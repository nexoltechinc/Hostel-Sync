from __future__ import annotations

from datetime import datetime

from django.utils import timezone
from rest_framework import permissions, serializers, viewsets
from rest_framework.response import Response

from accounts.permissions import HasRBACPermission
from accounts.rbac import PermissionCode
from attendance.models import AttendanceRecord, AttendanceStatus
from allotments.models import AllotmentStatus, RoomAllotment
from members.models import Member, MemberStatus
from notifications.models import Notification, NotificationStatus
from rooms.models import Bed, Room


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


class ReportsStatusViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_permission = PermissionCode.VIEW_REPORTS

    def list(self, request):
        member_qs = Member.objects.filter(is_deleted=False)
        allotment_qs = RoomAllotment.objects.all()
        attendance_qs = AttendanceRecord.objects.all()
        notification_qs = Notification.objects.all()
        user = request.user

        if not user.is_superuser:
            if user.hostel_id:
                member_qs = member_qs.filter(hostel_id=user.hostel_id)
                allotment_qs = allotment_qs.filter(hostel_id=user.hostel_id)
                attendance_qs = attendance_qs.filter(hostel_id=user.hostel_id)
                notification_qs = notification_qs.filter(hostel_id=user.hostel_id)
            else:
                member_qs = member_qs.none()
                allotment_qs = allotment_qs.none()
                attendance_qs = attendance_qs.none()
                notification_qs = notification_qs.none()

        status_breakdown = {
            "active": member_qs.filter(status=MemberStatus.ACTIVE).count(),
            "inactive": member_qs.filter(status=MemberStatus.INACTIVE).count(),
            "checked_out": member_qs.filter(status=MemberStatus.CHECKED_OUT).count(),
        }
        active_allotments = allotment_qs.filter(status=AllotmentStatus.ACTIVE).count()
        today = timezone.localdate()
        attendance_today = attendance_qs.filter(attendance_date=today).count()
        unread_notifications = notification_qs.filter(status=NotificationStatus.UNREAD).count()

        return Response(
            {
                "module": "reports",
                "phase": 8,
                "status": "notifications_integrated",
                "summary": {
                    "total_members": member_qs.count(),
                    "status_breakdown": status_breakdown,
                    "active_allotments": active_allotments,
                    "attendance_records_today": attendance_today,
                    "unread_notifications": unread_notifications,
                },
            }
        )


class DashboardSummaryViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_permission = PermissionCode.VIEW_DASHBOARD

    def list(self, request):
        user = request.user
        hostel_id = self._resolve_hostel_scope(request)
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
                        "status": "member_integrated_baseline",
                    },
                    "attendance": {
                        "present_today": None,
                        "absent_today": None,
                        "status": "connected",
                    },
                    "notifications": {
                        "unread": None,
                        "status": "connected",
                    },
                    "integrations": {
                        "members": "connected",
                        "rooms": "connected",
                        "allotments": "connected",
                        "billing": "member_integrated",
                        "attendance": "connected",
                        "notifications": "connected",
                        "reports": "member_integrated",
                    },
                    "recent_activities": [],
                }
            )

        member_qs = Member.objects.filter(is_deleted=False)
        room_qs = Room.objects.all()
        bed_qs = Bed.objects.filter(is_active=True, room__is_active=True)
        allotment_qs = RoomAllotment.objects.select_related("member", "bed__room")
        attendance_qs = AttendanceRecord.objects.all()
        notification_qs = Notification.objects.all()

        if hostel_id is not None:
            member_qs = member_qs.filter(hostel_id=hostel_id)
            room_qs = room_qs.filter(hostel_id=hostel_id)
            bed_qs = bed_qs.filter(room__hostel_id=hostel_id)
            allotment_qs = allotment_qs.filter(hostel_id=hostel_id)
            attendance_qs = attendance_qs.filter(hostel_id=hostel_id)
            notification_qs = notification_qs.filter(hostel_id=hostel_id)

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
        today_attendance = attendance_qs.filter(attendance_date=today)
        present_today = today_attendance.filter(status=AttendanceStatus.PRESENT).count()
        absent_today = today_attendance.filter(status=AttendanceStatus.ABSENT).count()
        unread_notifications = notification_qs.filter(status=NotificationStatus.UNREAD).count()
        available_beds = max(total_beds - occupied_beds, 0)
        occupancy_rate = round((occupied_beds / total_beds) * 100, 1) if total_beds else 0.0

        recent_activities = self._build_recent_activities(member_qs=member_qs, allotment_qs=allotment_qs)

        return Response(
            {
                "scope": {
                    "hostel_id": hostel_id,
                    "is_global": user.is_superuser and hostel_id is None,
                },
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
                    "pending_dues": None,
                    "monthly_collection": None,
                    "status": "member_integrated_baseline",
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
                    "billing": "member_integrated",
                    "attendance": "connected",
                    "notifications": "connected",
                    "reports": "member_integrated",
                },
                "recent_activities": recent_activities,
            }
        )

    def _resolve_hostel_scope(self, request) -> int | None:
        user = request.user
        if user.is_superuser:
            hostel_param = request.query_params.get("hostel_id")
            if not hostel_param:
                return None
            try:
                return int(hostel_param)
            except ValueError as error:
                raise serializers.ValidationError({"hostel_id": "hostel_id must be an integer."}) from error

        if user.hostel_id:
            return user.hostel_id
        return None

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
            "status",
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
