from rest_framework import permissions, serializers, viewsets

from accounts.permissions import HasRBACPermission
from accounts.rbac import PermissionCode
from allotments.models import AllotmentStatus, RoomAllotment

from .models import Bed, Room
from .serializers import BedSerializer, RoomSerializer


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.select_related("hostel").prefetch_related("beds").all()
    serializer_class = RoomSerializer
    filterset_fields = ("hostel", "room_type", "is_active")
    search_fields = ("room_code", "floor")
    ordering_fields = ("id", "room_code", "capacity")
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    permission_map = {
        "list": PermissionCode.VIEW_ROOMS,
        "retrieve": PermissionCode.VIEW_ROOMS,
        "create": PermissionCode.MANAGE_ROOMS,
        "update": PermissionCode.MANAGE_ROOMS,
        "partial_update": PermissionCode.MANAGE_ROOMS,
        "destroy": PermissionCode.MANAGE_ROOMS,
    }

    def get_queryset(self):
        queryset = super().get_queryset()
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
                raise serializers.ValidationError({"hostel": "Hostel is required for room creation."})
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


class BedViewSet(viewsets.ModelViewSet):
    queryset = Bed.objects.select_related("room", "room__hostel").all()
    serializer_class = BedSerializer
    filterset_fields = ("room", "room__hostel", "is_active")
    search_fields = ("label", "room__room_code")
    ordering_fields = ("id", "label")
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    permission_map = {
        "list": PermissionCode.VIEW_ROOMS,
        "retrieve": PermissionCode.VIEW_ROOMS,
        "create": PermissionCode.MANAGE_ROOMS,
        "update": PermissionCode.MANAGE_ROOMS,
        "partial_update": PermissionCode.MANAGE_ROOMS,
        "destroy": PermissionCode.MANAGE_ROOMS,
    }

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return queryset
        if user.hostel_id:
            return queryset.filter(room__hostel_id=user.hostel_id)
        return queryset.none()

    def perform_destroy(self, instance):
        if RoomAllotment.objects.filter(bed=instance, status=AllotmentStatus.ACTIVE).exists():
            raise serializers.ValidationError({"detail": "Cannot delete a bed with active allotment."})
        super().perform_destroy(instance)
