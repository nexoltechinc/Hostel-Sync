from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AuditStatusViewSet

router = DefaultRouter()
router.register("status", AuditStatusViewSet, basename="audit-status")

urlpatterns = [
    path("", include(router.urls)),
]
