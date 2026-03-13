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
  integrations: {
    members: string;
    rooms: string;
    allotments: string;
    billing: string;
    attendance: string;
    reports: string;
  };
  recent_activities: DashboardActivity[];
};
