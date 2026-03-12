from rest_framework import permissions, viewsets

from accounts.permissions import HasRBACPermission
from accounts.rbac import PermissionCode

from .models import Hostel
from .serializers import HostelSerializer


class HostelViewSet(viewsets.ModelViewSet):
    queryset = Hostel.objects.all()
    serializer_class = HostelSerializer
    filterset_fields = ("is_active", "timezone")
    search_fields = ("name", "code", "phone", "email")
    ordering_fields = ("id", "name", "code")
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    permission_map = {
        "create": PermissionCode.MANAGE_HOSTEL_SETTINGS,
        "update": PermissionCode.MANAGE_HOSTEL_SETTINGS,
        "partial_update": PermissionCode.MANAGE_HOSTEL_SETTINGS,
        "destroy": PermissionCode.MANAGE_HOSTEL_SETTINGS,
    }
