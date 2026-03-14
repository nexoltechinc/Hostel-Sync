from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User, UserRole
from attendance.models import AttendanceRecord, AttendanceStatus
from allotments.models import AllotmentStatus, RoomAllotment
from billing.models import Invoice, InvoiceStatus, Payment, PaymentMethod
from hostels.models import Hostel
from members.models import Member, MemberStatus
from notifications.models import Notification, NotificationType
from rooms.models import Bed, Room, RoomType


class ReportsModuleTests(APITestCase):
    def setUp(self):
        self.today = timezone.localdate()
        self.month_start = self.today.replace(day=1)

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

        self.member_a1 = Member.objects.create(
            hostel=self.hostel_a,
            member_code="A-001",
            full_name="Alpha One",
            phone="+1234567001",
            status=MemberStatus.ACTIVE,
            joining_date=self.month_start,
        )
        self.member_a2 = Member.objects.create(
            hostel=self.hostel_a,
            member_code="A-002",
            full_name="Alpha Two",
            phone="+1234567002",
            status=MemberStatus.ACTIVE,
            joining_date=self.month_start,
        )
        self.member_b1 = Member.objects.create(
            hostel=self.hostel_b,
            member_code="B-001",
            full_name="Beta One",
            phone="+1234567003",
            status=MemberStatus.ACTIVE,
            joining_date=self.month_start,
        )

        self.room_a_standard = Room.objects.create(
            hostel=self.hostel_a,
            room_code="A-101",
            floor="1",
            capacity=2,
            room_type=RoomType.STANDARD,
            monthly_rent=Decimal("1200.00"),
        )
        self.room_a_private = Room.objects.create(
            hostel=self.hostel_a,
            room_code="A-102",
            floor="1",
            capacity=1,
            room_type=RoomType.PRIVATE,
            monthly_rent=Decimal("1800.00"),
        )
        self.room_b_standard = Room.objects.create(
            hostel=self.hostel_b,
            room_code="B-101",
            floor="2",
            capacity=1,
            room_type=RoomType.STANDARD,
            monthly_rent=Decimal("900.00"),
        )

        self.bed_a1 = Bed.objects.create(room=self.room_a_standard, label="B1", is_active=True)
        self.bed_a2 = Bed.objects.create(room=self.room_a_standard, label="B2", is_active=True)
        self.bed_a3 = Bed.objects.create(room=self.room_a_private, label="B1", is_active=True)
        self.bed_b1 = Bed.objects.create(room=self.room_b_standard, label="B1", is_active=True)

        RoomAllotment.objects.create(
            hostel=self.hostel_a,
            member=self.member_a1,
            bed=self.bed_a1,
            start_date=self.month_start,
            status=AllotmentStatus.ACTIVE,
            created_by=self.admin_a,
        )
        RoomAllotment.objects.create(
            hostel=self.hostel_b,
            member=self.member_b1,
            bed=self.bed_b1,
            start_date=self.month_start,
            status=AllotmentStatus.ACTIVE,
            created_by=self.admin_b,
        )

        AttendanceRecord.objects.create(
            hostel=self.hostel_a,
            member=self.member_a1,
            attendance_date=self.today - timedelta(days=1),
            status=AttendanceStatus.PRESENT,
            marked_by=self.admin_a,
        )
        AttendanceRecord.objects.create(
            hostel=self.hostel_a,
            member=self.member_a1,
            attendance_date=self.today,
            status=AttendanceStatus.ABSENT,
            marked_by=self.admin_a,
        )
        AttendanceRecord.objects.create(
            hostel=self.hostel_a,
            member=self.member_a2,
            attendance_date=self.today,
            status=AttendanceStatus.PRESENT,
            marked_by=self.admin_a,
        )
        AttendanceRecord.objects.create(
            hostel=self.hostel_b,
            member=self.member_b1,
            attendance_date=self.today,
            status=AttendanceStatus.PRESENT,
            marked_by=self.admin_b,
        )

        Notification.objects.create(
            hostel=self.hostel_a,
            member=self.member_a1,
            notification_type=NotificationType.GENERAL,
            title="Alpha Alert",
            message="Alpha message",
            created_by=self.admin_a,
        )
        Notification.objects.create(
            hostel=self.hostel_b,
            member=self.member_b1,
            notification_type=NotificationType.GENERAL,
            title="Beta Alert",
            message="Beta message",
            created_by=self.admin_b,
        )

        self.invoice_a_overdue = Invoice.objects.create(
            hostel=self.hostel_a,
            member=self.member_a1,
            billing_month=self.month_start,
            issue_date=self.month_start,
            due_date=self.today - timedelta(days=2),
            status=InvoiceStatus.OPEN,
            total_amount=Decimal("500.00"),
            paid_amount=Decimal("0.00"),
            balance_amount=Decimal("500.00"),
            created_by=self.admin_a,
        )
        self.invoice_a_partial = Invoice.objects.create(
            hostel=self.hostel_a,
            member=self.member_a2,
            billing_month=self.month_start,
            issue_date=self.month_start,
            due_date=self.today + timedelta(days=4),
            status=InvoiceStatus.PARTIALLY_PAID,
            total_amount=Decimal("400.00"),
            paid_amount=Decimal("250.00"),
            balance_amount=Decimal("150.00"),
            created_by=self.admin_a,
        )
        Invoice.objects.create(
            hostel=self.hostel_b,
            member=self.member_b1,
            billing_month=self.month_start,
            issue_date=self.month_start,
            due_date=self.today - timedelta(days=1),
            status=InvoiceStatus.OPEN,
            total_amount=Decimal("700.00"),
            paid_amount=Decimal("0.00"),
            balance_amount=Decimal("700.00"),
            created_by=self.admin_b,
        )

        Payment.objects.create(
            hostel=self.hostel_a,
            member=self.member_a1,
            payment_date=self.today - timedelta(days=1),
            amount=Decimal("600.00"),
            applied_amount=Decimal("500.00"),
            credit_added=Decimal("100.00"),
            method=PaymentMethod.CASH,
            receipt_number="RCPT-A-001",
            created_by=self.admin_a,
        )
        Payment.objects.create(
            hostel=self.hostel_a,
            member=self.member_a2,
            payment_date=self.month_start - timedelta(days=1),
            amount=Decimal("300.00"),
            applied_amount=Decimal("300.00"),
            credit_added=Decimal("0.00"),
            method=PaymentMethod.UPI,
            receipt_number="RCPT-A-OLD",
            created_by=self.admin_a,
        )
        Payment.objects.create(
            hostel=self.hostel_b,
            member=self.member_b1,
            payment_date=self.today,
            amount=Decimal("900.00"),
            applied_amount=Decimal("900.00"),
            credit_added=Decimal("0.00"),
            method=PaymentMethod.CARD,
            receipt_number="RCPT-B-001",
            created_by=self.admin_b,
        )

    def test_reports_status_returns_live_phase_9_summary(self):
        self.client.force_authenticate(self.admin_a)
        response = self.client.get("/api/v1/reports/status/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["phase"], 9)
        self.assertEqual(response.data["status"], "reporting_operations_live")
        self.assertEqual(response.data["summary"]["total_members"], 2)
        self.assertEqual(response.data["summary"]["active_allotments"], 1)
        self.assertEqual(response.data["summary"]["unread_notifications"], 1)
        self.assertEqual(response.data["summary"]["pending_dues"], 650.0)

    def test_dashboard_summary_includes_billing_attendance_and_notifications(self):
        self.client.force_authenticate(self.admin_a)
        response = self.client.get("/api/v1/reports/dashboard-summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["total_members"], 2)
        self.assertEqual(response.data["summary"]["occupied_beds"], 1)
        self.assertEqual(response.data["financial"]["pending_dues"], 650.0)
        self.assertEqual(response.data["financial"]["monthly_collection"], 600.0)
        self.assertEqual(response.data["attendance"]["present_today"], 1)
        self.assertEqual(response.data["attendance"]["absent_today"], 1)
        self.assertEqual(response.data["notifications"]["unread"], 1)
        self.assertEqual(response.data["integrations"]["billing"], "connected")
        self.assertEqual(response.data["integrations"]["reports"], "connected")

    def test_occupancy_report_supports_room_type_filter(self):
        self.client.force_authenticate(self.admin_a)
        response = self.client.get("/api/v1/reports/occupancy/?room_type=standard")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["total_rooms"], 1)
        self.assertEqual(response.data["summary"]["occupied_beds"], 1)
        self.assertEqual(len(response.data["rows"]), 1)
        self.assertEqual(response.data["rows"][0]["room_code"], "A-101")

    def test_fee_collection_report_filters_by_date_range(self):
        self.client.force_authenticate(self.admin_a)
        response = self.client.get(
            f"/api/v1/reports/fee-collection/?date_from={self.month_start.isoformat()}&date_to={self.today.isoformat()}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["payment_count"], 1)
        self.assertEqual(response.data["summary"]["total_collected"], 600.0)
        self.assertEqual(response.data["by_method"][0]["method"], PaymentMethod.CASH)
        self.assertEqual(response.data["rows"][0]["receipt_number"], "RCPT-A-001")

    def test_pending_dues_report_can_limit_to_overdue(self):
        self.client.force_authenticate(self.admin_a)
        response = self.client.get("/api/v1/reports/pending-dues/?only_overdue=true")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["invoice_count"], 1)
        self.assertEqual(response.data["summary"]["overdue_invoices"], 1)
        self.assertEqual(response.data["summary"]["total_outstanding"], 500.0)
        self.assertEqual(response.data["rows"][0]["member_code"], self.member_a1.member_code)

    def test_attendance_report_returns_summary_and_member_breakdown(self):
        self.client.force_authenticate(self.admin_a)
        response = self.client.get(
            f"/api/v1/reports/attendance/?date_from={(self.today - timedelta(days=1)).isoformat()}&date_to={self.today.isoformat()}"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["days_in_range"], 2)
        self.assertEqual(response.data["summary"]["marked_records"], 3)
        self.assertEqual(response.data["summary"]["present"], 2)
        self.assertEqual(response.data["summary"]["absent"], 1)
        self.assertEqual(len(response.data["daily_breakdown"]), 2)
        self.assertEqual(len(response.data["member_breakdown"]), 2)
        member_row = next(row for row in response.data["member_breakdown"] if row["member_code"] == self.member_a1.member_code)
        self.assertEqual(member_row["marked_days"], 2)
        self.assertEqual(member_row["attendance_rate"], 50.0)

    def test_reports_are_hostel_scoped(self):
        self.client.force_authenticate(self.admin_a)
        response = self.client.get("/api/v1/reports/pending-dues/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["invoice_count"], 2)
        self.assertTrue(all(row["hostel_code"] == "ALPHA" for row in response.data["rows"]))

    def test_staff_without_view_reports_permission_is_forbidden(self):
        self.client.force_authenticate(self.staff_a)
        response = self.client.get("/api/v1/reports/status/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
