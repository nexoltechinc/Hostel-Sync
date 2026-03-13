from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.utils import timezone

from accounts.models import User
from billing.models import Invoice, InvoiceStatus
from members.models import Member, MemberStatus

from .models import (
    Announcement,
    AnnouncementAudience,
    AnnouncementMemberTarget,
    AnnouncementStatus,
    Notification,
    NotificationPriority,
    NotificationStatus,
    NotificationType,
)


def _clean_member_targets_for_announcement(announcement: Announcement, member_ids: list[int]):
    normalized_member_ids = list(dict.fromkeys(member_ids))
    AnnouncementMemberTarget.objects.filter(announcement=announcement).exclude(member_id__in=normalized_member_ids).delete()
    existing_ids = set(
        AnnouncementMemberTarget.objects.filter(announcement=announcement, member_id__in=normalized_member_ids).values_list(
            "member_id",
            flat=True,
        )
    )
    new_targets = [
        AnnouncementMemberTarget(announcement=announcement, member_id=member_id)
        for member_id in normalized_member_ids
        if member_id not in existing_ids
    ]
    if new_targets:
        AnnouncementMemberTarget.objects.bulk_create(new_targets)


@dataclass
class PublishResult:
    member_notifications: int
    user_notifications: int
    total_notifications: int


@transaction.atomic
def publish_announcement(*, announcement: Announcement, actor: User | None = None) -> PublishResult:
    announcement = Announcement.objects.select_for_update().get(pk=announcement.pk)
    if announcement.status != AnnouncementStatus.DRAFT:
        raise ValueError("Only draft announcements can be published.")

    now = timezone.now()
    announcement.status = AnnouncementStatus.PUBLISHED
    announcement.published_at = now
    if announcement.publish_at is None:
        announcement.publish_at = now
    announcement.save(update_fields=["status", "published_at", "publish_at", "updated_at"])

    member_notifications = 0
    user_notifications = 0
    rows: list[Notification] = []

    if announcement.audience_type in {
        AnnouncementAudience.ALL_RESIDENTS,
        AnnouncementAudience.ALL_USERS,
        AnnouncementAudience.SELECTED_MEMBERS,
    }:
        members_qs = Member.objects.filter(hostel_id=announcement.hostel_id, is_deleted=False, status=MemberStatus.ACTIVE)
        if announcement.audience_type == AnnouncementAudience.SELECTED_MEMBERS:
            member_ids = list(
                AnnouncementMemberTarget.objects.filter(announcement=announcement).values_list("member_id", flat=True)
            )
            if not member_ids:
                raise ValueError("Selected-members announcement requires at least one target member.")
            members_qs = members_qs.filter(id__in=member_ids)
        for member in members_qs.only("id"):
            rows.append(
                Notification(
                    hostel_id=announcement.hostel_id,
                    member_id=member.id,
                    announcement=announcement,
                    notification_type=NotificationType.ANNOUNCEMENT,
                    title=announcement.title,
                    message=announcement.body,
                    priority=announcement.priority,
                    status=NotificationStatus.UNREAD,
                    created_by=actor,
                    context={"source": "announcement", "announcement_id": announcement.id},
                )
            )
            member_notifications += 1

    if announcement.audience_type in {AnnouncementAudience.ALL_STAFF, AnnouncementAudience.ALL_USERS}:
        users_qs = User.objects.filter(hostel_id=announcement.hostel_id, is_active=True)
        if actor is not None:
            users_qs = users_qs.exclude(id=actor.id)
        for user in users_qs.only("id"):
            rows.append(
                Notification(
                    hostel_id=announcement.hostel_id,
                    user_id=user.id,
                    announcement=announcement,
                    notification_type=NotificationType.ANNOUNCEMENT,
                    title=announcement.title,
                    message=announcement.body,
                    priority=announcement.priority,
                    status=NotificationStatus.UNREAD,
                    created_by=actor,
                    context={"source": "announcement", "announcement_id": announcement.id},
                )
            )
            user_notifications += 1

    if rows:
        Notification.objects.bulk_create(rows)
    return PublishResult(
        member_notifications=member_notifications,
        user_notifications=user_notifications,
        total_notifications=member_notifications + user_notifications,
    )


@dataclass
class ReminderResult:
    created_count: int
    skipped_count: int
    notification_ids: list[int]


@transaction.atomic
def generate_fee_due_reminders(
    *,
    hostel_id: int,
    actor: User | None = None,
    due_on_or_before: date | None = None,
    min_balance: Decimal = Decimal("0.01"),
) -> ReminderResult:
    invoices = Invoice.objects.select_related("member").filter(
        hostel_id=hostel_id,
        status__in=[InvoiceStatus.OPEN, InvoiceStatus.PARTIALLY_PAID],
        balance_amount__gte=min_balance,
        member__is_deleted=False,
        member__status=MemberStatus.ACTIVE,
    )
    if due_on_or_before:
        invoices = invoices.filter(due_date__isnull=False, due_date__lte=due_on_or_before)

    created_count = 0
    skipped_count = 0
    notification_ids: list[int] = []
    today_token = timezone.localdate().isoformat()

    for invoice in invoices:
        dedupe_key = f"fee_due:{invoice.id}:{today_token}"
        try:
            notification = Notification.objects.create(
                hostel_id=hostel_id,
                member_id=invoice.member_id,
                notification_type=NotificationType.FEE_REMINDER,
                title="Fee Due Reminder",
                message=(
                    f"Pending dues of {invoice.balance_amount} for billing month {invoice.billing_month:%B %Y}. "
                    f"Due date: {invoice.due_date.isoformat() if invoice.due_date else 'N/A'}."
                ),
                priority=NotificationPriority.HIGH if invoice.balance_amount >= Decimal("1000.00") else NotificationPriority.NORMAL,
                status=NotificationStatus.UNREAD,
                dedupe_key=dedupe_key,
                context={"invoice_id": invoice.id, "billing_month": invoice.billing_month.isoformat()},
                created_by=actor,
            )
            created_count += 1
            notification_ids.append(notification.id)
        except IntegrityError:
            skipped_count += 1

    return ReminderResult(
        created_count=created_count,
        skipped_count=skipped_count,
        notification_ids=notification_ids,
    )
