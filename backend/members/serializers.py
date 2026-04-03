import re

from rest_framework import serializers

from allotments.models import AllotmentStatus, RoomAllotment

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
        read_only_fields = ("id", "is_deleted", "created_at", "updated_at")
        validators = []
        extra_kwargs = {
            "hostel": {"required": False},
            "guardian_name": {"required": False, "allow_blank": True},
            "id_number": {"required": False, "allow_blank": True},
            "emergency_contact": {"required": False, "allow_blank": True},
            "address": {"required": False, "allow_blank": True},
            "leaving_date": {"required": False, "allow_null": True},
            "remarks": {"required": False, "allow_blank": True},
        }

    def _resolve_hostel(self, attrs):
        if "hostel" in attrs and attrs["hostel"] is not None:
            return attrs["hostel"]

        if self.instance is not None:
            return self.instance.hostel

        request = self.context.get("request")
        if request is None:
            return None

        user = getattr(request, "user", None)
        return getattr(user, "hostel", None)

    def validate_phone(self, value):
        if not PHONE_PATTERN.match(value):
            raise serializers.ValidationError("Phone format is invalid.")
        return value

    def validate_emergency_contact(self, value):
        if value and not PHONE_PATTERN.match(value):
            raise serializers.ValidationError("Emergency contact format is invalid.")
        return value

    def validate(self, attrs):
        hostel = self._resolve_hostel(attrs)
        member_code = attrs.get("member_code", getattr(self.instance, "member_code", None))
        id_number = attrs.get("id_number", getattr(self.instance, "id_number", ""))
        status = attrs.get("status", getattr(self.instance, "status", None))
        leaving_date = attrs.get("leaving_date", getattr(self.instance, "leaving_date", None))

        if hostel and member_code:
            member_code_queryset = Member.objects.filter(hostel=hostel, member_code=member_code)
            if self.instance is not None:
                member_code_queryset = member_code_queryset.exclude(pk=self.instance.pk)
            if member_code_queryset.exists():
                raise serializers.ValidationError({"member_code": "Member code must be unique within the hostel."})

        if hostel and id_number:
            id_number_queryset = Member.objects.filter(hostel=hostel, id_number=id_number)
            if self.instance is not None:
                id_number_queryset = id_number_queryset.exclude(pk=self.instance.pk)
            if id_number_queryset.exists():
                raise serializers.ValidationError({"id_number": "ID number must be unique within the hostel."})

        if self.instance and status in {MemberStatus.INACTIVE, MemberStatus.CHECKED_OUT}:
            has_active_allotment = RoomAllotment.objects.filter(
                member=self.instance,
                status=AllotmentStatus.ACTIVE,
            ).exists()
            if has_active_allotment:
                raise serializers.ValidationError(
                    {"status": "Cannot set member inactive or checked out while an active allotment exists."}
                )

        if status in {MemberStatus.INACTIVE, MemberStatus.CHECKED_OUT} and not leaving_date:
            raise serializers.ValidationError({"leaving_date": "Leaving date is required for inactive or checked-out members."})
        if status == MemberStatus.ACTIVE:
            attrs["leaving_date"] = None
        return attrs
