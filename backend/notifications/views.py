from django.db.models import Count
from django.utils import timezone
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import HasRBACPermission
from accounts.rbac import PermissionCode
from hostels.models import Hostel

from .models import (
    Announcement,
    AnnouncementStatus,
    Notification,
    NotificationPriority,
    NotificationStatus,
    NotificationType,
)
from .serializers import (
    AnnouncementSerializer,
    ArchiveAnnouncementSerializer,
    GenerateFeeReminderSerializer,
    NotificationSerializer,
    NotificationStatusActionSerializer,
    PublishAnnouncementSerializer,
)


class NotificationsScopedViewSet(viewsets.ModelViewSet):
    def _parse_hostel_id(self, raw_value, *, field_name: str = "hostel") -> int | None:
        if raw_value in (None, ""):
            return None
        try:
            return int(raw_value)
        except (TypeError, ValueError) as exc:
            raise serializers.ValidationError({field_name: f"{field_name} must be a valid integer id."}) from exc

    def scoped_queryset(self, queryset, *, hostel_field: str = "hostel_id"):
        user = self.request.user
        if user.is_superuser:
            requested_hostel_id = self._parse_hostel_id(self.request.query_params.get("hostel"), field_name="hostel")
            if requested_hostel_id is not None:
                return queryset.filter(**{hostel_field: requested_hostel_id})
            return queryset
        if user.hostel_id:
            return queryset.filter(**{hostel_field: user.hostel_id})
        return queryset.none()

    def resolved_hostel_id(self) -> int:
        user = self.request.user
        if user.is_superuser:
            resolved = self._parse_hostel_id(self.request.data.get("hostel") or self.request.query_params.get("hostel"))
            if resolved is None:
                raise serializers.ValidationError({"hostel": "Hostel is required for superuser requests."})
            return resolved
        if not user.hostel_id:
            raise serializers.ValidationError({"hostel": "Your account is not linked to a hostel."})
        return user.hostel_id

    def get_serializer_context(self):
        context = super().get_serializer_context()
        user = self.request.user
        if user.is_superuser:
            raw = self.request.data.get("hostel") or self.request.query_params.get("hostel")
            context["resolved_hostel_id"] = self._parse_hostel_id(raw)
        else:
            context["resolved_hostel_id"] = user.hostel_id
        return context


