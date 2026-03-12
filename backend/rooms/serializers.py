from django.db import transaction
from rest_framework import serializers

from allotments.models import AllotmentStatus, RoomAllotment

from .models import Bed, Room


class BedSerializer(serializers.ModelSerializer):
    is_occupied = serializers.SerializerMethodField()

    class Meta:
        model = Bed
        fields = ("id", "room", "label", "is_active", "is_occupied", "created_at")
        read_only_fields = ("id", "is_occupied", "created_at")

    def get_is_occupied(self, obj):
        return RoomAllotment.objects.filter(bed=obj, status=AllotmentStatus.ACTIVE).exists()


class RoomSerializer(serializers.ModelSerializer):
    beds = BedSerializer(many=True, read_only=True)
    bed_labels = serializers.ListField(
        child=serializers.CharField(max_length=20),
        required=False,
        write_only=True,
    )
    occupied_beds = serializers.SerializerMethodField()
    available_beds = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = (
            "id",
            "hostel",
            "room_code",
            "floor",
            "capacity",
            "room_type",
            "monthly_rent",
            "is_active",
            "beds",
            "bed_labels",
            "occupied_beds",
            "available_beds",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "occupied_beds", "available_beds", "created_at", "updated_at")

    def get_occupied_beds(self, obj):
        return obj.beds.filter(allotments__status=AllotmentStatus.ACTIVE).distinct().count()

    def get_available_beds(self, obj):
        return max(obj.beds.filter(is_active=True).count() - self.get_occupied_beds(obj), 0)

    def validate(self, attrs):
        capacity = attrs.get("capacity", getattr(self.instance, "capacity", None))
        bed_labels = attrs.get("bed_labels", None)
        if bed_labels and capacity and len(bed_labels) > capacity:
            raise serializers.ValidationError({"bed_labels": "Bed count cannot exceed room capacity."})
        if bed_labels and len(set(bed_labels)) != len(bed_labels):
            raise serializers.ValidationError({"bed_labels": "Bed labels must be unique within a room."})

        if self.instance and capacity is not None:
            existing_bed_count = self.instance.beds.count()
            occupied_beds = self.get_occupied_beds(self.instance)
            if capacity < occupied_beds:
                raise serializers.ValidationError({"capacity": "Capacity cannot be less than current occupied beds."})
            if capacity < existing_bed_count:
                raise serializers.ValidationError({"capacity": "Capacity cannot be less than existing bed count."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        bed_labels = validated_data.pop("bed_labels", None)
        room = Room.objects.create(**validated_data)
        if bed_labels:
            Bed.objects.bulk_create([Bed(room=room, label=label) for label in bed_labels])
        else:
            Bed.objects.bulk_create([Bed(room=room, label=f"B{i}") for i in range(1, room.capacity + 1)])
        return room
