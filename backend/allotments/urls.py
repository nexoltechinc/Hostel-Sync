from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import RoomAllotmentViewSet

router = DefaultRouter()
router.register("", RoomAllotmentViewSet, basename="allotment")

urlpatterns = [
    path("", include(router.urls)),
]
