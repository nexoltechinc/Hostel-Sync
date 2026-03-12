from __future__ import annotations

from dataclasses import dataclass

from django.db import transaction
from rest_framework import serializers

from .models import User, UserRole


ALLOWED_CREATION_BY_ROLE: dict[str, set[str]] = {
    UserRole.OWNER: {UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.WARDEN, UserRole.STAFF},
    UserRole.ADMIN: {UserRole.ACCOUNTANT, UserRole.WARDEN, UserRole.STAFF},
}


@dataclass(frozen=True)
class UserServiceResult:
    user: User


def _validate_role_assignment(actor: User, target_role: str) -> None:
    if actor.is_superuser:
        return

    allowed_roles = ALLOWED_CREATION_BY_ROLE.get(actor.role, set())
    if target_role not in allowed_roles:
        raise serializers.ValidationError({"role": "You are not allowed to assign this role."})


def _resolve_hostel(actor: User, requested_hostel_id: int | None) -> int | None:
    if actor.is_superuser:
        return requested_hostel_id

    if not actor.hostel_id:
        raise serializers.ValidationError({"hostel": "Your account is not linked to any hostel."})
    if requested_hostel_id and requested_hostel_id != actor.hostel_id:
        raise serializers.ValidationError({"hostel": "You can only assign users within your hostel."})
    return actor.hostel_id


@transaction.atomic
def create_staff_user(*, actor: User, validated_data: dict) -> UserServiceResult:
    password = validated_data.pop("password")
    target_role = validated_data.get("role", UserRole.STAFF)
    _validate_role_assignment(actor, target_role)

    requested_hostel_id = validated_data.pop("hostel_id", None)
    validated_data["hostel_id"] = _resolve_hostel(actor, requested_hostel_id)
    user = User(**validated_data)
    user.set_password(password)
    user.save()
    return UserServiceResult(user=user)


@transaction.atomic
def update_staff_user(*, actor: User, instance: User, validated_data: dict) -> UserServiceResult:
    if not actor.is_superuser:
        if not actor.hostel_id:
            raise serializers.ValidationError({"hostel": "Your account is not linked to any hostel."})
        if instance.hostel_id != actor.hostel_id:
            raise serializers.ValidationError("You can only update users from your hostel.")

    new_role = validated_data.get("role")
    if new_role and new_role != instance.role:
        _validate_role_assignment(actor, new_role)

    requested_hostel_id = validated_data.pop("hostel_id", instance.hostel_id)
    instance.hostel_id = _resolve_hostel(actor, requested_hostel_id)

    password = validated_data.pop("password", None)
    for key, value in validated_data.items():
        setattr(instance, key, value)
    if password:
        instance.set_password(password)
    instance.save()
    return UserServiceResult(user=instance)
