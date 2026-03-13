from django.db.models import Sum
from django.utils import timezone
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import HasRBACPermission
from accounts.rbac import PermissionCode
from members.models import Member, MemberStatus

from .models import FeeAssignmentStatus, FeePlan, Invoice, InvoiceStatus, MemberCredit, MemberFeePlan, Payment
from .serializers import (
    AddInvoiceChargeSerializer,
    CloseMemberFeePlanSerializer,
    FeePlanSerializer,
    GenerateMonthlyInvoicesSerializer,
    InvoiceSerializer,
    MemberCreditSerializer,
    MemberFeePlanSerializer,
    PaymentCreateSerializer,
    PaymentSerializer,
)
from .services import apply_member_credit_to_invoice


class BillingScopedViewSet(viewsets.ModelViewSet):
    def scoped_queryset(self, queryset, *, hostel_field: str = "hostel_id"):
        user = self.request.user
        if user.is_superuser:
            return queryset
        if user.hostel_id:
            return queryset.filter(**{hostel_field: user.hostel_id})
        return queryset.none()


class FeePlanViewSet(BillingScopedViewSet):
    queryset = FeePlan.objects.select_related("hostel", "created_by").all()
    serializer_class = FeePlanSerializer
    filterset_fields = ("hostel", "is_active")
    search_fields = ("name", "description")
    ordering_fields = ("id", "name", "monthly_amount", "created_at")
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    permission_map = {
        "list": PermissionCode.VIEW_BILLING,
        "retrieve": PermissionCode.VIEW_BILLING,
        "create": PermissionCode.MANAGE_BILLING,
        "update": PermissionCode.MANAGE_BILLING,
        "partial_update": PermissionCode.MANAGE_BILLING,
        "destroy": PermissionCode.MANAGE_BILLING,
    }

    def get_queryset(self):
        return self.scoped_queryset(super().get_queryset())

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_superuser:
            hostel = serializer.validated_data.get("hostel")
            if not hostel:
                raise serializers.ValidationError({"hostel": "Hostel is required for fee plan creation."})
            serializer.save(created_by=user)
            return

        if not user.hostel_id:
            raise serializers.ValidationError({"hostel": "Your account is not linked to a hostel."})
        serializer.save(hostel=user.hostel, created_by=user)

    def perform_update(self, serializer):
        user = self.request.user
        if user.is_superuser:
            serializer.save()
            return
        serializer.save(hostel=user.hostel)

    def perform_destroy(self, instance):
        if MemberFeePlan.objects.filter(fee_plan=instance).exists():
            raise serializers.ValidationError({"detail": "Cannot delete a fee plan that has assignment history."})
        super().perform_destroy(instance)


class MemberFeePlanViewSet(BillingScopedViewSet):
    queryset = MemberFeePlan.objects.select_related("hostel", "member", "fee_plan", "created_by").all()
    serializer_class = MemberFeePlanSerializer
    filterset_fields = ("status", "hostel", "member", "fee_plan")
    search_fields = ("member__member_code", "member__full_name", "fee_plan__name")
    ordering_fields = ("id", "start_date", "end_date", "created_at")
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    permission_map = {
        "list": PermissionCode.VIEW_BILLING,
        "retrieve": PermissionCode.VIEW_BILLING,
        "create": PermissionCode.MANAGE_BILLING,
        "update": PermissionCode.MANAGE_BILLING,
        "partial_update": PermissionCode.MANAGE_BILLING,
        "destroy": PermissionCode.MANAGE_BILLING,
        "close": PermissionCode.MANAGE_BILLING,
    }

    def get_queryset(self):
        return self.scoped_queryset(super().get_queryset())

    def update(self, request, *args, **kwargs):
        raise serializers.ValidationError({"detail": "Direct updates are disabled. Use close action and create a new assignment."})

    def partial_update(self, request, *args, **kwargs):
        raise serializers.ValidationError({"detail": "Direct updates are disabled. Use close action and create a new assignment."})

    def destroy(self, request, *args, **kwargs):
        raise serializers.ValidationError({"detail": "Fee plan assignments are immutable and cannot be deleted."})

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        assignment = self.get_object()
        if assignment.status != FeeAssignmentStatus.ACTIVE:
            raise serializers.ValidationError({"detail": "Only active assignments can be closed."})

        serializer = CloseMemberFeePlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        closed = serializer.save(assignment=assignment)
        payload = MemberFeePlanSerializer(closed, context={"request": request}).data
        return Response(payload, status=status.HTTP_200_OK)


