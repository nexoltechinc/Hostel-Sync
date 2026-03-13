from datetime import timedelta
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers

from members.models import Member

from .models import (
    ChargeType,
    FeeAssignmentStatus,
    FeePlan,
    Invoice,
    InvoiceCharge,
    MemberCredit,
    MemberFeePlan,
    Payment,
    PaymentAllocation,
    PaymentMethod,
)
from .services import (
    add_invoice_charge,
    apply_member_credit_to_invoice,
    generate_monthly_invoices,
    normalize_billing_month,
    safely_record_member_payment,
)


class FeePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeePlan
        fields = (
            "id",
            "hostel",
            "name",
            "description",
            "monthly_amount",
            "admission_fee",
            "security_deposit",
            "is_active",
            "created_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")


class MemberFeePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberFeePlan
        fields = (
            "id",
            "hostel",
            "member",
            "fee_plan",
            "start_date",
            "end_date",
            "status",
            "remarks",
            "created_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "hostel", "end_date", "status", "created_by", "created_at", "updated_at")

    def validate(self, attrs):
        member = attrs["member"]
        fee_plan = attrs["fee_plan"]
        request = self.context.get("request")

        if member.is_deleted:
            raise serializers.ValidationError({"member": "Archived members cannot be assigned fee plans."})

        if not fee_plan.is_active:
            raise serializers.ValidationError({"fee_plan": "Inactive fee plans cannot be assigned."})

        if member.hostel_id != fee_plan.hostel_id:
            raise serializers.ValidationError("Member and fee plan must belong to the same hostel.")

        if request and not request.user.is_superuser:
            if not request.user.hostel_id:
                raise serializers.ValidationError("Your account is not linked to a hostel.")
            if member.hostel_id != request.user.hostel_id:
                raise serializers.ValidationError("You can only assign fee plans in your hostel.")

        if MemberFeePlan.objects.filter(member=member, status=FeeAssignmentStatus.ACTIVE).exists():
            raise serializers.ValidationError({"member": "Member already has an active fee plan assignment."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        try:
            return MemberFeePlan.objects.create(
                hostel=validated_data["member"].hostel,
                created_by=request.user,
                **validated_data,
            )
        except IntegrityError as exc:
            raise serializers.ValidationError({"detail": "Active fee plan already exists for this member."}) from exc


class CloseMemberFeePlanSerializer(serializers.Serializer):
    end_date = serializers.DateField(default=timezone.localdate)
    remarks = serializers.CharField(required=False, allow_blank=True, max_length=500)

    @transaction.atomic
    def save(self, *, assignment: MemberFeePlan):
        end_date = self.validated_data["end_date"]
        if end_date < assignment.start_date:
            raise serializers.ValidationError({"end_date": "End date cannot be before start date."})

        assignment.status = FeeAssignmentStatus.CLOSED
        assignment.end_date = end_date
        remarks = self.validated_data.get("remarks")
        if remarks:
            assignment.remarks = remarks
        assignment.save(update_fields=["status", "end_date", "remarks", "updated_at"])
        return assignment


class InvoiceChargeSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceCharge
        fields = (
            "id",
            "invoice",
            "member",
            "charge_type",
            "description",
            "amount",
            "posted_on",
            "created_by",
            "created_at",
        )
        read_only_fields = ("id", "invoice", "member", "created_by", "created_at")


class InvoiceSerializer(serializers.ModelSerializer):
    charges = InvoiceChargeSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = (
            "id",
            "hostel",
            "member",
            "billing_month",
            "issue_date",
            "due_date",
            "status",
            "total_amount",
            "paid_amount",
            "balance_amount",
            "remarks",
            "created_by",
            "created_at",
            "updated_at",
            "charges",
        )
        read_only_fields = (
            "id",
            "hostel",
            "issue_date",
            "status",
            "total_amount",
            "paid_amount",
            "balance_amount",
            "created_by",
            "created_at",
            "updated_at",
            "charges",
        )

    def validate(self, attrs):
        member = attrs["member"]
        request = self.context.get("request")

        if member.is_deleted:
            raise serializers.ValidationError({"member": "Archived members cannot be billed."})

        if request and not request.user.is_superuser:
            if not request.user.hostel_id:
                raise serializers.ValidationError("Your account is not linked to a hostel.")
            if member.hostel_id != request.user.hostel_id:
                raise serializers.ValidationError("You can only create invoices for your hostel.")

        attrs["billing_month"] = normalize_billing_month(attrs["billing_month"])
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        month = validated_data["billing_month"]
        due_date = validated_data.get("due_date") or (month + timedelta(days=9))
        try:
            invoice = Invoice.objects.create(
                hostel=validated_data["member"].hostel,
                issue_date=timezone.localdate(),
                due_date=due_date,
                created_by=request.user,
                **validated_data,
            )
        except IntegrityError as exc:
            raise serializers.ValidationError({"detail": "Invoice already exists for this member and month."}) from exc

        # If member has existing credit, apply immediately.
        apply_member_credit_to_invoice(invoice=invoice, actor=request.user)
        return invoice


class AddInvoiceChargeSerializer(serializers.Serializer):
    charge_type = serializers.ChoiceField(choices=ChargeType.choices, default=ChargeType.MISC)
    description = serializers.CharField(max_length=255)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    posted_on = serializers.DateField(default=timezone.localdate)

    def validate_amount(self, value):
        if value <= Decimal("0.00"):
            raise serializers.ValidationError("Charge amount must be greater than zero.")
        return value

    def save(self, *, invoice: Invoice, actor=None):
        try:
            return add_invoice_charge(
                invoice=invoice,
                charge_type=self.validated_data["charge_type"],
                description=self.validated_data["description"],
                amount=self.validated_data["amount"],
                posted_on=self.validated_data["posted_on"],
                actor=actor,
            )
        except ValueError as exc:
            raise serializers.ValidationError({"detail": str(exc)}) from exc


class GenerateMonthlyInvoicesSerializer(serializers.Serializer):
    billing_month = serializers.DateField(default=timezone.localdate)
    member_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=False,
    )

    def save(self, *, hostel_id: int, actor=None):
        month = normalize_billing_month(self.validated_data["billing_month"])
        member_ids = self.validated_data.get("member_ids")
        return generate_monthly_invoices(hostel_id=hostel_id, billing_month=month, actor=actor, member_ids=member_ids)


class PaymentAllocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentAllocation
        fields = ("id", "invoice", "amount", "created_at")
        read_only_fields = ("id", "invoice", "amount", "created_at")


class PaymentSerializer(serializers.ModelSerializer):
    allocations = PaymentAllocationSerializer(many=True, read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id",
            "hostel",
            "member",
            "payment_date",
            "amount",
            "applied_amount",
            "credit_added",
            "method",
            "reference_no",
            "receipt_number",
            "remarks",
            "created_by",
            "created_at",
            "updated_at",
            "allocations",
        )
        read_only_fields = (
            "id",
            "hostel",
            "applied_amount",
            "credit_added",
            "receipt_number",
            "created_by",
            "created_at",
            "updated_at",
            "allocations",
        )


class PaymentCreateSerializer(serializers.Serializer):
    member = serializers.PrimaryKeyRelatedField(queryset=Member.objects.select_related("hostel").all())
    payment_date = serializers.DateField(default=timezone.localdate)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    method = serializers.ChoiceField(choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    reference_no = serializers.CharField(required=False, allow_blank=True, max_length=80)
    remarks = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def validate(self, attrs):
        request = self.context.get("request")
        member = attrs["member"]

        if member.is_deleted:
            raise serializers.ValidationError({"member": "Archived members cannot receive new payment entries."})

        if attrs["amount"] <= Decimal("0.00"):
            raise serializers.ValidationError({"amount": "Payment amount must be greater than zero."})

        if request and not request.user.is_superuser:
            if not request.user.hostel_id:
                raise serializers.ValidationError("Your account is not linked to a hostel.")
            if member.hostel_id != request.user.hostel_id:
                raise serializers.ValidationError("You can only post payments in your hostel.")
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        try:
            return safely_record_member_payment(
                member_id=validated_data["member"].id,
                amount=validated_data["amount"],
                payment_date=validated_data["payment_date"],
                method=validated_data["method"],
                reference_no=validated_data.get("reference_no", ""),
                remarks=validated_data.get("remarks", ""),
                actor=request.user,
            )
        except ValueError as exc:
            raise serializers.ValidationError({"detail": str(exc)}) from exc


class MemberCreditSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberCredit
        fields = ("id", "hostel", "member", "balance", "updated_at")
        read_only_fields = fields
