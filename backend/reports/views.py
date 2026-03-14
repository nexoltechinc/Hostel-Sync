from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.response import Response

from accounts.permissions import HasRBACPermission
from accounts.rbac import PermissionCode
from attendance.models import AttendanceRecord, AttendanceStatus
from allotments.models import AllotmentStatus, RoomAllotment
from billing.models import Invoice, InvoiceStatus, Payment, PaymentMethod
from members.models import Member, MemberStatus
from notifications.models import Notification, NotificationStatus
from rooms.models import Bed, Room

from .serializers import (
    AttendanceReportQuerySerializer,
    FeeCollectionReportQuerySerializer,
    OccupancyReportQuerySerializer,
    PendingDuesReportQuerySerializer,
    ReportScopeQuerySerializer,
)

ZERO = Decimal("0.00")


def _activity_payload(
    *,
    timestamp: datetime,
    activity_type: str,
    title: str,
    description: str,
    reference_id: int,
):
    return {
        "type": activity_type,
        "title": title,
        "description": description,
        "timestamp": timestamp.isoformat(),
        "reference_id": reference_id,
    }


def _decimal_to_float(value: Decimal | int | float | None) -> float:
    if value is None:
        return 0.0
    return float(value)


def _month_start(value: date) -> date:
    return value.replace(day=1)


def _resolve_period(date_from: date | None, date_to: date | None) -> tuple[date, date]:
    today = timezone.localdate()
    if date_from and date_to:
        return date_from, date_to
    if date_from:
        return date_from, today
    if date_to:
        return _month_start(date_to), date_to
    return _month_start(today), today


class ScopedReportMixin:
    def _resolve_hostel_scope(self, request, requested_hostel_id: int | None = None) -> int | None:
        user = request.user
        if user.is_superuser:
            return requested_hostel_id
        if user.hostel_id:
            return user.hostel_id
        return None

    def _scope_queryset(self, queryset, *, hostel_id: int | None, hostel_field: str = "hostel_id"):
        if hostel_id is None:
            if self.request.user.is_superuser:
                return queryset
            return queryset.none()
        return queryset.filter(**{hostel_field: hostel_id})

    def _scope_payload(self, hostel_id: int | None):
        return {
            "hostel_id": hostel_id,
            "is_global": self.request.user.is_superuser and hostel_id is None,
        }


