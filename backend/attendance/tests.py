from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User, UserRole
from hostels.models import Hostel
from members.models import Member, MemberStatus

from .models import AttendanceRecord, AttendanceStatus


class AttendanceModuleTests(APITestCase):
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
        self.admin_b = User.objects.create_user(
            username="admin_b",
            email="admin_b@example.com",
            password="Password123!",
            role=UserRole.ADMIN,
            hostel=self.hostel_b,
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

    def test_create_attendance_record_success(self):
        self.client.force_authenticate(self.warden_a)
        response = self.client.post(
            "/api/v1/attendance/records/",
            {
                "member": self.member_a1.id,
                "attendance_date": "2026-03-10",
                "status": AttendanceStatus.PRESENT,
                "remarks": "On time",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        record = AttendanceRecord.objects.get(id=response.data["id"])
        self.assertEqual(record.hostel_id, self.hostel_a.id)
        self.assertEqual(record.marked_by_id, self.warden_a.id)
        self.assertEqual(record.status, AttendanceStatus.PRESENT)

    def test_unique_attendance_per_member_per_day(self):
        AttendanceRecord.objects.create(
            hostel=self.hostel_a,
            member=self.member_a1,
            attendance_date=date(2026, 3, 10),
            status=AttendanceStatus.PRESENT,
            marked_by=self.admin_a,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.post(
            "/api/v1/attendance/records/",
            {
                "member": self.member_a1.id,
                "attendance_date": "2026-03-10",
                "status": AttendanceStatus.ABSENT,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Attendance already exists", str(response.data))

    def test_daily_sheet_returns_active_members_and_marked_status(self):
        AttendanceRecord.objects.create(
            hostel=self.hostel_a,
            member=self.member_a1,
            attendance_date=date(2026, 3, 11),
            status=AttendanceStatus.ABSENT,
            remarks="Sick leave",
            marked_by=self.admin_a,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.get("/api/v1/attendance/records/daily-sheet/?attendance_date=2026-03-11")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["active_residents"], 2)
        self.assertEqual(response.data["summary"]["marked_residents"], 1)

        row_by_member = {row["member_id"]: row for row in response.data["rows"]}
        self.assertTrue(row_by_member[self.member_a1.id]["is_marked"])
        self.assertFalse(row_by_member[self.member_a2.id]["is_marked"])

    def test_bulk_mark_creates_then_updates(self):
        self.client.force_authenticate(self.admin_a)
        first = self.client.post(
            "/api/v1/attendance/records/bulk-mark/",
            {
                "attendance_date": "2026-03-12",
                "entries": [
                    {"member": self.member_a1.id, "status": AttendanceStatus.PRESENT, "remarks": ""},
                    {"member": self.member_a2.id, "status": AttendanceStatus.ABSENT, "remarks": "Out"},
                ],
            },
            format="json",
        )
        second = self.client.post(
            "/api/v1/attendance/records/bulk-mark/",
            {
                "attendance_date": "2026-03-12",
                "entries": [
                    {"member": self.member_a1.id, "status": AttendanceStatus.EXCUSED, "remarks": "Medical"},
                ],
            },
            format="json",
        )

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data["created_count"], 2)
        self.assertEqual(first.data["updated_count"], 0)

        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data["created_count"], 0)
        self.assertEqual(second.data["updated_count"], 1)

        updated = AttendanceRecord.objects.get(member=self.member_a1, attendance_date=date(2026, 3, 12))
        self.assertEqual(updated.status, AttendanceStatus.EXCUSED)
        self.assertIsNotNone(updated.corrected_at)
        self.assertEqual(updated.corrected_by_id, self.admin_a.id)

    def test_partial_update_marks_correction_metadata(self):
        record = AttendanceRecord.objects.create(
            hostel=self.hostel_a,
            member=self.member_a1,
            attendance_date=date(2026, 3, 13),
            status=AttendanceStatus.PRESENT,
            marked_by=self.admin_a,
        )

        self.client.force_authenticate(self.warden_a)
        response = self.client.patch(
            f"/api/v1/attendance/records/{record.id}/",
            {"status": AttendanceStatus.ON_LEAVE, "remarks": "Approved leave"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        record.refresh_from_db()
        self.assertEqual(record.status, AttendanceStatus.ON_LEAVE)
        self.assertEqual(record.corrected_by_id, self.warden_a.id)
        self.assertIsNotNone(record.corrected_at)

    def test_attendance_destroy_is_blocked(self):
        record = AttendanceRecord.objects.create(
            hostel=self.hostel_a,
            member=self.member_a1,
            attendance_date=date(2026, 3, 14),
            status=AttendanceStatus.PRESENT,
            marked_by=self.admin_a,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.delete(f"/api/v1/attendance/records/{record.id}/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(AttendanceRecord.objects.filter(id=record.id).exists())

    def test_cross_hostel_record_access_is_blocked(self):
        record = AttendanceRecord.objects.create(
            hostel=self.hostel_b,
            member=self.member_b1,
            attendance_date=date(2026, 3, 15),
            status=AttendanceStatus.PRESENT,
            marked_by=self.admin_b,
        )

        self.client.force_authenticate(self.admin_a)
        response = self.client.get(f"/api/v1/attendance/records/{record.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_view_only_role_cannot_mark_attendance(self):
        self.client.force_authenticate(self.staff_a)
        create_response = self.client.post(
            "/api/v1/attendance/records/",
            {
                "member": self.member_a1.id,
                "attendance_date": "2026-03-16",
                "status": AttendanceStatus.PRESENT,
            },
            format="json",
        )
        bulk_response = self.client.post(
            "/api/v1/attendance/records/bulk-mark/",
            {
                "attendance_date": "2026-03-16",
                "entries": [
                    {"member": self.member_a1.id, "status": AttendanceStatus.PRESENT},
                ],
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(bulk_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_status_endpoint_reflects_daily_counts(self):
        AttendanceRecord.objects.create(
            hostel=self.hostel_a,
            member=self.member_a1,
            attendance_date=date(2026, 3, 17),
            status=AttendanceStatus.PRESENT,
            marked_by=self.admin_a,
        )
        AttendanceRecord.objects.create(
            hostel=self.hostel_a,
            member=self.member_a2,
            attendance_date=date(2026, 3, 17),
            status=AttendanceStatus.ABSENT,
            marked_by=self.admin_a,
        )

        self.client.force_authenticate(self.staff_a)
        response = self.client.get("/api/v1/attendance/status/?attendance_date=2026-03-17")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["expected_headcount"], 2)
        self.assertEqual(response.data["summary"]["marked_residents"], 2)
        self.assertEqual(response.data["summary"]["present"], 1)
        self.assertEqual(response.data["summary"]["absent"], 1)
