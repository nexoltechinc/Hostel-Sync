from datetime import date

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers

from members.models import Member, MemberStatus

from .models import AttendanceRecord, AttendanceStatus


class AttendanceRecordSerializer(serializers.ModelSerializer):
    member_code = serializers.CharField(source="member.member_code", read_only=True)
    member_name = serializers.CharField(source="member.full_name", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = (
            "id",
            "hostel",
            "member",
            "member_code",
            "member_name",
            "attendance_date",
            "status",
            "remarks",
            "marked_by",
            "corrected_by",
            "corrected_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "hostel",
            "member_code",
            "member_name",
            "marked_by",
            "corrected_by",
            "corrected_at",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        request = self.context.get("request")
        member = attrs.get("member", getattr(self.instance, "member", None))
        attendance_date = attrs.get("attendance_date", getattr(self.instance, "attendance_date", None))

        if member is None:
            raise serializers.ValidationError({"member": "Member is required."})
        if attendance_date is None:
            raise serializers.ValidationError({"attendance_date": "Attendance date is required."})

        if member.is_deleted:
            raise serializers.ValidationError({"member": "Archived members cannot be marked for attendance."})

        if not self.instance and member.status != MemberStatus.ACTIVE:
            raise serializers.ValidationError({"member": "Only active members can be marked for new attendance records."})

        if attendance_date > timezone.localdate():
            raise serializers.ValidationError({"attendance_date": "Attendance cannot be marked for a future date."})

        if request and not request.user.is_superuser:
            if not request.user.hostel_id:
                raise serializers.ValidationError("Your account is not linked to a hostel.")
            if member.hostel_id != request.user.hostel_id:
                raise serializers.ValidationError("You can only manage attendance for your own hostel.")

        if self.instance:
            if "member" in attrs and attrs["member"].id != self.instance.member_id:
                raise serializers.ValidationError({"member": "Member cannot be changed in attendance correction."})
            if "attendance_date" in attrs and attrs["attendance_date"] != self.instance.attendance_date:
                raise serializers.ValidationError(
                    {"attendance_date": "Attendance date cannot be changed in attendance correction."}
                )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        try:
            return AttendanceRecord.objects.create(
                hostel=validated_data["member"].hostel,
                marked_by=request.user,
                **validated_data,
            )
        except IntegrityError as exc:
            raise serializers.ValidationError({"detail": "Attendance already exists for this member on the selected date."}) from exc

    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context["request"]
        for field in ("status", "remarks"):
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.corrected_by = request.user
        instance.corrected_at = timezone.now()
        instance.save(update_fields=["status", "remarks", "corrected_by", "corrected_at", "updated_at"])
        return instance


class DailySheetQuerySerializer(serializers.Serializer):
    attendance_date = serializers.DateField(default=timezone.localdate)

    def validate_attendance_date(self, value: date):
        if value > timezone.localdate():
            raise serializers.ValidationError("Attendance cannot be marked for a future date.")
        return value


class BulkAttendanceEntrySerializer(serializers.Serializer):
    member = serializers.PrimaryKeyRelatedField(queryset=Member.objects.select_related("hostel").all())
    status = serializers.ChoiceField(choices=AttendanceStatus.choices)
    remarks = serializers.CharField(required=False, allow_blank=True, max_length=500)


class BulkAttendanceMarkSerializer(serializers.Serializer):
    attendance_date = serializers.DateField(default=timezone.localdate)
    entries = BulkAttendanceEntrySerializer(many=True, allow_empty=False)

    def validate_attendance_date(self, value: date):
        if value > timezone.localdate():
            raise serializers.ValidationError("Attendance cannot be marked for a future date.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        entries = attrs["entries"]
        seen_member_ids: set[int] = set()

        for raw in entries:
            member = raw["member"]

            if member.id in seen_member_ids:
                raise serializers.ValidationError({"entries": f"Duplicate member entry found for member id {member.id}."})
            seen_member_ids.add(member.id)

            if member.is_deleted:
                raise serializers.ValidationError({"entries": f"Archived member cannot be marked (member id {member.id})."})

            if member.status != MemberStatus.ACTIVE:
                raise serializers.ValidationError({"entries": f"Only active members can be marked (member id {member.id})."})

            if request and not request.user.is_superuser:
                if not request.user.hostel_id:
                    raise serializers.ValidationError("Your account is not linked to a hostel.")
                if member.hostel_id != request.user.hostel_id:
                    raise serializers.ValidationError({"entries": f"Cross-hostel member is not allowed (member id {member.id})."})
        return attrs

    @transaction.atomic
    def save(self, *, actor):
        attendance_date = self.validated_data["attendance_date"]
        entries = self.validated_data["entries"]

        created_count = 0
        updated_count = 0
        record_ids: list[int] = []

        for entry in entries:
            member = Member.objects.select_for_update().get(pk=entry["member"].id)
            record, created = AttendanceRecord.objects.select_for_update().get_or_create(
                member=member,
                attendance_date=attendance_date,
                defaults={
                    "hostel": member.hostel,
                    "status": entry["status"],
                    "remarks": entry.get("remarks", ""),
                    "marked_by": actor,
                },
            )

            if created:
                created_count += 1
            else:
                record.status = entry["status"]
                record.remarks = entry.get("remarks", "")
                record.corrected_by = actor
                record.corrected_at = timezone.now()
                record.save(update_fields=["status", "remarks", "corrected_by", "corrected_at", "updated_at"])
                updated_count += 1

            record_ids.append(record.id)

        return {
            "attendance_date": attendance_date,
            "created_count": created_count,
            "updated_count": updated_count,
            "record_ids": record_ids,
        }
