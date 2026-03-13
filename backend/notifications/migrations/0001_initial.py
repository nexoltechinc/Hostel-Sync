# Generated manually for notifications initial schema.

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
            name="Announcement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=200)),
                ("body", models.TextField()),
                (
                    "priority",
                    models.CharField(
                        choices=[("low", "Low"), ("normal", "Normal"), ("high", "High"), ("urgent", "Urgent")],
                        default="normal",
                        max_length=20,
                    ),
                ),
                (
                    "audience_type",
                    models.CharField(
                        choices=[
                            ("all_residents", "All Residents"),
                            ("all_staff", "All Staff"),
                            ("all_users", "All Users"),
                            ("selected_members", "Selected Members"),
                        ],
                        default="all_residents",
                        max_length=30,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[("draft", "Draft"), ("published", "Published"), ("archived", "Archived")],
                        default="draft",
                        max_length=20,
                    ),
                ),
                ("publish_at", models.DateTimeField(blank=True, null=True)),
                ("published_at", models.DateTimeField(blank=True, null=True)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_announcements",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "hostel",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="announcements",
                        to="hostels.hostel",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["hostel", "status", "created_at"], name="notificatio_hostel_f70217_idx"),
                    models.Index(fields=["hostel", "priority", "created_at"], name="notificatio_hostel_289cd0_idx"),
                ],
                "constraints": [
                    models.CheckConstraint(
                        condition=models.Q(published_at__isnull=False) | ~models.Q(status="published"),
                        name="announcement_published_at_required_when_published",
                    ),
                    models.CheckConstraint(
                        condition=(
                            models.Q(expires_at__isnull=True)
                            | models.Q(published_at__isnull=True)
                            | models.Q(expires_at__gte=models.F("published_at"))
                        ),
                        name="announcement_expiry_after_publish",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="Notification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "notification_type",
                    models.CharField(
                        choices=[
                            ("general", "General"),
                            ("announcement", "Announcement"),
                            ("fee_reminder", "Fee Reminder"),
                            ("attendance_alert", "Attendance Alert"),
                            ("system", "System"),
                        ],
                        default="general",
                        max_length=30,
                    ),
                ),
                ("title", models.CharField(max_length=200)),
                ("message", models.TextField()),
                (
                    "priority",
                    models.CharField(
                        choices=[("low", "Low"), ("normal", "Normal"), ("high", "High"), ("urgent", "Urgent")],
                        default="normal",
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[("unread", "Unread"), ("read", "Read"), ("dismissed", "Dismissed")],
                        default="unread",
                        max_length=20,
                    ),
                ),
                ("dedupe_key", models.CharField(blank=True, max_length=120)),
                ("context", models.JSONField(blank=True, default=dict)),
                ("scheduled_for", models.DateTimeField(blank=True, null=True)),
                ("delivered_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("read_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "announcement",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="notifications",
                        to="notifications.announcement",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_notifications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "hostel",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="notifications",
                        to="hostels.hostel",
                    ),
                ),
                (
                    "member",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="notifications",
                        to="members.member",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="notifications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["hostel", "status", "created_at"], name="notificatio_hostel_8f0d5d_idx"),
                    models.Index(fields=["hostel", "priority", "created_at"], name="notificatio_hostel_363527_idx"),
                    models.Index(fields=["member", "status", "created_at"], name="notificatio_member_d25118_idx"),
                    models.Index(fields=["user", "status", "created_at"], name="notificatio_user_id_a8de63_idx"),
                    models.Index(fields=["hostel", "notification_type", "created_at"], name="notificatio_hostel_65219e_idx"),
                ],
                "constraints": [
                    models.UniqueConstraint(
                        condition=~models.Q(dedupe_key=""),
                        fields=("hostel", "dedupe_key"),
                        name="uniq_notification_dedupe_key_per_hostel",
                    ),
                    models.CheckConstraint(
                        condition=(
                            models.Q(member__isnull=False)
                            | models.Q(user__isnull=False)
                            | models.Q(announcement__isnull=False)
                        ),
                        name="notification_has_delivery_target",
                    ),
                    models.CheckConstraint(
                        condition=models.Q(read_at__isnull=False) | models.Q(status="unread"),
                        name="notification_read_at_required_if_not_unread",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="AnnouncementMemberTarget",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "announcement",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="member_targets",
                        to="notifications.announcement",
                    ),
                ),
                (
                    "member",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="targeted_announcements",
                        to="members.member",
                    ),
                ),
            ],
            options={
                "ordering": ["id"],
                "indexes": [models.Index(fields=["member", "announcement"], name="notificatio_member__3722ec_idx")],
                "constraints": [
                    models.UniqueConstraint(
                        fields=("announcement", "member"),
                        name="uniq_member_target_per_announcement",
                    )
                ],
            },
        ),
    ]
