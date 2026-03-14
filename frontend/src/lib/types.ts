export type UserRole = "owner" | "admin" | "accountant" | "warden" | "staff";

export type AuthUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: UserRole;
  hostel: number | null;
  is_active: boolean;
  permissions: string[];
};

export type AuthResponse = {
  access: string;
  refresh: string;
  user: AuthUser;
};

export type MemberStatus = "active" | "inactive" | "checked_out";
export type MemberGender = "male" | "female" | "other";

export type Member = {
  id: number;
  hostel: number;
  member_code: string;
  full_name: string;
  guardian_name: string;
  id_number: string;
  phone: string;
  emergency_contact: string;
  address: string;
  joining_date: string;
  gender: MemberGender;
  status: MemberStatus;
  leaving_date: string | null;
  remarks: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type MemberWritePayload = {
  hostel?: number;
  member_code: string;
  full_name: string;
  guardian_name?: string;
  id_number?: string;
  phone: string;
  emergency_contact?: string;
  address?: string;
  joining_date: string;
  gender: MemberGender;
  status: MemberStatus;
  leaving_date?: string | null;
  remarks?: string;
};

export type MemberUpdatePayload = Partial<MemberWritePayload>;

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type RoomType = "standard" | "deluxe" | "private";

export type Bed = {
  id: number;
  room: number;
  label: string;
  is_active: boolean;
  is_occupied: boolean;
  created_at: string;
};

export type Room = {
  id: number;
  hostel: number;
  room_code: string;
  floor: string;
  capacity: number;
  room_type: RoomType;
  monthly_rent: string | null;
  is_active: boolean;
  beds: Bed[];
  occupied_beds: number;
  available_beds: number;
  created_at: string;
  updated_at: string;
};

export type RoomAllotment = {
  id: number;
  hostel: number;
  member: number;
  bed: number;
  start_date: string;
  end_date: string | null;
  status: "active" | "closed";
};

export type RoomWritePayload = {
  hostel?: number;
  room_code: string;
  floor?: string;
  capacity: number;
  room_type: RoomType;
  monthly_rent?: number | null;
  is_active?: boolean;
  bed_labels?: string[];
};

export type RoomUpdatePayload = Partial<Omit<RoomWritePayload, "bed_labels">> & {
  bed_labels?: string[];
};

export type BedWritePayload = {
  room: number;
  label: string;
  is_active?: boolean;
};

export type BedUpdatePayload = Partial<BedWritePayload>;

export type DashboardActivity = {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  reference_id: number;
};

export type DashboardSummary = {
  scope: {
    hostel_id: number | null;
    is_global: boolean;
  };
  summary: {
    total_members: number;
    active_members: number;
    total_rooms: number;
    active_rooms: number;
    total_beds: number;
    occupied_beds: number;
    available_beds: number;
    occupancy_rate: number;
  };
  financial: {
    pending_dues: number | null;
    monthly_collection: number | null;
    status: string;
  };
  attendance: {
    present_today: number | null;
    absent_today: number | null;
    status: string;
  };
  notifications: {
    unread: number | null;
    status: string;
  };
  integrations: {
    members: string;
    rooms: string;
    allotments: string;
    billing: string;
    attendance: string;
    notifications: string;
    reports: string;
  };
  recent_activities: DashboardActivity[];
};

export type ReportScope = {
  hostel_id: number | null;
  is_global: boolean;
};

export type PaymentMethod = "cash" | "upi" | "bank_transfer" | "card" | "other";
export type AttendanceRecordStatus = "present" | "absent" | "on_leave" | "excused";
export type InvoiceLifecycleStatus = "open" | "partially_paid" | "paid";

export type OccupancyReportRow = {
  id: number;
  hostel_id: number;
  hostel_code: string;
  room_code: string;
  floor: string;
  room_type: RoomType;
  is_active: boolean;
  capacity: number;
  monthly_rent: number | null;
  total_beds: number;
  active_beds: number;
  occupied_beds: number;
  available_beds: number;
  occupancy_rate: number;
};

export type OccupancyReport = {
  module: string;
  report: "occupancy";
  snapshot_date: string;
  scope: ReportScope;
  filters: {
    room_type: RoomType | "all";
    is_active: boolean | "all";
  };
  summary: {
    total_rooms: number;
    active_rooms: number;
    total_capacity: number;
    total_beds: number;
    active_beds: number;
    occupied_beds: number;
    available_beds: number;
    occupancy_rate: number;
  };
  room_type_breakdown: Array<{
    room_type: RoomType;
    rooms: number;
    active_beds: number;
    occupied_beds: number;
    occupancy_rate: number;
  }>;
  rows: OccupancyReportRow[];
};

export type FeeCollectionReportRow = {
  id: number;
  hostel_id: number;
  hostel_code: string;
  member_id: number;
  member_code: string;
  member_name: string;
  payment_date: string;
  method: PaymentMethod;
  method_label: string;
  amount: number;
  applied_amount: number;
  credit_added: number;
  receipt_number: string;
  reference_no: string;
};

export type FeeCollectionReport = {
  module: string;
  report: "fee_collection";
  snapshot_date: string;
  scope: ReportScope;
  filters: {
    date_from: string;
    date_to: string;
    member: number | null;
    method: PaymentMethod | "all";
  };
  summary: {
    payment_count: number;
    member_count: number;
    total_collected: number;
    total_applied: number;
    total_credit_added: number;
  };
  by_method: Array<{
    method: PaymentMethod;
    label: string;
    payment_count: number;
    total_collected: number;
  }>;
  rows: FeeCollectionReportRow[];
};

export type PendingDuesReportRow = {
  id: number;
  hostel_id: number;
  hostel_code: string;
  member_id: number;
  member_code: string;
  member_name: string;
  billing_month: string;
  issue_date: string;
  due_date: string | null;
  status: InvoiceLifecycleStatus;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  is_overdue: boolean;
  days_overdue: number | null;
};

export type PendingDuesReport = {
  module: string;
  report: "pending_dues";
  snapshot_date: string;
  scope: ReportScope;
  filters: {
    billing_month: string | null;
    member: number | null;
    only_overdue: boolean;
    due_on_or_before: string | null;
    min_balance: number;
  };
  summary: {
    invoice_count: number;
    member_count: number;
    open_invoices: number;
    partially_paid_invoices: number;
    overdue_invoices: number;
    total_outstanding: number;
  };
  rows: PendingDuesReportRow[];
};

export type AttendanceReportDailyBreakdown = {
  attendance_date: string;
  present: number;
  absent: number;
  on_leave: number;
  excused: number;
  corrected_records: number;
};

export type AttendanceReportMemberBreakdown = {
  member_id: number;
  member_code: string;
  member_name: string;
  present: number;
  absent: number;
  on_leave: number;
  excused: number;
  marked_days: number;
  corrected_records: number;
  attendance_rate: number;
};

export type AttendanceReport = {
  module: string;
  report: "attendance";
  snapshot_date: string;
  scope: ReportScope;
  filters: {
    date_from: string;
    date_to: string;
    member: number | null;
    status: AttendanceRecordStatus | "all";
  };
  summary: {
    days_in_range: number;
    expected_members: number;
    expected_records: number;
    marked_records: number;
    matching_records: number;
    present: number;
    absent: number;
    on_leave: number;
    excused: number;
    corrected_records: number;
    marking_rate_percent: number;
  };
  daily_breakdown: AttendanceReportDailyBreakdown[];
  member_breakdown: AttendanceReportMemberBreakdown[];
};

export type HostelProfile = {
  id: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type HostelBrandingSettings = {
  brand_name: string;
  website_url: string;
  primary_color: string;
  accent_color: string;
};

export type HostelFinancialSettings = {
  currency_code: string;
  invoice_due_day: number;
  late_fee_amount: number;
  default_security_deposit: number;
  default_admission_fee: number;
  allow_partial_payments: boolean;
  auto_apply_member_credit: boolean;
};

export type HostelNotificationSettings = {
  enable_announcements: boolean;
  enable_fee_reminders: boolean;
  fee_reminder_days_before: number;
  fee_reminder_days_after: number;
  enable_attendance_alerts: boolean;
};

export type HostelOperationsSettings = {
  attendance_cutoff_time: string;
  allow_attendance_corrections: boolean;
  checkout_notice_days: number;
  require_checkout_clearance: boolean;
};

export type HostelAccessSettings = {
  allow_admin_manage_users: boolean;
  allow_admin_manage_hostel_settings: boolean;
  allow_warden_view_reports: boolean;
  allow_staff_view_reports: boolean;
};

export type SettingsRecord = {
  id: number;
  hostel: HostelProfile;
  branding: HostelBrandingSettings;
  financial: HostelFinancialSettings;
  notifications: HostelNotificationSettings;
  operations: HostelOperationsSettings;
  access: HostelAccessSettings;
  updated_at: string;
  updated_by: string | null;
};

export type SettingsSnapshot = {
  module: string;
  phase: number;
  status: string;
  scope: {
    hostel_id: number;
    hostel_code: string;
  };
  effective_permissions: string[];
  data: SettingsRecord;
};

export type SettingsStatus = {
  module: string;
  phase: number;
  status: string;
  scope: {
    hostel_id: number;
    hostel_code: string;
    is_global: boolean;
  };
  summary: {
    currency_code: string;
    invoice_due_day: number;
    allow_partial_payments: boolean;
    fee_reminders_enabled: boolean;
    attendance_corrections_enabled: boolean;
    admin_manage_users_enabled: boolean;
    admin_manage_settings_enabled: boolean;
  };
  available_sections: string[];
};

export type SettingsUpdatePayload = {
  hostel?: Partial<Pick<HostelProfile, "name" | "code" | "address" | "phone" | "email" | "timezone" | "is_active">>;
  branding?: Partial<HostelBrandingSettings>;
  financial?: Partial<HostelFinancialSettings>;
  notifications?: Partial<HostelNotificationSettings>;
  operations?: Partial<HostelOperationsSettings>;
  access?: Partial<HostelAccessSettings>;
};
