from django.db import models
from django.db.models import Q
from django.utils import timezone


class AttendanceStatus(models.TextChoices):
    PRESENT = "present", "Present"
    ABSENT = "absent", "Absent"
    ON_LEAVE = "on_leave", "On Leave"
    EXCUSED = "excused", "Excused"


class AttendanceRecord(models.Model):
    hostel = models.ForeignKey("hostels.Hostel", on_delete=models.PROTECT, related_name="attendance_records")
    member = models.ForeignKey("members.Member", on_delete=models.PROTECT, related_name="attendance_records")
    attendance_date = models.DateField(default=timezone.localdate)
    status = models.CharField(max_length=20, choices=AttendanceStatus.choices, default=AttendanceStatus.PRESENT)
    remarks = models.TextField(blank=True)
    marked_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="marked_attendance_records",
        null=True,
        blank=True,
    )
    corrected_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="corrected_attendance_records",
        null=True,
        blank=True,
    )
    corrected_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-attendance_date", "member_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["member", "attendance_date"],
                name="uniq_attendance_per_member_per_day",
            ),
            models.CheckConstraint(
                condition=Q(remarks__isnull=False),
                name="attendance_remarks_not_null",
            ),
        ]
        indexes = [
            models.Index(fields=["hostel", "attendance_date"]),
            models.Index(fields=["hostel", "status", "attendance_date"]),
            models.Index(fields=["member", "attendance_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.member.member_code} - {self.attendance_date} - {self.status}"
