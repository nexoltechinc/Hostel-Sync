from django.db import models
from django.db.models import F, Q


class AllotmentStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    CLOSED = "closed", "Closed"


class RoomAllotment(models.Model):
    hostel = models.ForeignKey("hostels.Hostel", on_delete=models.PROTECT, related_name="allotments")
    member = models.ForeignKey("members.Member", on_delete=models.PROTECT, related_name="allotments")
    bed = models.ForeignKey("rooms.Bed", on_delete=models.PROTECT, related_name="allotments")
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=AllotmentStatus.choices, default=AllotmentStatus.ACTIVE)
    remarks = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="created_allotments",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["member"],
                condition=Q(status=AllotmentStatus.ACTIVE),
                name="uniq_active_allotment_per_member",
            ),
            models.UniqueConstraint(
                fields=["bed"],
                condition=Q(status=AllotmentStatus.ACTIVE),
                name="uniq_active_allotment_per_bed",
            ),
            models.CheckConstraint(
                condition=Q(end_date__isnull=True) | Q(end_date__gte=F("start_date")),
                name="allotment_end_date_after_start",
            ),
        ]
        indexes = [
            models.Index(fields=["hostel", "status"]),
            models.Index(fields=["member", "status"]),
            models.Index(fields=["bed", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.member.member_code} -> {self.bed}"
