from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .permissions import HasRBACPermission
from .rbac import PermissionCode
from .serializers import MyTokenObtainPairSerializer, UserReadSerializer, UserWriteSerializer
from .services import create_staff_user, update_staff_user


class AuthTokenView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related("hostel").all()
    filterset_fields = ("role", "hostel", "is_active")
    search_fields = ("username", "first_name", "last_name", "email", "phone")
    ordering_fields = ("id", "username", "role")
    permission_classes = [IsAuthenticated, HasRBACPermission]
    permission_map = {
        "list": PermissionCode.MANAGE_USERS,
        "retrieve": PermissionCode.MANAGE_USERS,
        "create": PermissionCode.MANAGE_USERS,
        "update": PermissionCode.MANAGE_USERS,
        "partial_update": PermissionCode.MANAGE_USERS,
        "destroy": PermissionCode.MANAGE_USERS,
    }

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return UserWriteSerializer
        return UserReadSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_superuser:
            return queryset
        if user.hostel_id:
            return queryset.filter(hostel_id=user.hostel_id)
        return queryset.none()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = create_staff_user(actor=request.user, validated_data=serializer.validated_data)
        response_serializer = UserReadSerializer(result.user, context=self.get_serializer_context())
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        result = update_staff_user(actor=request.user, instance=instance, validated_data=serializer.validated_data)
        response_serializer = UserReadSerializer(result.user, context=self.get_serializer_context())
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)


class MeViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = UserReadSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    @action(detail=False, methods=["get"])
    def profile(self, request):
        serializer = self.get_serializer(self.get_object())
        return Response(serializer.data)