class InvoiceViewSet(BillingScopedViewSet):
    queryset = Invoice.objects.select_related("hostel", "member", "created_by").prefetch_related("charges").all()
    serializer_class = InvoiceSerializer
    filterset_fields = ("status", "hostel", "member", "billing_month")
    search_fields = ("member__member_code", "member__full_name")
    ordering_fields = ("id", "billing_month", "issue_date", "due_date", "balance_amount")
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    permission_map = {
        "list": PermissionCode.VIEW_BILLING,
        "retrieve": PermissionCode.VIEW_BILLING,
        "create": PermissionCode.MANAGE_BILLING,
        "update": PermissionCode.MANAGE_BILLING,
        "partial_update": PermissionCode.MANAGE_BILLING,
        "destroy": PermissionCode.MANAGE_BILLING,
        "generate_monthly": PermissionCode.MANAGE_BILLING,
        "add_charge": PermissionCode.MANAGE_BILLING,
        "apply_credit": PermissionCode.MANAGE_BILLING,
    }

    def get_queryset(self):
        return self.scoped_queryset(super().get_queryset())

    def update(self, request, *args, **kwargs):
        raise serializers.ValidationError({"detail": "Direct updates are disabled. Use controlled invoice actions."})

    def partial_update(self, request, *args, **kwargs):
        raise serializers.ValidationError({"detail": "Direct updates are disabled. Use controlled invoice actions."})

    def destroy(self, request, *args, **kwargs):
        raise serializers.ValidationError({"detail": "Invoices are immutable and cannot be deleted."})

    @action(detail=False, methods=["post"], url_path="generate-monthly")
    def generate_monthly(self, request):
        serializer = GenerateMonthlyInvoicesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if user.is_superuser:
            hostel_id = request.data.get("hostel")
            if not hostel_id:
                raise serializers.ValidationError({"hostel": "Hostel is required for superuser invoice generation."})
            try:
                hostel_id = int(hostel_id)
            except (TypeError, ValueError) as exc:
                raise serializers.ValidationError({"hostel": "Hostel must be a valid integer id."}) from exc
        else:
            if not user.hostel_id:
                raise serializers.ValidationError({"hostel": "Your account is not linked to a hostel."})
            hostel_id = user.hostel_id

        result = serializer.save(hostel_id=hostel_id, actor=request.user)
        return Response(
            {
                "billing_month": serializer.validated_data["billing_month"].replace(day=1).isoformat(),
                "created_count": result.created_count,
                "skipped_count": result.skipped_count,
                "invoice_ids": result.invoice_ids,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="add-charge")
    def add_charge(self, request, pk=None):
        invoice = self.get_object()
        serializer = AddInvoiceChargeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(invoice=invoice, actor=request.user)
        invoice.refresh_from_db()
        payload = InvoiceSerializer(invoice, context={"request": request}).data
        return Response(payload, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="apply-credit")
    def apply_credit(self, request, pk=None):
        invoice = self.get_object()
        applied = apply_member_credit_to_invoice(invoice=invoice, actor=request.user)
        invoice.refresh_from_db()
        payload = InvoiceSerializer(invoice, context={"request": request}).data
        payload["applied_credit"] = applied
        return Response(payload, status=status.HTTP_200_OK)


class PaymentViewSet(BillingScopedViewSet):
    queryset = Payment.objects.select_related("hostel", "member", "created_by").prefetch_related("allocations").all()
    serializer_class = PaymentSerializer
    filterset_fields = ("hostel", "member", "method", "payment_date")
    search_fields = ("member__member_code", "member__full_name", "receipt_number", "reference_no")
    ordering_fields = ("id", "payment_date", "amount", "created_at")
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    permission_map = {
        "list": PermissionCode.VIEW_BILLING,
        "retrieve": PermissionCode.VIEW_BILLING,
        "create": PermissionCode.MANAGE_BILLING,
        "update": PermissionCode.MANAGE_BILLING,
        "partial_update": PermissionCode.MANAGE_BILLING,
        "destroy": PermissionCode.MANAGE_BILLING,
    }

    def get_queryset(self):
        return self.scoped_queryset(super().get_queryset())

    def get_serializer_class(self):
        if self.action == "create":
            return PaymentCreateSerializer
        return super().get_serializer_class()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        payload = PaymentSerializer(payment, context={"request": request}).data
        return Response(payload, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        raise serializers.ValidationError({"detail": "Payments are immutable and cannot be edited directly."})

    def partial_update(self, request, *args, **kwargs):
        raise serializers.ValidationError({"detail": "Payments are immutable and cannot be edited directly."})

    def destroy(self, request, *args, **kwargs):
        raise serializers.ValidationError({"detail": "Payments are immutable and cannot be deleted."})


class MemberCreditViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MemberCredit.objects.select_related("hostel", "member").all()
    serializer_class = MemberCreditSerializer
    filterset_fields = ("hostel", "member")
    search_fields = ("member__member_code", "member__full_name")
    ordering_fields = ("id", "balance", "updated_at")
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_permission = PermissionCode.VIEW_BILLING

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return queryset
        if user.hostel_id:
            return queryset.filter(hostel_id=user.hostel_id)
        return queryset.none()


class BillingStatusViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_permission = PermissionCode.VIEW_BILLING

    def list(self, request):
        member_qs = self._scoped_members(request.user)
        invoice_qs = self._scoped_invoices(request.user)
        payment_qs = self._scoped_payments(request.user)
        credit_qs = self._scoped_credits(request.user)

        month_start = timezone.localdate().replace(day=1)

        outstanding = (
            invoice_qs.filter(status__in=[InvoiceStatus.OPEN, InvoiceStatus.PARTIALLY_PAID])
            .aggregate(total=Sum("balance_amount"))
            .get("total")
            or 0
        )
        collected_this_month = payment_qs.filter(payment_date__gte=month_start).aggregate(total=Sum("amount")).get("total") or 0
        total_credit_balance = credit_qs.aggregate(total=Sum("balance")).get("total") or 0
        active_members = member_qs.filter(status=MemberStatus.ACTIVE).count()

        return Response(
            {
                "module": "billing",
                "phase": 6,
                "status": "financial_operations_live",
                "snapshot_date": timezone.localdate().isoformat(),
                "summary": {
                    "active_billable_members": active_members,
                    "open_invoices": invoice_qs.filter(status=InvoiceStatus.OPEN).count(),
                    "partially_paid_invoices": invoice_qs.filter(status=InvoiceStatus.PARTIALLY_PAID).count(),
                    "paid_invoices": invoice_qs.filter(status=InvoiceStatus.PAID).count(),
                    "total_outstanding": outstanding,
                    "collections_this_month": collected_this_month,
                    "member_credit_balance": total_credit_balance,
                },
                "recent_payments": list(
                    payment_qs.order_by("-payment_date", "-id").values(
                        "id",
                        "member_id",
                        "amount",
                        "applied_amount",
                        "credit_added",
                        "payment_date",
                        "receipt_number",
                    )[:5]
                ),
            }
        )

    def _scoped_members(self, user):
        queryset = Member.objects.filter(is_deleted=False)
        if user.is_superuser:
            return queryset
        if user.hostel_id:
            return queryset.filter(hostel_id=user.hostel_id)
        return queryset.none()

    def _scoped_invoices(self, user):
        queryset = Invoice.objects.all()
        if user.is_superuser:
            return queryset
        if user.hostel_id:
            return queryset.filter(hostel_id=user.hostel_id)
        return queryset.none()

    def _scoped_payments(self, user):
        queryset = Payment.objects.all()
        if user.is_superuser:
            return queryset
        if user.hostel_id:
            return queryset.filter(hostel_id=user.hostel_id)
        return queryset.none()

    def _scoped_credits(self, user):
        queryset = MemberCredit.objects.all()
        if user.is_superuser:
            return queryset
        if user.hostel_id:
            return queryset.filter(hostel_id=user.hostel_id)
        return queryset.none()
