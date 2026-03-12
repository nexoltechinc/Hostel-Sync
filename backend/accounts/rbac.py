from __future__ import annotations

from collections.abc import Iterable

from .models import UserRole


class PermissionCode:
    VIEW_DASHBOARD = "view_dashboard"
    MANAGE_USERS = "manage_users"
    MANAGE_HOSTEL_SETTINGS = "manage_hostel_settings"

    VIEW_MEMBERS = "view_members"
    MANAGE_MEMBERS = "manage_members"
    VIEW_ROOMS = "view_rooms"
    MANAGE_ROOMS = "manage_rooms"
    MANAGE_ALLOTMENTS = "manage_allotments"

    VIEW_BILLING = "view_billing"
    MANAGE_BILLING = "manage_billing"
    VIEW_ATTENDANCE = "view_attendance"
    MANAGE_ATTENDANCE = "manage_attendance"
    VIEW_REPORTS = "view_reports"
    MANAGE_REPORTS = "manage_reports"
    MANAGE_NOTIFICATIONS = "manage_notifications"
    VIEW_AUDIT = "view_audit"


BASE_PERMISSIONS: set[str] = {
    PermissionCode.VIEW_DASHBOARD,
    PermissionCode.VIEW_MEMBERS,
    PermissionCode.VIEW_ROOMS,
    PermissionCode.VIEW_BILLING,
    PermissionCode.VIEW_ATTENDANCE,
    PermissionCode.VIEW_REPORTS,
}

ROLE_PERMISSION_MAP: dict[str, set[str]] = {
    UserRole.OWNER: {
        *BASE_PERMISSIONS,
        PermissionCode.MANAGE_USERS,
        PermissionCode.MANAGE_HOSTEL_SETTINGS,
        PermissionCode.MANAGE_MEMBERS,
        PermissionCode.MANAGE_ROOMS,
        PermissionCode.MANAGE_ALLOTMENTS,
        PermissionCode.MANAGE_BILLING,
        PermissionCode.MANAGE_ATTENDANCE,
        PermissionCode.MANAGE_REPORTS,
        PermissionCode.MANAGE_NOTIFICATIONS,
        PermissionCode.VIEW_AUDIT,
    },
    UserRole.ADMIN: {
        *BASE_PERMISSIONS,
        PermissionCode.MANAGE_MEMBERS,
        PermissionCode.MANAGE_ROOMS,
        PermissionCode.MANAGE_ALLOTMENTS,
        PermissionCode.MANAGE_BILLING,
        PermissionCode.MANAGE_ATTENDANCE,
        PermissionCode.MANAGE_REPORTS,
        PermissionCode.MANAGE_NOTIFICATIONS,
    },
    UserRole.ACCOUNTANT: {
        PermissionCode.VIEW_DASHBOARD,
        PermissionCode.VIEW_MEMBERS,
        PermissionCode.VIEW_BILLING,
        PermissionCode.MANAGE_BILLING,
        PermissionCode.VIEW_REPORTS,
    },
    UserRole.WARDEN: {
        PermissionCode.VIEW_DASHBOARD,
        PermissionCode.VIEW_MEMBERS,
        PermissionCode.VIEW_ROOMS,
        PermissionCode.VIEW_ATTENDANCE,
        PermissionCode.MANAGE_ATTENDANCE,
    },
    UserRole.STAFF: {
        PermissionCode.VIEW_DASHBOARD,
        PermissionCode.VIEW_MEMBERS,
        PermissionCode.VIEW_ROOMS,
        PermissionCode.VIEW_ATTENDANCE,
    },
}


def get_role_permissions(role: str) -> set[str]:
    return ROLE_PERMISSION_MAP.get(role, set())


def has_permissions(role: str, requested: Iterable[str]) -> bool:
    role_permissions = get_role_permissions(role)
    return all(code in role_permissions for code in requested)