class ReportsStatusViewSet(ScopedReportMixin, viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_permission = PermissionCode.VIEW_REPORTS

    def list(self, request):
        query_serializer = ReportScopeQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        hostel_id = self._resolve_hostel_scope(request, query_serializer.validated_data.get("resolved_hostel"))

        member_qs = self._scope_queryset(Member.objects.filter(is_deleted=False), hostel_id=hostel_id)
        allotment_qs = self._scope_queryset(RoomAllotment.objects.all(), hostel_id=hostel_id)
        attendance_qs = self._scope_queryset(AttendanceRecord.objects.all(), hostel_id=hostel_id)
        notification_qs = self._scope_queryset(Notification.objects.all(), hostel_id=hostel_id)
        invoice_qs = self._scope_queryset(Invoice.objects.all(), hostel_id=hostel_id)
        bed_qs = self._scope_queryset(
            Bed.objects.filter(is_active=True, room__is_active=True),
            hostel_id=hostel_id,
            hostel_field="room__hostel_id",
        )

        today = timezone.localdate()
        occupied_beds = (
            allotment_qs.filter(status=AllotmentStatus.ACTIVE, bed__is_active=True, bed__room__is_active=True)
            .values("bed_id")
            .distinct()
            .count()
        )
        total_beds = bed_qs.count()
        outstanding = (
            invoice_qs.filter(status__in=[InvoiceStatus.OPEN, InvoiceStatus.PARTIALLY_PAID])
            .aggregate(total=Sum("balance_amount"))
            .get("total")
            or ZERO
        )

        return Response(
            {
                "module": "reports",
                "phase": 9,
                "status": "reporting_operations_live",
                "snapshot_date": today.isoformat(),
                "scope": self._scope_payload(hostel_id),
                "summary": {
                    "total_members": member_qs.count(),
                    "active_members": member_qs.filter(status=MemberStatus.ACTIVE).count(),
                    "active_allotments": allotment_qs.filter(status=AllotmentStatus.ACTIVE).count(),
                    "occupancy_rate": round((occupied_beds / total_beds) * 100, 1) if total_beds else 0.0,
                    "attendance_records_today": attendance_qs.filter(attendance_date=today).count(),
                    "unread_notifications": notification_qs.filter(status=NotificationStatus.UNREAD).count(),
                    "pending_dues": _decimal_to_float(outstanding),
                },
                "available_reports": [
                    "dashboard-summary",
                    "occupancy",
                    "fee-collection",
                    "pending-dues",
                    "attendance",
                ],
            }
        )


class DashboardSummaryViewSet(ScopedReportMixin, viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_permission = PermissionCode.VIEW_DASHBOARD

    def list(self, request):
        query_serializer = ReportScopeQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        hostel_id = self._resolve_hostel_scope(request, query_serializer.validated_data.get("resolved_hostel"))
        user = request.user

        if not user.is_superuser and hostel_id is None:
            return Response(
                {
                    "scope": {"hostel_id": None, "is_global": False},
                    "summary": {
                        "total_members": 0,
                        "active_members": 0,
                        "total_rooms": 0,
                        "active_rooms": 0,
                        "total_beds": 0,
                        "occupied_beds": 0,
                        "available_beds": 0,
                        "occupancy_rate": 0.0,
                    },
                    "financial": {
                        "pending_dues": None,
                        "monthly_collection": None,
                        "status": "unavailable",
                    },
                    "attendance": {
                        "present_today": None,
                        "absent_today": None,
                        "status": "unavailable",
                    },
                    "notifications": {
                        "unread": None,
                        "status": "unavailable",
                    },
                    "integrations": {
                        "members": "connected",
                        "rooms": "connected",
                        "allotments": "connected",
                        "billing": "connected",
                        "attendance": "connected",
                        "notifications": "connected",
                        "reports": "connected",
                    },
                    "recent_activities": [],
                }
            )

        member_qs = self._scope_queryset(Member.objects.filter(is_deleted=False), hostel_id=hostel_id)
        room_qs = self._scope_queryset(Room.objects.all(), hostel_id=hostel_id)
        bed_qs = self._scope_queryset(
            Bed.objects.filter(is_active=True, room__is_active=True),
            hostel_id=hostel_id,
            hostel_field="room__hostel_id",
        )
        allotment_qs = self._scope_queryset(
            RoomAllotment.objects.select_related("member", "bed__room"),
            hostel_id=hostel_id,
        )
        attendance_qs = self._scope_queryset(AttendanceRecord.objects.all(), hostel_id=hostel_id)
        notification_qs = self._scope_queryset(Notification.objects.all(), hostel_id=hostel_id)
        invoice_qs = self._scope_queryset(Invoice.objects.all(), hostel_id=hostel_id)
        payment_qs = self._scope_queryset(Payment.objects.all(), hostel_id=hostel_id)

        active_members = member_qs.filter(status=MemberStatus.ACTIVE).count()
        total_members = member_qs.count()
        total_rooms = room_qs.count()
        active_rooms = room_qs.filter(is_active=True).count()
        total_beds = bed_qs.count()
        occupied_beds = (
            allotment_qs.filter(status=AllotmentStatus.ACTIVE, bed__is_active=True, bed__room__is_active=True)
            .values("bed_id")
            .distinct()
            .count()
        )
        today = timezone.localdate()
        month_start = _month_start(today)
        today_attendance = attendance_qs.filter(attendance_date=today)
        pending_dues = (
            invoice_qs.filter(status__in=[InvoiceStatus.OPEN, InvoiceStatus.PARTIALLY_PAID])
            .aggregate(total=Sum("balance_amount"))
            .get("total")
            or ZERO
        )
        monthly_collection = (
            payment_qs.filter(payment_date__gte=month_start, payment_date__lte=today)
            .aggregate(total=Sum("amount"))
            .get("total")
            or ZERO
        )
        present_today = today_attendance.filter(status=AttendanceStatus.PRESENT).count()
        absent_today = today_attendance.filter(status=AttendanceStatus.ABSENT).count()
        unread_notifications = notification_qs.filter(status=NotificationStatus.UNREAD).count()
        available_beds = max(total_beds - occupied_beds, 0)
        occupancy_rate = round((occupied_beds / total_beds) * 100, 1) if total_beds else 0.0

        recent_activities = self._build_recent_activities(member_qs=member_qs, allotment_qs=allotment_qs)

        return Response(
            {
                "scope": self._scope_payload(hostel_id),
                "summary": {
                    "total_members": total_members,
                    "active_members": active_members,
                    "total_rooms": total_rooms,
                    "active_rooms": active_rooms,
                    "total_beds": total_beds,
                    "occupied_beds": occupied_beds,
                    "available_beds": available_beds,
                    "occupancy_rate": occupancy_rate,
                },
                "financial": {
                    "pending_dues": _decimal_to_float(pending_dues),
                    "monthly_collection": _decimal_to_float(monthly_collection),
                    "status": "connected",
                },
                "attendance": {
                    "present_today": present_today,
                    "absent_today": absent_today,
                    "status": "connected",
                },
                "notifications": {
                    "unread": unread_notifications,
                    "status": "connected",
                },
                "integrations": {
                    "members": "connected",
                    "rooms": "connected",
                    "allotments": "connected",
                    "billing": "connected",
                    "attendance": "connected",
                    "notifications": "connected",
                    "reports": "connected",
                },
                "recent_activities": recent_activities,
            }
        )

    def _build_recent_activities(self, *, member_qs, allotment_qs) -> list[dict[str, object]]:
        activities: list[tuple[datetime, dict[str, object]]] = []

        for member in member_qs.only("id", "member_code", "full_name", "created_at").order_by("-created_at")[:4]:
            activities.append(
                (
                    member.created_at,
                    _activity_payload(
                        timestamp=member.created_at,
                        activity_type="member_added",
                        title=f"Member added: {member.full_name}",
                        description=f"Member code {member.member_code} was registered.",
                        reference_id=member.id,
                    ),
                )
            )

        for allotment in allotment_qs.only(
            "id",
            "created_at",
            "member__full_name",
            "bed__label",
            "bed__room__room_code",
        ).order_by("-created_at")[:4]:
            activities.append(
                (
                    allotment.created_at,
                    _activity_payload(
                        timestamp=allotment.created_at,
                        activity_type="allotment_recorded",
                        title=f"Allotment recorded for {allotment.member.full_name}",
                        description=f"Assigned to room {allotment.bed.room.room_code}, bed {allotment.bed.label}.",
                        reference_id=allotment.id,
                    ),
                )
            )

        activities.sort(key=lambda item: item[0], reverse=True)
        return [payload for _, payload in activities[:6]]


class OccupancyReportViewSet(ScopedReportMixin, viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_permission = PermissionCode.VIEW_REPORTS

    def list(self, request):
        query_serializer = OccupancyReportQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        validated = query_serializer.validated_data
        hostel_id = self._resolve_hostel_scope(request, validated.get("resolved_hostel"))

        room_qs = self._scope_queryset(Room.objects.select_related("hostel"), hostel_id=hostel_id)
        if validated.get("room_type"):
            room_qs = room_qs.filter(room_type=validated["room_type"])
        has_active_filter = request.query_params.get("is_active") is not None
        if has_active_filter:
            room_qs = room_qs.filter(is_active=validated["is_active"])

        room_qs = room_qs.annotate(
            total_beds_count=Count("beds", distinct=True),
            active_beds_count=Count("beds", filter=Q(beds__is_active=True), distinct=True),
            occupied_beds_count=Count(
                "beds",
                filter=Q(beds__is_active=True, beds__allotments__status=AllotmentStatus.ACTIVE),
                distinct=True,
            ),
        ).order_by("room_code")

        summary = {
            "total_rooms": 0,
            "active_rooms": 0,
            "total_capacity": 0,
            "total_beds": 0,
            "active_beds": 0,
            "occupied_beds": 0,
            "available_beds": 0,
            "occupancy_rate": 0.0,
        }
        room_type_breakdown: dict[str, dict[str, object]] = {}
        rows: list[dict[str, object]] = []

        for room in room_qs:
            available_beds = max(room.active_beds_count - room.occupied_beds_count, 0)
            occupancy_rate = round((room.occupied_beds_count / room.active_beds_count) * 100, 1) if room.active_beds_count else 0.0

            rows.append(
                {
                    "id": room.id,
                    "hostel_id": room.hostel_id,
                    "hostel_code": room.hostel.code,
                    "room_code": room.room_code,
                    "floor": room.floor,
                    "room_type": room.room_type,
                    "is_active": room.is_active,
                    "capacity": room.capacity,
                    "monthly_rent": _decimal_to_float(room.monthly_rent) if room.monthly_rent is not None else None,
                    "total_beds": room.total_beds_count,
                    "active_beds": room.active_beds_count,
                    "occupied_beds": room.occupied_beds_count,
                    "available_beds": available_beds,
                    "occupancy_rate": occupancy_rate,
                }
            )

            summary["total_rooms"] += 1
            summary["active_rooms"] += int(room.is_active)
            summary["total_capacity"] += room.capacity
            summary["total_beds"] += room.total_beds_count
            summary["active_beds"] += room.active_beds_count
            summary["occupied_beds"] += room.occupied_beds_count
            summary["available_beds"] += available_beds

            bucket = room_type_breakdown.setdefault(
                room.room_type,
                {
                    "room_type": room.room_type,
                    "rooms": 0,
                    "active_beds": 0,
                    "occupied_beds": 0,
                    "occupancy_rate": 0.0,
                },
            )
            bucket["rooms"] += 1
            bucket["active_beds"] += room.active_beds_count
            bucket["occupied_beds"] += room.occupied_beds_count

        if summary["active_beds"]:
            summary["occupancy_rate"] = round((summary["occupied_beds"] / summary["active_beds"]) * 100, 1)

        breakdown = []
        for bucket in room_type_breakdown.values():
            active_beds = bucket["active_beds"]
            bucket["occupancy_rate"] = round((bucket["occupied_beds"] / active_beds) * 100, 1) if active_beds else 0.0
            breakdown.append(bucket)

        return Response(
            {
                "module": "reports",
                "report": "occupancy",
                "snapshot_date": timezone.localdate().isoformat(),
                "scope": self._scope_payload(hostel_id),
                "filters": {
                    "room_type": validated.get("room_type") or "all",
                    "is_active": validated["is_active"] if has_active_filter else "all",
                },
                "summary": summary,
                "room_type_breakdown": breakdown,
                "rows": rows,
            }
        )


class FeeCollectionReportViewSet(ScopedReportMixin, viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_permission = PermissionCode.VIEW_REPORTS

    def list(self, request):
        query_serializer = FeeCollectionReportQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        validated = query_serializer.validated_data
        hostel_id = self._resolve_hostel_scope(request, validated.get("resolved_hostel"))
        date_from, date_to = _resolve_period(validated.get("date_from"), validated.get("date_to"))

        payment_qs = self._scope_queryset(
            Payment.objects.select_related("hostel", "member"),
            hostel_id=hostel_id,
        ).filter(payment_date__gte=date_from, payment_date__lte=date_to)

        if validated.get("member"):
            payment_qs = payment_qs.filter(member_id=validated["member"])
        if validated.get("method"):
            payment_qs = payment_qs.filter(method=validated["method"])

        payment_qs = payment_qs.order_by("-payment_date", "-id")
        method_totals: dict[str, dict[str, object]] = {}
        rows: list[dict[str, object]] = []
        total_collected = ZERO
        total_applied = ZERO
        total_credit_added = ZERO
        member_ids: set[int] = set()

        for payment in payment_qs:
            total_collected += payment.amount
            total_applied += payment.applied_amount
            total_credit_added += payment.credit_added
            member_ids.add(payment.member_id)

            method_bucket = method_totals.setdefault(
                payment.method,
                {
                    "method": payment.method,
                    "label": dict(PaymentMethod.choices).get(payment.method, payment.method),
                    "payment_count": 0,
                    "total_collected": 0.0,
                },
            )
            method_bucket["payment_count"] += 1
            method_bucket["total_collected"] += _decimal_to_float(payment.amount)

            rows.append(
                {
                    "id": payment.id,
                    "hostel_id": payment.hostel_id,
                    "hostel_code": payment.hostel.code,
                    "member_id": payment.member_id,
                    "member_code": payment.member.member_code,
                    "member_name": payment.member.full_name,
                    "payment_date": payment.payment_date.isoformat(),
                    "method": payment.method,
                    "method_label": dict(PaymentMethod.choices).get(payment.method, payment.method),
                    "amount": _decimal_to_float(payment.amount),
                    "applied_amount": _decimal_to_float(payment.applied_amount),
                    "credit_added": _decimal_to_float(payment.credit_added),
                    "receipt_number": payment.receipt_number,
                    "reference_no": payment.reference_no,
                }
            )

        return Response(
            {
                "module": "reports",
                "report": "fee_collection",
                "snapshot_date": timezone.localdate().isoformat(),
                "scope": self._scope_payload(hostel_id),
                "filters": {
                    "date_from": date_from.isoformat(),
                    "date_to": date_to.isoformat(),
                    "member": validated.get("member"),
                    "method": validated.get("method") or "all",
                },
                "summary": {
                    "payment_count": len(rows),
                    "member_count": len(member_ids),
                    "total_collected": _decimal_to_float(total_collected),
                    "total_applied": _decimal_to_float(total_applied),
                    "total_credit_added": _decimal_to_float(total_credit_added),
                },
                "by_method": list(method_totals.values()),
                "rows": rows,
            }
        )


class PendingDuesReportViewSet(ScopedReportMixin, viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_permission = PermissionCode.VIEW_REPORTS

    def list(self, request):
        query_serializer = PendingDuesReportQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        validated = query_serializer.validated_data
        hostel_id = self._resolve_hostel_scope(request, validated.get("resolved_hostel"))
        today = timezone.localdate()

        invoice_qs = self._scope_queryset(
            Invoice.objects.select_related("hostel", "member"),
            hostel_id=hostel_id,
        ).filter(
            status__in=[InvoiceStatus.OPEN, InvoiceStatus.PARTIALLY_PAID],
            balance_amount__gte=validated.get("min_balance", Decimal("0.01")),
        )

        if validated.get("member"):
            invoice_qs = invoice_qs.filter(member_id=validated["member"])
        if validated.get("billing_month"):
            invoice_qs = invoice_qs.filter(billing_month=validated["billing_month"])
        if validated.get("due_on_or_before"):
            invoice_qs = invoice_qs.filter(due_date__isnull=False, due_date__lte=validated["due_on_or_before"])
        if validated.get("only_overdue"):
            invoice_qs = invoice_qs.filter(due_date__isnull=False, due_date__lt=today)

        invoice_qs = invoice_qs.order_by("due_date", "-balance_amount", "member__full_name")

        rows: list[dict[str, object]] = []
        outstanding_total = ZERO
        overdue_count = 0
        members_with_dues: set[int] = set()

        for invoice in invoice_qs:
            outstanding_total += invoice.balance_amount
            members_with_dues.add(invoice.member_id)

            days_overdue = None
            is_overdue = False
            if invoice.due_date and invoice.due_date < today:
                is_overdue = True
                overdue_count += 1
                days_overdue = (today - invoice.due_date).days

            rows.append(
                {
                    "id": invoice.id,
                    "hostel_id": invoice.hostel_id,
                    "hostel_code": invoice.hostel.code,
                    "member_id": invoice.member_id,
                    "member_code": invoice.member.member_code,
                    "member_name": invoice.member.full_name,
                    "billing_month": invoice.billing_month.isoformat(),
                    "issue_date": invoice.issue_date.isoformat(),
                    "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
                    "status": invoice.status,
                    "total_amount": _decimal_to_float(invoice.total_amount),
                    "paid_amount": _decimal_to_float(invoice.paid_amount),
                    "balance_amount": _decimal_to_float(invoice.balance_amount),
                    "is_overdue": is_overdue,
                    "days_overdue": days_overdue,
                }
            )

        return Response(
            {
                "module": "reports",
                "report": "pending_dues",
                "snapshot_date": today.isoformat(),
                "scope": self._scope_payload(hostel_id),
                "filters": {
                    "billing_month": validated.get("billing_month").isoformat() if validated.get("billing_month") else None,
                    "member": validated.get("member"),
                    "only_overdue": validated.get("only_overdue", False),
                    "due_on_or_before": (
                        validated.get("due_on_or_before").isoformat() if validated.get("due_on_or_before") else None
                    ),
                    "min_balance": _decimal_to_float(validated.get("min_balance", Decimal("0.01"))),
                },
                "summary": {
                    "invoice_count": len(rows),
                    "member_count": len(members_with_dues),
                    "open_invoices": sum(1 for row in rows if row["status"] == InvoiceStatus.OPEN),
                    "partially_paid_invoices": sum(1 for row in rows if row["status"] == InvoiceStatus.PARTIALLY_PAID),
                    "overdue_invoices": overdue_count,
                    "total_outstanding": _decimal_to_float(outstanding_total),
                },
                "rows": rows,
            }
        )


class AttendanceReportViewSet(ScopedReportMixin, viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_permission = PermissionCode.VIEW_REPORTS

    def list(self, request):
        query_serializer = AttendanceReportQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        validated = query_serializer.validated_data
        hostel_id = self._resolve_hostel_scope(request, validated.get("resolved_hostel"))
        date_from, date_to = _resolve_period(validated.get("date_from"), validated.get("date_to"))

        base_record_qs = self._scope_queryset(
            AttendanceRecord.objects.select_related("hostel", "member"),
            hostel_id=hostel_id,
        ).filter(attendance_date__gte=date_from, attendance_date__lte=date_to)

        if validated.get("member"):
            base_record_qs = base_record_qs.filter(member_id=validated["member"])

        report_record_qs = base_record_qs
        if validated.get("status"):
            report_record_qs = report_record_qs.filter(status=validated["status"])

        active_member_qs = self._scope_queryset(
            Member.objects.filter(is_deleted=False, status=MemberStatus.ACTIVE),
            hostel_id=hostel_id,
        )
        if validated.get("member"):
            active_member_qs = active_member_qs.filter(id=validated["member"])

        total_marked_records = base_record_qs.count()
        expected_members = active_member_qs.count()
        days_in_range = (date_to - date_from).days + 1
        expected_records = expected_members * days_in_range

        daily_rows = (
            report_record_qs.values("attendance_date")
            .annotate(
                present=Count("id", filter=Q(status=AttendanceStatus.PRESENT)),
                absent=Count("id", filter=Q(status=AttendanceStatus.ABSENT)),
                on_leave=Count("id", filter=Q(status=AttendanceStatus.ON_LEAVE)),
                excused=Count("id", filter=Q(status=AttendanceStatus.EXCUSED)),
                corrected_records=Count("id", filter=Q(corrected_at__isnull=False)),
            )
            .order_by("attendance_date")
        )

        member_rows = (
            report_record_qs.values("member_id", "member__member_code", "member__full_name")
            .annotate(
                present=Count("id", filter=Q(status=AttendanceStatus.PRESENT)),
                absent=Count("id", filter=Q(status=AttendanceStatus.ABSENT)),
                on_leave=Count("id", filter=Q(status=AttendanceStatus.ON_LEAVE)),
                excused=Count("id", filter=Q(status=AttendanceStatus.EXCUSED)),
                marked_days=Count("id"),
                corrected_records=Count("id", filter=Q(corrected_at__isnull=False)),
            )
            .order_by("member__full_name")
        )

        member_breakdown = []
        for row in member_rows:
            marked_days = row["marked_days"]
            member_breakdown.append(
                {
                    "member_id": row["member_id"],
                    "member_code": row["member__member_code"],
                    "member_name": row["member__full_name"],
                    "present": row["present"],
                    "absent": row["absent"],
                    "on_leave": row["on_leave"],
                    "excused": row["excused"],
                    "marked_days": marked_days,
                    "corrected_records": row["corrected_records"],
                    "attendance_rate": round((row["present"] / marked_days) * 100, 1) if marked_days else 0.0,
                }
            )

        return Response(
            {
                "module": "reports",
                "report": "attendance",
                "snapshot_date": timezone.localdate().isoformat(),
                "scope": self._scope_payload(hostel_id),
                "filters": {
                    "date_from": date_from.isoformat(),
                    "date_to": date_to.isoformat(),
                    "member": validated.get("member"),
                    "status": validated.get("status") or "all",
                },
                "summary": {
                    "days_in_range": days_in_range,
                    "expected_members": expected_members,
                    "expected_records": expected_records,
                    "marked_records": total_marked_records,
                    "matching_records": report_record_qs.count(),
                    "present": base_record_qs.filter(status=AttendanceStatus.PRESENT).count(),
                    "absent": base_record_qs.filter(status=AttendanceStatus.ABSENT).count(),
                    "on_leave": base_record_qs.filter(status=AttendanceStatus.ON_LEAVE).count(),
                    "excused": base_record_qs.filter(status=AttendanceStatus.EXCUSED).count(),
                    "corrected_records": base_record_qs.filter(corrected_at__isnull=False).count(),
                    "marking_rate_percent": round((total_marked_records / expected_records) * 100, 1) if expected_records else 0.0,
                },
                "daily_breakdown": [
                    {
                        "attendance_date": row["attendance_date"].isoformat(),
                        "present": row["present"],
                        "absent": row["absent"],
                        "on_leave": row["on_leave"],
                        "excused": row["excused"],
                        "corrected_records": row["corrected_records"],
                    }
                    for row in daily_rows
                ],
                "member_breakdown": member_breakdown,
            }
        )
