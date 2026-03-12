from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BedViewSet, RoomViewSet

router = DefaultRouter()
router.register("beds", BedViewSet, basename="bed")
router.register("", RoomViewSet, basename="room")

urlpatterns = [
    path("", include(router.urls)),
]
