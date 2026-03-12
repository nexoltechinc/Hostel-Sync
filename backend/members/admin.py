from django.contrib import admin

from .models import Member


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ("member_code", "full_name", "hostel", "phone", "status", "joining_date")
    list_filter = ("status", "gender", "hostel")
    search_fields = ("member_code", "full_name", "id_number", "phone")
