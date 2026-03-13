from django.utils import timezone
from rest_framework import permissions, serializers, viewsets
from rest_framework.response import Response

from accounts.permissions import HasRBACPermission
from accounts.rbac import PermissionCode
from allotments.models import AllotmentStatus, RoomAllotment

from .models import Member, MemberStatus
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

    def destroy(self, request, *args, **kwargs):
        member = self.get_object()
        if RoomAllotment.objects.filter(member=member, status=AllotmentStatus.ACTIVE).exists():
            raise serializers.ValidationError({"detail": "Cannot archive a member with active room allotment."})

        member.is_deleted = True
        update_fields = ["is_deleted", "updated_at"]
        if member.status == MemberStatus.ACTIVE:
            member.status = MemberStatus.INACTIVE
            update_fields.append("status")
            if not member.leaving_date:
                member.leaving_date = timezone.localdate()
                update_fields.append("leaving_date")
        member.save(update_fields=update_fields)
        return Response(status=204)
