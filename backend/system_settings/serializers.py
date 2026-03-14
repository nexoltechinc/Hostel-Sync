from __future__ import annotations

from rest_framework import serializers

from hostels.models import Hostel
from hostels.serializers import HostelSerializer

from .models import HostelSettings


class SettingsScopeQuerySerializer(serializers.Serializer):
    hostel = serializers.IntegerField(required=False, min_value=1)
    hostel_id = serializers.IntegerField(required=False, min_value=1)

    def validate(self, attrs):
        hostel = attrs.get("hostel")
        hostel_id = attrs.get("hostel_id")
        if hostel and hostel_id and hostel != hostel_id:
            raise serializers.ValidationError({"hostel": "hostel and hostel_id must match when both are provided."})
        attrs["resolved_hostel"] = hostel or hostel_id
        return attrs


class HostelProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hostel
        fields = (
            "name",
            "code",
            "address",
            "phone",
            "email",
            "timezone",
            "is_active",
        )


class BrandingSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = HostelSettings
        fields = (
            "brand_name",
            "website_url",
            "primary_color",
            "accent_color",
        )


class FinancialSettingsSerializer(serializers.ModelSerializer):
    late_fee_amount = serializers.DecimalField(max_digits=10, decimal_places=2, coerce_to_string=False)
    default_security_deposit = serializers.DecimalField(max_digits=10, decimal_places=2, coerce_to_string=False)
    default_admission_fee = serializers.DecimalField(max_digits=10, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = HostelSettings
        fields = (
            "currency_code",
            "invoice_due_day",
            "late_fee_amount",
            "default_security_deposit",
            "default_admission_fee",
            "allow_partial_payments",
            "auto_apply_member_credit",
        )


class NotificationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = HostelSettings
        fields = (
            "enable_announcements",
            "enable_fee_reminders",
            "fee_reminder_days_before",
            "fee_reminder_days_after",
            "enable_attendance_alerts",
        )


class OperationsSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = HostelSettings
        fields = (
            "attendance_cutoff_time",
            "allow_attendance_corrections",
            "checkout_notice_days",
            "require_checkout_clearance",
        )


class AccessSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = HostelSettings
        fields = (
            "allow_admin_manage_users",
            "allow_admin_manage_hostel_settings",
            "allow_warden_view_reports",
            "allow_staff_view_reports",
        )


class HostelSettingsSnapshotSerializer(serializers.ModelSerializer):
    hostel = HostelSerializer(read_only=True)
    branding = BrandingSettingsSerializer(source="*", read_only=True)
    financial = FinancialSettingsSerializer(source="*", read_only=True)
    notifications = NotificationSettingsSerializer(source="*", read_only=True)
    operations = OperationsSettingsSerializer(source="*", read_only=True)
    access = AccessSettingsSerializer(source="*", read_only=True)
    updated_by = serializers.SerializerMethodField()

    class Meta:
        model = HostelSettings
        fields = (
            "id",
            "hostel",
            "branding",
            "financial",
            "notifications",
            "operations",
            "access",
            "updated_at",
            "updated_by",
        )

    def get_updated_by(self, obj: HostelSettings):
        if not obj.updated_by:
            return None
        full_name = obj.updated_by.get_full_name().strip()
        return full_name or obj.updated_by.username


class HostelSettingsUpdateSerializer(serializers.Serializer):
    hostel = HostelProfileUpdateSerializer(required=False)
    branding = BrandingSettingsSerializer(required=False)
    financial = FinancialSettingsSerializer(required=False)
    notifications = NotificationSettingsSerializer(required=False)
    operations = OperationsSettingsSerializer(required=False)
    access = AccessSettingsSerializer(required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name in ("hostel", "branding", "financial", "notifications", "operations", "access"):
            self.fields[field_name].partial = True

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("At least one settings section must be provided.")
        return attrs

    def update(self, instance: HostelSettings, validated_data: dict) -> HostelSettings:
        hostel_data = validated_data.pop("hostel", None)
        settings_sections = validated_data

        if hostel_data:
            for field, value in hostel_data.items():
                setattr(instance.hostel, field, value)
            instance.hostel.save()

        updated = False
        for _, section_data in settings_sections.items():
            for field, value in section_data.items():
                setattr(instance, field, value)
                updated = True

        request = self.context.get("request")
        if request and request.user.is_authenticated:
            instance.updated_by = request.user
            updated = True

        if updated:
            instance.save()
        elif hostel_data:
            instance.refresh_from_db()

        return instance
