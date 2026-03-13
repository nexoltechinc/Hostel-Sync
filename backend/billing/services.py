from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from members.models import Member

from .models import (
    ChargeType,
    CreditEntryType,
    CreditLedgerEntry,
    FeeAssignmentStatus,
    Invoice,
    InvoiceCharge,
    InvoiceStatus,
    MemberCredit,
    MemberFeePlan,
    Payment,
    PaymentAllocation,
)

ZERO = Decimal("0.00")


def normalize_billing_month(value: date) -> date:
    return value.replace(day=1)


def _month_end(month_start: date) -> date:
    next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    return next_month - timedelta(days=1)


def resolve_invoice_status(total_amount: Decimal, balance_amount: Decimal) -> str:
    if balance_amount <= ZERO:
        return InvoiceStatus.PAID
    if balance_amount >= total_amount:
        return InvoiceStatus.OPEN
    return InvoiceStatus.PARTIALLY_PAID


def _receipt_number(hostel_id: int) -> str:
    now_token = timezone.now().strftime("%Y%m%d%H%M%S%f")
    return f"RCPT-{hostel_id}-{now_token}"


def _credit_account_for_member(*, hostel_id: int, member_id: int) -> MemberCredit:
    account, _ = MemberCredit.objects.select_for_update().get_or_create(
        hostel_id=hostel_id,
        member_id=member_id,
        defaults={"balance": ZERO},
    )
    return account


@transaction.atomic
def apply_member_credit_to_invoice(*, invoice: Invoice, actor=None, remarks: str = "") -> Decimal:
    invoice = Invoice.objects.select_for_update().select_related("member", "hostel").get(pk=invoice.pk)
    if invoice.balance_amount <= ZERO:
        return ZERO

    credit_account = _credit_account_for_member(hostel_id=invoice.hostel_id, member_id=invoice.member_id)
    if credit_account.balance <= ZERO:
        return ZERO

    applicable = min(credit_account.balance, invoice.balance_amount)
    if applicable <= ZERO:
        return ZERO

    credit_account.balance -= applicable
    credit_account.save(update_fields=["balance", "updated_at"])

    invoice.paid_amount += applicable
    invoice.balance_amount -= applicable
    invoice.status = resolve_invoice_status(invoice.total_amount, invoice.balance_amount)
    invoice.save(update_fields=["paid_amount", "balance_amount", "status", "updated_at"])

    CreditLedgerEntry.objects.create(
        credit_account=credit_account,
        hostel_id=invoice.hostel_id,
        member_id=invoice.member_id,
        invoice=invoice,
        entry_type=CreditEntryType.APPLIED_TO_INVOICE,
        amount=-applicable,
        remarks=remarks or f"Auto-applied credit to invoice {invoice.id}.",
        created_by=actor,
    )
    return applicable


@transaction.atomic
def add_invoice_charge(
    *,
    invoice: Invoice,
    charge_type: str,
    description: str,
    amount: Decimal,
    actor=None,
    posted_on: date | None = None,
) -> InvoiceCharge:
    if amount == ZERO:
        raise ValueError("Charge amount cannot be zero.")

    invoice = Invoice.objects.select_for_update().select_related("member", "hostel").get(pk=invoice.pk)

    charge = InvoiceCharge.objects.create(
        hostel_id=invoice.hostel_id,
        invoice=invoice,
        member_id=invoice.member_id,
        charge_type=charge_type,
        description=description,
        amount=amount,
        posted_on=posted_on or timezone.localdate(),
        created_by=actor,
    )

    invoice.total_amount += amount
    invoice.balance_amount += amount
    if invoice.balance_amount < ZERO:
        raise ValueError("Charge would create a negative invoice balance.")
    invoice.status = resolve_invoice_status(invoice.total_amount, invoice.balance_amount)
    invoice.save(update_fields=["total_amount", "balance_amount", "status", "updated_at"])

    if invoice.balance_amount > ZERO:
        apply_member_credit_to_invoice(invoice=invoice, actor=actor)
    return charge


@dataclass
class MonthlyGenerationResult:
    created_count: int
    skipped_count: int
    invoice_ids: list[int]


