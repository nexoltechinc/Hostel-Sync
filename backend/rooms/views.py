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
        instance = serializer.instance
        if serializer.validated_data.get("is_active") is False and RoomAllotment.objects.filter(
            bed__room=instance, status=AllotmentStatus.ACTIVE
        ).exists():
            raise serializers.ValidationError({"detail": "Cannot deactivate a room with active allotments."})

        user = self.request.user
        if user.is_superuser:
            serializer.save()
            return
        serializer.save(hostel=user.hostel)

    def perform_destroy(self, instance):
        active_allotments = RoomAllotment.objects.filter(bed__room=instance, status=AllotmentStatus.ACTIVE).exists()
        if active_allotments:
            raise serializers.ValidationError({"detail": "Cannot delete a room with active allotments."})

        allotment_history = RoomAllotment.objects.filter(bed__room=instance).exists()
        if allotment_history:
            raise serializers.ValidationError({"detail": "Cannot delete a room with allotment history."})

        super().perform_destroy(instance)


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

    def perform_create(self, serializer):
        room = serializer.validated_data["room"]
        user = self.request.user
        if not user.is_superuser:
            if not user.hostel_id:
                raise serializers.ValidationError({"room": "Your account is not linked to a hostel."})
            if room.hostel_id != user.hostel_id:
                raise serializers.ValidationError({"room": "You can only create beds in your hostel."})
        serializer.save()

    def perform_update(self, serializer):
        instance = self.get_object()
        room = serializer.validated_data.get("room", instance.room)
        user = self.request.user

        if not user.is_superuser:
            if not user.hostel_id:
                raise serializers.ValidationError({"room": "Your account is not linked to a hostel."})
            if room.hostel_id != user.hostel_id:
                raise serializers.ValidationError({"room": "You can only manage beds in your hostel."})

        if serializer.validated_data.get("is_active") is False and RoomAllotment.objects.filter(
            bed=instance, status=AllotmentStatus.ACTIVE
        ).exists():
            raise serializers.ValidationError({"detail": "Cannot deactivate a bed with active allotment."})

        if room.id != instance.room_id and RoomAllotment.objects.filter(bed=instance).exists():
            raise serializers.ValidationError({"room": "Cannot move a bed with allotment history to another room."})

        serializer.save()

    def perform_destroy(self, instance):
        active_allotments = RoomAllotment.objects.filter(bed=instance, status=AllotmentStatus.ACTIVE).exists()
        if active_allotments:
            raise serializers.ValidationError({"detail": "Cannot delete a bed with active allotment."})

        allotment_history = RoomAllotment.objects.filter(bed=instance).exists()
        if allotment_history:
            raise serializers.ValidationError({"detail": "Cannot delete a bed with allotment history."})

        super().perform_destroy(instance)
