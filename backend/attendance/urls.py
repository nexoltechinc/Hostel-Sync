from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AttendanceRecordViewSet, AttendanceStatusViewSet

router = DefaultRouter()
router.register("status", AttendanceStatusViewSet, basename="attendance-status")
router.register("records", AttendanceRecordViewSet, basename="attendance-record")

urlpatterns = [
    path("", include(router.urls)),
]
