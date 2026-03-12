from rest_framework import permissions, viewsets
from rest_framework.response import Response

from accounts.permissions import HasRBACPermission
from accounts.rbac import PermissionCode


class AuditStatusViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_permission = PermissionCode.VIEW_AUDIT

    def list(self, request):
        return Response({"module": "audit", "status": "scaffolded", "phase": 6})
