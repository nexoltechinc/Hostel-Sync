from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User, UserRole
from allotments.models import AllotmentStatus, RoomAllotment
from hostels.models import Hostel
from members.models import Member, MemberStatus
from rooms.models import Bed, Room


class MemberModuleTests(APITestCase):
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
        self.accountant_a = User.objects.create_user(
            username="accountant_a",
            email="accountant_a@example.com",
            password="Password123!",
            role=UserRole.ACCOUNTANT,
            hostel=self.hostel_a,
        )
        self.admin_b = User.objects.create_user(
            username="admin_b",
            email="admin_b@example.com",
            password="Password123!",
            role=UserRole.ADMIN,
            hostel=self.hostel_b,
        )

    def test_list_is_scoped_to_user_hostel_and_excludes_archived(self):
        member_visible = Member.objects.create(
            hostel=self.hostel_a,
            member_code="A-001",
            full_name="Visible Member",
            phone="+1234567890",
        )
        Member.objects.create(
            hostel=self.hostel_a,
            member_code="A-002",
            full_name="Archived Member",
            phone="+1234567891",
            is_deleted=True,
        )
        Member.objects.create(
            hostel=self.hostel_b,
            member_code="B-001",
            full_name="Other Hostel Member",
            phone="+1234567892",
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.get("/api/v1/members/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], member_visible.id)

    def test_create_assigns_hostel_from_authenticated_user(self):
        self.client.force_authenticate(self.admin_a)

        payload = {
            "hostel": self.hostel_b.id,
            "member_code": "A-003",
            "full_name": "Scoped Create",
            "phone": "+1234567000",
            "joining_date": "2026-03-01",
            "gender": "male",
            "status": "active",
        }
        response = self.client.post("/api/v1/members/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["hostel"], self.hostel_a.id)

    def test_cannot_create_inactive_member_without_leaving_date(self):
        self.client.force_authenticate(self.admin_a)

        payload = {
            "member_code": "A-004",
            "full_name": "Invalid Inactive",
            "phone": "+1234567001",
            "joining_date": "2026-03-01",
            "gender": "female",
            "status": "inactive",
        }
        response = self.client.post("/api/v1/members/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("leaving_date", response.data)

    def test_read_only_role_cannot_create_or_update_members(self):
        member = Member.objects.create(
            hostel=self.hostel_a,
            member_code="A-005",
            full_name="Readonly Target",
            phone="+1234567002",
        )

        self.client.force_authenticate(self.accountant_a)

        list_response = self.client.get("/api/v1/members/")
        create_response = self.client.post(
            "/api/v1/members/",
            {
                "member_code": "A-006",
                "full_name": "Blocked Create",
                "phone": "+1234567003",
                "joining_date": "2026-03-01",
                "gender": "male",
                "status": "active",
            },
            format="json",
        )
        update_response = self.client.patch(
            f"/api/v1/members/{member.id}/",
            {"full_name": "Blocked Update"},
            format="json",
        )

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(update_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_soft_delete_archives_member(self):
        member = Member.objects.create(
            hostel=self.hostel_a,
            member_code="A-007",
            full_name="Archive Candidate",
            phone="+1234567004",
            status=MemberStatus.ACTIVE,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.delete(f"/api/v1/members/{member.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        member.refresh_from_db()
        self.assertTrue(member.is_deleted)
        self.assertEqual(member.status, MemberStatus.INACTIVE)
        self.assertIsNotNone(member.leaving_date)

        list_response = self.client.get("/api/v1/members/")
        member_ids = [entry["id"] for entry in list_response.data["results"]]
        self.assertNotIn(member.id, member_ids)

    def test_soft_delete_rejects_member_with_active_allotment(self):
        member = Member.objects.create(
            hostel=self.hostel_a,
            member_code="A-008",
            full_name="Allotted Member",
            phone="+1234567005",
            status=MemberStatus.ACTIVE,
        )
        room = Room.objects.create(
            hostel=self.hostel_a,
            room_code="R-101",
            capacity=2,
            room_type="standard",
        )
        bed = Bed.objects.create(room=room, label="B1")
        RoomAllotment.objects.create(
            hostel=self.hostel_a,
            member=member,
            bed=bed,
            start_date=date(2026, 3, 1),
            status=AllotmentStatus.ACTIVE,
            created_by=self.admin_a,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.delete(f"/api/v1/members/{member.id}/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Cannot archive a member with active room allotment.")

        member.refresh_from_db()
        self.assertFalse(member.is_deleted)

    def test_status_transition_requires_leaving_date_then_allows_activation(self):
        member = Member.objects.create(
            hostel=self.hostel_a,
            member_code="A-009",
            full_name="Transition Member",
            phone="+1234567006",
            status=MemberStatus.ACTIVE,
        )

        self.client.force_authenticate(self.admin_a)

        invalid_checkout = self.client.patch(
            f"/api/v1/members/{member.id}/",
            {"status": "checked_out"},
            format="json",
        )
        valid_checkout = self.client.patch(
            f"/api/v1/members/{member.id}/",
            {"status": "checked_out", "leaving_date": "2026-03-10"},
            format="json",
        )
        reactivate = self.client.patch(
            f"/api/v1/members/{member.id}/",
            {"status": "active"},
            format="json",
        )

        self.assertEqual(invalid_checkout.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("leaving_date", invalid_checkout.data)

        self.assertEqual(valid_checkout.status_code, status.HTTP_200_OK)
        self.assertEqual(valid_checkout.data["status"], MemberStatus.CHECKED_OUT)

        self.assertEqual(reactivate.status_code, status.HTTP_200_OK)
        self.assertEqual(reactivate.data["status"], MemberStatus.ACTIVE)
        self.assertIsNone(reactivate.data["leaving_date"])

    def test_member_cannot_be_marked_checked_out_with_active_allotment(self):
        member = Member.objects.create(
            hostel=self.hostel_a,
            member_code="A-010",
            full_name="Has Active Allotment",
            phone="+1234567008",
            status=MemberStatus.ACTIVE,
        )
        room = Room.objects.create(
            hostel=self.hostel_a,
            room_code="R-102",
            capacity=1,
            room_type="standard",
        )
        bed = Bed.objects.create(room=room, label="B1")
        RoomAllotment.objects.create(
            hostel=self.hostel_a,
            member=member,
            bed=bed,
            start_date=date(2026, 3, 1),
            status=AllotmentStatus.ACTIVE,
            created_by=self.admin_a,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.patch(
            f"/api/v1/members/{member.id}/",
            {"status": "checked_out", "leaving_date": "2026-03-10"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["status"][0],
            "Cannot set member inactive or checked out while an active allotment exists.",
        )

        member.refresh_from_db()
        self.assertEqual(member.status, MemberStatus.ACTIVE)

    def test_cross_hostel_record_is_not_accessible(self):
        member_other_hostel = Member.objects.create(
            hostel=self.hostel_b,
            member_code="B-002",
            full_name="Cross Hostel",
            phone="+1234567007",
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.get(f"/api/v1/members/{member_other_hostel.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
