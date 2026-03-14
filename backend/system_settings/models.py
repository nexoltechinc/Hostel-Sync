from __future__ import annotations

from datetime import time
from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models


HEX_COLOR_VALIDATOR = RegexValidator(
    regex=r"^#[0-9A-Fa-f]{6}$",
    message="Enter a valid hex color in the format #RRGGBB.",
)


class HostelSettings(models.Model):
    hostel = models.OneToOneField("hostels.Hostel", on_delete=models.CASCADE, related_name="settings")
    brand_name = models.CharField(max_length=120, blank=True)
    website_url = models.URLField(blank=True)
    primary_color = models.CharField(max_length=7, default="#1667D6", validators=[HEX_COLOR_VALIDATOR])
    accent_color = models.CharField(max_length=7, default="#F59E0B", validators=[HEX_COLOR_VALIDATOR])
    currency_code = models.CharField(max_length=3, default="USD")
    invoice_due_day = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(28)],
    )
    late_fee_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    default_security_deposit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    default_admission_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    allow_partial_payments = models.BooleanField(default=True)
    auto_apply_member_credit = models.BooleanField(default=True)
    enable_announcements = models.BooleanField(default=True)
    enable_fee_reminders = models.BooleanField(default=True)
    fee_reminder_days_before = models.PositiveSmallIntegerField(
        default=3,
        validators=[MinValueValidator(0), MaxValueValidator(30)],
    )
    fee_reminder_days_after = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(0), MaxValueValidator(30)],
    )
    enable_attendance_alerts = models.BooleanField(default=False)
    attendance_cutoff_time = models.TimeField(default=time(hour=22, minute=0))
    allow_attendance_corrections = models.BooleanField(default=True)
    checkout_notice_days = models.PositiveSmallIntegerField(
        default=3,
        validators=[MinValueValidator(0), MaxValueValidator(60)],
    )
    require_checkout_clearance = models.BooleanField(default=True)
    allow_admin_manage_users = models.BooleanField(default=True)
    allow_admin_manage_hostel_settings = models.BooleanField(default=True)
    allow_warden_view_reports = models.BooleanField(default=False)
    allow_staff_view_reports = models.BooleanField(default=False)
    updated_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="updated_hostel_settings",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Hostel Settings"
        verbose_name_plural = "Hostel Settings"

    def __str__(self) -> str:
        return f"Settings for {self.hostel.name}"
