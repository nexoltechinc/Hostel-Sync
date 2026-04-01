import type { LucideIcon } from "lucide-react";
import {
  Archive,
  ArrowDownUp,
  BadgeDollarSign,
  BedDouble,
  BedSingle,
  Bell,
  BellDot,
  BookCheck,
  Building2,
  Building,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CalendarSearch,
  ChartColumnBig,
  ChevronRight,
  CircleAlert,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Download,
  FileBarChart2,
  FileCheck2,
  FileClock,
  FileSpreadsheet,
  Filter,
  House,
  IdCard,
  Landmark,
  LayoutDashboard,
  MapPinned,
  MessageSquareMore,
  MessageSquareWarning,
  NotebookPen,
  Receipt,
  RefreshCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  ShieldEllipsis,
  Smartphone,
  UserCog,
  UserPlus,
  UserRound,
  UserRoundX,
  Users,
  Wallet,
} from "lucide-react";

export type AppModuleKey =
  | "dashboard"
  | "members"
  | "rooms"
  | "allotments"
  | "billing"
  | "attendance"
  | "notifications"
  | "reports"
  | "settings";

export type WorkflowKey =
  | "member_list"
  | "member_add"
  | "member_edit"
  | "member_detail"
  | "room_list"
  | "room_add"
  | "room_detail"
  | "room_allotment"
  | "room_transfer"
  | "checkout"
  | "fee_plans"
  | "payment_entry"
  | "payment_history"
  | "pending_dues"
  | "attendance_marking"
  | "attendance_history"
  | "announcements"
  | "reports_overview"
  | "settings_profile";

export const navIcons: Record<AppModuleKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  members: Users,
  rooms: Building2,
  allotments: BedSingle,
  billing: Wallet,
  attendance: ClipboardCheck,
  notifications: BellDot,
  reports: ChartColumnBig,
  settings: Settings,
};

export const moduleIcons: Record<AppModuleKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  members: UserRound,
  rooms: Building,
  allotments: BedDouble,
  billing: BadgeDollarSign,
  attendance: BookCheck,
  notifications: MessageSquareMore,
  reports: FileBarChart2,
  settings: ShieldEllipsis,
};

export const workflowIcons: Record<WorkflowKey, LucideIcon> = {
  member_list: Users,
  member_add: UserPlus,
  member_edit: UserCog,
  member_detail: IdCard,
  room_list: Building2,
  room_add: House,
  room_detail: BedDouble,
  room_allotment: BedSingle,
  room_transfer: ChevronRight,
  checkout: UserRoundX,
  fee_plans: Landmark,
  payment_entry: CreditCard,
  payment_history: Receipt,
  pending_dues: FileClock,
  attendance_marking: ClipboardCheck,
  attendance_history: CalendarSearch,
  announcements: Bell,
  reports_overview: FileCheck2,
  settings_profile: Settings,
};

export const actionIcons = {
  addMember: UserPlus,
  edit: NotebookPen,
  view: Search,
  delete: Archive,
  archive: Archive,
  sort: ArrowDownUp,
  filter: Filter,
  search: Search,
  refresh: RefreshCcw,
  exportPdf: FileBarChart2,
  exportExcel: FileSpreadsheet,
  download: Download,
  print: Receipt,
  send: Send,
  quickAction: CircleAlert,
};

export const formFieldIcons = {
  email: Bell,
  password: ShieldCheck,
  phone: Smartphone,
  address: MapPinned,
  date: CalendarDays,
  dateRange: CalendarRange,
  currency: CircleDollarSign,
  search: Search,
  idDocument: IdCard,
  member: UserRound,
  room: Building2,
  bed: BedSingle,
  notes: MessageSquareMore,
  emergency: MessageSquareWarning,
  due: CalendarClock,
};

export const summaryIcons = {
  totalMembers: Users,
  totalRooms: Building2,
  occupiedBeds: BedDouble,
  availableBeds: BedSingle,
  monthlyCollection: Wallet,
  pendingDues: FileClock,
  attendanceSummary: ClipboardList,
  recentActivity: CalendarClock,
  alerts: CircleAlert,
};
