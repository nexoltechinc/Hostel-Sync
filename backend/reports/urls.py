from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AttendanceReportViewSet,
    DashboardSummaryViewSet,
    FeeCollectionReportViewSet,
    OccupancyReportViewSet,
    PendingDuesReportViewSet,
    ReportsStatusViewSet,
)

router = DefaultRouter()
router.register("status", ReportsStatusViewSet, basename="reports-status")
router.register("dashboard-summary", DashboardSummaryViewSet, basename="dashboard-summary")
router.register("occupancy", OccupancyReportViewSet, basename="reports-occupancy")
router.register("fee-collection", FeeCollectionReportViewSet, basename="reports-fee-collection")
router.register("pending-dues", PendingDuesReportViewSet, basename="reports-pending-dues")
router.register("attendance", AttendanceReportViewSet, basename="reports-attendance")

urlpatterns = [
    path("", include(router.urls)),
]
