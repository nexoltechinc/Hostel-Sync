from __future__ import annotations

from django.db import transaction
from rest_framework import serializers

from hostels.models import Hostel

from .models import HostelSettings


def resolve_hostel_for_request(*, user, requested_hostel_id: int | None = None) -> Hostel:
    if user.is_superuser:
        hostel = None
        if requested_hostel_id:
            hostel = Hostel.objects.filter(pk=requested_hostel_id).first()
        elif user.hostel_id:
            hostel = Hostel.objects.filter(pk=user.hostel_id).first()
        else:
            hostel = Hostel.objects.order_by("id").first()
        if hostel is None:
            raise serializers.ValidationError({"hostel": "No hostel is available to configure."})
        return hostel

    if not user.hostel_id:
        raise serializers.ValidationError({"hostel": "Your account is not linked to a hostel."})
    return Hostel.objects.get(pk=user.hostel_id)


@transaction.atomic
def get_or_create_hostel_settings(*, hostel: Hostel) -> HostelSettings:
    settings, _ = HostelSettings.objects.select_for_update().get_or_create(hostel=hostel)
    return settings
