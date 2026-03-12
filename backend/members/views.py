from rest_framework import permissions, serializers, viewsets

from accounts.permissions import HasRBACPermission
from accounts.rbac import PermissionCode

from .models import Member
from .serializers import MemberSerializer


class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.select_related("hostel").all()
    serializer_class = MemberSerializer
    filterset_fields = ("status", "gender", "hostel")
    search_fields = ("member_code", "full_name", "phone", "id_number")
    ordering_fields = ("id", "member_code", "full_name", "joining_date")
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    permission_map = {
        "list": PermissionCode.VIEW_MEMBERS,
        "retrieve": PermissionCode.VIEW_MEMBERS,
        "create": PermissionCode.MANAGE_MEMBERS,
        "update": PermissionCode.MANAGE_MEMBERS,
        "partial_update": PermissionCode.MANAGE_MEMBERS,
        "destroy": PermissionCode.MANAGE_MEMBERS,
    }

    def get_queryset(self):
        queryset = super().get_queryset().filter(is_deleted=False)
        user = self.request.user
        if user.is_superuser:
            return queryset
        if user.hostel_id:
            return queryset.filter(hostel_id=user.hostel_id)
        return queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_superuser:
            hostel = serializer.validated_data.get("hostel")
            if not hostel:
                raise serializers.ValidationError({"hostel": "Hostel is required for member creation."})
        else:
            hostel = user.hostel
            if not hostel:
                raise serializers.ValidationError({"hostel": "Your account is not linked to a hostel."})
        serializer.save(hostel=hostel)

    def perform_update(self, serializer):
        user = self.request.user
        if user.is_superuser:
            serializer.save()
            return
        serializer.save(hostel=user.hostel)
