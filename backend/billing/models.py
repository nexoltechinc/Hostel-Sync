from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Q
from django.utils import timezone


class FeeAssignmentStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    CLOSED = "closed", "Closed"


class InvoiceStatus(models.TextChoices):
    OPEN = "open", "Open"
    PARTIALLY_PAID = "partially_paid", "Partially Paid"
    PAID = "paid", "Paid"


class ChargeType(models.TextChoices):
    MONTHLY_RENT = "monthly_rent", "Monthly Rent"
    ADMISSION_FEE = "admission_fee", "Admission Fee"
    SECURITY_DEPOSIT = "security_deposit", "Security Deposit"
    UTILITY = "utility", "Utility"
    MESS = "mess", "Mess"
    PENALTY = "penalty", "Penalty"
    MISC = "misc", "Miscellaneous"
    ADJUSTMENT = "adjustment", "Adjustment"


class PaymentMethod(models.TextChoices):
    CASH = "cash", "Cash"
    UPI = "upi", "UPI"
    BANK_TRANSFER = "bank_transfer", "Bank Transfer"
    CARD = "card", "Card"
    OTHER = "other", "Other"


class CreditEntryType(models.TextChoices):
    OVERPAYMENT = "overpayment", "Overpayment"
    APPLIED_TO_INVOICE = "applied_to_invoice", "Applied To Invoice"
    MANUAL_ADJUSTMENT = "manual_adjustment", "Manual Adjustment"


class FeePlan(models.Model):
    hostel = models.ForeignKey("hostels.Hostel", on_delete=models.PROTECT, related_name="fee_plans")
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    monthly_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    admission_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    security_deposit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="created_fee_plans",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["hostel", "name"], name="uniq_fee_plan_name_per_hostel"),
        ]
        indexes = [
            models.Index(fields=["hostel", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.hostel.code} - {self.name}"


class MemberFeePlan(models.Model):
    hostel = models.ForeignKey("hostels.Hostel", on_delete=models.PROTECT, related_name="member_fee_plans")
    member = models.ForeignKey("members.Member", on_delete=models.PROTECT, related_name="fee_plans")
    fee_plan = models.ForeignKey(FeePlan, on_delete=models.PROTECT, related_name="member_assignments")
    start_date = models.DateField(default=timezone.localdate)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=FeeAssignmentStatus.choices, default=FeeAssignmentStatus.ACTIVE)
    remarks = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="created_member_fee_plans",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["member"],
                condition=Q(status=FeeAssignmentStatus.ACTIVE),
                name="uniq_active_fee_plan_per_member",
            ),
            models.CheckConstraint(
                condition=Q(end_date__isnull=True) | Q(end_date__gte=F("start_date")),
                name="member_fee_plan_end_after_start",
            ),
        ]
        indexes = [
            models.Index(fields=["hostel", "status"]),
            models.Index(fields=["member", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.member.member_code} - {self.fee_plan.name}"


class Invoice(models.Model):
    hostel = models.ForeignKey("hostels.Hostel", on_delete=models.PROTECT, related_name="invoices")
    member = models.ForeignKey("members.Member", on_delete=models.PROTECT, related_name="invoices")
    billing_month = models.DateField()
    issue_date = models.DateField(default=timezone.localdate)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=InvoiceStatus.choices, default=InvoiceStatus.OPEN)
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    paid_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    balance_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    remarks = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="created_invoices",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-billing_month", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["hostel", "member", "billing_month"], name="uniq_invoice_per_member_month"),
            models.CheckConstraint(
                condition=Q(paid_amount__lte=F("total_amount")),
                name="invoice_paid_lte_total",
            ),
            models.CheckConstraint(
                condition=Q(balance_amount__lte=F("total_amount")),
                name="invoice_balance_lte_total",
            ),
        ]
        indexes = [
            models.Index(fields=["hostel", "status"]),
            models.Index(fields=["member", "status"]),
            models.Index(fields=["hostel", "billing_month"]),
        ]

    def __str__(self) -> str:
        return f"{self.member.member_code} - {self.billing_month:%Y-%m}"


