from datetime import date
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User, UserRole
from hostels.models import Hostel
from members.models import Member, MemberStatus

from .models import FeeAssignmentStatus, FeePlan, Invoice, InvoiceStatus, MemberCredit, MemberFeePlan, Payment


class BillingModuleTests(APITestCase):
    def setUp(self):
        self.hostel_a = Hostel.objects.create(name="Alpha Hostel", code="ALPHA")
        self.hostel_b = Hostel.objects.create(name="Beta Hostel", code="BETA")

        self.admin_a = User.objects.create_user(
            username="admin_a",
            email="admin_a@example.com",
            password="Password123!",
            role=UserRole.ADMIN,
            hostel=self.hostel_a,
        )
        self.admin_b = User.objects.create_user(
            username="admin_b",
            email="admin_b@example.com",
            password="Password123!",
            role=UserRole.ADMIN,
            hostel=self.hostel_b,
        )

        self.member_a = Member.objects.create(
            hostel=self.hostel_a,
            member_code="M-A1",
            full_name="Member Alpha",
            phone="+1234567000",
            status=MemberStatus.ACTIVE,
            joining_date=date(2026, 3, 1),
        )
        self.member_b = Member.objects.create(
            hostel=self.hostel_b,
            member_code="M-B1",
            full_name="Member Beta",
            phone="+1234567001",
            status=MemberStatus.ACTIVE,
            joining_date=date(2026, 3, 1),
        )

        self.plan_a = FeePlan.objects.create(
            hostel=self.hostel_a,
            name="Standard A",
            monthly_amount=Decimal("1000.00"),
            admission_fee=Decimal("0.00"),
            security_deposit=Decimal("0.00"),
            created_by=self.admin_a,
        )

    def _assign_active_plan(self, *, start_date=date(2026, 3, 1)):
        return MemberFeePlan.objects.create(
            hostel=self.hostel_a,
            member=self.member_a,
            fee_plan=self.plan_a,
            start_date=start_date,
            status=FeeAssignmentStatus.ACTIVE,
            created_by=self.admin_a,
        )

    def _generate_month(self, month: str):
        return self.client.post(
            "/api/v1/billing/invoices/generate-monthly/",
            {"billing_month": month},
            format="json",
        )

    def test_fee_plan_create_is_scoped_to_authenticated_hostel(self):
        self.client.force_authenticate(self.admin_a)
        response = self.client.post(
            "/api/v1/billing/fee-plans/",
            {
                "hostel": self.hostel_b.id,
                "name": "Scoped Plan",
                "monthly_amount": "1200.00",
                "admission_fee": "100.00",
                "security_deposit": "500.00",
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["hostel"], self.hostel_a.id)

    def test_member_fee_plan_assignment_requires_same_hostel(self):
        plan_b = FeePlan.objects.create(
            hostel=self.hostel_b,
            name="Plan B",
            monthly_amount=Decimal("900.00"),
            created_by=self.admin_b,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.post(
            "/api/v1/billing/member-fee-plans/",
            {
                "member": self.member_a.id,
                "fee_plan": plan_b.id,
                "start_date": "2026-03-01",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Member and fee plan must belong to the same hostel.", str(response.data))

    def test_generate_monthly_invoice_creates_invoice_and_charge(self):
        self._assign_active_plan()
        self.client.force_authenticate(self.admin_a)

        response = self._generate_month("2026-03-15")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["created_count"], 1)
        self.assertEqual(response.data["skipped_count"], 0)

        invoice = Invoice.objects.get(member=self.member_a, billing_month=date(2026, 3, 1))
        self.assertEqual(invoice.total_amount, Decimal("1000.00"))
        self.assertEqual(invoice.balance_amount, Decimal("1000.00"))
        self.assertEqual(invoice.status, InvoiceStatus.OPEN)
        self.assertEqual(invoice.charges.count(), 1)

    def test_generate_monthly_invoice_skips_existing(self):
        self._assign_active_plan()
        self.client.force_authenticate(self.admin_a)

        first = self._generate_month("2026-03-01")
        second = self._generate_month("2026-03-20")

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data["created_count"], 0)
        self.assertEqual(second.data["skipped_count"], 1)

    def test_payment_allocation_marks_invoice_paid(self):
        self._assign_active_plan()
        self.client.force_authenticate(self.admin_a)
        self._generate_month("2026-03-01")
        invoice = Invoice.objects.get(member=self.member_a, billing_month=date(2026, 3, 1))

        response = self.client.post(
            "/api/v1/billing/payments/",
            {
                "member": self.member_a.id,
                "amount": "1000.00",
                "payment_date": "2026-03-05",
                "method": "upi",
                "reference_no": "UPI123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["applied_amount"], "1000.00")
        self.assertEqual(response.data["credit_added"], "0.00")

        invoice.refresh_from_db()
        self.assertEqual(invoice.status, InvoiceStatus.PAID)
        self.assertEqual(invoice.balance_amount, Decimal("0.00"))
        self.assertEqual(invoice.payment_allocations.count(), 1)

    def test_overpayment_becomes_credit_then_auto_applies_to_next_invoice(self):
        self._assign_active_plan()
        self.client.force_authenticate(self.admin_a)

        self._generate_month("2026-03-01")
        payment_response = self.client.post(
            "/api/v1/billing/payments/",
            {
                "member": self.member_a.id,
                "amount": "1200.00",
                "payment_date": "2026-03-05",
                "method": "cash",
            },
            format="json",
        )
        self.assertEqual(payment_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(payment_response.data["credit_added"], "200.00")

        credit_account = MemberCredit.objects.get(member=self.member_a, hostel=self.hostel_a)
        self.assertEqual(credit_account.balance, Decimal("200.00"))

        self._generate_month("2026-04-01")
        april_invoice = Invoice.objects.get(member=self.member_a, billing_month=date(2026, 4, 1))
        credit_account.refresh_from_db()

        self.assertEqual(april_invoice.total_amount, Decimal("1000.00"))
        self.assertEqual(april_invoice.paid_amount, Decimal("200.00"))
        self.assertEqual(april_invoice.balance_amount, Decimal("800.00"))
        self.assertEqual(april_invoice.status, InvoiceStatus.PARTIALLY_PAID)
        self.assertEqual(credit_account.balance, Decimal("0.00"))

    def test_add_charge_updates_outstanding_balance(self):
        self._assign_active_plan()
        self.client.force_authenticate(self.admin_a)
        self._generate_month("2026-03-01")
        invoice = Invoice.objects.get(member=self.member_a, billing_month=date(2026, 3, 1))

        self.client.post(
            "/api/v1/billing/payments/",
            {
                "member": self.member_a.id,
                "amount": "400.00",
                "payment_date": "2026-03-05",
                "method": "cash",
            },
            format="json",
        )

        charge_response = self.client.post(
            f"/api/v1/billing/invoices/{invoice.id}/add-charge/",
            {
                "charge_type": "utility",
                "description": "Power adjustment",
                "amount": "100.00",
                "posted_on": "2026-03-06",
            },
            format="json",
        )
        self.assertEqual(charge_response.status_code, status.HTTP_200_OK)

        invoice.refresh_from_db()
        self.assertEqual(invoice.total_amount, Decimal("1100.00"))
        self.assertEqual(invoice.paid_amount, Decimal("400.00"))
        self.assertEqual(invoice.balance_amount, Decimal("700.00"))
        self.assertEqual(invoice.status, InvoiceStatus.PARTIALLY_PAID)

    def test_invoice_and_payment_records_are_immutable(self):
        self._assign_active_plan()
        self.client.force_authenticate(self.admin_a)
        self._generate_month("2026-03-01")
        invoice = Invoice.objects.get(member=self.member_a, billing_month=date(2026, 3, 1))
        payment = Payment.objects.create(
            hostel=self.hostel_a,
            member=self.member_a,
            amount=Decimal("100.00"),
            applied_amount=Decimal("0.00"),
            credit_added=Decimal("100.00"),
            method="cash",
            receipt_number="RCPT-MANUAL-1",
            created_by=self.admin_a,
        )

        invoice_patch = self.client.patch(f"/api/v1/billing/invoices/{invoice.id}/", {"remarks": "edited"}, format="json")
        payment_delete = self.client.delete(f"/api/v1/billing/payments/{payment.id}/")

        self.assertEqual(invoice_patch.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(payment_delete.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cross_hostel_invoice_access_is_blocked(self):
        plan_b = FeePlan.objects.create(
            hostel=self.hostel_b,
            name="B Plan",
            monthly_amount=Decimal("800.00"),
            created_by=self.admin_b,
        )
        MemberFeePlan.objects.create(
            hostel=self.hostel_b,
            member=self.member_b,
            fee_plan=plan_b,
            start_date=date(2026, 3, 1),
            status=FeeAssignmentStatus.ACTIVE,
            created_by=self.admin_b,
        )
        self.client.force_authenticate(self.admin_b)
        self.client.post("/api/v1/billing/invoices/generate-monthly/", {"billing_month": "2026-03-01"}, format="json")
        target_invoice = Invoice.objects.get(member=self.member_b, billing_month=date(2026, 3, 1))

        self.client.force_authenticate(self.admin_a)
        response = self.client.get(f"/api/v1/billing/invoices/{target_invoice.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
