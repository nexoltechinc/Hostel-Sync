from __future__ import annotations

from datetime import date
from decimal import Decimal

from rest_framework import serializers

from attendance.models import AttendanceStatus
from billing.models import PaymentMethod
from rooms.models import RoomType


class ReportScopeQuerySerializer(serializers.Serializer):
    hostel = serializers.IntegerField(required=False, min_value=1)
    hostel_id = serializers.IntegerField(required=False, min_value=1)

    def validate(self, attrs):
        hostel = attrs.get("hostel")
        hostel_id = attrs.get("hostel_id")
        if hostel and hostel_id and hostel != hostel_id:
            raise serializers.ValidationError({"hostel": "hostel and hostel_id must match when both are provided."})
        attrs["resolved_hostel"] = hostel or hostel_id
        return attrs


class OccupancyReportQuerySerializer(ReportScopeQuerySerializer):
    room_type = serializers.ChoiceField(choices=RoomType.choices, required=False)
    is_active = serializers.BooleanField(required=False, allow_null=True, default=None)


class FeeCollectionReportQuerySerializer(ReportScopeQuerySerializer):
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    member = serializers.IntegerField(required=False, min_value=1)
    method = serializers.ChoiceField(choices=PaymentMethod.choices, required=False)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        date_from = attrs.get("date_from")
        date_to = attrs.get("date_to")
        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError({"date_to": "date_to must be on or after date_from."})
        return attrs


class PendingDuesReportQuerySerializer(ReportScopeQuerySerializer):
    billing_month = serializers.DateField(required=False)
    due_on_or_before = serializers.DateField(required=False)
    member = serializers.IntegerField(required=False, min_value=1)
    only_overdue = serializers.BooleanField(required=False, default=False)
    min_balance = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        default=Decimal("0.01"),
    )

    def validate_min_balance(self, value: Decimal):
        if value <= Decimal("0.00"):
            raise serializers.ValidationError("min_balance must be greater than zero.")
        return value

    def validate_billing_month(self, value: date):
        return value.replace(day=1)


class AttendanceReportQuerySerializer(ReportScopeQuerySerializer):
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    member = serializers.IntegerField(required=False, min_value=1)
    status = serializers.ChoiceField(choices=AttendanceStatus.choices, required=False)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        date_from = attrs.get("date_from")
        date_to = attrs.get("date_to")
        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError({"date_to": "date_to must be on or after date_from."})
        return attrs
