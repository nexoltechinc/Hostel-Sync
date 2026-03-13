from django.db import IntegrityError, transaction
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import HasRBACPermission
from accounts.rbac import PermissionCode
from members.models import Member
from rooms.models import Bed

from .models import AllotmentStatus, RoomAllotment
from .serializers import CheckoutSerializer, RoomAllotmentSerializer, TransferSerializer


class RoomAllotmentViewSet(viewsets.ModelViewSet):
    queryset = RoomAllotment.objects.select_related("hostel", "member", "bed", "bed__room", "created_by").all()
    serializer_class = RoomAllotmentSerializer
    filterset_fields = ("status", "hostel", "member", "bed")
    search_fields = ("member__member_code", "member__full_name", "bed__room__room_code", "bed__label")
    ordering_fields = ("id", "start_date", "end_date")
    permission_classes = [permissions.IsAuthenticated, HasRBACPermission]
    permission_map = {
        "list": PermissionCode.VIEW_ROOMS,
        "retrieve": PermissionCode.VIEW_ROOMS,
        "create": PermissionCode.MANAGE_ALLOTMENTS,
        "update": PermissionCode.MANAGE_ALLOTMENTS,
        "partial_update": PermissionCode.MANAGE_ALLOTMENTS,
        "destroy": PermissionCode.MANAGE_ALLOTMENTS,
        "transfer": PermissionCode.MANAGE_ALLOTMENTS,
        "checkout": PermissionCode.MANAGE_ALLOTMENTS,
    }

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return queryset
        if user.hostel_id:
            return queryset.filter(hostel_id=user.hostel_id)
        return queryset.none()

    def partial_update(self, request, *args, **kwargs):
        raise serializers.ValidationError({"detail": "Direct updates are disabled. Use transfer or checkout actions."})

    def update(self, request, *args, **kwargs):
        raise serializers.ValidationError({"detail": "Direct updates are disabled. Use transfer or checkout actions."})

    def destroy(self, request, *args, **kwargs):
        raise serializers.ValidationError({"detail": "Allotment records are immutable and cannot be deleted."})

    @transaction.atomic
    def perform_create(self, serializer):
        member = serializer.validated_data["member"]
        bed = serializer.validated_data["bed"]

        member = Member.objects.select_for_update().get(pk=member.pk)
        bed = Bed.objects.select_for_update().select_related("room", "room__hostel").get(pk=bed.pk)

        if member.hostel_id != bed.room.hostel_id:
            raise serializers.ValidationError({"detail": "Member and bed must belong to the same hostel."})

        if not bed.is_active:
            raise serializers.ValidationError({"bed": "Only active beds can be allotted."})

        if not bed.room.is_active:
            raise serializers.ValidationError({"bed": "Cannot allot a bed in an inactive room."})

        if RoomAllotment.objects.filter(member_id=member.id, status=AllotmentStatus.ACTIVE).exists():
            raise serializers.ValidationError({"member": "Member already has an active allotment."})

        if RoomAllotment.objects.filter(bed_id=bed.id, status=AllotmentStatus.ACTIVE).exists():
            raise serializers.ValidationError({"bed": "Selected bed is already occupied."})

        try:
            serializer.save(member=member, bed=bed)
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"detail": "Allotment conflict detected. Member or bed was updated by another request."}
            ) from exc

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def transfer(self, request, pk=None):
        allotment = self.get_object()
        allotment = (
            RoomAllotment.objects.select_for_update()
            .select_related("hostel", "member", "bed", "bed__room", "created_by")
            .get(pk=allotment.pk)
        )
        Member.objects.select_for_update().filter(pk=allotment.member_id).exists()
        if allotment.status != AllotmentStatus.ACTIVE:
            raise serializers.ValidationError({"detail": "Only active allotments can be transferred."})

        serializer = TransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_bed = serializer.validated_data["new_bed"]
        new_bed = Bed.objects.select_for_update().select_related("room", "room__hostel").get(pk=new_bed.pk)
        transfer_date = serializer.validated_data["transfer_date"]
        remarks = serializer.validated_data.get("remarks", "")

        if transfer_date < allotment.start_date:
            raise serializers.ValidationError({"transfer_date": "Transfer date cannot be before start date."})

        if new_bed.room.hostel_id != allotment.hostel_id:
            raise serializers.ValidationError({"new_bed": "New bed must belong to the same hostel."})

        if not new_bed.is_active:
            raise serializers.ValidationError({"new_bed": "New bed must be active."})

        if not new_bed.room.is_active:
            raise serializers.ValidationError({"new_bed": "Cannot transfer into an inactive room."})

        if RoomAllotment.objects.filter(bed=new_bed, status=AllotmentStatus.ACTIVE).exists():
            raise serializers.ValidationError({"new_bed": "New bed is already occupied."})

        allotment.status = AllotmentStatus.CLOSED
        allotment.end_date = transfer_date
        if remarks:
            allotment.remarks = remarks
        allotment.save(update_fields=["status", "end_date", "remarks", "updated_at"])

        try:
            new_allotment = RoomAllotment.objects.create(
                hostel=allotment.hostel,
                member=allotment.member,
                bed=new_bed,
                start_date=transfer_date,
                status=AllotmentStatus.ACTIVE,
                remarks=remarks,
                created_by=request.user,
            )
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"detail": "Transfer conflict detected. Member or bed was updated by another request."}
            ) from exc
        payload = RoomAllotmentSerializer(new_allotment, context={"request": request}).data
        return Response(payload, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def checkout(self, request, pk=None):
        allotment = self.get_object()
        allotment = RoomAllotment.objects.select_for_update().select_related("member").get(pk=allotment.pk)
        Member.objects.select_for_update().filter(pk=allotment.member_id).exists()
        if allotment.status != AllotmentStatus.ACTIVE:
            raise serializers.ValidationError({"detail": "Only active allotments can be checked out."})

        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save(allotment=allotment)
        payload = RoomAllotmentSerializer(updated, context={"request": request}).data
        return Response(payload, status=status.HTTP_200_OK)
