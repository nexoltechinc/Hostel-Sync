from django.db import models
from django.db.models import Q


class RoomType(models.TextChoices):
    STANDARD = "standard", "Standard"
    DELUXE = "deluxe", "Deluxe"
    PRIVATE = "private", "Private"


class Room(models.Model):
    hostel = models.ForeignKey("hostels.Hostel", on_delete=models.PROTECT, related_name="rooms")
    room_code = models.CharField(max_length=40)
    floor = models.CharField(max_length=20, blank=True)
    capacity = models.PositiveIntegerField(default=1)
    room_type = models.CharField(max_length=20, choices=RoomType.choices, default=RoomType.STANDARD)
    monthly_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["room_code"]
        constraints = [
            models.UniqueConstraint(fields=["hostel", "room_code"], name="uniq_room_code_per_hostel"),
            models.CheckConstraint(condition=Q(capacity__gt=0), name="room_capacity_gt_zero"),
        ]

    def __str__(self) -> str:
        return f"{self.hostel.code} - {self.room_code}"


class Bed(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="beds")
    label = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["label"]
        constraints = [
            models.UniqueConstraint(fields=["room", "label"], name="uniq_bed_label_per_room"),
        ]

    def __str__(self) -> str:
        return f"{self.room.room_code} - {self.label}"
