from django.contrib import admin

from .models import Bed, Room


class BedInline(admin.TabularInline):
    model = Bed
    extra = 0


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("room_code", "hostel", "capacity", "room_type", "is_active")
    list_filter = ("hostel", "room_type", "is_active")
    search_fields = ("room_code", "floor")
    inlines = [BedInline]


@admin.register(Bed)
class BedAdmin(admin.ModelAdmin):
    list_display = ("label", "room", "is_active")
    list_filter = ("is_active", "room__hostel")
    search_fields = ("label", "room__room_code")
