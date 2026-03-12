from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from members.models import MemberStatus
from rooms.models import Bed

from .models import AllotmentStatus, RoomAllotment


class RoomAllotmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomAllotment
        fields = (
            "id",
            "hostel",
            "member",
            "bed",
            "start_date",
            "end_date",
            "status",
            "remarks",
            "created_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "status", "end_date", "hostel", "created_by", "created_at", "updated_at")

    def validate(self, attrs):
        member = attrs["member"]
        bed = attrs["bed"]
        request = self.context.get("request")

        if member.status != MemberStatus.ACTIVE:
            raise serializers.ValidationError({"member": "Only active members can be allotted."})

        if member.hostel_id != bed.room.hostel_id:
            raise serializers.ValidationError("Member and bed must belong to the same hostel.")

        if request and not request.user.is_superuser:
            if not request.user.hostel_id:
                raise serializers.ValidationError("Your account is not linked to a hostel.")
            if member.hostel_id != request.user.hostel_id:
                raise serializers.ValidationError("You can only create allotments for your own hostel.")

        if RoomAllotment.objects.filter(member=member, status=AllotmentStatus.ACTIVE).exists():
            raise serializers.ValidationError({"member": "Member already has an active allotment."})

        if RoomAllotment.objects.filter(bed=bed, status=AllotmentStatus.ACTIVE).exists():
            raise serializers.ValidationError({"bed": "Selected bed is already occupied."})

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        return RoomAllotment.objects.create(
            hostel=validated_data["member"].hostel,
            created_by=request.user,
            **validated_data,
        )


class TransferSerializer(serializers.Serializer):
    new_bed = serializers.PrimaryKeyRelatedField(queryset=Bed.objects.select_related("room", "room__hostel").all())
    transfer_date = serializers.DateField(default=timezone.localdate)
    remarks = serializers.CharField(required=False, allow_blank=True, max_length=500)


class CheckoutSerializer(serializers.Serializer):
    checkout_date = serializers.DateField(default=timezone.localdate)
    remarks = serializers.CharField(required=False, allow_blank=True, max_length=500)

    @transaction.atomic
    def save(self, *, allotment: RoomAllotment):
        checkout_date = self.validated_data["checkout_date"]
        if checkout_date < allotment.start_date:
            raise serializers.ValidationError({"checkout_date": "Checkout date cannot be before start date."})

        allotment.status = AllotmentStatus.CLOSED
        allotment.end_date = checkout_date
        remarks = self.validated_data.get("remarks")
        if remarks:
            allotment.remarks = remarks
        allotment.save(update_fields=["status", "end_date", "remarks", "updated_at"])

        member = allotment.member
        member.status = MemberStatus.CHECKED_OUT
        member.leaving_date = checkout_date
        member.save(update_fields=["status", "leaving_date", "updated_at"])

        return allotment
