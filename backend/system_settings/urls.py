from django.urls import path

from .views import CurrentSettingsViewSet, SettingsStatusViewSet

urlpatterns = [
    path("status/", SettingsStatusViewSet.as_view({"get": "list"}), name="settings-status"),
    path("current/", CurrentSettingsViewSet.as_view({"get": "list", "patch": "partial_update"}), name="settings-current"),
]
