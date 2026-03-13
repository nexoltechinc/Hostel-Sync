from datetime import date
from unittest.mock import patch

from django.db import IntegrityError
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User, UserRole
from hostels.models import Hostel
from members.models import Member, MemberStatus
from rooms.models import Bed, Room

from .models import AllotmentStatus, RoomAllotment


class AllotmentModuleTests(APITestCase):
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

    def test_create_allotment_success(self):
        room = Room.objects.create(hostel=self.hostel_a, room_code="A-101", capacity=2, room_type="standard")
        bed = Bed.objects.create(room=room, label="B1", is_active=True)
        member = Member.objects.create(
            hostel=self.hostel_a,
            member_code="M-001",
            full_name="Resident One",
            phone="+1234567000",
            status=MemberStatus.ACTIVE,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.post(
            "/api/v1/allotments/",
            {
                "member": member.id,
                "bed": bed.id,
                "start_date": "2026-03-01",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], AllotmentStatus.ACTIVE)
        self.assertEqual(response.data["hostel"], self.hostel_a.id)

        allotment = RoomAllotment.objects.get(id=response.data["id"])
        self.assertEqual(allotment.member_id, member.id)
        self.assertEqual(allotment.bed_id, bed.id)
        self.assertEqual(allotment.created_by_id, self.admin_a.id)

    def test_create_rejects_inactive_bed(self):
        room = Room.objects.create(hostel=self.hostel_a, room_code="A-102", capacity=1, room_type="standard")
        bed = Bed.objects.create(room=room, label="B1", is_active=False)
        member = Member.objects.create(
            hostel=self.hostel_a,
            member_code="M-002",
            full_name="Resident Two",
            phone="+1234567001",
            status=MemberStatus.ACTIVE,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.post(
            "/api/v1/allotments/",
            {"member": member.id, "bed": bed.id, "start_date": "2026-03-01"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["bed"][0], "Only active beds can be allotted.")

    def test_create_rejects_bed_in_inactive_room(self):
        room = Room.objects.create(
            hostel=self.hostel_a,
            room_code="A-103",
            capacity=1,
            room_type="standard",
            is_active=False,
        )
        bed = Bed.objects.create(room=room, label="B1", is_active=True)
        member = Member.objects.create(
            hostel=self.hostel_a,
            member_code="M-003",
            full_name="Resident Three",
            phone="+1234567002",
            status=MemberStatus.ACTIVE,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.post(
            "/api/v1/allotments/",
            {"member": member.id, "bed": bed.id, "start_date": "2026-03-01"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["bed"][0], "Cannot allot a bed in an inactive room.")

    def test_allotment_delete_is_blocked(self):
        room = Room.objects.create(hostel=self.hostel_a, room_code="A-104", capacity=1, room_type="private")
        bed = Bed.objects.create(room=room, label="B1", is_active=True)
        member = Member.objects.create(
            hostel=self.hostel_a,
            member_code="M-004",
            full_name="Resident Four",
            phone="+1234567003",
            status=MemberStatus.ACTIVE,
        )
        allotment = RoomAllotment.objects.create(
            hostel=self.hostel_a,
            member=member,
            bed=bed,
            start_date=date(2026, 3, 1),
            status=AllotmentStatus.ACTIVE,
            created_by=self.admin_a,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.delete(f"/api/v1/allotments/{allotment.id}/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Allotment records are immutable and cannot be deleted.")
        self.assertTrue(RoomAllotment.objects.filter(id=allotment.id).exists())

    def test_transfer_rejects_inactive_new_bed(self):
        room = Room.objects.create(hostel=self.hostel_a, room_code="A-105", capacity=2, room_type="standard")
        old_bed = Bed.objects.create(room=room, label="B1", is_active=True)
        new_bed = Bed.objects.create(room=room, label="B2", is_active=False)
        member = Member.objects.create(
            hostel=self.hostel_a,
            member_code="M-005",
            full_name="Resident Five",
            phone="+1234567004",
            status=MemberStatus.ACTIVE,
        )
        allotment = RoomAllotment.objects.create(
            hostel=self.hostel_a,
            member=member,
            bed=old_bed,
            start_date=date(2026, 3, 1),
            status=AllotmentStatus.ACTIVE,
            created_by=self.admin_a,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.post(
            f"/api/v1/allotments/{allotment.id}/transfer/",
            {"new_bed": new_bed.id, "transfer_date": "2026-03-05"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["new_bed"][0], "New bed must be active.")

    def test_transfer_rejects_inactive_new_room(self):
        old_room = Room.objects.create(hostel=self.hostel_a, room_code="A-106", capacity=1, room_type="standard")
        new_room = Room.objects.create(
            hostel=self.hostel_a,
            room_code="A-107",
            capacity=1,
            room_type="standard",
            is_active=False,
        )
        old_bed = Bed.objects.create(room=old_room, label="B1", is_active=True)
        new_bed = Bed.objects.create(room=new_room, label="B1", is_active=True)
        member = Member.objects.create(
            hostel=self.hostel_a,
            member_code="M-006",
            full_name="Resident Six",
            phone="+1234567005",
            status=MemberStatus.ACTIVE,
        )
        allotment = RoomAllotment.objects.create(
            hostel=self.hostel_a,
            member=member,
            bed=old_bed,
            start_date=date(2026, 3, 1),
            status=AllotmentStatus.ACTIVE,
            created_by=self.admin_a,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.post(
            f"/api/v1/allotments/{allotment.id}/transfer/",
            {"new_bed": new_bed.id, "transfer_date": "2026-03-06"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["new_bed"][0], "Cannot transfer into an inactive room.")

    def test_transfer_conflict_rolls_back_current_allotment(self):
        room = Room.objects.create(hostel=self.hostel_a, room_code="A-108", capacity=2, room_type="standard")
        old_bed = Bed.objects.create(room=room, label="B1", is_active=True)
        new_bed = Bed.objects.create(room=room, label="B2", is_active=True)
        member = Member.objects.create(
            hostel=self.hostel_a,
            member_code="M-007",
            full_name="Resident Seven",
            phone="+1234567006",
            status=MemberStatus.ACTIVE,
        )
        allotment = RoomAllotment.objects.create(
            hostel=self.hostel_a,
            member=member,
            bed=old_bed,
            start_date=date(2026, 3, 1),
            status=AllotmentStatus.ACTIVE,
            created_by=self.admin_a,
        )

        self.client.force_authenticate(self.admin_a)
        with patch("allotments.views.RoomAllotment.objects.create", side_effect=IntegrityError("race")):
            response = self.client.post(
                f"/api/v1/allotments/{allotment.id}/transfer/",
                {"new_bed": new_bed.id, "transfer_date": "2026-03-06"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            str(response.data["detail"]),
            "Transfer conflict detected. Member or bed was updated by another request.",
        )

        allotment.refresh_from_db()
        self.assertEqual(allotment.status, AllotmentStatus.ACTIVE)
        self.assertIsNone(allotment.end_date)
        self.assertEqual(RoomAllotment.objects.filter(member=member, status=AllotmentStatus.ACTIVE).count(), 1)

    def test_checkout_closes_allotment_and_marks_member_checked_out(self):
        room = Room.objects.create(hostel=self.hostel_a, room_code="A-109", capacity=1, room_type="private")
        bed = Bed.objects.create(room=room, label="B1", is_active=True)
        member = Member.objects.create(
            hostel=self.hostel_a,
            member_code="M-008",
            full_name="Resident Eight",
            phone="+1234567007",
            status=MemberStatus.ACTIVE,
        )
        allotment = RoomAllotment.objects.create(
            hostel=self.hostel_a,
            member=member,
            bed=bed,
            start_date=date(2026, 3, 1),
            status=AllotmentStatus.ACTIVE,
            created_by=self.admin_a,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.post(
            f"/api/v1/allotments/{allotment.id}/checkout/",
            {"checkout_date": "2026-03-12", "remarks": "Completed stay"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        allotment.refresh_from_db()
        member.refresh_from_db()
        self.assertEqual(allotment.status, AllotmentStatus.CLOSED)
        self.assertEqual(allotment.end_date, date(2026, 3, 12))
        self.assertEqual(member.status, MemberStatus.CHECKED_OUT)
        self.assertEqual(member.leaving_date, date(2026, 3, 12))

    def test_create_conflict_returns_validation_error(self):
        room = Room.objects.create(hostel=self.hostel_a, room_code="A-110", capacity=1, room_type="private")
        bed = Bed.objects.create(room=room, label="B1", is_active=True)
        member = Member.objects.create(
            hostel=self.hostel_a,
            member_code="M-009",
            full_name="Resident Nine",
            phone="+1234567008",
            status=MemberStatus.ACTIVE,
        )

        self.client.force_authenticate(self.admin_a)
        with patch("allotments.serializers.RoomAllotment.objects.create", side_effect=IntegrityError("race")):
            response = self.client.post(
                "/api/v1/allotments/",
                {"member": member.id, "bed": bed.id, "start_date": "2026-03-01"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            str(response.data["detail"]),
            "Allotment conflict detected. Member or bed was updated by another request.",
        )
        self.assertEqual(RoomAllotment.objects.count(), 0)
