"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Download,
  Eye,
  FileText,
  Filter,
  History,
  Landmark,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  Wallet,
  X,
} from "lucide-react";

type ResidentStatus = "Active" | "Inactive" | "Vacated";
type ResidentBillingHealth = "Clear" | "Outstanding" | "Overdue";
type LedgerDirection = "Debit" | "Credit";
type LedgerStatus =
  | "Paid"
  | "Pending"
  | "Partially Paid"
  | "Overdue"
  | "Failed"
  | "Adjusted"
  | "Reversed";
type LedgerType = "Invoice" | "Payment" | "Adjustment" | "Refund";
type InvoiceLifecycleStatus =
  | "Draft"
  | "Pending Review"
  | "Approved"
  | "Issued"
  | "Partially Paid"
  | "Paid"
  | "Overdue"
  | "Cancelled"
  | "Refunded"
  | "Adjusted";
type InvoiceType =
  | "Monthly Rent"
  | "Admission Fee"
  | "Security Deposit"
  | "Mess Charges"
  | "Utility Charges"
  | "Fines"
  | "Damage Recovery"
  | "Adjustment Invoice"
  | "Refund Invoice"
  | "Final Checkout Settlement";
type InvoiceScope = "single" | "bulk";
type PaymentTerms = "Due on receipt" | "7 days" | "15 days" | "Month end";
type TypeFilter = "all" | LedgerType;
type StatusFilter = "all" | LedgerStatus;
type DateRangeFilter = "all" | "this_month" | "last_30_days" | "quarter";
type ExceptionFilter = "all" | "overdue_only" | "failed_only" | "credits_only";
type SortDirection = "asc" | "desc";
type SortKey =
  | "date"
  | "resident"
  | "room"
  | "type"
  | "category"
  | "amount"
  | "direction"
  | "balance"
  | "status"
  | "reference";
type CategoryFilter =
  | "all"
  | "Monthly Rent"
  | "Mess"
  | "Utility"
  | "Deposit"
  | "Fine"
  | "Admission"
  | "Adjustment"
  | "Refund";
type LineItemCategory =
  | "Monthly Rent"
  | "Mess"
  | "Utility"
  | "Deposit"
  | "Admission"
  | "Fine"
  | "Adjustment"
  | "Refund";

type ResidentProfile = {
  id: string;
  name: string;
  regId: string;
  hostel: string;
  floor: string;
  room: string;
  bed: string;
  status: ResidentStatus;
  billingHealth: ResidentBillingHealth;
  monthlyRent: number;
  messPlan: number;
  utilityPlan: number;
  depositHeld: number;
  previousDue: number;
  paidThisCycle: number;
  lastActivity: string;
  lastPaymentNote: string;
  lastUpdatedBy: string;
};

type ExistingInvoice = {
  id: string;
  residentId: string;
  billingCycle: string;
  invoiceType: InvoiceType;
  status: InvoiceLifecycleStatus;
  total: number;
};

type LedgerRow = {
  id: string;
  date: string;
  residentId: string;
  resident: string;
  regId: string;
  hostel: string;
  floor: string;
  room: string;
  bed: string;
  type: LedgerType;
  category: CategoryFilter;
  amount: number;
  direction: LedgerDirection;
  balance: number;
  status: LedgerStatus;
  reference: string;
  note: string;
  description: string;
  invoiceType?: InvoiceType;
};

type LineItem = {
  id: string;
  label: string;
  category: LineItemCategory;
  quantity: number;
  rate: number;
};

type FeedbackTone = "success" | "warning" | "danger" | "info";

type Feedback = {
  tone: FeedbackTone;
  message: string;
};

const PAGE_SIZE = 8;
const TODAY = new Date("2026-04-03T10:35:00");
const ACTIVE_BILLING_CYCLE = "2026-04";
const FILTER_ALL_ROOMS = "all";
const FILTER_ALL_INVOICE_TYPES = "all";

const residents: ResidentProfile[] = [
  {
    id: "res-001",
    name: "Amina Yusuf",
    regId: "REG-24011",
    hostel: "North Block",
    floor: "Floor 1",
    room: "NB-103",
    bed: "Bed A",
    status: "Active",
    billingHealth: "Outstanding",
    monthlyRent: 420,
    messPlan: 85,
    utilityPlan: 24,
    depositHeld: 260,
    previousDue: 60,
    paidThisCycle: 210,
    lastActivity: "2026-04-01T09:10:00",
    lastPaymentNote: "Partial rent payment posted via front desk.",
    lastUpdatedBy: "Front Desk Admin",
  },
  {
    id: "res-002",
    name: "Umar Farooq",
    regId: "REG-24018",
    hostel: "South Block",
    floor: "Floor 2",
    room: "SB-118",
    bed: "Bed B",
    status: "Active",
    billingHealth: "Clear",
    monthlyRent: 410,
    messPlan: 74,
    utilityPlan: 18,
    depositHeld: 250,
    previousDue: 0,
    paidThisCycle: 502,
    lastActivity: "2026-03-31T16:20:00",
    lastPaymentNote: "Monthly rent invoice cleared.",
    lastUpdatedBy: "Accounts Office",
  },
  {
    id: "res-003",
    name: "Salma Noor",
    regId: "REG-24027",
    hostel: "North Block",
    floor: "Floor 2",
    room: "NB-204",
    bed: "Bed A",
    status: "Active",
    billingHealth: "Overdue",
    monthlyRent: 430,
    messPlan: 85,
    utilityPlan: 28,
    depositHeld: 300,
    previousDue: 140,
    paidThisCycle: 90,
    lastActivity: "2026-03-29T14:05:00",
    lastPaymentNote: "Mess charge reminder sent. Partial utility payment pending.",
    lastUpdatedBy: "Warden Desk",
  },
  {
    id: "res-004",
    name: "Iqra Khan",
    regId: "REG-23098",
    hostel: "East Wing",
    floor: "Floor 1",
    room: "EW-011",
    bed: "Bed C",
    status: "Vacated",
    billingHealth: "Outstanding",
    monthlyRent: 365,
    messPlan: 68,
    utilityPlan: 15,
    depositHeld: 200,
    previousDue: 0,
    paidThisCycle: 0,
    lastActivity: "2026-03-24T16:20:00",
    lastPaymentNote: "Final settlement not issued yet.",
    lastUpdatedBy: "Front Desk Admin",
  },
];

const existingInvoices: ExistingInvoice[] = [
  {
    id: "inv-existing-001",
    residentId: "res-001",
    billingCycle: ACTIVE_BILLING_CYCLE,
    invoiceType: "Monthly Rent",
    status: "Issued",
    total: 589,
  },
  {
    id: "inv-existing-002",
    residentId: "res-003",
    billingCycle: ACTIVE_BILLING_CYCLE,
    invoiceType: "Monthly Rent",
    status: "Overdue",
    total: 683,
  },
  {
    id: "inv-existing-003",
    residentId: "res-002",
    billingCycle: ACTIVE_BILLING_CYCLE,
    invoiceType: "Mess Charges",
    status: "Paid",
    total: 74,
  },
];

const initialLedgerRows: LedgerRow[] = [
  {
    id: "txn-001",
    date: "2026-04-01",
    residentId: "res-001",
    resident: "Amina Yusuf",
    regId: "REG-24011",
    hostel: "North Block",
    floor: "Floor 1",
    room: "NB-103",
    bed: "Bed A",
    type: "Invoice",
    category: "Monthly Rent",
    amount: 589,
    direction: "Debit",
    balance: 379,
    status: "Pending",
    reference: "INV-240401-011",
    note: "April cycle includes rent, mess, and utility recovery.",
    description: "Monthly hostel charges for April cycle.",
    invoiceType: "Monthly Rent",
  },
  {
    id: "txn-002",
    date: "2026-03-31",
    residentId: "res-002",
    resident: "Umar Farooq",
    regId: "REG-24018",
    hostel: "South Block",
    floor: "Floor 2",
    room: "SB-118",
    bed: "Bed B",
    type: "Payment",
    category: "Monthly Rent",
    amount: 502,
    direction: "Credit",
    balance: 0,
    status: "Paid",
    reference: "PAY-240331-067",
    note: "Card payment cleared against March hostel dues.",
    description: "March invoice paid in full.",
    invoiceType: "Monthly Rent",
  },
  {
    id: "txn-003",
    date: "2026-03-29",
    residentId: "res-003",
    resident: "Salma Noor",
    regId: "REG-24027",
    hostel: "North Block",
    floor: "Floor 2",
    room: "NB-204",
    bed: "Bed A",
    type: "Invoice",
    category: "Monthly Rent",
    amount: 683,
    direction: "Debit",
    balance: 593,
    status: "Overdue",
    reference: "INV-240329-044",
    note: "Overdue after reminder schedule and grace period.",
    description: "April invoice with prior due carry-forward.",
    invoiceType: "Monthly Rent",
  },
  {
    id: "txn-004",
    date: "2026-03-28",
    residentId: "res-001",
    resident: "Amina Yusuf",
    regId: "REG-24011",
    hostel: "North Block",
    floor: "Floor 1",
    room: "NB-103",
    bed: "Bed A",
    type: "Payment",
    category: "Monthly Rent",
    amount: 210,
    direction: "Credit",
    balance: 379,
    status: "Paid",
    reference: "PAY-240328-015",
    note: "Resident cleared part of rent at front desk.",
    description: "Partial payment applied to April invoice.",
    invoiceType: "Monthly Rent",
  },
  {
    id: "txn-005",
    date: "2026-03-27",
    residentId: "res-003",
    resident: "Salma Noor",
    regId: "REG-24027",
    hostel: "North Block",
    floor: "Floor 2",
    room: "NB-204",
    bed: "Bed A",
    type: "Payment",
    category: "Utility",
    amount: 90,
    direction: "Credit",
    balance: 593,
    status: "Partially Paid",
    reference: "PAY-240327-021",
    note: "Resident paid part of outstanding balance.",
    description: "Cash received against overdue utility-inclusive balance.",
    invoiceType: "Utility Charges",
  },
  {
    id: "txn-006",
    date: "2026-03-24",
    residentId: "res-004",
    resident: "Iqra Khan",
    regId: "REG-23098",
    hostel: "East Wing",
    floor: "Floor 1",
    room: "EW-011",
    bed: "Bed C",
    type: "Invoice",
    category: "Adjustment",
    amount: 148,
    direction: "Debit",
    balance: 148,
    status: "Pending",
    reference: "INV-240324-003",
    note: "Pending final checkout settlement for damages and utility true-up.",
    description: "Checkout settlement draft awaiting review.",
    invoiceType: "Final Checkout Settlement",
  },
  {
    id: "txn-007",
    date: "2026-03-22",
    residentId: "res-001",
    resident: "Amina Yusuf",
    regId: "REG-24011",
    hostel: "North Block",
    floor: "Floor 1",
    room: "NB-103",
    bed: "Bed A",
    type: "Adjustment",
    category: "Adjustment",
    amount: 25,
    direction: "Credit",
    balance: 0,
    status: "Adjusted",
    reference: "ADJ-240322-019",
    note: "Mess overcharge corrected after diet plan update.",
    description: "Credit adjustment posted to resident ledger.",
    invoiceType: "Adjustment Invoice",
  },
  {
    id: "txn-008",
    date: "2026-03-20",
    residentId: "res-003",
    resident: "Salma Noor",
    regId: "REG-24027",
    hostel: "North Block",
    floor: "Floor 2",
    room: "NB-204",
    bed: "Bed A",
    type: "Payment",
    category: "Monthly Rent",
    amount: 180,
    direction: "Credit",
    balance: 683,
    status: "Failed",
    reference: "PAY-240320-004",
    note: "Bank transfer failed. Retry pending confirmation.",
    description: "Resident transfer was not settled by bank.",
    invoiceType: "Monthly Rent",
  },
];

