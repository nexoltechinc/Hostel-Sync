from django.db import models
from django.db.models import Q
from django.utils import timezone


class MemberStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"
    CHECKED_OUT = "checked_out", "Checked Out"


class Gender(models.TextChoices):
    MALE = "male", "Male"
    FEMALE = "female", "Female"
    OTHER = "other", "Other"


class Member(models.Model):
    hostel = models.ForeignKey("hostels.Hostel", on_delete=models.PROTECT, related_name="members")
    member_code = models.CharField(max_length=40)
    full_name = models.CharField(max_length=120)
    guardian_name = models.CharField(max_length=120, blank=True)
    id_number = models.CharField(max_length=64, blank=True)
    phone = models.CharField(max_length=20)
    emergency_contact = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    joining_date = models.DateField(default=timezone.localdate)
    gender = models.CharField(max_length=16, choices=Gender.choices, default=Gender.MALE)
    status = models.CharField(max_length=20, choices=MemberStatus.choices, default=MemberStatus.ACTIVE)
    leaving_date = models.DateField(null=True, blank=True)
    remarks = models.TextField(blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name"]
        constraints = [
            models.UniqueConstraint(fields=["hostel", "member_code"], name="uniq_member_code_per_hostel"),
            models.UniqueConstraint(
                fields=["hostel", "id_number"],
                condition=~Q(id_number=""),
                name="uniq_member_id_number_per_hostel",
            ),
        ]
        indexes = [
            models.Index(fields=["hostel", "status"]),
            models.Index(fields=["hostel", "phone"]),
        ]

    def __str__(self) -> str:
        return f"{self.member_code} - {self.full_name}"
