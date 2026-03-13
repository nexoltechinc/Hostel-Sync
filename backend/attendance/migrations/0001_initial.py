# Generated manually for attendance initial schema.

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
            name="AttendanceRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("attendance_date", models.DateField(default=django.utils.timezone.localdate)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("present", "Present"),
                            ("absent", "Absent"),
                            ("on_leave", "On Leave"),
                            ("excused", "Excused"),
                        ],
                        default="present",
                        max_length=20,
                    ),
                ),
                ("remarks", models.TextField(blank=True)),
                ("corrected_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "corrected_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="corrected_attendance_records",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "hostel",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="attendance_records",
                        to="hostels.hostel",
                    ),
                ),
                (
                    "marked_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="marked_attendance_records",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "member",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="attendance_records",
                        to="members.member",
                    ),
                ),
            ],
            options={
                "ordering": ["-attendance_date", "member_id"],
                "indexes": [
                    models.Index(fields=["hostel", "attendance_date"], name="attendance___hostel__3f6d3d_idx"),
                    models.Index(fields=["hostel", "status", "attendance_date"], name="attendance___hostel__21f082_idx"),
                    models.Index(fields=["member", "attendance_date"], name="attendance___member__3d4f60_idx"),
                ],
                "constraints": [
                    models.UniqueConstraint(
                        fields=("member", "attendance_date"),
                        name="uniq_attendance_per_member_per_day",
                    ),
                    models.CheckConstraint(
                        condition=models.Q(("remarks__isnull", False)),
                        name="attendance_remarks_not_null",
                    ),
                ],
            },
        ),
    ]
