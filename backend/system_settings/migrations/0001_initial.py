from datetime import time
from decimal import Decimal

import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def seed_hostel_settings(apps, schema_editor):
    Hostel = apps.get_model("hostels", "Hostel")
    HostelSettings = apps.get_model("system_settings", "HostelSettings")

    for hostel in Hostel.objects.all().iterator():
        HostelSettings.objects.get_or_create(hostel=hostel)


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("hostels", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="HostelSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("brand_name", models.CharField(blank=True, max_length=120)),
                ("website_url", models.URLField(blank=True)),
                (
                    "primary_color",
                    models.CharField(
                        default="#1667D6",
                        max_length=7,
                        validators=[
                            django.core.validators.RegexValidator(
                                message="Enter a valid hex color in the format #RRGGBB.",
                                regex="^#[0-9A-Fa-f]{6}$",
                            )
                        ],
                    ),
                ),
                (
                    "accent_color",
                    models.CharField(
                        default="#F59E0B",
                        max_length=7,
                        validators=[
                            django.core.validators.RegexValidator(
                                message="Enter a valid hex color in the format #RRGGBB.",
                                regex="^#[0-9A-Fa-f]{6}$",
                            )
                        ],
                    ),
                ),
                ("currency_code", models.CharField(default="USD", max_length=3)),
                (
                    "invoice_due_day",
                    models.PositiveSmallIntegerField(
                        default=5,
                        validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(28)],
                    ),
                ),
                (
                    "late_fee_amount",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("0.00"),
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    ),
                ),
                (
                    "default_security_deposit",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("0.00"),
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    ),
                ),
                (
                    "default_admission_fee",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("0.00"),
                        max_digits=10,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    ),
                ),
                ("allow_partial_payments", models.BooleanField(default=True)),
                ("auto_apply_member_credit", models.BooleanField(default=True)),
                ("enable_announcements", models.BooleanField(default=True)),
                ("enable_fee_reminders", models.BooleanField(default=True)),
                (
                    "fee_reminder_days_before",
                    models.PositiveSmallIntegerField(
                        default=3,
                        validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(30)],
                    ),
                ),
                (
                    "fee_reminder_days_after",
                    models.PositiveSmallIntegerField(
                        default=5,
                        validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(30)],
                    ),
                ),
                ("enable_attendance_alerts", models.BooleanField(default=False)),
                ("attendance_cutoff_time", models.TimeField(default=time(22, 0))),
                ("allow_attendance_corrections", models.BooleanField(default=True)),
                (
                    "checkout_notice_days",
                    models.PositiveSmallIntegerField(
                        default=3,
                        validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(60)],
                    ),
                ),
                ("require_checkout_clearance", models.BooleanField(default=True)),
                ("allow_admin_manage_users", models.BooleanField(default=True)),
                ("allow_admin_manage_hostel_settings", models.BooleanField(default=True)),
                ("allow_warden_view_reports", models.BooleanField(default=False)),
                ("allow_staff_view_reports", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "hostel",
                    models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="settings", to="hostels.hostel"),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="updated_hostel_settings",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Hostel Settings",
                "verbose_name_plural": "Hostel Settings",
            },
        ),
        migrations.RunPython(seed_hostel_settings, migrations.RunPython.noop),
    ]
