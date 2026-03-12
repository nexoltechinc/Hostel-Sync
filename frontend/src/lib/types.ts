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

export type Member = {
  id: number;
  hostel: number;
  member_code: string;
  full_name: string;
  phone: string;
  status: "active" | "inactive" | "checked_out";
};

export type Room = {
  id: number;
  hostel: number;
  room_code: string;
  capacity: number;
  occupied_beds: number;
  available_beds: number;
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
