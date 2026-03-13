from datetime import date, timedelta
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers

from accounts.models import User
from members.models import Member

from .models import (
    Announcement,
    AnnouncementAudience,
    AnnouncementMemberTarget,
    AnnouncementStatus,
    Notification,
    NotificationStatus,
    NotificationType,
)
from .services import _clean_member_targets_for_announcement, generate_fee_due_reminders, publish_announcement


class AnnouncementSerializer(serializers.ModelSerializer):
    selected_member_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        write_only=True,
        allow_empty=False,
    )
    selected_members = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = (
            "id",
            "hostel",
            "title",
            "body",
            "priority",
            "audience_type",
            "status",
            "publish_at",
            "published_at",
            "expires_at",
            "created_by",
            "created_at",
            "updated_at",
            "selected_member_ids",
            "selected_members",
        )
        read_only_fields = ("id", "hostel", "status", "published_at", "created_by", "created_at", "updated_at", "selected_members")

    def get_selected_members(self, obj):
        return list(obj.member_targets.values_list("member_id", flat=True))

    def validate_selected_member_ids(self, value: list[int]):
        return list(dict.fromkeys(value))

    def validate(self, attrs):
        audience = attrs.get("audience_type", getattr(self.instance, "audience_type", None))
        selected_member_ids = attrs.get("selected_member_ids", serializers.empty)
        request = self.context.get("request")
        hostel_id = self.context.get("resolved_hostel_id")

        if audience == AnnouncementAudience.SELECTED_MEMBERS and selected_member_ids is serializers.empty:
            has_existing_targets = bool(self.instance and self.instance.member_targets.exists())
            if not has_existing_targets:
                raise serializers.ValidationError(
                    {"selected_member_ids": "Selected members are required for selected_members audience."}
                )
        if audience != AnnouncementAudience.SELECTED_MEMBERS and selected_member_ids is not serializers.empty:
            raise serializers.ValidationError(
                {"selected_member_ids": "selected_member_ids can only be used with selected_members audience."}
            )

        if selected_member_ids is not serializers.empty:
            member_qs = Member.objects.filter(id__in=selected_member_ids, is_deleted=False)
            if hostel_id is not None:
                member_qs = member_qs.filter(hostel_id=hostel_id)
            found_ids = set(member_qs.values_list("id", flat=True))
            missing_ids = [member_id for member_id in selected_member_ids if member_id not in found_ids]
            if missing_ids:
                raise serializers.ValidationError(
                    {"selected_member_ids": f"Invalid or cross-hostel members found: {missing_ids}"}
                )

        if request and not request.user.is_superuser and hostel_id is None:
            raise serializers.ValidationError("Your account is not linked to a hostel.")
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        selected_member_ids = validated_data.pop("selected_member_ids", [])
        request = self.context["request"]
        announcement = Announcement.objects.create(created_by=request.user, **validated_data)
        if selected_member_ids:
            _clean_member_targets_for_announcement(announcement, selected_member_ids)
        return announcement

    @transaction.atomic
    def update(self, instance, validated_data):
        selected_member_ids = validated_data.pop("selected_member_ids", None)
        for field in ("title", "body", "priority", "audience_type", "publish_at", "expires_at"):
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.save(update_fields=["title", "body", "priority", "audience_type", "publish_at", "expires_at", "updated_at"])

        if selected_member_ids is not None:
            _clean_member_targets_for_announcement(instance, selected_member_ids)
        elif instance.audience_type != AnnouncementAudience.SELECTED_MEMBERS:
            AnnouncementMemberTarget.objects.filter(announcement=instance).delete()
        return instance


class NotificationSerializer(serializers.ModelSerializer):
    member_code = serializers.CharField(source="member.member_code", read_only=True)
    member_name = serializers.CharField(source="member.full_name", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Notification
        fields = (
            "id",
            "hostel",
            "member",
            "member_code",
            "member_name",
            "user",
            "username",
            "announcement",
            "notification_type",
            "title",
            "message",
            "priority",
            "status",
            "dedupe_key",
            "context",
            "scheduled_for",
            "delivered_at",
            "read_at",
            "created_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "hostel",
            "status",
            "dedupe_key",
            "delivered_at",
            "read_at",
            "created_by",
            "created_at",
            "updated_at",
            "member_code",
            "member_name",
            "username",
        )

    def validate(self, attrs):
        request = self.context.get("request")
        hostel_id = self.context.get("resolved_hostel_id")
        member = attrs.get("member")
        user = attrs.get("user")
        announcement = attrs.get("announcement")

        if member is None and user is None and announcement is None:
            raise serializers.ValidationError("At least one target (member, user, or announcement) is required.")

        if member is not None:
            if member.is_deleted:
                raise serializers.ValidationError({"member": "Archived members cannot receive notifications."})
            if hostel_id is not None and member.hostel_id != hostel_id:
                raise serializers.ValidationError({"member": "Cross-hostel member is not allowed."})

        if user is not None:
            if hostel_id is not None and user.hostel_id != hostel_id:
                raise serializers.ValidationError({"user": "Cross-hostel user is not allowed."})

        if announcement is not None:
            if hostel_id is not None and announcement.hostel_id != hostel_id:
                raise serializers.ValidationError({"announcement": "Cross-hostel announcement is not allowed."})

        if request and not request.user.is_superuser and hostel_id is None:
            raise serializers.ValidationError("Your account is not linked to a hostel.")

        attrs["notification_type"] = attrs.get("notification_type", NotificationType.GENERAL)
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        return Notification.objects.create(
            status=NotificationStatus.UNREAD,
            created_by=request.user,
            **validated_data,
        )


class PublishAnnouncementSerializer(serializers.Serializer):
    pass

    def save(self, *, announcement: Announcement, actor: User):
        try:
            return publish_announcement(announcement=announcement, actor=actor)
        except ValueError as exc:
            raise serializers.ValidationError({"detail": str(exc)}) from exc


class ArchiveAnnouncementSerializer(serializers.Serializer):
    pass

    def save(self, *, announcement: Announcement):
        if announcement.status == AnnouncementStatus.ARCHIVED:
            return announcement
        announcement.status = AnnouncementStatus.ARCHIVED
        announcement.save(update_fields=["status", "updated_at"])
        return announcement


class NotificationStatusActionSerializer(serializers.Serializer):
    target_status = serializers.ChoiceField(choices=[NotificationStatus.READ, NotificationStatus.DISMISSED])

    def save(self, *, notification: Notification):
        status_value = self.validated_data["target_status"]
        notification.status = status_value
        notification.read_at = timezone.now()
        notification.save(update_fields=["status", "read_at", "updated_at"])
        return notification


class GenerateFeeReminderSerializer(serializers.Serializer):
    due_on_or_before = serializers.DateField(required=False)
    min_balance = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=Decimal("0.01"))

    def validate_min_balance(self, value):
        if value <= Decimal("0.00"):
            raise serializers.ValidationError("min_balance must be greater than zero.")
        return value

    def validate_due_on_or_before(self, value: date):
        if value > timezone.localdate() + timedelta(days=365):
            raise serializers.ValidationError("due_on_or_before is out of allowed range.")
        return value

    def save(self, *, hostel_id: int, actor=None):
        try:
            return generate_fee_due_reminders(
                hostel_id=hostel_id,
                actor=actor,
                due_on_or_before=self.validated_data.get("due_on_or_before"),
                min_balance=self.validated_data.get("min_balance", Decimal("0.01")),
            )
        except IntegrityError as exc:
            raise serializers.ValidationError({"detail": "Reminder generation conflict detected. Please retry."}) from exc
