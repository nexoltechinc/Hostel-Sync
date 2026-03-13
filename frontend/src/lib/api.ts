import type {
  AuthResponse,
  AuthUser,
  Bed,
  BedUpdatePayload,
  BedWritePayload,
  DashboardSummary,
  Member,
  MemberGender,
  MemberStatus,
  MemberUpdatePayload,
  MemberWritePayload,
  PaginatedResponse,
  Room,
  RoomType,
  RoomUpdatePayload,
  RoomWritePayload,
} from "./types";

type WebRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

async function webRequest<T>(path: string, options: WebRequestOptions = {}) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  const payload = (await response.json().catch(() => null)) as T | { detail?: string } | null;
  if (!response.ok) {
    let detail = "Request failed";
    if (payload && typeof payload === "object") {
      if ("detail" in payload && typeof payload.detail === "string") {
        detail = payload.detail;
      } else {
        const firstEntry = Object.values(payload)[0];
        if (typeof firstEntry === "string") {
          detail = firstEntry;
        } else if (Array.isArray(firstEntry) && typeof firstEntry[0] === "string") {
          detail = firstEntry[0];
        }
      }
    }
    throw new Error(detail || "Request failed");
  }
  return payload as T;
}

export type MembersQueryParams = {
  search?: string;
  status?: MemberStatus | "all";
  gender?: MemberGender | "all";
  ordering?: "id" | "-id" | "member_code" | "-member_code" | "full_name" | "-full_name" | "joining_date" | "-joining_date";
  page?: number;
};

function buildMembersQuery(params: MembersQueryParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }
  if (params.status && params.status !== "all") {
    searchParams.set("status", params.status);
  }
  if (params.gender && params.gender !== "all") {
    searchParams.set("gender", params.gender);
  }
  if (params.ordering) {
    searchParams.set("ordering", params.ordering);
  }
  if (params.page && params.page > 1) {
    searchParams.set("page", String(params.page));
  }
  return searchParams.toString();
}

export type RoomsQueryParams = {
  search?: string;
  room_type?: RoomType | "all";
  is_active?: boolean | "all";
  ordering?: "id" | "-id" | "room_code" | "-room_code" | "capacity" | "-capacity";
  page?: number;
};

export type BedsQueryParams = {
  search?: string;
  room?: number;
  is_active?: boolean | "all";
  ordering?: "id" | "-id" | "label" | "-label";
  page?: number;
};

function buildRoomsQuery(params: RoomsQueryParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }
  if (params.room_type && params.room_type !== "all") {
    searchParams.set("room_type", params.room_type);
  }
  if (typeof params.is_active === "boolean") {
    searchParams.set("is_active", String(params.is_active));
  }
  if (params.ordering) {
    searchParams.set("ordering", params.ordering);
  }
  if (params.page && params.page > 1) {
    searchParams.set("page", String(params.page));
  }
  return searchParams.toString();
}

function buildBedsQuery(params: BedsQueryParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.search?.trim()) {
    searchParams.set("search", params.search.trim());
  }
  if (typeof params.room === "number") {
    searchParams.set("room", String(params.room));
  }
  if (typeof params.is_active === "boolean") {
    searchParams.set("is_active", String(params.is_active));
  }
  if (params.ordering) {
    searchParams.set("ordering", params.ordering);
  }
  if (params.page && params.page > 1) {
    searchParams.set("page", String(params.page));
  }
  return searchParams.toString();
}

export function login(payload: { username: string; password: string }) {
  return webRequest<AuthResponse>("/api/auth/login", { method: "POST", body: payload });
}

export function logout() {
  return webRequest<{ success: boolean }>("/api/auth/logout", { method: "POST" });
}

export function getSession() {
  return webRequest<{ user: AuthUser }>("/api/auth/session");
}

export function getDashboardSummary() {
  return webRequest<DashboardSummary>("/api/dashboard/summary");
}

export function getMembers(params: MembersQueryParams = {}) {
  const query = buildMembersQuery(params);
  const path = query ? `/api/members?${query}` : "/api/members";
  return webRequest<PaginatedResponse<Member>>(path);
}

export function createMember(payload: MemberWritePayload) {
  return webRequest<Member>("/api/members", { method: "POST", body: payload });
}

export function updateMember(memberId: number, payload: MemberUpdatePayload) {
  return webRequest<Member>(`/api/members/${memberId}`, { method: "PATCH", body: payload });
}

export function deleteMember(memberId: number) {
  return webRequest<null>(`/api/members/${memberId}`, { method: "DELETE" });
}

export function getRooms(params: RoomsQueryParams = {}) {
  const query = buildRoomsQuery(params);
  const path = query ? `/api/rooms?${query}` : "/api/rooms";
  return webRequest<PaginatedResponse<Room>>(path);
}

export function createRoom(payload: RoomWritePayload) {
  return webRequest<Room>("/api/rooms", { method: "POST", body: payload });
}

export function updateRoom(roomId: number, payload: RoomUpdatePayload) {
  return webRequest<Room>(`/api/rooms/${roomId}`, { method: "PATCH", body: payload });
}

export function deleteRoom(roomId: number) {
  return webRequest<null>(`/api/rooms/${roomId}`, { method: "DELETE" });
}

export function getBeds(params: BedsQueryParams = {}) {
  const query = buildBedsQuery(params);
  const path = query ? `/api/rooms/beds?${query}` : "/api/rooms/beds";
  return webRequest<PaginatedResponse<Bed>>(path);
}

export function createBed(payload: BedWritePayload) {
  return webRequest<Bed>("/api/rooms/beds", { method: "POST", body: payload });
}

export function updateBed(bedId: number, payload: BedUpdatePayload) {
  return webRequest<Bed>(`/api/rooms/beds/${bedId}`, { method: "PATCH", body: payload });
}

export function deleteBed(bedId: number) {
  return webRequest<null>(`/api/rooms/beds/${bedId}`, { method: "DELETE" });
}
