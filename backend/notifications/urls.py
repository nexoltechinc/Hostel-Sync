from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AnnouncementViewSet, NotificationsStatusViewSet, NotificationViewSet

router = DefaultRouter()
router.register("status", NotificationsStatusViewSet, basename="notifications-status")
router.register("announcements", AnnouncementViewSet, basename="announcement")
router.register("notifications", NotificationViewSet, basename="notification")

urlpatterns = [
    path("", include(router.urls)),
]
