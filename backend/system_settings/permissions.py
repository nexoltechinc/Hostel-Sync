from __future__ import annotations

from accounts.models import UserRole

from .models import HostelSettings


EXTRA_PERMISSION_FLAGS: dict[str, dict[str, str]] = {
    UserRole.ADMIN: {
        "allow_admin_manage_users": "manage_users",
        "allow_admin_manage_hostel_settings": "manage_hostel_settings",
    },
    UserRole.WARDEN: {
        "allow_warden_view_reports": "view_reports",
    },
    UserRole.STAFF: {
        "allow_staff_view_reports": "view_reports",
    },
}


def get_additional_permissions(user) -> set[str]:
    if user.is_superuser or not user.hostel_id:
        return set()

    flags = EXTRA_PERMISSION_FLAGS.get(user.role)
    if not flags:
        return set()

    hostel_settings = HostelSettings.objects.filter(hostel_id=user.hostel_id).first() or HostelSettings(hostel_id=user.hostel_id)

    permissions = set()
    for field_name, permission_code in flags.items():
        if getattr(hostel_settings, field_name, False):
            permissions.add(permission_code)
    return permissions
