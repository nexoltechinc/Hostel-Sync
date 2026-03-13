from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DashboardSummaryViewSet, ReportsStatusViewSet

router = DefaultRouter()
router.register("status", ReportsStatusViewSet, basename="reports-status")
router.register("dashboard-summary", DashboardSummaryViewSet, basename="dashboard-summary")

urlpatterns = [
    path("", include(router.urls)),
]