class AnnouncementViewSet(NotificationsScopedViewSet):
    queryset = Announcement.objects.select_related("hostel", "created_by").prefetch_related("member_targets").all()
    serializer_class = AnnouncementSerializer
    filterset_fields = ("status", "priority", "audience_type", "hostel")
    search_fields = ("title", "body")
    ordering_fields = ("id", "status", "priority", "created_at", "published_at")
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    permission_map = {
        "list": PermissionCode.MANAGE_NOTIFICATIONS,
        "retrieve": PermissionCode.MANAGE_NOTIFICATIONS,
        "create": PermissionCode.MANAGE_NOTIFICATIONS,
        "update": PermissionCode.MANAGE_NOTIFICATIONS,
        "partial_update": PermissionCode.MANAGE_NOTIFICATIONS,
        "destroy": PermissionCode.MANAGE_NOTIFICATIONS,
        "publish": PermissionCode.MANAGE_NOTIFICATIONS,
        "archive": PermissionCode.MANAGE_NOTIFICATIONS,
    }

    def get_queryset(self):
        return self.scoped_queryset(super().get_queryset())

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_superuser:
            hostel_id = self.resolved_hostel_id()
            try:
                hostel = Hostel.objects.get(id=hostel_id)
            except Hostel.DoesNotExist as exc:
                raise serializers.ValidationError({"hostel": "Hostel does not exist."}) from exc
            serializer.save(hostel=hostel, created_by=user)
            return
        serializer.save(hostel=user.hostel, created_by=user)

    def perform_update(self, serializer):
        announcement = self.get_object()
        if announcement.status == AnnouncementStatus.PUBLISHED:
            raise serializers.ValidationError({"detail": "Published announcements cannot be edited. Archive and create a new one."})
        user = self.request.user
        if user.is_superuser:
            serializer.save()
            return
        serializer.save(hostel=user.hostel)

    def perform_destroy(self, instance):
        if instance.status != AnnouncementStatus.DRAFT:
            raise serializers.ValidationError({"detail": "Only draft announcements can be deleted."})
        super().perform_destroy(instance)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        announcement = self.get_object()
        serializer = PublishAnnouncementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save(announcement=announcement, actor=request.user)
        announcement.refresh_from_db()
        payload = AnnouncementSerializer(announcement, context=self.get_serializer_context()).data
        payload["member_notifications"] = result.member_notifications
        payload["user_notifications"] = result.user_notifications
        payload["total_notifications"] = result.total_notifications
        return Response(payload, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        announcement = self.get_object()
        serializer = ArchiveAnnouncementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        archived = serializer.save(announcement=announcement)
        payload = AnnouncementSerializer(archived, context=self.get_serializer_context()).data
        return Response(payload, status=status.HTTP_200_OK)


class NotificationViewSet(NotificationsScopedViewSet):
    queryset = Notification.objects.select_related("hostel", "member", "user", "announcement", "created_by").all()
    serializer_class = NotificationSerializer
    filterset_fields = ("status", "priority", "notification_type", "hostel", "member", "user", "announcement")
    search_fields = ("title", "message", "member__member_code", "member__full_name", "user__username")
    ordering_fields = ("id", "status", "priority", "created_at", "read_at")
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    permission_map = {
        "list": PermissionCode.MANAGE_NOTIFICATIONS,
        "retrieve": PermissionCode.MANAGE_NOTIFICATIONS,
        "create": PermissionCode.MANAGE_NOTIFICATIONS,
        "update": PermissionCode.MANAGE_NOTIFICATIONS,
        "partial_update": PermissionCode.MANAGE_NOTIFICATIONS,
        "destroy": PermissionCode.MANAGE_NOTIFICATIONS,
        "mark_read": PermissionCode.MANAGE_NOTIFICATIONS,
        "dismiss": PermissionCode.MANAGE_NOTIFICATIONS,
        "generate_fee_reminders": PermissionCode.MANAGE_NOTIFICATIONS,
    }

    def get_queryset(self):
        return self.scoped_queryset(super().get_queryset())

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_superuser:
            hostel_id = self.resolved_hostel_id()
            try:
                hostel = Hostel.objects.get(id=hostel_id)
            except Hostel.DoesNotExist as exc:
                raise serializers.ValidationError({"hostel": "Hostel does not exist."}) from exc
            serializer.save(hostel=hostel, created_by=user, delivered_at=timezone.now())
            return
        serializer.save(hostel=user.hostel, created_by=user, delivered_at=timezone.now())

    def update(self, request, *args, **kwargs):
        raise serializers.ValidationError({"detail": "Direct updates are disabled. Use mark_read or dismiss actions."})

    def partial_update(self, request, *args, **kwargs):
        raise serializers.ValidationError({"detail": "Direct updates are disabled. Use mark_read or dismiss actions."})

    def destroy(self, request, *args, **kwargs):
        raise serializers.ValidationError({"detail": "Notifications are immutable and cannot be deleted."})

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        serializer = NotificationStatusActionSerializer(data={"target_status": NotificationStatus.READ})
        serializer.is_valid(raise_exception=True)
        updated = serializer.save(notification=notification)
        payload = NotificationSerializer(updated, context=self.get_serializer_context()).data
        return Response(payload, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def dismiss(self, request, pk=None):
        notification = self.get_object()
        serializer = NotificationStatusActionSerializer(data={"target_status": NotificationStatus.DISMISSED})
        serializer.is_valid(raise_exception=True)
        updated = serializer.save(notification=notification)
        payload = NotificationSerializer(updated, context=self.get_serializer_context()).data
        return Response(payload, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="generate-fee-reminders")
    def generate_fee_reminders(self, request):
        serializer = GenerateFeeReminderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save(hostel_id=self.resolved_hostel_id(), actor=request.user)
        return Response(
            {
                "created_count": result.created_count,
                "skipped_count": result.skipped_count,
                "notification_ids": result.notification_ids,
            },
            status=status.HTTP_200_OK,
        )


class NotificationsStatusViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_permission = PermissionCode.MANAGE_NOTIFICATIONS

    def list(self, request):
        hostel_id = self._resolve_hostel_scope(request)
        announcement_qs = self._scoped_announcements(request.user, hostel_id=hostel_id)
        notification_qs = self._scoped_notifications(request.user, hostel_id=hostel_id)
        today = timezone.localdate()

        summary = {
            "draft_announcements": announcement_qs.filter(status=AnnouncementStatus.DRAFT).count(),
            "published_announcements": announcement_qs.filter(status=AnnouncementStatus.PUBLISHED).count(),
            "archived_announcements": announcement_qs.filter(status=AnnouncementStatus.ARCHIVED).count(),
            "notifications_unread": notification_qs.filter(status=NotificationStatus.UNREAD).count(),
            "high_priority_unread": notification_qs.filter(
                status=NotificationStatus.UNREAD,
                priority__in=[NotificationPriority.HIGH, NotificationPriority.URGENT],
            ).count(),
            "fee_reminders_today": notification_qs.filter(
                notification_type=NotificationType.FEE_REMINDER,
                created_at__date=today,
            ).count(),
        }

        per_priority = list(
            notification_qs.values("priority").annotate(total=Count("id")).order_by("priority")
        )
        latest = list(
            notification_qs.order_by("-created_at").values(
                "id",
                "title",
                "priority",
                "status",
                "notification_type",
                "member_id",
                "user_id",
                "created_at",
            )[:5]
        )

        return Response(
            {
                "module": "notifications",
                "phase": 8,
                "status": "communication_operations_live",
                "snapshot_date": today.isoformat(),
                "scope": {
                    "hostel_id": hostel_id,
                    "is_global": request.user.is_superuser and hostel_id is None,
                },
                "summary": summary,
                "breakdown_by_priority": per_priority,
                "latest_notifications": latest,
            }
        )

    def _resolve_hostel_scope(self, request) -> int | None:
        user = request.user
        if user.is_superuser:
            raw = request.query_params.get("hostel") or request.query_params.get("hostel_id")
            if raw in (None, ""):
                return None
            try:
                return int(raw)
            except (TypeError, ValueError) as exc:
                raise serializers.ValidationError({"hostel": "hostel must be a valid integer id."}) from exc
        if user.hostel_id:
            return user.hostel_id
        return None

    def _scoped_announcements(self, user, *, hostel_id: int | None):
        queryset = Announcement.objects.all()
        if hostel_id is None and user.is_superuser:
            return queryset
        if hostel_id is not None:
            return queryset.filter(hostel_id=hostel_id)
        return queryset.none()

    def _scoped_notifications(self, user, *, hostel_id: int | None):
        queryset = Notification.objects.all()
        if hostel_id is None and user.is_superuser:
            return queryset
        if hostel_id is not None:
            return queryset.filter(hostel_id=hostel_id)
        return queryset.none()
