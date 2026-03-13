from django.db import models
from django.db.models import Q
from django.utils import timezone


class NotificationPriority(models.TextChoices):
    LOW = "low", "Low"
    NORMAL = "normal", "Normal"
    HIGH = "high", "High"
    URGENT = "urgent", "Urgent"


class AnnouncementStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"
    ARCHIVED = "archived", "Archived"


class AnnouncementAudience(models.TextChoices):
    ALL_RESIDENTS = "all_residents", "All Residents"
    ALL_STAFF = "all_staff", "All Staff"
    ALL_USERS = "all_users", "All Users"
    SELECTED_MEMBERS = "selected_members", "Selected Members"


class NotificationType(models.TextChoices):
    GENERAL = "general", "General"
    ANNOUNCEMENT = "announcement", "Announcement"
    FEE_REMINDER = "fee_reminder", "Fee Reminder"
    ATTENDANCE_ALERT = "attendance_alert", "Attendance Alert"
    SYSTEM = "system", "System"


class NotificationStatus(models.TextChoices):
    UNREAD = "unread", "Unread"
    READ = "read", "Read"
    DISMISSED = "dismissed", "Dismissed"


class Announcement(models.Model):
    hostel = models.ForeignKey("hostels.Hostel", on_delete=models.PROTECT, related_name="announcements")
    title = models.CharField(max_length=200)
    body = models.TextField()
    priority = models.CharField(max_length=20, choices=NotificationPriority.choices, default=NotificationPriority.NORMAL)
    audience_type = models.CharField(
        max_length=30,
        choices=AnnouncementAudience.choices,
        default=AnnouncementAudience.ALL_RESIDENTS,
    )
    status = models.CharField(max_length=20, choices=AnnouncementStatus.choices, default=AnnouncementStatus.DRAFT)
    publish_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="created_announcements",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(published_at__isnull=False) | ~Q(status=AnnouncementStatus.PUBLISHED),
                name="announcement_published_at_required_when_published",
            ),
            models.CheckConstraint(
                condition=Q(expires_at__isnull=True) | Q(published_at__isnull=True) | Q(expires_at__gte=models.F("published_at")),
                name="announcement_expiry_after_publish",
            ),
        ]
        indexes = [
            models.Index(fields=["hostel", "status", "created_at"]),
            models.Index(fields=["hostel", "priority", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.hostel.code} - {self.title}"


class AnnouncementMemberTarget(models.Model):
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name="member_targets")
    member = models.ForeignKey("members.Member", on_delete=models.PROTECT, related_name="targeted_announcements")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(fields=["announcement", "member"], name="uniq_member_target_per_announcement"),
        ]
        indexes = [
            models.Index(fields=["member", "announcement"]),
        ]

    def __str__(self) -> str:
        return f"{self.announcement_id} -> {self.member.member_code}"


class Notification(models.Model):
    hostel = models.ForeignKey("hostels.Hostel", on_delete=models.PROTECT, related_name="notifications")
    member = models.ForeignKey(
        "members.Member",
        on_delete=models.PROTECT,
        related_name="notifications",
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="notifications",
        null=True,
        blank=True,
    )
    announcement = models.ForeignKey(
        Announcement,
        on_delete=models.PROTECT,
        related_name="notifications",
        null=True,
        blank=True,
    )
    notification_type = models.CharField(max_length=30, choices=NotificationType.choices, default=NotificationType.GENERAL)
    title = models.CharField(max_length=200)
    message = models.TextField()
    priority = models.CharField(max_length=20, choices=NotificationPriority.choices, default=NotificationPriority.NORMAL)
    status = models.CharField(max_length=20, choices=NotificationStatus.choices, default=NotificationStatus.UNREAD)
    dedupe_key = models.CharField(max_length=120, blank=True)
    context = models.JSONField(default=dict, blank=True)
    scheduled_for = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(default=timezone.now)
    read_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="created_notifications",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["hostel", "dedupe_key"],
                condition=~Q(dedupe_key=""),
                name="uniq_notification_dedupe_key_per_hostel",
            ),
            models.CheckConstraint(
                condition=(
                    Q(member__isnull=False) | Q(user__isnull=False) | Q(announcement__isnull=False)
                ),
                name="notification_has_delivery_target",
            ),
            models.CheckConstraint(
                condition=Q(read_at__isnull=False) | Q(status=NotificationStatus.UNREAD),
                name="notification_read_at_required_if_not_unread",
            ),
        ]
        indexes = [
            models.Index(fields=["hostel", "status", "created_at"]),
            models.Index(fields=["hostel", "priority", "created_at"]),
            models.Index(fields=["member", "status", "created_at"]),
            models.Index(fields=["user", "status", "created_at"]),
            models.Index(fields=["hostel", "notification_type", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.hostel.code} - {self.title}"
