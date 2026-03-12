from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        (
            "Hostel Management",
            {
                "fields": (
                    "phone",
                    "role",
                    "hostel",
                )
            },
        ),
    )
    list_display = ("username", "email", "role", "hostel", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff", "hostel")
