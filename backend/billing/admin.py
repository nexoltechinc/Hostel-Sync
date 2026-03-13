from django.contrib import admin

from .models import CreditLedgerEntry, FeePlan, Invoice, InvoiceCharge, MemberCredit, MemberFeePlan, Payment, PaymentAllocation


@admin.register(FeePlan)
class FeePlanAdmin(admin.ModelAdmin):
    list_display = ("name", "hostel", "monthly_amount", "is_active", "created_at")
    list_filter = ("hostel", "is_active")
    search_fields = ("name", "description")


@admin.register(MemberFeePlan)
class MemberFeePlanAdmin(admin.ModelAdmin):
    list_display = ("member", "fee_plan", "status", "start_date", "end_date", "hostel")
    list_filter = ("status", "hostel")
    search_fields = ("member__member_code", "member__full_name", "fee_plan__name")


class InvoiceChargeInline(admin.TabularInline):
    model = InvoiceCharge
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("id", "member", "billing_month", "status", "total_amount", "paid_amount", "balance_amount", "hostel")
    list_filter = ("status", "hostel", "billing_month")
    search_fields = ("member__member_code", "member__full_name")
    inlines = [InvoiceChargeInline]


class PaymentAllocationInline(admin.TabularInline):
    model = PaymentAllocation
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("receipt_number", "member", "amount", "applied_amount", "credit_added", "method", "payment_date", "hostel")
    list_filter = ("hostel", "method", "payment_date")
    search_fields = ("receipt_number", "reference_no", "member__member_code", "member__full_name")
    inlines = [PaymentAllocationInline]


@admin.register(MemberCredit)
class MemberCreditAdmin(admin.ModelAdmin):
    list_display = ("member", "balance", "hostel", "updated_at")
    list_filter = ("hostel",)
    search_fields = ("member__member_code", "member__full_name")


@admin.register(CreditLedgerEntry)
class CreditLedgerEntryAdmin(admin.ModelAdmin):
    list_display = ("member", "entry_type", "amount", "hostel", "created_at")
    list_filter = ("hostel", "entry_type")
    search_fields = ("member__member_code", "member__full_name", "remarks")
