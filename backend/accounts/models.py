from django.contrib.auth.models import AbstractUser
from django.db import models


class UserRole(models.TextChoices):
    OWNER = "owner", "Owner"
    ADMIN = "admin", "Admin"
    ACCOUNTANT = "accountant", "Accountant"
    WARDEN = "warden", "Warden"
    STAFF = "staff", "Staff"


class User(AbstractUser):
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.STAFF)
    hostel = models.ForeignKey(
        "hostels.Hostel",
        on_delete=models.PROTECT,
        related_name="users",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["username"]

    def __str__(self) -> str:
        return self.username
