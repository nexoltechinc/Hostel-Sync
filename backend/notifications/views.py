from rest_framework import permissions, viewsets
from rest_framework.response import Response

from accounts.permissions import HasRBACPermission
from accounts.rbac import PermissionCode


class NotificationsStatusViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_permission = PermissionCode.MANAGE_NOTIFICATIONS

    def list(self, request):
        return Response({"module": "notifications", "status": "scaffolded", "phase": 6})
