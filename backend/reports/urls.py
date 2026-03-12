from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ReportsStatusViewSet

router = DefaultRouter()
router.register("status", ReportsStatusViewSet, basename="reports-status")

urlpatterns = [
    path("", include(router.urls)),
]
