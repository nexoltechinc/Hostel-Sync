from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import NotificationsStatusViewSet

router = DefaultRouter()
router.register("status", NotificationsStatusViewSet, basename="notifications-status")

urlpatterns = [
    path("", include(router.urls)),
]
