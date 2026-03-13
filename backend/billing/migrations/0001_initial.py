# Generated manually for billing initial schema.

from decimal import Decimal

import django.core.validators
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("hostels", "0001_initial"),
        ("members", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="FeePlan",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("description", models.TextField(blank=True)),
                (
                    "monthly_amount",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("0.00"),
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    ),
                ),
                (
                    "admission_fee",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("0.00"),
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    ),
                ),
                (
                    "security_deposit",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("0.00"),
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_fee_plans",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "hostel",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="fee_plans",
                        to="hostels.hostel",
                    ),
                ),
            ],
            options={
                "ordering": ["name"],
                "indexes": [models.Index(fields=["hostel", "is_active"], name="billing_fee__hostel__8c0dd0_idx")],
                "constraints": [
                    models.UniqueConstraint(fields=("hostel", "name"), name="uniq_fee_plan_name_per_hostel")
                ],
            },
        ),
        migrations.CreateModel(
            name="Invoice",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("billing_month", models.DateField()),
                ("issue_date", models.DateField(default=django.utils.timezone.localdate)),
                ("due_date", models.DateField(blank=True, null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[("open", "Open"), ("partially_paid", "Partially Paid"), ("paid", "Paid")],
                        default="open",
                        max_length=20,
                    ),
                ),
                (
                    "total_amount",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("0.00"),
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    ),
                ),
                (
                    "paid_amount",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("0.00"),
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    ),
                ),
                (
                    "balance_amount",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("0.00"),
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    ),
                ),
                ("remarks", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_invoices",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "hostel",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="invoices",
                        to="hostels.hostel",
                    ),
                ),
                (
                    "member",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="invoices",
                        to="members.member",
                    ),
                ),
            ],
            options={
                "ordering": ["-billing_month", "-id"],
                "indexes": [
                    models.Index(fields=["hostel", "status"], name="billing_inv__hostel__50a4a6_idx"),
                    models.Index(fields=["member", "status"], name="billing_inv__member__ce4d4b_idx"),
                    models.Index(fields=["hostel", "billing_month"], name="billing_inv__hostel__856dc3_idx"),
                ],
                "constraints": [
                    models.UniqueConstraint(
                        fields=("hostel", "member", "billing_month"),
                        name="uniq_invoice_per_member_month",
                    ),
                    models.CheckConstraint(
                        condition=models.Q(("paid_amount__lte", models.F("total_amount"))),
                        name="invoice_paid_lte_total",
                    ),
                    models.CheckConstraint(
                        condition=models.Q(("balance_amount__lte", models.F("total_amount"))),
                        name="invoice_balance_lte_total",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="MemberCredit",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "balance",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("0.00"),
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "hostel",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="member_credits",
                        to="hostels.hostel",
                    ),
                ),
                (
                    "member",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="credit_accounts",
                        to="members.member",
                    ),
                ),
            ],
            options={
                "ordering": ["member_id"],
                "indexes": [models.Index(fields=["hostel", "member"], name="billing_cre__hostel__84d779_idx")],
                "constraints": [
                    models.UniqueConstraint(
                        fields=("hostel", "member"),
                        name="uniq_credit_account_per_member",
                    )
                ],
            },
        ),
        migrations.CreateModel(
            name="MemberFeePlan",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("start_date", models.DateField(default=django.utils.timezone.localdate)),
                ("end_date", models.DateField(blank=True, null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[("active", "Active"), ("closed", "Closed")],
                        default="active",
                        max_length=20,
                    ),
                ),
                ("remarks", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_member_fee_plans",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "fee_plan",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="member_assignments",
                        to="billing.feeplan",
                    ),
                ),
                (
                    "hostel",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="member_fee_plans",
                        to="hostels.hostel",
                    ),
                ),
                (
                    "member",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="fee_plans",
                        to="members.member",
                    ),
                ),
            ],
            options={
                "ordering": ["-start_date", "-id"],
                "indexes": [
                    models.Index(fields=["hostel", "status"], name="billing_mem__hostel__f51077_idx"),
                    models.Index(fields=["member", "status"], name="billing_mem__member__fe9b54_idx"),
                ],
                "constraints": [
                    models.UniqueConstraint(
                        condition=models.Q(("status", "active")),
                        fields=("member",),
                        name="uniq_active_fee_plan_per_member",
                    ),
                    models.CheckConstraint(
                        condition=models.Q(("end_date__isnull", True), ("end_date__gte", models.F("start_date")), _connector="OR"),
                        name="member_fee_plan_end_after_start",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="Payment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("payment_date", models.DateField(default=django.utils.timezone.localdate)),
                (
                    "amount",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.01"))],
                    ),
                ),
                (
                    "applied_amount",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("0.00"),
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    ),
                ),
                (
                    "credit_added",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("0.00"),
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    ),
                ),
                (
                    "method",
                    models.CharField(
                        choices=[
                            ("cash", "Cash"),
                            ("upi", "UPI"),
                            ("bank_transfer", "Bank Transfer"),
                            ("card", "Card"),
                            ("other", "Other"),
                        ],
                        default="cash",
                        max_length=30,
                    ),
                ),
                ("reference_no", models.CharField(blank=True, max_length=80)),
                ("receipt_number", models.CharField(max_length=50)),
                ("remarks", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_payments",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "hostel",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="payments",
                        to="hostels.hostel",
                    ),
                ),
                (
                    "member",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="payments",
                        to="members.member",
                    ),
                ),
            ],
            options={
                "ordering": ["-payment_date", "-id"],
                "indexes": [
                    models.Index(fields=["hostel", "payment_date"], name="billing_pay__hostel__9fb758_idx"),
                    models.Index(fields=["member", "payment_date"], name="billing_pay__member__dbf084_idx"),
                    models.Index(fields=["hostel", "method"], name="billing_pay__hostel__77461d_idx"),
                ],
                "constraints": [
                    models.UniqueConstraint(
                        fields=("hostel", "receipt_number"),
                        name="uniq_payment_receipt_per_hostel",
                    ),
                    models.CheckConstraint(
                        condition=models.Q(("applied_amount__lte", models.F("amount"))),
                        name="payment_applied_lte_amount",
                    ),
                    models.CheckConstraint(
                        condition=models.Q(("credit_added__lte", models.F("amount"))),
                        name="payment_credit_lte_amount",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="CreditLedgerEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "entry_type",
                    models.CharField(
                        choices=[
                            ("overpayment", "Overpayment"),
                            ("applied_to_invoice", "Applied To Invoice"),
                            ("manual_adjustment", "Manual Adjustment"),
                        ],
                        max_length=30,
                    ),
                ),
                ("amount", models.DecimalField(decimal_places=2, max_digits=10)),
                ("remarks", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_credit_entries",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "credit_account",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="entries",
                        to="billing.membercredit",
                    ),
                ),
                (
                    "hostel",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="credit_entries",
                        to="hostels.hostel",
                    ),
                ),
                (
                    "invoice",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="credit_entries",
                        to="billing.invoice",
                    ),
                ),
                (
                    "member",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="credit_entries",
                        to="members.member",
                    ),
                ),
                (
                    "payment",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="credit_entries",
                        to="billing.payment",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at", "-id"],
                "indexes": [
                    models.Index(fields=["hostel", "created_at"], name="billing_cre__hostel__b61095_idx"),
                    models.Index(fields=["member", "created_at"], name="billing_cre__member__93f534_idx"),
                ],
                "constraints": [
                    models.CheckConstraint(
                        condition=~models.Q(("amount", Decimal("0.00"))),
                        name="credit_ledger_amount_non_zero",
                    )
                ],
            },
        ),
        migrations.CreateModel(
            name="InvoiceCharge",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "charge_type",
                    models.CharField(
                        choices=[
                            ("monthly_rent", "Monthly Rent"),
                            ("admission_fee", "Admission Fee"),
                            ("security_deposit", "Security Deposit"),
                            ("utility", "Utility"),
                            ("mess", "Mess"),
                            ("penalty", "Penalty"),
                            ("misc", "Miscellaneous"),
                            ("adjustment", "Adjustment"),
                        ],
                        default="monthly_rent",
                        max_length=30,
                    ),
                ),
                ("description", models.CharField(max_length=255)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=10)),
                ("posted_on", models.DateField(default=django.utils.timezone.localdate)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_invoice_charges",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "hostel",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="invoice_charges",
                        to="hostels.hostel",
                    ),
                ),
                (
                    "invoice",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="charges",
                        to="billing.invoice",
                    ),
                ),
                (
                    "member",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="invoice_charges",
                        to="members.member",
                    ),
                ),
            ],
            options={
                "ordering": ["posted_on", "id"],
                "indexes": [
                    models.Index(fields=["invoice", "posted_on"], name="billing_cha__invoice_a66f68_idx"),
                    models.Index(fields=["member", "posted_on"], name="billing_cha__member_f93f4f_idx"),
                    models.Index(fields=["hostel", "charge_type"], name="billing_cha__hostel_6f769f_idx"),
                ],
                "constraints": [
                    models.CheckConstraint(
                        condition=~models.Q(("amount", Decimal("0.00"))),
                        name="invoice_charge_amount_non_zero",
                    )
                ],
            },
        ),
        migrations.CreateModel(
            name="PaymentAllocation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "amount",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.01"))],
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "invoice",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="payment_allocations",
                        to="billing.invoice",
                    ),
                ),
                (
                    "payment",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="allocations",
                        to="billing.payment",
                    ),
                ),
            ],
            options={
                "ordering": ["id"],
                "indexes": [models.Index(fields=["invoice", "id"], name="billing_all__invoice_ef6a64_idx")],
                "constraints": [
                    models.UniqueConstraint(
                        fields=("payment", "invoice"),
                        name="uniq_payment_invoice_allocation",
                    )
                ],
            },
        ),
    ]
