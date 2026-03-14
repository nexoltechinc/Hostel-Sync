from django.contrib import admin

from .models import HostelSettings


@admin.register(HostelSettings)
class HostelSettingsAdmin(admin.ModelAdmin):
    list_display = (
        "hostel",
        "brand_name",
        "currency_code",
        "invoice_due_day",
        "allow_admin_manage_users",
        "allow_admin_manage_hostel_settings",
        "updated_at",
    )
    list_filter = (
        "currency_code",
        "allow_partial_payments",
        "enable_fee_reminders",
        "allow_admin_manage_users",
        "allow_admin_manage_hostel_settings",
    )
    search_fields = ("hostel__name", "hostel__code", "brand_name")
