from django.contrib import admin

from .models import Hostel


@admin.register(Hostel)
class HostelAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "phone", "timezone", "is_active")
    search_fields = ("name", "code", "phone", "email")
