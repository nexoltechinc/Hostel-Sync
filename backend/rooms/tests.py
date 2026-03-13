from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User, UserRole
from allotments.models import AllotmentStatus, RoomAllotment
from hostels.models import Hostel
from members.models import Member
from rooms.models import Bed, Room


class RoomModuleTests(APITestCase):
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

    def test_room_create_auto_generates_beds_by_capacity(self):
        self.client.force_authenticate(self.admin_a)

        response = self.client.post(
            "/api/v1/rooms/",
            {
                "room_code": "A-101",
                "floor": "1",
                "capacity": 3,
                "room_type": "standard",
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        room_id = response.data["id"]

        room = Room.objects.get(id=room_id)
        bed_labels = sorted(list(room.beds.values_list("label", flat=True)))
        self.assertEqual(bed_labels, ["B1", "B2", "B3"])

    def test_room_create_supports_custom_bed_labels(self):
        self.client.force_authenticate(self.admin_a)

        response = self.client.post(
            "/api/v1/rooms/",
            {
                "room_code": "A-102",
                "capacity": 4,
                "room_type": "deluxe",
                "bed_labels": ["A1", "A2", "A3"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        room = Room.objects.get(id=response.data["id"])
        self.assertEqual(sorted(list(room.beds.values_list("label", flat=True))), ["A1", "A2", "A3"])

    def test_room_create_rejects_invalid_bed_labels(self):
        self.client.force_authenticate(self.admin_a)

        duplicate_labels = self.client.post(
            "/api/v1/rooms/",
            {
                "room_code": "A-103",
                "capacity": 2,
                "room_type": "standard",
                "bed_labels": ["B1", "B1"],
            },
            format="json",
        )
        over_capacity = self.client.post(
            "/api/v1/rooms/",
            {
                "room_code": "A-104",
                "capacity": 2,
                "room_type": "standard",
                "bed_labels": ["B1", "B2", "B3"],
            },
            format="json",
        )

        self.assertEqual(duplicate_labels.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("bed_labels", duplicate_labels.data)
        self.assertEqual(over_capacity.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("bed_labels", over_capacity.data)

    def test_room_list_is_scoped_to_user_hostel(self):
        Room.objects.create(hostel=self.hostel_a, room_code="A-105", capacity=2, room_type="standard")
        Room.objects.create(hostel=self.hostel_b, room_code="B-201", capacity=2, room_type="standard")

        self.client.force_authenticate(self.admin_a)
        response = self.client.get("/api/v1/rooms/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["room_code"], "A-105")

    def test_read_only_role_cannot_create_or_update_room(self):
        room = Room.objects.create(hostel=self.hostel_a, room_code="A-106", capacity=2, room_type="standard")

        self.client.force_authenticate(self.accountant_a)
        list_response = self.client.get("/api/v1/rooms/")
        create_response = self.client.post(
            "/api/v1/rooms/",
            {
                "room_code": "A-107",
                "capacity": 2,
                "room_type": "standard",
            },
            format="json",
        )
        update_response = self.client.patch(
            f"/api/v1/rooms/{room.id}/",
            {"capacity": 3},
            format="json",
        )

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(update_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_capacity_cannot_be_reduced_below_existing_bed_count(self):
        room = Room.objects.create(hostel=self.hostel_a, room_code="A-108", capacity=3, room_type="standard")
        Bed.objects.create(room=room, label="B1")
        Bed.objects.create(room=room, label="B2")
        Bed.objects.create(room=room, label="B3")

        self.client.force_authenticate(self.admin_a)
        response = self.client.patch(
            f"/api/v1/rooms/{room.id}/",
            {"capacity": 2},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("capacity", response.data)

    def test_capacity_cannot_be_reduced_below_active_occupied_beds(self):
        room = Room.objects.create(hostel=self.hostel_a, room_code="A-109", capacity=3, room_type="standard")
        bed_1 = Bed.objects.create(room=room, label="B1")
        Bed.objects.create(room=room, label="B2")
        Bed.objects.create(room=room, label="B3")
        member = Member.objects.create(
            hostel=self.hostel_a,
            member_code="M-001",
            full_name="Resident One",
            phone="+1234567890",
        )
        RoomAllotment.objects.create(
            hostel=self.hostel_a,
            member=member,
            bed=bed_1,
            start_date=date(2026, 3, 1),
            status=AllotmentStatus.ACTIVE,
            created_by=self.admin_a,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.patch(
            f"/api/v1/rooms/{room.id}/",
            {"capacity": 0.5},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("capacity", response.data)

    def test_bed_create_is_restricted_to_same_hostel(self):
        room_b = Room.objects.create(hostel=self.hostel_b, room_code="B-202", capacity=2, room_type="standard")

        self.client.force_authenticate(self.admin_a)
        response = self.client.post(
            "/api/v1/rooms/beds/",
            {"room": room_b.id, "label": "B1", "is_active": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("room", response.data)

    def test_bed_cannot_be_deactivated_or_deleted_with_active_allotment(self):
        room = Room.objects.create(hostel=self.hostel_a, room_code="A-110", capacity=2, room_type="standard")
        bed = Bed.objects.create(room=room, label="B1", is_active=True)
        member = Member.objects.create(
            hostel=self.hostel_a,
            member_code="M-002",
            full_name="Resident Two",
            phone="+1234567891",
        )
        RoomAllotment.objects.create(
            hostel=self.hostel_a,
            member=member,
            bed=bed,
            start_date=date(2026, 3, 2),
            status=AllotmentStatus.ACTIVE,
            created_by=self.admin_a,
        )

        self.client.force_authenticate(self.admin_a)
        deactivate_response = self.client.patch(
            f"/api/v1/rooms/beds/{bed.id}/",
            {"is_active": False},
            format="json",
        )
        delete_response = self.client.delete(f"/api/v1/rooms/beds/{bed.id}/")

        self.assertEqual(deactivate_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(deactivate_response.data["detail"], "Cannot deactivate a bed with active allotment.")
        self.assertEqual(delete_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(delete_response.data["detail"], "Cannot delete a bed with active allotment.")

    def test_room_cannot_be_deactivated_with_active_allotment(self):
        room = Room.objects.create(hostel=self.hostel_a, room_code="A-111", capacity=1, room_type="standard", is_active=True)
        bed = Bed.objects.create(room=room, label="B1", is_active=True)
        member = Member.objects.create(
            hostel=self.hostel_a,
            member_code="M-003",
            full_name="Resident Three",
            phone="+1234567892",
        )
        RoomAllotment.objects.create(
            hostel=self.hostel_a,
            member=member,
            bed=bed,
            start_date=date(2026, 3, 3),
            status=AllotmentStatus.ACTIVE,
            created_by=self.admin_a,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.patch(
            f"/api/v1/rooms/{room.id}/",
            {"is_active": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Cannot deactivate a room with active allotments.")

        room.refresh_from_db()
        self.assertTrue(room.is_active)

    def test_room_delete_is_blocked_when_allotment_history_exists(self):
        room = Room.objects.create(hostel=self.hostel_a, room_code="A-112", capacity=1, room_type="private")
        bed = Bed.objects.create(room=room, label="B1", is_active=True)
        member = Member.objects.create(
            hostel=self.hostel_a,
            member_code="M-004",
            full_name="Resident Four",
            phone="+1234567893",
        )
        RoomAllotment.objects.create(
            hostel=self.hostel_a,
            member=member,
            bed=bed,
            start_date=date(2026, 3, 3),
            end_date=date(2026, 3, 4),
            status=AllotmentStatus.CLOSED,
            created_by=self.admin_a,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.delete(f"/api/v1/rooms/{room.id}/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Cannot delete a room with allotment history.")
