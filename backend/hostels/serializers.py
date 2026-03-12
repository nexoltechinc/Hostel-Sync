from rest_framework import serializers

from .models import Hostel


class HostelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hostel
        fields = (
            "id",
            "name",
            "code",
            "address",
            "phone",
            "email",
            "timezone",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
