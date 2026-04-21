from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User
from .rbac import get_user_permissions


class UserReadSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "phone",
            "role",
            "hostel",
            "is_active",
            "permissions",
        )
        read_only_fields = fields

    def get_permissions(self, obj: User):
        return sorted(get_user_permissions(obj))


class UserWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    hostel_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "phone",
            "role",
            "hostel_id",
            "is_active",
            "password",
        )
        read_only_fields = ("id",)

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Password is required."})
        return attrs


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["hostel_id"] = user.hostel_id
        return token

    def validate(self, attrs):
        username = attrs.get(self.username_field)
        if isinstance(username, str):
            canonical_user = User.objects.filter(username__iexact=username).only("username").first()
            if canonical_user:
                attrs[self.username_field] = canonical_user.username

        data = super().validate(attrs)
        data["user"] = UserReadSerializer(self.user).data
        return data
