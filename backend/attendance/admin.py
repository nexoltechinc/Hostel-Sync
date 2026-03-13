from django.contrib import admin

from .models import AttendanceRecord


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ("attendance_date", "member", "status", "hostel", "marked_by", "corrected_by", "corrected_at")
    list_filter = ("attendance_date", "status", "hostel")
    search_fields = ("member__member_code", "member__full_name", "remarks")
