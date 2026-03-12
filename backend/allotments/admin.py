from django.contrib import admin

from .models import RoomAllotment


@admin.register(RoomAllotment)
class RoomAllotmentAdmin(admin.ModelAdmin):
    list_display = ("member", "bed", "status", "start_date", "end_date", "hostel")
    list_filter = ("status", "hostel")
    search_fields = ("member__member_code", "member__full_name", "bed__label", "bed__room__room_code")