@transaction.atomic
def generate_monthly_invoices(*, hostel_id: int, billing_month: date, actor=None, member_ids: list[int] | None = None) -> MonthlyGenerationResult:
    month_start = normalize_billing_month(billing_month)
    month_end = _month_end(month_start)

    assignments = (
        MemberFeePlan.objects.select_for_update()
        .select_related("member", "fee_plan")
        .filter(
            hostel_id=hostel_id,
            status=FeeAssignmentStatus.ACTIVE,
            start_date__lte=month_end,
        )
        .filter(Q(end_date__isnull=True) | Q(end_date__gte=month_start))
        .filter(member__is_deleted=False)
    )
    if member_ids:
        assignments = assignments.filter(member_id__in=member_ids)

    created_count = 0
    skipped_count = 0
    created_invoice_ids: list[int] = []

    for assignment in assignments:
        invoice, created = Invoice.objects.get_or_create(
            hostel_id=hostel_id,
            member_id=assignment.member_id,
            billing_month=month_start,
            defaults={
                "issue_date": timezone.localdate(),
                "due_date": month_start + timedelta(days=9),
                "status": InvoiceStatus.OPEN,
                "total_amount": ZERO,
                "paid_amount": ZERO,
                "balance_amount": ZERO,
                "created_by": actor,
            },
        )
        if not created:
            skipped_count += 1
            continue

        monthly_desc = f"Monthly fee for {month_start:%B %Y} ({assignment.fee_plan.name})"
        add_invoice_charge(
            invoice=invoice,
            charge_type=ChargeType.MONTHLY_RENT,
            description=monthly_desc,
            amount=assignment.fee_plan.monthly_amount,
            actor=actor,
            posted_on=month_start,
        )

        # One-time setup charges are added in the member's first billing month.
        if assignment.start_date.year == month_start.year and assignment.start_date.month == month_start.month:
            if assignment.fee_plan.admission_fee > ZERO:
                add_invoice_charge(
                    invoice=invoice,
                    charge_type=ChargeType.ADMISSION_FEE,
                    description=f"Admission fee ({assignment.fee_plan.name})",
                    amount=assignment.fee_plan.admission_fee,
                    actor=actor,
                    posted_on=month_start,
                )
            if assignment.fee_plan.security_deposit > ZERO:
                add_invoice_charge(
                    invoice=invoice,
                    charge_type=ChargeType.SECURITY_DEPOSIT,
                    description=f"Security deposit ({assignment.fee_plan.name})",
                    amount=assignment.fee_plan.security_deposit,
                    actor=actor,
                    posted_on=month_start,
                )

        created_count += 1
        created_invoice_ids.append(invoice.id)

    return MonthlyGenerationResult(
        created_count=created_count,
        skipped_count=skipped_count,
        invoice_ids=created_invoice_ids,
    )


@transaction.atomic
def record_member_payment(
    *,
    member_id: int,
    amount: Decimal,
    payment_date: date,
    method: str,
    reference_no: str = "",
    remarks: str = "",
    actor=None,
) -> Payment:
    if amount <= ZERO:
        raise ValueError("Payment amount must be greater than zero.")

    member = Member.objects.select_for_update().select_related("hostel").get(pk=member_id)
    hostel_id = member.hostel_id

    payment = Payment.objects.create(
        hostel_id=hostel_id,
        member_id=member_id,
        payment_date=payment_date,
        amount=amount,
        applied_amount=ZERO,
        credit_added=ZERO,
        method=method,
        reference_no=reference_no,
        remarks=remarks,
        receipt_number=_receipt_number(hostel_id),
        created_by=actor,
    )

    remaining = amount
    open_invoices = Invoice.objects.select_for_update().filter(
        hostel_id=hostel_id,
        member_id=member_id,
        status__in=[InvoiceStatus.OPEN, InvoiceStatus.PARTIALLY_PAID],
    ).order_by("billing_month", "id")

    for invoice in open_invoices:
        if remaining <= ZERO:
            break
        alloc = min(remaining, invoice.balance_amount)
        if alloc <= ZERO:
            continue

        PaymentAllocation.objects.create(payment=payment, invoice=invoice, amount=alloc)
        invoice.paid_amount += alloc
        invoice.balance_amount -= alloc
        invoice.status = resolve_invoice_status(invoice.total_amount, invoice.balance_amount)
        invoice.save(update_fields=["paid_amount", "balance_amount", "status", "updated_at"])
        remaining -= alloc

    if remaining > ZERO:
        credit_account = _credit_account_for_member(hostel_id=hostel_id, member_id=member_id)
        credit_account.balance += remaining
        credit_account.save(update_fields=["balance", "updated_at"])
        CreditLedgerEntry.objects.create(
            credit_account=credit_account,
            hostel_id=hostel_id,
            member_id=member_id,
            payment=payment,
            entry_type=CreditEntryType.OVERPAYMENT,
            amount=remaining,
            remarks="Overpayment stored as member credit.",
            created_by=actor,
        )

    payment.applied_amount = amount - remaining
    payment.credit_added = remaining
    payment.save(update_fields=["applied_amount", "credit_added", "updated_at"])
    return payment


def safely_record_member_payment(**kwargs) -> Payment:
    try:
        return record_member_payment(**kwargs)
    except IntegrityError as exc:
        raise ValueError("Payment conflict detected. Please retry.") from exc
