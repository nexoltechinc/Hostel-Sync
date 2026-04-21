from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User, UserRole
from hostels.models import Hostel


class AuthLoginTests(APITestCase):
    def test_login_accepts_username_case_insensitively(self):
        hostel = Hostel.objects.create(name="Hostel Sync", code="HS")
        User.objects.create_user(
            username="Admin@HostelSync",
            email="admin@hostelsync.local",
            password="Hostel#03",
            role=UserRole.ADMIN,
            hostel=hostel,
        )

        response = self.client.post(
            "/api/v1/auth/login/",
            {"username": "Admin@hostelSync", "password": "Hostel#03"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["username"], "Admin@HostelSync")
