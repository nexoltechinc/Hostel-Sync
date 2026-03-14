from __future__ import annotations

from rest_framework import permissions, viewsets
from rest_framework.response import Response

from accounts.permissions import HasRBACPermission
from accounts.rbac import PermissionCode, get_user_permissions

from .serializers import SettingsScopeQuerySerializer, HostelSettingsSnapshotSerializer, HostelSettingsUpdateSerializer
from .services import get_or_create_hostel_settings, resolve_hostel_for_request


class SettingsStatusViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_permission = PermissionCode.MANAGE_HOSTEL_SETTINGS

    def list(self, request):
        query_serializer = SettingsScopeQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        hostel = resolve_hostel_for_request(
            user=request.user,
            requested_hostel_id=query_serializer.validated_data.get("resolved_hostel"),
        )
        settings = get_or_create_hostel_settings(hostel=hostel)

        return Response(
            {
                "module": "settings",
                "phase": 10,
                "status": "configuration_controls_live",
                "scope": {
                    "hostel_id": hostel.id,
                    "hostel_code": hostel.code,
                    "is_global": request.user.is_superuser and request.user.hostel_id is None,
                },
                "summary": {
                    "currency_code": settings.currency_code,
                    "invoice_due_day": settings.invoice_due_day,
                    "allow_partial_payments": settings.allow_partial_payments,
                    "fee_reminders_enabled": settings.enable_fee_reminders,
                    "attendance_corrections_enabled": settings.allow_attendance_corrections,
                    "admin_manage_users_enabled": settings.allow_admin_manage_users,
                    "admin_manage_settings_enabled": settings.allow_admin_manage_hostel_settings,
                },
                "available_sections": [
                    "hostel-profile",
                    "branding",
                    "financial-defaults",
                    "notification-policies",
                    "operations",
                    "access-policies",
                ],
            }
        )


class CurrentSettingsViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_permission = PermissionCode.MANAGE_HOSTEL_SETTINGS

    def list(self, request):
        query_serializer = SettingsScopeQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        hostel = resolve_hostel_for_request(
            user=request.user,
            requested_hostel_id=query_serializer.validated_data.get("resolved_hostel"),
        )
        settings = get_or_create_hostel_settings(hostel=hostel)
        snapshot = HostelSettingsSnapshotSerializer(settings, context={"request": request})
        return Response(
            {
                "module": "settings",
                "phase": 10,
                "status": "configuration_controls_live",
                "scope": {
                    "hostel_id": hostel.id,
                    "hostel_code": hostel.code,
                },
                "effective_permissions": sorted(get_user_permissions(request.user)),
                "data": snapshot.data,
            }
        )

    def partial_update(self, request):
        query_serializer = SettingsScopeQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)
        hostel = resolve_hostel_for_request(
            user=request.user,
            requested_hostel_id=query_serializer.validated_data.get("resolved_hostel"),
        )
        settings = get_or_create_hostel_settings(hostel=hostel)
        serializer = HostelSettingsUpdateSerializer(
            settings,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        snapshot = HostelSettingsSnapshotSerializer(settings, context={"request": request})
        return Response(
            {
                "module": "settings",
                "phase": 10,
                "status": "configuration_controls_live",
                "scope": {
                    "hostel_id": hostel.id,
                    "hostel_code": hostel.code,
                },
                "data": snapshot.data,
            }
        )
