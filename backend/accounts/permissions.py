from rest_framework.permissions import BasePermission

from .rbac import has_permissions


class HasRBACPermission(BasePermission):
    """
    Expects either:
    - `required_permission` on the view
    - `permission_map` keyed by action on the viewset
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True

        required_permission = getattr(view, "required_permission", None)
        permission_map = getattr(view, "permission_map", {})
        action = getattr(view, "action", None)
        if action and action in permission_map:
            required_permission = permission_map[action]

        if required_permission is None:
            return True

        if isinstance(required_permission, str):
            required = [required_permission]
        else:
            required = list(required_permission)

        return has_permissions(user.role, required)
