from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User, UserRole
from hostels.models import Hostel

from .models import HostelSettings


class SettingsModuleTests(APITestCase):
    def setUp(self):
        self.hostel_a = Hostel.objects.create(name="Alpha Hostel", code="ALPHA", timezone="Asia/Karachi")
        self.hostel_b = Hostel.objects.create(name="Beta Hostel", code="BETA", timezone="UTC")

        self.owner_a = User.objects.create_user(
            username="owner_a",
            email="owner_a@example.com",
            password="Password123!",
            role=UserRole.OWNER,
            hostel=self.hostel_a,
        )
        self.admin_a = User.objects.create_user(
            username="admin_a",
            email="admin_a@example.com",
            password="Password123!",
            role=UserRole.ADMIN,
            hostel=self.hostel_a,
        )
        self.warden_a = User.objects.create_user(
            username="warden_a",
            email="warden_a@example.com",
            password="Password123!",
            role=UserRole.WARDEN,
            hostel=self.hostel_a,
        )
        self.staff_a = User.objects.create_user(
            username="staff_a",
            email="staff_a@example.com",
            password="Password123!",
            role=UserRole.STAFF,
            hostel=self.hostel_a,
        )
        self.owner_b = User.objects.create_user(
            username="owner_b",
            email="owner_b@example.com",
            password="Password123!",
            role=UserRole.OWNER,
            hostel=self.hostel_b,
        )

    def test_owner_can_fetch_current_settings_with_defaults(self):
        self.client.force_authenticate(self.owner_a)
        response = self.client.get("/api/v1/settings/current/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["phase"], 10)
        self.assertEqual(response.data["data"]["hostel"]["code"], "ALPHA")
        self.assertEqual(response.data["data"]["financial"]["currency_code"], "USD")
        self.assertTrue(response.data["data"]["access"]["allow_admin_manage_hostel_settings"])

    def test_owner_can_update_profile_and_settings_sections(self):
        self.client.force_authenticate(self.owner_a)
        response = self.client.patch(
            "/api/v1/settings/current/",
            {
                "hostel": {
                    "phone": "+1234567890",
                    "timezone": "America/Los_Angeles",
                },
                "branding": {
                    "brand_name": "Alpha Residences",
                    "primary_color": "#0F766E",
                },
                "financial": {
                    "currency_code": "PKR",
                    "invoice_due_day": 10,
                    "default_security_deposit": 5000,
                },
                "access": {
                    "allow_admin_manage_users": False,
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.hostel_a.refresh_from_db()
        hostel_settings = HostelSettings.objects.get(hostel=self.hostel_a)

        self.assertEqual(self.hostel_a.phone, "+1234567890")
        self.assertEqual(self.hostel_a.timezone, "America/Los_Angeles")
        self.assertEqual(hostel_settings.brand_name, "Alpha Residences")
        self.assertEqual(hostel_settings.primary_color, "#0F766E")
        self.assertEqual(hostel_settings.currency_code, "PKR")
        self.assertEqual(float(hostel_settings.default_security_deposit), 5000.0)
        self.assertFalse(hostel_settings.allow_admin_manage_users)

    def test_admin_inherits_manage_settings_permission_from_hostel_settings(self):
        self.client.force_authenticate(self.admin_a)
        response = self.client.get("/api/v1/settings/current/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("manage_hostel_settings", response.data["effective_permissions"])

    def test_disabling_admin_user_management_blocks_user_admin_endpoints(self):
        hostel_settings = HostelSettings.objects.get(hostel=self.hostel_a)
        hostel_settings.allow_admin_manage_users = False
        hostel_settings.allow_admin_manage_hostel_settings = True
        hostel_settings.save()
        self.client.force_authenticate(self.admin_a)

        response = self.client.get("/api/v1/auth/users/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_warden_report_access_can_be_enabled_from_settings(self):
        hostel_settings = HostelSettings.objects.get(hostel=self.hostel_a)
        hostel_settings.allow_admin_manage_users = True
        hostel_settings.allow_admin_manage_hostel_settings = True
        hostel_settings.allow_warden_view_reports = True
        hostel_settings.save()
        self.client.force_authenticate(self.warden_a)

        response = self.client.get("/api/v1/reports/status/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_staff_report_access_stays_blocked_by_default(self):
        self.client.force_authenticate(self.staff_a)
        response = self.client.get("/api/v1/reports/status/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_hostel_management_endpoints_are_scoped_to_current_hostel(self):
        self.client.force_authenticate(self.owner_a)
        response = self.client.get("/api/v1/hostels/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["code"], "ALPHA")

    def test_non_settings_user_cannot_read_hostels(self):
        self.client.force_authenticate(self.staff_a)
        response = self.client.get("/api/v1/hostels/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
