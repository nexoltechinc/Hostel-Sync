from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("accounts.urls")),
    path("api/v1/hostels/", include("hostels.urls")),
    path("api/v1/members/", include("members.urls")),
    path("api/v1/rooms/", include("rooms.urls")),
    path("api/v1/allotments/", include("allotments.urls")),
    path("api/v1/billing/", include("billing.urls")),
    path("api/v1/attendance/", include("attendance.urls")),
    path("api/v1/notifications/", include("notifications.urls")),
    path("api/v1/reports/", include("reports.urls")),
    path("api/v1/audit/", include("audit.urls")),
]
