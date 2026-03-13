from datetime import date
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User, UserRole
from billing.models import Invoice, InvoiceStatus
from hostels.models import Hostel
from members.models import Member, MemberStatus

from .models import (
    Announcement,
    AnnouncementAudience,
    AnnouncementMemberTarget,
    AnnouncementStatus,
    Notification,
    NotificationStatus,
    NotificationType,
)


class NotificationsModuleTests(APITestCase):
    def setUp(self):
        self.hostel_a = Hostel.objects.create(name="Alpha Hostel", code="ALPHA")
        self.hostel_b = Hostel.objects.create(name="Beta Hostel", code="BETA")

        self.admin_a = User.objects.create_user(
            username="admin_a",
            email="admin_a@example.com",
            password="Password123!",
            role=UserRole.ADMIN,
            hostel=self.hostel_a,
        )
        self.admin_b = User.objects.create_user(
            username="admin_b",
            email="admin_b@example.com",
            password="Password123!",
            role=UserRole.ADMIN,
            hostel=self.hostel_b,
        )
        self.staff_a = User.objects.create_user(
            username="staff_a",
            email="staff_a@example.com",
            password="Password123!",
            role=UserRole.STAFF,
            hostel=self.hostel_a,
        )
        self.superuser = User.objects.create_superuser(
            username="root",
            email="root@example.com",
            password="Password123!",
        )

        self.member_a1 = Member.objects.create(
            hostel=self.hostel_a,
            member_code="A-001",
            full_name="Alpha One",
            phone="+1234567001",
            status=MemberStatus.ACTIVE,
        )
        self.member_a2 = Member.objects.create(
            hostel=self.hostel_a,
            member_code="A-002",
            full_name="Alpha Two",
            phone="+1234567002",
            status=MemberStatus.ACTIVE,
        )
        self.member_b1 = Member.objects.create(
            hostel=self.hostel_b,
            member_code="B-001",
            full_name="Beta One",
            phone="+1234567003",
            status=MemberStatus.ACTIVE,
        )

    def test_create_selected_members_announcement_dedupes_targets(self):
        self.client.force_authenticate(self.admin_a)
        response = self.client.post(
            "/api/v1/notifications/announcements/",
            {
                "title": "Floor Cleaning",
                "body": "Please keep corridor clear between 10am-12pm.",
                "priority": "normal",
                "audience_type": AnnouncementAudience.SELECTED_MEMBERS,
                "selected_member_ids": [self.member_a1.id, self.member_a1.id, self.member_a2.id],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["hostel"], self.hostel_a.id)
        self.assertEqual(response.data["status"], AnnouncementStatus.DRAFT)
        self.assertEqual(
            AnnouncementMemberTarget.objects.filter(announcement_id=response.data["id"]).count(),
            2,
        )

    def test_publish_selected_members_without_targets_is_rejected(self):
        announcement = Announcement.objects.create(
            hostel=self.hostel_a,
            title="Targeted Circular",
            body="Internal note",
            audience_type=AnnouncementAudience.SELECTED_MEMBERS,
            created_by=self.admin_a,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.post(f"/api/v1/notifications/announcements/{announcement.id}/publish/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Selected-members announcement requires at least one target member.", str(response.data))
        announcement.refresh_from_db()
        self.assertEqual(announcement.status, AnnouncementStatus.DRAFT)

    def test_publish_announcement_creates_member_notifications(self):
        self.member_a2.status = MemberStatus.INACTIVE
        self.member_a2.save(update_fields=["status", "updated_at"])

        announcement = Announcement.objects.create(
            hostel=self.hostel_a,
            title="Water Shutdown",
            body="Water supply will be off from 2pm to 4pm.",
            audience_type=AnnouncementAudience.SELECTED_MEMBERS,
            created_by=self.admin_a,
        )
        AnnouncementMemberTarget.objects.create(announcement=announcement, member=self.member_a1)
        AnnouncementMemberTarget.objects.create(announcement=announcement, member=self.member_a2)

        self.client.force_authenticate(self.admin_a)
        response = self.client.post(f"/api/v1/notifications/announcements/{announcement.id}/publish/", {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], AnnouncementStatus.PUBLISHED)
        self.assertEqual(response.data["member_notifications"], 1)
        self.assertEqual(response.data["user_notifications"], 0)
        self.assertEqual(response.data["total_notifications"], 1)
        self.assertEqual(
            Notification.objects.filter(
                announcement=announcement,
                hostel=self.hostel_a,
                notification_type=NotificationType.ANNOUNCEMENT,
            ).count(),
            1,
        )

    def test_notification_mark_read_and_dismiss_flow(self):
        notification = Notification.objects.create(
            hostel=self.hostel_a,
            member=self.member_a1,
            notification_type=NotificationType.GENERAL,
            title="General Alert",
            message="Check notice board.",
            created_by=self.admin_a,
        )

        self.client.force_authenticate(self.admin_a)
        mark_read_response = self.client.post(
            f"/api/v1/notifications/notifications/{notification.id}/mark-read/",
            {},
            format="json",
        )
        self.assertEqual(mark_read_response.status_code, status.HTTP_200_OK)
        self.assertEqual(mark_read_response.data["status"], NotificationStatus.READ)
        self.assertIsNotNone(mark_read_response.data["read_at"])

        dismiss_response = self.client.post(
            f"/api/v1/notifications/notifications/{notification.id}/dismiss/",
            {},
            format="json",
        )
        self.assertEqual(dismiss_response.status_code, status.HTTP_200_OK)
        self.assertEqual(dismiss_response.data["status"], NotificationStatus.DISMISSED)

        patch_response = self.client.patch(
            f"/api/v1/notifications/notifications/{notification.id}/",
            {"title": "Edited"},
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_generate_fee_reminders_is_deduped_per_day(self):
        Invoice.objects.create(
            hostel=self.hostel_a,
            member=self.member_a1,
            billing_month=date(2026, 3, 1),
            issue_date=date(2026, 3, 1),
            due_date=date(2026, 3, 10),
            status=InvoiceStatus.OPEN,
            total_amount=Decimal("1500.00"),
            paid_amount=Decimal("0.00"),
            balance_amount=Decimal("1500.00"),
            created_by=self.admin_a,
        )

        self.client.force_authenticate(self.admin_a)
        first = self.client.post(
            "/api/v1/notifications/notifications/generate-fee-reminders/",
            {"due_on_or_before": "2026-03-31", "min_balance": "100.00"},
            format="json",
        )
        second = self.client.post(
            "/api/v1/notifications/notifications/generate-fee-reminders/",
            {"due_on_or_before": "2026-03-31", "min_balance": "100.00"},
            format="json",
        )

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data["created_count"], 1)
        self.assertEqual(first.data["skipped_count"], 0)

        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data["created_count"], 0)
        self.assertEqual(second.data["skipped_count"], 1)
        self.assertEqual(Notification.objects.filter(notification_type=NotificationType.FEE_REMINDER).count(), 1)

    def test_status_endpoint_is_hostel_scoped(self):
        Announcement.objects.create(
            hostel=self.hostel_a,
            title="A1",
            body="Alpha announcement",
            status=AnnouncementStatus.DRAFT,
            created_by=self.admin_a,
        )
        Notification.objects.create(
            hostel=self.hostel_a,
            member=self.member_a1,
            notification_type=NotificationType.FEE_REMINDER,
            title="Fee Pending",
            message="Please pay dues.",
            status=NotificationStatus.UNREAD,
            created_by=self.admin_a,
        )
        Announcement.objects.create(
            hostel=self.hostel_b,
            title="B1",
            body="Beta announcement",
            status=AnnouncementStatus.DRAFT,
            created_by=self.admin_b,
        )
        Notification.objects.create(
            hostel=self.hostel_b,
            member=self.member_b1,
            notification_type=NotificationType.FEE_REMINDER,
            title="Fee Pending Beta",
            message="Please pay dues.",
            status=NotificationStatus.UNREAD,
            created_by=self.admin_b,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.get("/api/v1/notifications/status/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["scope"]["hostel_id"], self.hostel_a.id)
        self.assertFalse(response.data["scope"]["is_global"])
        self.assertEqual(response.data["summary"]["draft_announcements"], 1)
        self.assertEqual(response.data["summary"]["notifications_unread"], 1)

    def test_create_notification_rejects_cross_hostel_member(self):
        self.client.force_authenticate(self.admin_a)
        response = self.client.post(
            "/api/v1/notifications/notifications/",
            {
                "member": self.member_b1.id,
                "notification_type": NotificationType.GENERAL,
                "title": "Cross Hostel",
                "message": "Should fail.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cross-hostel member is not allowed.", str(response.data))

    def test_staff_role_cannot_manage_notifications(self):
        self.client.force_authenticate(self.staff_a)
        response = self.client.get("/api/v1/notifications/announcements/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_superuser_create_requires_hostel_and_supports_filtered_list(self):
        self.client.force_authenticate(self.superuser)
        missing_hostel_response = self.client.post(
            "/api/v1/notifications/announcements/",
            {
                "title": "Global Draft",
                "body": "Hostel is missing",
                "audience_type": AnnouncementAudience.ALL_USERS,
            },
            format="json",
        )
        self.assertEqual(missing_hostel_response.status_code, status.HTTP_400_BAD_REQUEST)

        create_response = self.client.post(
            "/api/v1/notifications/announcements/",
            {
                "hostel": self.hostel_b.id,
                "title": "Beta Circular",
                "body": "For beta only",
                "audience_type": AnnouncementAudience.ALL_USERS,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["hostel"], self.hostel_b.id)

        list_response = self.client.get(f"/api/v1/notifications/announcements/?hostel={self.hostel_b.id}")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data["count"], 1)
