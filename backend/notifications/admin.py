from django.contrib import admin

from .models import Announcement, AnnouncementMemberTarget, Notification


class AnnouncementMemberTargetInline(admin.TabularInline):
    model = AnnouncementMemberTarget
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "hostel", "status", "priority", "audience_type", "published_at", "created_at")
    list_filter = ("hostel", "status", "priority", "audience_type")
    search_fields = ("title", "body")
    inlines = [AnnouncementMemberTargetInline]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "hostel", "notification_type", "priority", "status", "member", "user", "created_at")
    list_filter = ("hostel", "notification_type", "priority", "status")
    search_fields = ("title", "message", "member__member_code", "member__full_name", "user__username")
