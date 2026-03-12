import re

from rest_framework import serializers

from .models import Member, MemberStatus

PHONE_PATTERN = re.compile(r"^[\d+\-()\s]{7,20}$")


class MemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = (
            "id",
            "hostel",
            "member_code",
            "full_name",
            "guardian_name",
            "id_number",
            "phone",
            "emergency_contact",
            "address",
            "joining_date",
            "gender",
            "status",
            "leaving_date",
            "remarks",
            "is_deleted",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_phone(self, value):
        if not PHONE_PATTERN.match(value):
            raise serializers.ValidationError("Phone format is invalid.")
        return value

    def validate_emergency_contact(self, value):
        if value and not PHONE_PATTERN.match(value):
            raise serializers.ValidationError("Emergency contact format is invalid.")
        return value

    def validate(self, attrs):
        status = attrs.get("status", getattr(self.instance, "status", None))
        leaving_date = attrs.get("leaving_date", getattr(self.instance, "leaving_date", None))
        if status in {MemberStatus.INACTIVE, MemberStatus.CHECKED_OUT} and not leaving_date:
            raise serializers.ValidationError({"leaving_date": "Leaving date is required for inactive or checked-out members."})
        return attrs
