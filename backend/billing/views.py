from rest_framework import permissions, viewsets
from rest_framework.response import Response

from accounts.permissions import HasRBACPermission
from accounts.rbac import PermissionCode


class BillingStatusViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    required_permission = PermissionCode.VIEW_BILLING

    def list(self, request):
        return Response({"module": "billing", "status": "scaffolded", "phase": 3})