const invoiceTypeOptions: InvoiceType[] = [
  "Monthly Rent",
  "Admission Fee",
  "Security Deposit",
  "Mess Charges",
  "Utility Charges",
  "Fines",
  "Damage Recovery",
  "Adjustment Invoice",
  "Refund Invoice",
  "Final Checkout Settlement",
];

const paymentTermsOptions: PaymentTerms[] = [
  "Due on receipt",
  "7 days",
  "15 days",
  "Month end",
];

const lineItemCategories: LineItemCategory[] = [
  "Monthly Rent",
  "Mess",
  "Utility",
  "Deposit",
  "Admission",
  "Fine",
  "Adjustment",
  "Refund",
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const cycleFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatDate(value: string) {
  return shortDateFormatter.format(new Date(value));
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function formatCycle(value: string) {
  return cycleFormatter.format(new Date(`${value}-01T00:00:00`));
}

function lineAmount(item: LineItem) {
  return item.quantity * item.rate;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2, 8)}`;
}

function makeReference(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

function roomLabel(resident: ResidentProfile | LedgerRow) {
  return `${resident.room} / ${resident.bed}`;
}

function locationLabel(resident: ResidentProfile | LedgerRow) {
  return `${resident.hostel} · ${resident.floor}`;
}

function chipToneForLedgerStatus(status: LedgerStatus): FeedbackTone {
  switch (status) {
    case "Paid":
      return "success";
    case "Pending":
    case "Partially Paid":
      return "warning";
    case "Overdue":
    case "Failed":
      return "danger";
    case "Adjusted":
    case "Reversed":
      return "info";
    default:
      return "info";
  }
}

function chipToneForInvoiceStatus(status: InvoiceLifecycleStatus): FeedbackTone {
  switch (status) {
    case "Paid":
      return "success";
    case "Approved":
    case "Issued":
    case "Pending Review":
    case "Partially Paid":
      return "info";
    case "Overdue":
    case "Cancelled":
      return "danger";
    case "Refunded":
    case "Adjusted":
      return "warning";
    case "Draft":
    default:
      return "warning";
  }
}

function chipToneForBillingHealth(health: ResidentBillingHealth): FeedbackTone {
  switch (health) {
    case "Clear":
      return "success";
    case "Outstanding":
      return "warning";
    case "Overdue":
      return "danger";
    default:
      return "info";
  }
}

function chipToneForDirection(direction: LedgerDirection): FeedbackTone {
  return direction === "Credit" ? "success" : "warning";
}

function suggestedDueDate(billingCycle: string, terms: PaymentTerms) {
  const baseDate = new Date(`${billingCycle}-01T00:00:00`);

  if (terms === "Due on receipt") {
    return baseDate.toISOString().slice(0, 10);
  }

  if (terms === "7 days") {
    baseDate.setDate(baseDate.getDate() + 6);
    return baseDate.toISOString().slice(0, 10);
  }

  if (terms === "15 days") {
    baseDate.setDate(baseDate.getDate() + 14);
    return baseDate.toISOString().slice(0, 10);
  }

  const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  return monthEnd.toISOString().slice(0, 10);
}

function buildLineItems(
  resident: ResidentProfile | undefined,
  invoiceType: InvoiceType,
  prorated: boolean,
) {
  const baseResident = resident ?? residents[0];
  const rentRate = prorated ? Number((baseResident.monthlyRent * 0.5).toFixed(2)) : baseResident.monthlyRent;
  const messRate = prorated ? Number((baseResident.messPlan * 0.5).toFixed(2)) : baseResident.messPlan;
  const utilityRate = prorated ? Number((baseResident.utilityPlan * 0.5).toFixed(2)) : baseResident.utilityPlan;

  const templates: Record<InvoiceType, LineItem[]> = {
    "Monthly Rent": [
      { id: makeId("line"), label: "Room rent", category: "Monthly Rent", quantity: 1, rate: rentRate },
      { id: makeId("line"), label: "Mess plan", category: "Mess", quantity: 1, rate: messRate },
      { id: makeId("line"), label: "Utility recovery", category: "Utility", quantity: 1, rate: utilityRate },
    ],
    "Admission Fee": [{ id: makeId("line"), label: "Admission fee", category: "Admission", quantity: 1, rate: 180 }],
    "Security Deposit": [{ id: makeId("line"), label: "Security deposit", category: "Deposit", quantity: 1, rate: 250 }],
    "Mess Charges": [{ id: makeId("line"), label: "Mess cycle charge", category: "Mess", quantity: 1, rate: baseResident.messPlan }],
    "Utility Charges": [{ id: makeId("line"), label: "Utility recovery", category: "Utility", quantity: 1, rate: baseResident.utilityPlan }],
    Fines: [{ id: makeId("line"), label: "Disciplinary fine", category: "Fine", quantity: 1, rate: 35 }],
    "Damage Recovery": [{ id: makeId("line"), label: "Damage recovery", category: "Fine", quantity: 1, rate: 120 }],
    "Adjustment Invoice": [{ id: makeId("line"), label: "Billing adjustment", category: "Adjustment", quantity: 1, rate: 25 }],
    "Refund Invoice": [{ id: makeId("line"), label: "Deposit refund", category: "Refund", quantity: 1, rate: -120 }],
    "Final Checkout Settlement": [
      { id: makeId("line"), label: "Prorated room settlement", category: "Monthly Rent", quantity: 1, rate: rentRate },
      { id: makeId("line"), label: "Utility final read", category: "Utility", quantity: 1, rate: utilityRate },
      { id: makeId("line"), label: "Checkout recovery", category: "Fine", quantity: 1, rate: 45 },
    ],
  };

  return templates[invoiceType];
}

function BillingBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: FeedbackTone;
}) {
  return (
    <span className="billing-chip" data-tone={tone}>
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  delta,
}: {
  label: string;
  value: string;
  subtext: string;
  delta?: { label: string; tone: FeedbackTone };
}) {
  return (
    <article className="billing-kpi">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--billing-text-muted)]">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold text-[var(--billing-text-primary)]">{value}</p>
        </div>
        {delta ? <BillingBadge tone={delta.tone}>{delta.label}</BillingBadge> : null}
      </div>
      <p className="mt-3 text-sm text-[var(--billing-text-secondary)]">{subtext}</p>
    </article>
  );
}

function SortableLedgerHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (sortKey: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = activeKey === sortKey;
  const Icon = !isActive ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      className={`inline-flex w-full items-center gap-2 text-left transition hover:text-[var(--billing-text-primary)] ${
        align === "right" ? "justify-end" : "justify-start"
      }`}
      onClick={() => onSort(sortKey)}
      type="button"
    >
      <span>{label}</span>
      <Icon className={`size-3.5 ${isActive ? "text-[var(--billing-text-primary)]" : "text-[var(--billing-text-muted)]"}`} />
    </button>
  );
}

export default function BillingPage() {
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>(initialLedgerRows);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [roomFilter, setRoomFilter] = useState(FILTER_ALL_ROOMS);
  const [exceptionFilter, setExceptionFilter] = useState<ExceptionFilter>("all");
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<typeof FILTER_ALL_INVOICE_TYPES | InvoiceType>(
    FILTER_ALL_INVOICE_TYPES,
  );
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const [invoiceScope, setInvoiceScope] = useState<InvoiceScope>("single");
  const [selectedResidentId, setSelectedResidentId] = useState("res-001");
  const [billingCycle, setBillingCycle] = useState(ACTIVE_BILLING_CYCLE);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("Monthly Rent");
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>("7 days");
  const [dueDate, setDueDate] = useState(suggestedDueDate(ACTIVE_BILLING_CYCLE, "7 days"));
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceLifecycleStatus>("Draft");
  const [lineItems, setLineItems] = useState<LineItem[]>(() =>
    buildLineItems(residents.find((resident) => resident.id === "res-001"), "Monthly Rent", false),
  );
  const [discountAmount, setDiscountAmount] = useState(0);
  const [waiverAmount, setWaiverAmount] = useState(0);
  const [fineAmount, setFineAmount] = useState(0);
  const [depositAdjustment, setDepositAdjustment] = useState(0);
  const [invoicePaidAmount, setInvoicePaidAmount] = useState(0);
  const [enableRecurring, setEnableRecurring] = useState(true);
  const [enableProration, setEnableProration] = useState(false);
  const [carryForwardDue, setCarryForwardDue] = useState(true);
  const [enableLateFeeAutomation, setEnableLateFeeAutomation] = useState(true);
  const [allowPartialPayments, setAllowPartialPayments] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState("2026-04-03T09:42:00");
  const [invoiceReference, setInvoiceReference] = useState("INV-260403-901");
  const [feedback, setFeedback] = useState<Feedback | null>({
    tone: "info",
    message: "Billing workspace ready. Review invoice details before approval and issuance.",
  });

  const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());

  const selectedResident = useMemo(
    () => residents.find((resident) => resident.id === selectedResidentId) ?? residents[0],
    [selectedResidentId],
  );

  useEffect(() => {
    setDueDate(suggestedDueDate(billingCycle, paymentTerms));
  }, [billingCycle, paymentTerms]);

  useEffect(() => {
    setLineItems(buildLineItems(selectedResident, invoiceType, enableProration));
    setDiscountAmount(0);
    setWaiverAmount(0);
    setFineAmount(0);
    setDepositAdjustment(0);
    setInvoicePaidAmount(0);
    setInvoiceStatus("Draft");
    setPreviewOpen(false);
    setInvoiceReference(`INV-${billingCycle.replace("-", "")}-${selectedResident.regId.slice(-3)}`);
  }, [billingCycle, enableProration, invoiceType, selectedResident]);

  const activeResidents = useMemo(
    () => residents.filter((resident) => resident.status === "Active"),
    [],
  );

  const totalOutstanding = useMemo(
    () =>
      ledgerRows.reduce((sum, row) => {
        if (row.direction === "Debit" && row.balance > 0 && row.status !== "Paid") {
          return sum + row.balance;
        }
        return sum;
      }, 0),
    [ledgerRows],
  );

  const paymentsReceived = useMemo(
    () =>
      ledgerRows.reduce((sum, row) => {
        const rowDate = new Date(row.date);
        const isCurrentMonth =
          rowDate.getFullYear() === TODAY.getFullYear() && rowDate.getMonth() === TODAY.getMonth();

        if (row.type === "Payment" && row.status === "Paid" && isCurrentMonth) {
          return sum + row.amount;
        }
        return sum;
      }, 0),
    [ledgerRows],
  );

  const pendingInvoices = useMemo(
    () =>
      ledgerRows.filter(
        (row) =>
          row.type === "Invoice" &&
          (row.status === "Pending" || row.status === "Partially Paid" || row.status === "Overdue"),
      ).length,
    [ledgerRows],
  );

  const overdueResidents = useMemo(
    () => new Set(ledgerRows.filter((row) => row.status === "Overdue").map((row) => row.residentId)).size,
    [ledgerRows],
  );

  const overdueAmount = useMemo(
    () =>
      ledgerRows.reduce((sum, row) => (row.status === "Overdue" ? sum + row.balance : sum), 0),
    [ledgerRows],
  );

  const failedPayments = useMemo(
    () => ledgerRows.filter((row) => row.type === "Payment" && row.status === "Failed").length,
    [ledgerRows],
  );

  const roomOptions = useMemo(
    () =>
      Array.from(new Set(residents.map((resident) => `${resident.room} / ${resident.bed}`))),
    [],
  );

  const filteredLedger = useMemo(() => {
    return ledgerRows.filter((row) => {
      if (deferredSearch) {
        const haystack = [
          row.resident,
          row.regId,
          row.reference,
          row.room,
          row.bed,
          row.note,
          row.description,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(deferredSearch)) {
          return false;
        }
      }

      if (typeFilter !== "all" && row.type !== typeFilter) {
        return false;
      }

      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }

      if (categoryFilter !== "all" && row.category !== categoryFilter) {
        return false;
      }

      if (roomFilter !== FILTER_ALL_ROOMS && `${row.room} / ${row.bed}` !== roomFilter) {
        return false;
      }

      if (invoiceTypeFilter !== FILTER_ALL_INVOICE_TYPES && row.invoiceType !== invoiceTypeFilter) {
        return false;
      }

      if (exceptionFilter === "overdue_only" && row.status !== "Overdue") {
        return false;
      }

      if (exceptionFilter === "failed_only" && row.status !== "Failed") {
        return false;
      }

      if (exceptionFilter === "credits_only" && row.direction !== "Credit") {
        return false;
      }

      if (dateRange !== "all") {
        const rowDate = new Date(row.date);
        const diff = TODAY.getTime() - rowDate.getTime();
        const dayMs = 1000 * 60 * 60 * 24;

        if (dateRange === "this_month") {
          if (rowDate.getFullYear() !== TODAY.getFullYear() || rowDate.getMonth() !== TODAY.getMonth()) {
            return false;
          }
        }

        if (dateRange === "last_30_days" && diff > dayMs * 30) {
          return false;
        }

        if (dateRange === "quarter" && diff > dayMs * 90) {
          return false;
        }
      }

      return true;
    });
  }, [
    categoryFilter,
    dateRange,
    deferredSearch,
    exceptionFilter,
    invoiceTypeFilter,
    ledgerRows,
    roomFilter,
    statusFilter,
    typeFilter,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, dateRange, deferredSearch, exceptionFilter, invoiceTypeFilter, roomFilter, statusFilter, typeFilter]);

  const sortedLedger = useMemo(() => {
    const statusOrder: Record<LedgerStatus, number> = {
      Paid: 1,
      "Partially Paid": 2,
      Pending: 3,
      Overdue: 4,
      Failed: 5,
      Adjusted: 6,
      Reversed: 7,
    };

    const directionOrder: Record<LedgerDirection, number> = {
      Credit: 1,
      Debit: 2,
    };

    const valueForSort = (row: LedgerRow) => {
      switch (sortKey) {
        case "date":
          return new Date(row.date).getTime();
        case "resident":
          return `${row.resident} ${row.regId}`.toLowerCase();
        case "room":
          return `${row.room} ${row.bed}`.toLowerCase();
        case "type":
          return row.type.toLowerCase();
        case "category":
          return row.category.toLowerCase();
        case "amount":
          return row.amount;
        case "direction":
          return directionOrder[row.direction];
        case "balance":
          return row.balance;
        case "status":
          return statusOrder[row.status];
        case "reference":
          return row.reference.toLowerCase();
        default:
          return row.date;
      }
    };

    return [...filteredLedger].sort((left, right) => {
      const leftValue = valueForSort(left);
      const rightValue = valueForSort(right);

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return sortDirection === "asc" ? leftValue - rightValue : rightValue - leftValue;
      }

      const comparison = String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredLedger, sortDirection, sortKey]);

  const pageCount = Math.max(1, Math.ceil(sortedLedger.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, pageCount);
  const pagedRows = sortedLedger.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pageStart = sortedLedger.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(sortedLedger.length, safePage * PAGE_SIZE);

  const duplicateInvoice = useMemo(
    () =>
      existingInvoices.find(
        (invoice) =>
          invoice.residentId === selectedResident.id &&
          invoice.billingCycle === billingCycle &&
          invoice.invoiceType === invoiceType &&
          invoice.status !== "Cancelled" &&
          invoice.status !== "Refunded",
      ),
    [billingCycle, invoiceType, selectedResident.id],
  );

  const bulkDuplicateCount = useMemo(
    () =>
      activeResidents.filter((resident) =>
        existingInvoices.some(
          (invoice) =>
            invoice.residentId === resident.id &&
            invoice.billingCycle === billingCycle &&
            invoice.invoiceType === invoiceType &&
            invoice.status !== "Cancelled" &&
            invoice.status !== "Refunded",
        ),
      ).length,
    [activeResidents, billingCycle, invoiceType],
  );

  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + lineAmount(item), 0),
    [lineItems],
  );

  const previousDue = carryForwardDue && invoiceScope === "single" ? selectedResident.previousDue : 0;
  const totalDiscounts = discountAmount + waiverAmount;
  const totalAmount = subtotal + fineAmount + previousDue - totalDiscounts - depositAdjustment;
  const displayInvoiceStatus = useMemo(() => {
    if ((invoiceStatus === "Issued" || invoiceStatus === "Partially Paid") && totalAmount - invoicePaidAmount <= 0) {
      return "Paid";
    }

    if (
      (invoiceStatus === "Issued" || invoiceStatus === "Partially Paid") &&
      new Date(dueDate).getTime() < TODAY.getTime() &&
      totalAmount - invoicePaidAmount > 0
    ) {
      return invoicePaidAmount > 0 ? "Partially Paid" : "Overdue";
    }

    return invoiceStatus;
  }, [dueDate, invoicePaidAmount, invoiceStatus, totalAmount]);
  const balanceDue = totalAmount - invoicePaidAmount;
  const paymentProgress = totalAmount <= 0 ? 100 : clamp((invoicePaidAmount / totalAmount) * 100, 0, 100);
  const portfolioEstimate = invoiceScope === "bulk" ? totalAmount * activeResidents.length : totalAmount;
  const isLockedInvoice = [
    "Issued",
    "Partially Paid",
    "Paid",
    "Overdue",
    "Cancelled",
    "Refunded",
    "Adjusted",
  ].includes(displayInvoiceStatus);

  const blockingIssues = useMemo(() => {
    const issues: string[] = [];

    if (!lineItems.length) {
      issues.push("Add at least one charge line before saving or issuing an invoice.");
    }

    if (invoiceScope === "single" && duplicateInvoice) {
      issues.push(
        `${selectedResident.name} already has a ${invoiceType.toLowerCase()} invoice for ${formatCycle(billingCycle)}.`,
      );
    }

    if (
      invoiceScope === "single" &&
      selectedResident.status !== "Active" &&
      invoiceType !== "Final Checkout Settlement" &&
      invoiceType !== "Refund Invoice"
    ) {
      issues.push("Inactive or vacated residents can only be billed through final settlement or refund workflows.");
    }

    if (invoiceScope === "bulk" && bulkDuplicateCount > 0) {
      issues.push(
        `${bulkDuplicateCount} active residents already have a matching invoice for ${formatCycle(
          billingCycle,
        )}. Review duplicates before bulk generation.`,
      );
    }

    if (depositAdjustment > selectedResident.depositHeld) {
      issues.push("Deposit adjustment exceeds the security deposit currently held for the selected resident.");
    }

    if (totalAmount === 0) {
      issues.push("Invoice total cannot be zero.");
    }

    if (totalAmount < 0 && invoiceType !== "Refund Invoice") {
      issues.push("Negative totals are only valid for refund invoices.");
    }

    if (isLockedInvoice) {
      issues.push("This invoice is locked because it has already been issued or settled.");
    }

    return issues;
  }, [
    billingCycle,
    bulkDuplicateCount,
    depositAdjustment,
    duplicateInvoice,
    invoiceScope,
    invoiceType,
    isLockedInvoice,
    lineItems.length,
    selectedResident.depositHeld,
    selectedResident.name,
    selectedResident.status,
    totalAmount,
  ]);

  const advisoryNotes = useMemo(() => {
    const notes: string[] = [];

    if (!carryForwardDue && selectedResident.previousDue > 0 && invoiceScope === "single") {
      notes.push("Previous dues are excluded from this draft. Balance follow-up will remain open on the resident ledger.");
    }

    if (enableProration && invoiceType !== "Monthly Rent" && invoiceType !== "Final Checkout Settlement") {
      notes.push("Proration is enabled, but it only affects rent and final settlement charge templates.");
    }

    if (invoiceScope === "bulk") {
      notes.push(
        `Bulk generation will use the selected template for ${activeResidents.length} active residents in ${formatCycle(
          billingCycle,
        )}.`,
      );
    }

    if (invoiceType === "Final Checkout Settlement" && selectedResident.status === "Active") {
      notes.push("Final checkout settlement is usually applied after checkout inspection or move-out confirmation.");
    }

    if (!allowPartialPayments) {
      notes.push("Partial payments are disabled. The full billed amount will remain due until a complete settlement is recorded.");
    }

    return notes;
  }, [
    activeResidents.length,
    allowPartialPayments,
    billingCycle,
    carryForwardDue,
    enableProration,
    invoiceScope,
    invoiceType,
    selectedResident.previousDue,
    selectedResident.status,
  ]);

  function markDirty() {
    setUnsavedChanges(true);
  }

  function updateLedgerSort(nextSortKey: SortKey) {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === "date" || nextSortKey === "amount" || nextSortKey === "balance" ? "desc" : "asc");
  }

  function jumpToInvoiceBuilder() {
    document.getElementById("billing-invoice-builder")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetInvoiceDraft() {
    setLineItems(buildLineItems(selectedResident, invoiceType, enableProration));
    setDiscountAmount(0);
    setWaiverAmount(0);
    setFineAmount(0);
    setDepositAdjustment(0);
    setInvoicePaidAmount(0);
    setInvoiceStatus("Draft");
    setPreviewOpen(false);
    setUnsavedChanges(false);
    setFeedback({ tone: "info", message: "Invoice draft reset to the current resident template." });
  }

  function updateLineItem(
    id: string,
    field: keyof Pick<LineItem, "label" | "category" | "quantity" | "rate">,
    value: string,
  ) {
    setLineItems((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }

        if (field === "quantity" || field === "rate") {
          return { ...item, [field]: Number(value) };
        }

        return { ...item, [field]: value };
      }),
    );
    markDirty();
  }

  function addCustomCharge() {
    setLineItems((current) => [
      ...current,
      { id: makeId("line"), label: "Custom charge", category: "Adjustment", quantity: 1, rate: 0 },
    ]);
    setFeedback({ tone: "info", message: "Custom charge row added to the invoice breakdown." });
    markDirty();
  }

  function removeLineItem(id: string) {
    setLineItems((current) => current.filter((item) => item.id !== id));
    setFeedback({ tone: "warning", message: "Charge line removed from the invoice draft." });
    markDirty();
  }

  function saveDraft() {
    if (blockingIssues.length) {
      setFeedback({ tone: "danger", message: blockingIssues[0] });
      return;
    }

    setInvoiceStatus("Draft");
    setLastSavedAt(TODAY.toISOString());
    setUnsavedChanges(false);
    setFeedback({ tone: "success", message: "Invoice draft saved and ready for review." });
  }

  function previewInvoice() {
    if (blockingIssues.length) {
      setFeedback({ tone: "danger", message: blockingIssues[0] });
      return;
    }

    setPreviewOpen(true);
    setInvoiceStatus((current) => (current === "Draft" ? "Pending Review" : current));
    setFeedback({ tone: "info", message: "Invoice preview prepared for finance review." });
  }

  function approveInvoice() {
    if (blockingIssues.length) {
      setFeedback({ tone: "danger", message: blockingIssues[0] });
      return;
    }

    setInvoiceStatus("Approved");
    setLastSavedAt(TODAY.toISOString());
    setUnsavedChanges(false);
    setFeedback({ tone: "success", message: "Invoice approved. It is ready to issue to the resident ledger." });
  }

  function issueInvoice() {
    if (blockingIssues.length) {
      setFeedback({ tone: "danger", message: blockingIssues[0] });
      return;
    }

    if (invoiceStatus !== "Approved") {
      setFeedback({ tone: "warning", message: "Approve the invoice before issuing it." });
      return;
    }

    if (invoiceScope === "bulk") {
      setInvoiceStatus("Issued");
      setLastSavedAt(TODAY.toISOString());
      setUnsavedChanges(false);
      setFeedback({
        tone: "success",
        message: `Bulk invoice run prepared for ${activeResidents.length} residents. Duplicate protections remain active.`,
      });
      return;
    }

    const nextStatus: LedgerStatus = balanceDue > 0 ? "Pending" : "Paid";
    const nextRow: LedgerRow = {
      id: makeId("txn"),
      date: TODAY.toISOString().slice(0, 10),
      residentId: selectedResident.id,
      resident: selectedResident.name,
      regId: selectedResident.regId,
      hostel: selectedResident.hostel,
      floor: selectedResident.floor,
      room: selectedResident.room,
      bed: selectedResident.bed,
      type: "Invoice",
      category:
        invoiceType === "Monthly Rent"
          ? "Monthly Rent"
          : invoiceType === "Mess Charges"
            ? "Mess"
            : invoiceType === "Utility Charges"
              ? "Utility"
              : invoiceType === "Security Deposit"
                ? "Deposit"
                : invoiceType === "Admission Fee"
                  ? "Admission"
                  : invoiceType === "Refund Invoice"
                    ? "Refund"
                    : invoiceType === "Adjustment Invoice"
                      ? "Adjustment"
                      : "Fine",
      amount: totalAmount,
      direction: totalAmount >= 0 ? "Debit" : "Credit",
      balance: Math.max(balanceDue, 0),
      status: nextStatus,
      reference: invoiceReference,
      note: `${invoiceType} issued for ${formatCycle(billingCycle)}.`,
      description: "Invoice issued from billing workspace.",
      invoiceType,
    };

    setLedgerRows((current) => [nextRow, ...current]);
    setInvoiceStatus("Issued");
    setLastSavedAt(TODAY.toISOString());
    setUnsavedChanges(false);
    setFeedback({ tone: "success", message: "Invoice issued and posted to the resident billing ledger." });
  }

  function sendInvoice() {
    if (!["Issued", "Partially Paid", "Paid", "Overdue"].includes(displayInvoiceStatus)) {
      setFeedback({ tone: "warning", message: "Issue the invoice before sending it to the resident or guardian." });
      return;
    }

    setFeedback({ tone: "success", message: "Invoice delivery queued for email and resident portal download." });
  }

  function recordInvoicePayment() {
    if (!["Issued", "Partially Paid", "Overdue", "Paid"].includes(displayInvoiceStatus)) {
      setFeedback({ tone: "warning", message: "Issue the invoice before recording a payment against it." });
      return;
    }

    if (balanceDue <= 0) {
      setFeedback({ tone: "info", message: "This invoice is already fully settled." });
      return;
    }

    const postedAmount = allowPartialPayments ? Math.min(balanceDue, Math.max(120, totalAmount * 0.4)) : balanceDue;
    const nextPaidAmount = invoicePaidAmount + postedAmount;
    const nextStatus: InvoiceLifecycleStatus = nextPaidAmount >= totalAmount ? "Paid" : "Partially Paid";
    const nextLedgerStatus: LedgerStatus = nextPaidAmount >= totalAmount ? "Paid" : "Partially Paid";
    const paymentReference = makeReference("PAY");

    setInvoicePaidAmount(nextPaidAmount);
    setInvoiceStatus(nextStatus);
    setLedgerRows((current) => {
      const invoiceUpdated = current.map((row) =>
        row.reference === invoiceReference
          ? {
              ...row,
              balance: Math.max(totalAmount - nextPaidAmount, 0),
              status: nextLedgerStatus,
            }
          : row,
      );

      return [
        {
          id: makeId("txn"),
          date: TODAY.toISOString().slice(0, 10),
          residentId: selectedResident.id,
          resident: selectedResident.name,
          regId: selectedResident.regId,
          hostel: selectedResident.hostel,
          floor: selectedResident.floor,
          room: selectedResident.room,
          bed: selectedResident.bed,
          type: "Payment",
          category:
            invoiceType === "Utility Charges"
              ? "Utility"
              : invoiceType === "Mess Charges"
                ? "Mess"
                : invoiceType === "Refund Invoice"
                  ? "Refund"
                  : "Monthly Rent",
          amount: postedAmount,
          direction: "Credit",
          balance: Math.max(totalAmount - nextPaidAmount, 0),
          status: "Paid",
          reference: paymentReference,
          note: "Payment recorded directly from billing workspace.",
          description: `${allowPartialPayments ? "Partial" : "Full"} payment applied to issued invoice.`,
          invoiceType,
        },
        ...invoiceUpdated,
      ];
    });
    setFeedback({
      tone: "success",
      message: `${formatCurrency(postedAmount)} recorded successfully. Ledger and invoice balance updated.`,
    });
  }

  function downloadInvoice() {
    if (displayInvoiceStatus === "Draft" || displayInvoiceStatus === "Pending Review") {
      setFeedback({ tone: "warning", message: "Approve and issue the invoice before exporting a final PDF." });
      return;
    }

    setFeedback({ tone: "info", message: "Invoice PDF export prepared with the latest approved line items and totals." });
  }

  function viewBillingHistory() {
    setSearchQuery(selectedResident.name);
    setFeedback({ tone: "info", message: `Billing ledger filtered to ${selectedResident.name} for quick account review.` });
  }

  function markLedgerRowPaid(row: LedgerRow) {
    if (row.direction !== "Debit" || row.balance <= 0) {
      setFeedback({ tone: "info", message: "This ledger entry does not have an outstanding debit balance." });
      return;
    }

    const paymentReference = makeReference("PAY");

    setLedgerRows((current) => {
      const updatedRows = current.map((item) =>
        item.id === row.id ? { ...item, balance: 0, status: "Paid" as LedgerStatus } : item,
      );

      return [
        {
          id: makeId("txn"),
          date: TODAY.toISOString().slice(0, 10),
          residentId: row.residentId,
          resident: row.resident,
          regId: row.regId,
          hostel: row.hostel,
          floor: row.floor,
          room: row.room,
          bed: row.bed,
          type: "Payment",
          category: row.category,
          amount: row.balance,
          direction: "Credit",
          balance: 0,
          status: "Paid",
          reference: paymentReference,
          note: `Payment posted against ${row.reference}.`,
          description: "Manual settlement recorded from the billing ledger.",
          invoiceType: row.invoiceType,
        },
        ...updatedRows,
      ];
    });

    setFeedback({
      tone: "success",
      message: `${row.reference} marked as paid and a payment receipt entry was added to the ledger.`,
    });
  }

  const previewTitle =
    invoiceScope === "bulk"
      ? `${formatCycle(billingCycle)} bulk invoice run`
      : `${invoiceType} for ${selectedResident.name}`;

  const headerSection = (
    <>
      <header className="billing-card billing-card-elevated p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <BillingBadge tone="success">Ledger Active</BillingBadge>
              <BillingBadge tone={overdueAmount > 0 ? "danger" : "success"}>
                Overdue Amount {formatCurrency(overdueAmount)}
              </BillingBadge>
              <BillingBadge tone={pendingInvoices > 0 ? "warning" : "success"}>
                Pending Invoices {pendingInvoices}
              </BillingBadge>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--billing-text-primary)] sm:text-[2.35rem]">
                Billing &amp; Fee Management
              </h1>
              <p className="max-w-3xl text-base text-[var(--billing-text-secondary)]">
                Manage payments, invoices, dues, ledger entries, and billing activity.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="billing-button-primary"
              onClick={() => {
                jumpToInvoiceBuilder();
                recordInvoicePayment();
              }}
              type="button"
            >
              <Wallet className="size-4" />
              Record Payment
            </button>
            <button
              className="billing-button-secondary"
              onClick={() => {
                jumpToInvoiceBuilder();
                setFeedback({ tone: "info", message: "Invoice creation workspace is ready for review and issuance." });
              }}
              type="button"
            >
              <FileText className="size-4" />
              Generate Invoice
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard
          delta={{ label: totalOutstanding > 0 ? "Requires follow-up" : "Healthy", tone: totalOutstanding > 0 ? "warning" : "success" }}
          label="Total Outstanding"
          subtext="Open debit balances across rent, deposits, fines, and utility recovery."
          value={formatCurrency(totalOutstanding)}
        />
        <MetricCard
          delta={{ label: "This month", tone: "success" }}
          label="Payments Received"
          subtext="Settled payments recorded in the current billing month."
          value={formatCurrency(paymentsReceived)}
        />
        <MetricCard
          delta={{ label: pendingInvoices > 0 ? "Needs review" : "On track", tone: pendingInvoices > 0 ? "warning" : "success" }}
          label="Pending Invoices"
          subtext="Invoices that are still waiting for approval, payment, or follow-up."
          value={String(pendingInvoices)}
        />
        <MetricCard
          delta={{ label: overdueResidents > 0 ? "Priority" : "Healthy", tone: overdueResidents > 0 ? "danger" : "success" }}
          label="Overdue Accounts"
          subtext="Residents with overdue balances after reminders and due-date checks."
          value={String(overdueResidents)}
        />
      </section>

      <section className="billing-alert" data-tone={overdueAmount > 0 || failedPayments > 0 ? "danger" : "warning"}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--billing-text-primary)]">
              <AlertTriangle className="size-4" />
              Billing exceptions
            </div>
            <p className="text-sm text-[var(--billing-text-secondary)]">
              {formatCurrency(overdueAmount)} overdue across {overdueResidents} resident account
              {overdueResidents === 1 ? "" : "s"}, with {failedPayments} failed payment
              {failedPayments === 1 ? "" : "s"} waiting for retry.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <BillingBadge tone="danger">{overdueResidents} overdue accounts</BillingBadge>
            <BillingBadge tone={failedPayments > 0 ? "warning" : "success"}>
              {failedPayments} failed payments
            </BillingBadge>
            <button
              className="billing-button-secondary"
              onClick={() => {
                setExceptionFilter("overdue_only");
                setFeedback({ tone: "warning", message: "Ledger narrowed to overdue billing exceptions for follow-up." });
              }}
              type="button"
            >
              Review overdue
            </button>
          </div>
        </div>
      </section>

      <section className="billing-card p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(180px,0.8fr))_auto]">
          <label className="billing-search xl:col-span-2">
            <Search className="size-4 shrink-0 text-[var(--billing-text-muted)]" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--billing-text-primary)] outline-none placeholder:text-[var(--billing-text-muted)]"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search resident, registration ID, invoice, payment, or reference"
              value={searchQuery}
            />
            {searchQuery ? (
              <button
                className="billing-button-ghost !min-h-8 !px-2 text-xs"
                onClick={() => setSearchQuery("")}
                type="button"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </label>

          <select className="billing-control" onChange={(event) => setTypeFilter(event.target.value as TypeFilter)} value={typeFilter}>
            <option value="all">All Types</option>
            <option value="Invoice">Invoice</option>
            <option value="Payment">Payment</option>
            <option value="Adjustment">Adjustment</option>
            <option value="Refund">Refund</option>
          </select>

          <select className="billing-control" onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} value={statusFilter}>
            <option value="all">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Overdue">Overdue</option>
            <option value="Failed">Failed</option>
            <option value="Adjusted">Adjusted</option>
            <option value="Reversed">Reversed</option>
          </select>

          <select className="billing-control" onChange={(event) => setDateRange(event.target.value as DateRangeFilter)} value={dateRange}>
            <option value="all">All Dates</option>
            <option value="this_month">This Month</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="quarter">This Quarter</option>
          </select>

          <button
            className="billing-button-secondary"
            onClick={() => setShowAdvancedFilters((current) => !current)}
            type="button"
          >
            <Filter className="size-4" />
            Advanced
          </button>
        </div>

        {showAdvancedFilters ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <select
              className="billing-control"
              onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
              value={categoryFilter}
            >
              <option value="all">All Categories</option>
              <option value="Monthly Rent">Monthly Rent</option>
              <option value="Mess">Mess</option>
              <option value="Utility">Utility</option>
              <option value="Deposit">Deposit</option>
              <option value="Admission">Admission</option>
              <option value="Fine">Fine</option>
              <option value="Adjustment">Adjustment</option>
              <option value="Refund">Refund</option>
            </select>

            <select className="billing-control" onChange={(event) => setRoomFilter(event.target.value)} value={roomFilter}>
              <option value={FILTER_ALL_ROOMS}>All Rooms / Beds</option>
              {roomOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              className="billing-control"
              onChange={(event) => setExceptionFilter(event.target.value as ExceptionFilter)}
              value={exceptionFilter}
            >
              <option value="all">All Exceptions</option>
              <option value="overdue_only">Overdue only</option>
              <option value="failed_only">Failed only</option>
              <option value="credits_only">Credits only</option>
            </select>

            <select
              className="billing-control"
              onChange={(event) =>
                setInvoiceTypeFilter(event.target.value as typeof FILTER_ALL_INVOICE_TYPES | InvoiceType)
              }
              value={invoiceTypeFilter}
            >
              <option value={FILTER_ALL_INVOICE_TYPES}>All Invoice Types</option>
              {invoiceTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </section>
    </>
  );

  const invoiceSection = (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,0.95fr)]">
      <article className="billing-card p-6" id="billing-invoice-builder">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--billing-text-muted)]">
                Invoice Creation
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--billing-text-primary)]">
                Create and control hostel billing
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-[var(--billing-text-secondary)]">
                Build resident-linked invoices with recurring billing, prorated charges, deposits, discounts,
                waivers, carry-forward dues, payment tracking, and approval-safe issuance.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <BillingBadge tone={chipToneForInvoiceStatus(displayInvoiceStatus)}>{displayInvoiceStatus}</BillingBadge>
              <BillingBadge tone={chipToneForBillingHealth(selectedResident.billingHealth)}>
                Resident {selectedResident.billingHealth}
              </BillingBadge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[16px] border border-[var(--billing-border-subtle)] bg-white/3 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--billing-text-muted)]">
                Resident
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full border border-[var(--billing-border-subtle)] bg-white/5 text-sm font-semibold text-[var(--billing-text-primary)]">
                  {selectedResident.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <div>
                  <p className="font-medium text-[var(--billing-text-primary)]">{selectedResident.name}</p>
                  <p className="text-sm text-[var(--billing-text-secondary)]">{selectedResident.regId}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[16px] border border-[var(--billing-border-subtle)] bg-white/3 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--billing-text-muted)]">
                Room / Bed
              </p>
              <p className="mt-3 font-medium text-[var(--billing-text-primary)]">{roomLabel(selectedResident)}</p>
              <p className="text-sm text-[var(--billing-text-secondary)]">{locationLabel(selectedResident)}</p>
            </div>

            <div className="rounded-[16px] border border-[var(--billing-border-subtle)] bg-white/3 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--billing-text-muted)]">
                Billing Cycle
              </p>
              <p className="mt-3 font-medium text-[var(--billing-text-primary)]">{formatCycle(billingCycle)}</p>
              <p className="text-sm text-[var(--billing-text-secondary)]">Due {formatDate(dueDate)}</p>
            </div>

            <div className="rounded-[16px] border border-[var(--billing-border-subtle)] bg-white/3 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--billing-text-muted)]">
                Reference
              </p>
              <p className="mt-3 font-medium text-[var(--billing-text-primary)]">{invoiceReference}</p>
              <p className="text-sm text-[var(--billing-text-secondary)]">Last saved {formatDateTime(lastSavedAt)}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--billing-text-primary)]">Invoice scope</span>
              <select
                className="billing-control"
                disabled={isLockedInvoice}
                onChange={(event) => {
                  setInvoiceScope(event.target.value as InvoiceScope);
                  markDirty();
                }}
                value={invoiceScope}
              >
                <option value="single">Single resident</option>
                <option value="bulk">Bulk active residents</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--billing-text-primary)]">
                {invoiceScope === "bulk" ? "Template resident" : "Resident"}
              </span>
              <select
                className="billing-control"
                disabled={isLockedInvoice}
                onChange={(event) => {
                  setSelectedResidentId(event.target.value);
                  markDirty();
                }}
                value={selectedResidentId}
              >
                {residents.map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.name} · {resident.regId}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--billing-text-primary)]">Billing cycle</span>
              <input
                className="billing-control"
                disabled={isLockedInvoice}
                onChange={(event) => {
                  setBillingCycle(event.target.value);
                  markDirty();
                }}
                type="month"
                value={billingCycle}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--billing-text-primary)]">Invoice type</span>
              <select
                className="billing-control"
                disabled={isLockedInvoice}
                onChange={(event) => {
                  setInvoiceType(event.target.value as InvoiceType);
                  markDirty();
                }}
                value={invoiceType}
              >
                {invoiceTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--billing-text-primary)]">Due date</span>
              <input
                className="billing-control"
                disabled={isLockedInvoice}
                onChange={(event) => {
                  setDueDate(event.target.value);
                  markDirty();
                }}
                type="date"
                value={dueDate}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--billing-text-primary)]">Payment terms</span>
              <select
                className="billing-control"
                disabled={isLockedInvoice}
                onChange={(event) => {
                  setPaymentTerms(event.target.value as PaymentTerms);
                  markDirty();
                }}
                value={paymentTerms}
              >
                {paymentTermsOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <button
              className="billing-toggle text-left"
              onClick={() => {
                if (isLockedInvoice) {
                  return;
                }
                setEnableRecurring((current) => !current);
                markDirty();
              }}
              type="button"
            >
              <input checked={enableRecurring} className="mt-1 size-4" readOnly type="checkbox" />
              <span>
                <span className="block text-sm font-medium text-[var(--billing-text-primary)]">Recurring invoice generation</span>
                <span className="mt-1 block text-xs text-[var(--billing-text-secondary)]">
                  Reuse this invoice type for monthly billing runs.
                </span>
              </span>
            </button>

            <button
              className="billing-toggle text-left"
              onClick={() => {
                if (isLockedInvoice) {
                  return;
                }
                setEnableProration((current) => !current);
                markDirty();
              }}
              type="button"
            >
              <input checked={enableProration} className="mt-1 size-4" readOnly type="checkbox" />
              <span>
                <span className="block text-sm font-medium text-[var(--billing-text-primary)]">Prorated billing</span>
                <span className="mt-1 block text-xs text-[var(--billing-text-secondary)]">
                  Apply mid-cycle rent logic for check-in and checkout adjustments.
                </span>
              </span>
            </button>

            <button
              className="billing-toggle text-left"
              onClick={() => {
                if (isLockedInvoice) {
                  return;
                }
                setCarryForwardDue((current) => !current);
                markDirty();
              }}
              type="button"
            >
              <input checked={carryForwardDue} className="mt-1 size-4" readOnly type="checkbox" />
              <span>
                <span className="block text-sm font-medium text-[var(--billing-text-primary)]">Carry forward previous dues</span>
                <span className="mt-1 block text-xs text-[var(--billing-text-secondary)]">
                  Moves unpaid resident balances into the next invoice cycle.
                </span>
              </span>
            </button>

            <button
              className="billing-toggle text-left"
              onClick={() => {
                if (isLockedInvoice) {
                  return;
                }
                setEnableLateFeeAutomation((current) => !current);
                markDirty();
              }}
              type="button"
            >
              <input checked={enableLateFeeAutomation} className="mt-1 size-4" readOnly type="checkbox" />
              <span>
                <span className="block text-sm font-medium text-[var(--billing-text-primary)]">Late fee automation</span>
                <span className="mt-1 block text-xs text-[var(--billing-text-secondary)]">
                  Applies follow-up fees once the due date passes and grace rules expire.
                </span>
              </span>
            </button>

            <button
              className="billing-toggle text-left"
              onClick={() => {
                if (isLockedInvoice) {
                  return;
                }
                setAllowPartialPayments((current) => !current);
                markDirty();
              }}
              type="button"
            >
              <input checked={allowPartialPayments} className="mt-1 size-4" readOnly type="checkbox" />
              <span>
                <span className="block text-sm font-medium text-[var(--billing-text-primary)]">Allow partial payments</span>
                <span className="mt-1 block text-xs text-[var(--billing-text-secondary)]">
                  Controls whether receipts can settle the invoice in multiple payments.
                </span>
              </span>
            </button>

            <div className="billing-toggle">
              <ShieldAlert className="mt-1 size-4 text-[var(--billing-text-muted)]" />
              <span>
                <span className="block text-sm font-medium text-[var(--billing-text-primary)]">Approval-safe versioning</span>
                <span className="mt-1 block text-xs text-[var(--billing-text-secondary)]">
                  Issued or paid invoices lock line-item edits and preserve audit consistency.
                </span>
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--billing-text-primary)]">Charge breakdown</h3>
                <p className="text-sm text-[var(--billing-text-secondary)]">
                  Editable line items for rent, mess, utilities, deposits, fines, discounts, waivers, and custom adjustments.
                </p>
              </div>
              <button className="billing-button-secondary" disabled={isLockedInvoice} onClick={addCustomCharge} type="button">
                <Plus className="size-4" />
                Add custom charge
              </button>
            </div>

            <div className="billing-line-table-wrap">
              <table className="billing-line-table">
                <thead>
                  <tr>
                    <th>Charge</th>
                    <th>Category</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          className="billing-control"
                          disabled={isLockedInvoice}
                          onChange={(event) => updateLineItem(item.id, "label", event.target.value)}
                          value={item.label}
                        />
                      </td>
                      <td>
                        <select
                          className="billing-control"
                          disabled={isLockedInvoice}
                          onChange={(event) => updateLineItem(item.id, "category", event.target.value)}
                          value={item.category}
                        >
                          {lineItemCategories.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className="billing-control text-right"
                          disabled={isLockedInvoice}
                          min="0"
                          onChange={(event) => updateLineItem(item.id, "quantity", event.target.value)}
                          step="1"
                          type="number"
                          value={item.quantity}
                        />
                      </td>
                      <td>
                        <input
                          className="billing-control text-right"
                          disabled={isLockedInvoice}
                          onChange={(event) => updateLineItem(item.id, "rate", event.target.value)}
                          step="0.01"
                          type="number"
                          value={item.rate}
                        />
                      </td>
                      <td className="text-right text-sm font-semibold text-[var(--billing-text-primary)]">
                        {formatCurrency(lineAmount(item))}
                      </td>
                      <td>
                        <div className="flex justify-end">
                          <button
                            className="billing-row-action"
                            disabled={isLockedInvoice || lineItems.length === 1}
                            onClick={() => removeLineItem(item.id)}
                            type="button"
                          >
                            <X className="size-4" />
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--billing-text-primary)]">Discount</span>
              <input
                className="billing-control"
                disabled={isLockedInvoice}
                onChange={(event) => {
                  setDiscountAmount(Number(event.target.value));
                  markDirty();
                }}
                step="0.01"
                type="number"
                value={discountAmount}
              />
              <p className="text-xs text-[var(--billing-text-secondary)]">
                Use for approved resident discounts or plan concessions.
              </p>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--billing-text-primary)]">Waiver</span>
              <input
                className="billing-control"
                disabled={isLockedInvoice}
                onChange={(event) => {
                  setWaiverAmount(Number(event.target.value));
                  markDirty();
                }}
                step="0.01"
                type="number"
                value={waiverAmount}
              />
              <p className="text-xs text-[var(--billing-text-secondary)]">
                Apply short-term waivers for approved billing relief.
              </p>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--billing-text-primary)]">Fine amount</span>
              <input
                className="billing-control"
                disabled={isLockedInvoice}
                onChange={(event) => {
                  setFineAmount(Number(event.target.value));
                  markDirty();
                }}
                step="0.01"
                type="number"
                value={fineAmount}
              />
              <p className="text-xs text-[var(--billing-text-secondary)]">
                Add late fees, damages, or conduct-related recovery items.
              </p>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[var(--billing-text-primary)]">Deposit adjustment</span>
              <input
                className={`billing-control${depositAdjustment > selectedResident.depositHeld ? " billing-control-error" : ""}`}
                disabled={isLockedInvoice}
                onChange={(event) => {
                  setDepositAdjustment(Number(event.target.value));
                  markDirty();
                }}
                step="0.01"
                type="number"
                value={depositAdjustment}
              />
              <p className="text-xs text-[var(--billing-text-secondary)]">
                Held deposit available: {formatCurrency(selectedResident.depositHeld)}.
              </p>
            </label>
          </div>

          {blockingIssues.length ? (
            <div className="billing-alert" data-tone="danger">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[var(--billing-text-primary)]">Validation checks need attention</p>
                  <ul className="space-y-1.5 text-sm text-[var(--billing-text-secondary)]">
                    {blockingIssues.map((issue) => (
                      <li key={issue}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {advisoryNotes.length ? (
            <div className="rounded-[18px] border border-[var(--billing-border-subtle)] bg-white/2 p-4">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 size-4 shrink-0 text-[var(--billing-text-muted)]" />
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[var(--billing-text-primary)]">Billing notes</p>
                  <ul className="space-y-1.5 text-sm text-[var(--billing-text-secondary)]">
                    {advisoryNotes.map((note) => (
                      <li key={note}>• {note}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </article>

      <div className="space-y-6">
        <article className="billing-card billing-card-elevated p-6" id="billing-invoice-summary">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--billing-text-muted)]">
                Invoice Summary
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--billing-text-primary)]">{previewTitle}</h3>
            </div>
            <BillingBadge tone={chipToneForInvoiceStatus(displayInvoiceStatus)}>{displayInvoiceStatus}</BillingBadge>
          </div>

          <div className="mt-5 space-y-1">
            <div className="billing-summary-row">
              <span className="text-[var(--billing-text-secondary)]">Subtotal</span>
              <span className="billing-value-neutral">{formatCurrency(subtotal)}</span>
            </div>
            <div className="billing-summary-row">
              <span className="text-[var(--billing-text-secondary)]">Discounts</span>
              <span className="billing-value-negative">-{formatCurrency(totalDiscounts)}</span>
            </div>
            <div className="billing-summary-row">
              <span className="text-[var(--billing-text-secondary)]">Fines</span>
              <span className="billing-value-neutral">{formatCurrency(fineAmount)}</span>
            </div>
            <div className="billing-summary-row">
              <span className="text-[var(--billing-text-secondary)]">Previous dues</span>
              <span className="billing-value-neutral">{formatCurrency(previousDue)}</span>
            </div>
            <div className="billing-summary-row">
              <span className="text-[var(--billing-text-secondary)]">Deposit adjustment</span>
              <span className="billing-value-positive">-{formatCurrency(depositAdjustment)}</span>
            </div>
            <div className="billing-summary-row">
              <span className="text-base font-semibold text-[var(--billing-text-primary)]">Total amount</span>
              <span className={totalAmount < 0 ? "billing-value-positive text-base" : "billing-value-neutral text-base"}>
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <div className="billing-summary-row">
              <span className="text-[var(--billing-text-secondary)]">Paid amount</span>
              <span className="billing-value-positive">{formatCurrency(invoicePaidAmount)}</span>
            </div>
            <div className="billing-summary-row">
              <span className="text-base font-semibold text-[var(--billing-text-primary)]">Balance due</span>
              <span className={balanceDue > 0 ? "billing-value-negative text-base" : "billing-value-positive text-base"}>
                {formatCurrency(balanceDue)}
              </span>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--billing-text-secondary)]">Payment progress</span>
              <span className="font-medium text-[var(--billing-text-primary)]">{Math.round(paymentProgress)}%</span>
            </div>
            <div className="billing-progress-track">
              <div className="billing-progress-fill" style={{ width: `${paymentProgress}%` }} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[16px] border border-[var(--billing-border-subtle)] bg-white/3 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--billing-text-muted)]">
                Resident billing status
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <BillingBadge tone={chipToneForBillingHealth(selectedResident.billingHealth)}>
                  {selectedResident.billingHealth}
                </BillingBadge>
                <BillingBadge tone="warning">Previous due {formatCurrency(selectedResident.previousDue)}</BillingBadge>
              </div>
              <p className="mt-3 text-sm text-[var(--billing-text-secondary)]">{selectedResident.lastPaymentNote}</p>
            </div>

            <div className="rounded-[16px] border border-[var(--billing-border-subtle)] bg-white/3 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--billing-text-muted)]">
                Audit and history
              </p>
              <p className="mt-3 text-sm font-medium text-[var(--billing-text-primary)]">{selectedResident.lastUpdatedBy}</p>
              <p className="mt-1 text-sm text-[var(--billing-text-secondary)]">
                Last billing activity {formatDateTime(selectedResident.lastActivity)}.
              </p>
              <p className="mt-2 text-xs text-[var(--billing-text-muted)]">
                Issued invoices preserve charge versions and payment linkage for audit review.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[18px] border border-[var(--billing-border-subtle)] bg-white/3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--billing-text-primary)]">Bulk billing estimate</p>
                <p className="text-xs text-[var(--billing-text-secondary)]">
                  Uses the current template against all active residents when bulk scope is selected.
                </p>
              </div>
              <span className="text-lg font-semibold text-[var(--billing-text-primary)]">
                {formatCurrency(portfolioEstimate)}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <BillingBadge tone="info">{activeResidents.length} active residents</BillingBadge>
              <BillingBadge tone={bulkDuplicateCount > 0 ? "warning" : "success"}>
                {bulkDuplicateCount} duplicate protections
              </BillingBadge>
            </div>
          </div>

          {previewOpen ? (
            <div className="mt-5 rounded-[18px] border border-[var(--billing-border-strong)] bg-white/3 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--billing-text-primary)]">
                <Eye className="size-4" />
                Invoice preview ready
              </div>
              <p className="mt-2 text-sm text-[var(--billing-text-secondary)]">
                {invoiceScope === "bulk"
                  ? `The bulk run will create ${activeResidents.length} resident invoices for ${formatCycle(
                      billingCycle,
                    )}, following the current approval and duplicate controls.`
                  : `${selectedResident.name} will receive ${invoiceType.toLowerCase()} charges for ${formatCycle(
                      billingCycle,
                    )} with a due date of ${formatDate(dueDate)}.`}
              </p>
            </div>
          ) : null}
        </article>

        <article className="billing-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--billing-text-primary)]">
            <History className="size-4" />
            Recent billing activity
          </div>
          <div className="mt-4 space-y-3">
            {[
              {
                title: "Partial payment recorded",
                detail: `${selectedResident.name} cleared ${formatCurrency(selectedResident.paidThisCycle)} in the current cycle.`,
                time: formatDateTime(selectedResident.lastActivity),
              },
              {
                title: "Deposit available",
                detail: `Held deposit balance is ${formatCurrency(selectedResident.depositHeld)} and can be adjusted during settlement.`,
                time: "Policy check active",
              },
              {
                title: "Resident ledger note",
                detail: selectedResident.lastPaymentNote,
                time: selectedResident.lastUpdatedBy,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[16px] border border-[var(--billing-border-subtle)] bg-white/3 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-[var(--billing-text-primary)]">{item.title}</p>
                  <span className="text-xs text-[var(--billing-text-muted)]">{item.time}</span>
                </div>
                <p className="mt-2 text-sm text-[var(--billing-text-secondary)]">{item.detail}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );

  const ledgerSection = (
    <>
      <section className="billing-action-bar">
        <div className="min-w-[220px] flex-1">
          <p className="text-sm font-semibold text-[var(--billing-text-primary)]">
            {unsavedChanges ? "Unsaved invoice changes" : "Invoice state is up to date"}
          </p>
          <p className="text-sm text-[var(--billing-text-secondary)]">
            {unsavedChanges
              ? "Review invoice validation, then save or continue through approval and issuance."
              : `Last saved ${formatDateTime(lastSavedAt)}.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="billing-button-secondary" disabled={isLockedInvoice} onClick={resetInvoiceDraft} type="button">
            <RotateCcw className="size-4" />
            Reset changes
          </button>
          <button className="billing-button-secondary" disabled={blockingIssues.length > 0} onClick={saveDraft} type="button">
            <Check className="size-4" />
            Save Draft
          </button>
          <button className="billing-button-secondary" disabled={blockingIssues.length > 0} onClick={previewInvoice} type="button">
            <Eye className="size-4" />
            Preview Invoice
          </button>
          <button className="billing-button-secondary" disabled={blockingIssues.length > 0 || isLockedInvoice} onClick={approveInvoice} type="button">
            <CheckCheck className="size-4" />
            Approve
          </button>
          <button className="billing-button-primary" disabled={blockingIssues.length > 0 || displayInvoiceStatus !== "Approved"} onClick={issueInvoice} type="button">
            <Receipt className="size-4" />
            Issue Invoice
          </button>
          <button className="billing-button-secondary" onClick={sendInvoice} type="button">
            <Send className="size-4" />
            Send Invoice
          </button>
          <button className="billing-button-secondary" onClick={recordInvoicePayment} type="button">
            <CreditCard className="size-4" />
            Record Payment
          </button>
          <button className="billing-button-secondary" onClick={downloadInvoice} type="button">
            <Download className="size-4" />
            Download PDF
          </button>
          <button className="billing-button-ghost" onClick={viewBillingHistory} type="button">
            <History className="size-4" />
            View Billing History
          </button>
        </div>
      </section>

      {feedback ? (
        <section className="billing-alert" data-tone={feedback.tone === "danger" ? "danger" : "warning"}>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-[var(--billing-text-primary)]">{feedback.message}</p>
            <button className="billing-button-ghost !min-h-8 !px-2" onClick={() => setFeedback(null)} type="button">
              <X className="size-4" />
            </button>
          </div>
        </section>
      ) : null}

      <section className="billing-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--billing-text-muted)]">
              Billing Ledger
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--billing-text-primary)]">Resident payment ledger</h2>
            <p className="mt-2 text-sm text-[var(--billing-text-secondary)]">
              Review invoice activity, resident-linked charges, receipts, balances, and exception handling in one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="billing-pagination">
              Showing {pageStart}-{pageEnd} of {filteredLedger.length}
            </span>
            <button className="billing-button-secondary" type="button">
              <Download className="size-4" />
              Export Ledger
            </button>
            <button className="billing-button-secondary" type="button">
              <Landmark className="size-4" />
              Download Statement
            </button>
          </div>
        </div>

        <div className="mt-5 billing-ledger-wrap">
          <table className="billing-ledger-table">
            <thead>
              <tr>
                <th>
                  <SortableLedgerHeader
                    activeKey={sortKey}
                    direction={sortDirection}
                    label="Date"
                    onSort={updateLedgerSort}
                    sortKey="date"
                  />
                </th>
                <th>
                  <SortableLedgerHeader
                    activeKey={sortKey}
                    direction={sortDirection}
                    label="Resident"
                    onSort={updateLedgerSort}
                    sortKey="resident"
                  />
                </th>
                <th>
                  <SortableLedgerHeader
                    activeKey={sortKey}
                    direction={sortDirection}
                    label="Room / Bed"
                    onSort={updateLedgerSort}
                    sortKey="room"
                  />
                </th>
                <th>
                  <SortableLedgerHeader
                    activeKey={sortKey}
                    direction={sortDirection}
                    label="Type"
                    onSort={updateLedgerSort}
                    sortKey="type"
                  />
                </th>
                <th>
                  <SortableLedgerHeader
                    activeKey={sortKey}
                    direction={sortDirection}
                    label="Category"
                    onSort={updateLedgerSort}
                    sortKey="category"
                  />
                </th>
                <th className="text-right">
                  <SortableLedgerHeader
                    activeKey={sortKey}
                    align="right"
                    direction={sortDirection}
                    label="Amount"
                    onSort={updateLedgerSort}
                    sortKey="amount"
                  />
                </th>
                <th>
                  <SortableLedgerHeader
                    activeKey={sortKey}
                    direction={sortDirection}
                    label="Dr / Cr"
                    onSort={updateLedgerSort}
                    sortKey="direction"
                  />
                </th>
                <th className="text-right">
                  <SortableLedgerHeader
                    activeKey={sortKey}
                    align="right"
                    direction={sortDirection}
                    label="Balance"
                    onSort={updateLedgerSort}
                    sortKey="balance"
                  />
                </th>
                <th>
                  <SortableLedgerHeader
                    activeKey={sortKey}
                    direction={sortDirection}
                    label="Status"
                    onSort={updateLedgerSort}
                    sortKey="status"
                  />
                </th>
                <th>
                  <SortableLedgerHeader
                    activeKey={sortKey}
                    direction={sortDirection}
                    label="Reference"
                    onSort={updateLedgerSort}
                    sortKey="reference"
                  />
                </th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length ? (
                pagedRows.map((row) => (
                  <tr data-overdue={row.status === "Overdue"} key={row.id}>
                    <td>
                      <div className="space-y-1">
                        <p className="font-medium text-[var(--billing-text-primary)]">{formatDate(row.date)}</p>
                        <p className="text-xs text-[var(--billing-text-muted)]">{row.description}</p>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <p className="font-medium text-[var(--billing-text-primary)]">{row.resident}</p>
                        <p className="text-xs text-[var(--billing-text-secondary)]">
                          {row.regId} · {row.note}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <p className="font-medium text-[var(--billing-text-primary)]">
                          {row.room} / {row.bed}
                        </p>
                        <p className="text-xs text-[var(--billing-text-secondary)]">
                          {row.hostel} · {row.floor}
                        </p>
                      </div>
                    </td>
                    <td>
                      <BillingBadge tone={row.type === "Payment" ? "success" : row.type === "Invoice" ? "info" : "warning"}>
                        {row.type}
                      </BillingBadge>
                    </td>
                    <td>
                      <span className="text-sm font-medium text-[var(--billing-text-primary)]">{row.category}</span>
                    </td>
                    <td className="text-right">
                      <span className={row.direction === "Credit" ? "billing-value-positive" : "billing-value-neutral"}>
                        {formatCurrency(row.amount)}
                      </span>
                    </td>
                    <td>
                      <BillingBadge tone={chipToneForDirection(row.direction)}>{row.direction}</BillingBadge>
                    </td>
                    <td className="text-right">
                      <span className={row.balance > 0 ? "billing-value-negative" : "billing-value-neutral"}>
                        {formatCurrency(row.balance)}
                      </span>
                    </td>
                    <td>
                      <BillingBadge tone={chipToneForLedgerStatus(row.status)}>{row.status}</BillingBadge>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <p className="font-medium text-[var(--billing-text-primary)]">{row.reference}</p>
                        <p className="text-xs text-[var(--billing-text-muted)]">{row.invoiceType ?? "Resident billing"}</p>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button className="billing-row-action" type="button">
                          <Eye className="size-4" />
                          Details
                        </button>
                        {row.direction === "Debit" ? (
                          <button className="billing-row-action" onClick={() => markLedgerRowPaid(row)} type="button">
                            <Wallet className="size-4" />
                            Mark Paid
                          </button>
                        ) : (
                          <button className="billing-row-action" type="button">
                            <Download className="size-4" />
                            Receipt
                          </button>
                        )}
                        <button
                          className="billing-row-action"
                          data-tone={row.status === "Overdue" || row.status === "Failed" ? "danger" : undefined}
                          onClick={() => {
                            setSearchQuery(row.resident);
                            setFeedback({
                              tone: row.status === "Overdue" || row.status === "Failed" ? "warning" : "info",
                              message: `Ledger filtered to ${row.resident} so you can review the full billing history.`,
                            });
                          }}
                          type="button"
                        >
                          <History className="size-4" />
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-10 text-center text-sm text-[var(--billing-text-secondary)]" colSpan={11}>
                    No billing records match the current search and filter set.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--billing-text-secondary)]">
            Total records: <span className="font-medium text-[var(--billing-text-primary)]">{filteredLedger.length}</span>
          </p>
          <div className="flex items-center gap-3">
            <button
              className="billing-button-secondary"
              disabled={safePage === 1}
              onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              <ChevronLeft className="size-4" />
              Previous
            </button>
            <span className="billing-pagination">
              Page {safePage} of {pageCount}
            </span>
            <button
              className="billing-button-secondary"
              disabled={safePage === pageCount}
              onClick={() => setCurrentPage((current) => Math.min(pageCount, current + 1))}
              type="button"
            >
              Next
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </section>
    </>
  );

  return (
    <div className="mx-auto w-full max-w-[1720px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <section className="billing-shell overflow-hidden p-4 sm:p-6 lg:p-8">
        <div className="space-y-6">
          {headerSection}
          {invoiceSection}
          {ledgerSection}
        </div>
      </section>
    </div>
  );
}
