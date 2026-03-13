from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BillingStatusViewSet, FeePlanViewSet, InvoiceViewSet, MemberCreditViewSet, MemberFeePlanViewSet, PaymentViewSet

router = DefaultRouter()
router.register("status", BillingStatusViewSet, basename="billing-status")
router.register("fee-plans", FeePlanViewSet, basename="fee-plan")
router.register("member-fee-plans", MemberFeePlanViewSet, basename="member-fee-plan")
router.register("invoices", InvoiceViewSet, basename="invoice")
router.register("payments", PaymentViewSet, basename="payment")
router.register("credits", MemberCreditViewSet, basename="member-credit")

urlpatterns = [
    path("", include(router.urls)),
]
