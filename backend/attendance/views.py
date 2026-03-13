from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import HasRBACPermission
from accounts.rbac import PermissionCode
from members.models import Member, MemberStatus

from .models import AttendanceRecord, AttendanceStatus
from .serializers import AttendanceRecordSerializer, BulkAttendanceMarkSerializer, DailySheetQuerySerializer


class AttendanceScopedViewSet(viewsets.ModelViewSet):
    def scoped_queryset(self, queryset, *, hostel_field: str = "hostel_id"):
        user = self.request.user
        if user.is_superuser:
            return queryset
        if user.hostel_id:
            return queryset.filter(**{hostel_field: user.hostel_id})
        return queryset.none()


class AttendanceRecordViewSet(AttendanceScopedViewSet):
    queryset = AttendanceRecord.objects.select_related(
        "hostel",
        "member",
        "marked_by",
        "corrected_by",
    ).all()
    serializer_class = AttendanceRecordSerializer
    filterset_fields = ("status", "hostel", "member", "attendance_date")
    search_fields = ("member__member_code", "member__full_name", "remarks")
    ordering_fields = ("id", "attendance_date", "updated_at")
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    permission_map = {
        "list": PermissionCode.VIEW_ATTENDANCE,
        "retrieve": PermissionCode.VIEW_ATTENDANCE,
        "create": PermissionCode.MANAGE_ATTENDANCE,
        "update": PermissionCode.MANAGE_ATTENDANCE,
        "partial_update": PermissionCode.MANAGE_ATTENDANCE,
        "destroy": PermissionCode.MANAGE_ATTENDANCE,
        "daily_sheet": PermissionCode.VIEW_ATTENDANCE,
        "bulk_mark": PermissionCode.MANAGE_ATTENDANCE,
    }

    def get_queryset(self):
        return self.scoped_queryset(super().get_queryset())

    def destroy(self, request, *args, **kwargs):
        raise serializers.ValidationError({"detail": "Attendance records are immutable and cannot be deleted."})

    @action(detail=False, methods=["get"], url_path="daily-sheet")
    def daily_sheet(self, request):
        query_serializer = DailySheetQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        attendance_date = query_serializer.validated_data["attendance_date"]

        member_qs = Member.objects.filter(is_deleted=False, status=MemberStatus.ACTIVE)
        if not request.user.is_superuser:
            if not request.user.hostel_id:
                member_qs = member_qs.none()
            else:
                member_qs = member_qs.filter(hostel_id=request.user.hostel_id)

        records = {
            record.member_id: record
            for record in AttendanceRecord.objects.filter(
                member_id__in=member_qs.values("id"),
                attendance_date=attendance_date,
            )
        }

        payload_rows: list[dict[str, object]] = []
        for member in member_qs.order_by("full_name").only("id", "member_code", "full_name", "hostel_id"):
            record = records.get(member.id)
            payload_rows.append(
                {
                    "member_id": member.id,
                    "member_code": member.member_code,
                    "member_name": member.full_name,
                    "attendance_record_id": record.id if record else None,
                    "status": record.status if record else None,
                    "remarks": record.remarks if record else "",
                    "is_marked": bool(record),
                    "corrected_at": record.corrected_at.isoformat() if record and record.corrected_at else None,
                }
            )

        summary = {
            "active_residents": len(payload_rows),
            "marked_residents": sum(1 for row in payload_rows if row["is_marked"]),
            "present": sum(1 for row in payload_rows if row["status"] == AttendanceStatus.PRESENT),
            "absent": sum(1 for row in payload_rows if row["status"] == AttendanceStatus.ABSENT),
            "on_leave": sum(1 for row in payload_rows if row["status"] == AttendanceStatus.ON_LEAVE),
            "excused": sum(1 for row in payload_rows if row["status"] == AttendanceStatus.EXCUSED),
        }
        summary["unmarked_residents"] = max(summary["active_residents"] - summary["marked_residents"], 0)

        return Response(
            {
                "attendance_date": attendance_date.isoformat(),
                "summary": summary,
                "rows": payload_rows,
            }
        )

    @action(detail=False, methods=["post"], url_path="bulk-mark")
    def bulk_mark(self, request):
        serializer = BulkAttendanceMarkSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        result = serializer.save(actor=request.user)
        result["attendance_date"] = result["attendance_date"].isoformat()
        return Response(result, status=status.HTTP_200_OK)


class AttendanceStatusViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_permission = PermissionCode.VIEW_ATTENDANCE

    def list(self, request):
        date_serializer = DailySheetQuerySerializer(data=request.query_params)
        date_serializer.is_valid(raise_exception=True)
        attendance_date = date_serializer.validated_data["attendance_date"]

        member_qs = self._scoped_members(request.user)
        record_qs = self._scoped_records(request.user)

        active_members = member_qs.filter(status=MemberStatus.ACTIVE).count()
        day_records = record_qs.filter(attendance_date=attendance_date, member__status=MemberStatus.ACTIVE, member__is_deleted=False)
        marked_count = day_records.values("member_id").distinct().count()

        seven_day_start = attendance_date - timedelta(days=6)
        trend_rows = (
            record_qs.filter(attendance_date__gte=seven_day_start, attendance_date__lte=attendance_date)
            .values("attendance_date")
            .annotate(
                present=Count("id", filter=Q(status=AttendanceStatus.PRESENT)),
                absent=Count("id", filter=Q(status=AttendanceStatus.ABSENT)),
                on_leave=Count("id", filter=Q(status=AttendanceStatus.ON_LEAVE)),
                excused=Count("id", filter=Q(status=AttendanceStatus.EXCUSED)),
            )
            .order_by("attendance_date")
        )

        return Response(
            {
                "module": "attendance",
                "phase": 7,
                "status": "attendance_operations_live",
                "snapshot_date": timezone.localdate().isoformat(),
                "attendance_date": attendance_date.isoformat(),
                "summary": {
                    "expected_headcount": active_members,
                    "marked_residents": marked_count,
                    "unmarked_residents": max(active_members - marked_count, 0),
                    "present": day_records.filter(status=AttendanceStatus.PRESENT).count(),
                    "absent": day_records.filter(status=AttendanceStatus.ABSENT).count(),
                    "on_leave": day_records.filter(status=AttendanceStatus.ON_LEAVE).count(),
                    "excused": day_records.filter(status=AttendanceStatus.EXCUSED).count(),
                    "corrected_records": day_records.filter(corrected_at__isnull=False).count(),
                    "marking_rate_percent": round((marked_count / active_members) * 100, 1) if active_members else 0.0,
                },
                "last_7_days": [
                    {
                        "attendance_date": row["attendance_date"].isoformat(),
                        "present": row["present"],
                        "absent": row["absent"],
                        "on_leave": row["on_leave"],
                        "excused": row["excused"],
                    }
                    for row in trend_rows
                ],
            }
        )

    def _scoped_members(self, user):
        queryset = Member.objects.filter(is_deleted=False)
        if user.is_superuser:
            return queryset
        if user.hostel_id:
            return queryset.filter(hostel_id=user.hostel_id)
        return queryset.none()

    def _scoped_records(self, user):
        queryset = AttendanceRecord.objects.all()
        if user.is_superuser:
            return queryset
        if user.hostel_id:
            return queryset.filter(hostel_id=user.hostel_id)
        return queryset.none()
