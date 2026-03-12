from rest_framework import permissions, viewsets
from rest_framework.response import Response

from accounts.permissions import HasRBACPermission
from accounts.rbac import PermissionCode


class AttendanceStatusViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_permission = PermissionCode.VIEW_ATTENDANCE

    def list(self, request):
        return Response({"module": "attendance", "status": "scaffolded", "phase": 4})