class InvoiceCharge(models.Model):
    hostel = models.ForeignKey("hostels.Hostel", on_delete=models.PROTECT, related_name="invoice_charges")
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="charges")
    member = models.ForeignKey("members.Member", on_delete=models.PROTECT, related_name="invoice_charges")
    charge_type = models.CharField(max_length=30, choices=ChargeType.choices, default=ChargeType.MONTHLY_RENT)
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    posted_on = models.DateField(default=timezone.localdate)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="created_invoice_charges",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["posted_on", "id"]
        constraints = [
            models.CheckConstraint(
                condition=~Q(amount=Decimal("0.00")),
                name="invoice_charge_amount_non_zero",
            ),
        ]
        indexes = [
            models.Index(fields=["invoice", "posted_on"]),
            models.Index(fields=["member", "posted_on"]),
            models.Index(fields=["hostel", "charge_type"]),
        ]

    def __str__(self) -> str:
        return f"{self.invoice_id} - {self.charge_type} - {self.amount}"


class Payment(models.Model):
    hostel = models.ForeignKey("hostels.Hostel", on_delete=models.PROTECT, related_name="payments")
    member = models.ForeignKey("members.Member", on_delete=models.PROTECT, related_name="payments")
    payment_date = models.DateField(default=timezone.localdate)
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    applied_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    credit_added = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    method = models.CharField(max_length=30, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    reference_no = models.CharField(max_length=80, blank=True)
    receipt_number = models.CharField(max_length=50)
    remarks = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="created_payments",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-payment_date", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["hostel", "receipt_number"], name="uniq_payment_receipt_per_hostel"),
            models.CheckConstraint(
                condition=Q(applied_amount__lte=F("amount")),
                name="payment_applied_lte_amount",
            ),
            models.CheckConstraint(
                condition=Q(credit_added__lte=F("amount")),
                name="payment_credit_lte_amount",
            ),
        ]
        indexes = [
            models.Index(fields=["hostel", "payment_date"]),
            models.Index(fields=["member", "payment_date"]),
            models.Index(fields=["hostel", "method"]),
        ]

    def __str__(self) -> str:
        return f"{self.receipt_number} - {self.amount}"


class PaymentAllocation(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.PROTECT, related_name="allocations")
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="payment_allocations")
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(fields=["payment", "invoice"], name="uniq_payment_invoice_allocation"),
        ]
        indexes = [
            models.Index(fields=["invoice", "id"]),
        ]

    def __str__(self) -> str:
        return f"{self.payment.receipt_number} -> {self.invoice_id} ({self.amount})"


class MemberCredit(models.Model):
    hostel = models.ForeignKey("hostels.Hostel", on_delete=models.PROTECT, related_name="member_credits")
    member = models.ForeignKey("members.Member", on_delete=models.PROTECT, related_name="credit_accounts")
    balance = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["member_id"]
        constraints = [
            models.UniqueConstraint(fields=["hostel", "member"], name="uniq_credit_account_per_member"),
        ]
        indexes = [
            models.Index(fields=["hostel", "member"]),
        ]

    def __str__(self) -> str:
        return f"{self.member.member_code} credit {self.balance}"


class CreditLedgerEntry(models.Model):
    credit_account = models.ForeignKey(MemberCredit, on_delete=models.PROTECT, related_name="entries")
    hostel = models.ForeignKey("hostels.Hostel", on_delete=models.PROTECT, related_name="credit_entries")
    member = models.ForeignKey("members.Member", on_delete=models.PROTECT, related_name="credit_entries")
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="credit_entries", null=True, blank=True)
    payment = models.ForeignKey(Payment, on_delete=models.PROTECT, related_name="credit_entries", null=True, blank=True)
    entry_type = models.CharField(max_length=30, choices=CreditEntryType.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    remarks = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="created_credit_entries",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=~Q(amount=Decimal("0.00")),
                name="credit_ledger_amount_non_zero",
            ),
        ]
        indexes = [
            models.Index(fields=["hostel", "created_at"]),
            models.Index(fields=["member", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.member.member_code} {self.entry_type} {self.amount}"
