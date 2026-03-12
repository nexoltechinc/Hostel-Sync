from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BillingStatusViewSet

router = DefaultRouter()
router.register("status", BillingStatusViewSet, basename="billing-status")

urlpatterns = [
    path("", include(router.urls)),
]
