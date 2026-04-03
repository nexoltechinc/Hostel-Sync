"use client";

import {
  ArrowUpDown,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  Filter,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserCog,
  UserMinus,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { MemberFormModal } from "@/components/members/member-form-modal";
import { useCreateMember, useDeleteMember, useMembers, useUpdateMember } from "@/hooks/use-members";
import { useSession } from "@/hooks/use-session";
import type { MembersQueryParams } from "@/lib/api";
import type { Member, MemberGender, MemberStatus, MemberWritePayload } from "@/lib/types";

const STATUS_FILTERS: Array<{ value: MemberStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "checked_out", label: "Checked Out" },
];

const GENDER_OPTIONS: Array<{ value: MemberGender | "all"; label: string }> = [
  { value: "all", label: "All genders" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const STATUS_META: Record<
  MemberStatus,
  {
    label: string;
    section: string;
    pillClass: string;
    dotClass: string;
    cardBackground: string;
    cardBorder: string;
  }
> = {
  active: {
    label: "Active",
    section: "Active Residents",
    pillClass: "border-sky-500/20 bg-sky-500/15 text-sky-300",
    dotClass: "bg-sky-400",
    cardBackground: "linear-gradient(135deg, rgba(27, 62, 39, 0.96) 0%, rgba(20, 42, 29, 0.96) 100%)",
    cardBorder: "rgba(101, 149, 118, 0.24)",
  },
  inactive: {
    label: "Inactive",
    section: "Inactive Residents",
    pillClass: "border-slate-500/30 bg-slate-500/18 text-slate-300",
    dotClass: "bg-slate-400",
    cardBackground: "linear-gradient(135deg, rgba(35, 55, 38, 0.92) 0%, rgba(24, 36, 27, 0.96) 100%)",
    cardBorder: "rgba(109, 134, 115, 0.2)",
  },
  checked_out: {
    label: "Checked Out",
    section: "Checked Out",
    pillClass: "border-amber-500/20 bg-amber-500/15 text-amber-200",
    dotClass: "bg-amber-300",
    cardBackground: "linear-gradient(135deg, rgba(38, 42, 63, 0.96) 0%, rgba(24, 28, 44, 0.96) 100%)",
    cardBorder: "rgba(120, 129, 173, 0.22)",
  },
};

const AVATAR_BACKGROUNDS = [
  "linear-gradient(135deg, #f3d39d 0%, #c27a45 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #4f46e5 100%)",
  "linear-gradient(135deg, #fb7185 0%, #f59e0b 100%)",
  "linear-gradient(135deg, #22c55e 0%, #0f766e 100%)",
  "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
];

function formatShortDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

function formatCountLabel(total: number, status: MemberStatus | "all") {
  if (status === "all") {
    return `${total.toLocaleString("en-US")} members`;
  }

  const descriptor = status === "checked_out" ? "checked out members" : `${status} members`;
  return `${total.toLocaleString("en-US")} ${descriptor}`;
}

function getInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "HS";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function getAvatarBackground(seed: string) {
  const total = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_BACKGROUNDS[total % AVATAR_BACKGROUNDS.length];
}

function getMetaLine(member: Member) {
  if (member.status === "checked_out" && member.leaving_date) {
    return `${member.member_code} | Left ${formatShortDate(member.leaving_date)}`;
  }

  return `${member.member_code} | Joined ${formatShortDate(member.joining_date)}`;
}

function isManageMembersAllowed(permissions: string[]) {
  return permissions.includes("*") || permissions.includes("manage_members");
}

function isSuperuser(permissions: string[]) {
  return permissions.includes("*");
}

function buildSections(members: Member[]) {
  const order: MemberStatus[] = ["active", "inactive", "checked_out"];

  return order
    .map((status) => ({
      key: status,
      title: STATUS_META[status].section,
      members: members.filter((member) => member.status === status),
    }))
    .filter((section) => section.members.length > 0);
}

function getPaginationWindow(page: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const start = Math.max(1, Math.min(page - 1, totalPages - 4));
  return Array.from({ length: 5 }, (_, idx) => start + idx);
}

function MembersLoadingSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {Array.from({ length: 6 }, (_, index) => (
        <article
          key={index}
          className="members-animate-rise relative min-h-[210px] overflow-hidden rounded-[26px] border"
          style={{
            animationDelay: `${index * 55}ms`,
            borderColor: "rgba(133, 160, 188, 0.2)",
            background: "linear-gradient(180deg, rgba(16,24,40,0.82) 0%, rgba(12,19,33,0.86) 100%)",
          }}
        >
          <div className="members-skeleton absolute inset-0" />
        </article>
      ))}
    </div>
  );
}

export default function MembersPage() {
  const { data: sessionData } = useSession();
  const permissions = sessionData?.user.permissions ?? [];
  const canManageMembers = isManageMembersAllowed(permissions);
  const showHostelField = isSuperuser(permissions);

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<MemberStatus | "all">("all");
  const [genderFilter, setGenderFilter] = useState<MemberGender | "all">("all");
  const [ordering, setOrdering] = useState<MembersQueryParams["ordering"]>("-id");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);

  const params = useMemo<MembersQueryParams>(
    () => ({
      search: searchInput,
      status: statusFilter,
      gender: genderFilter,
      page,
      ordering,
    }),
    [genderFilter, ordering, page, searchInput, statusFilter],
  );

  const membersQuery = useMembers(params);
  const createMemberMutation = useCreateMember();
  const updateMemberMutation = useUpdateMember();
  const deleteMemberMutation = useDeleteMember();

  const members = useMemo(() => membersQuery.data?.results ?? [], [membersQuery.data?.results]);
  const sections = useMemo(() => buildSections(members), [members]);
  const isMutating = createMemberMutation.isPending || updateMemberMutation.isPending || deleteMemberMutation.isPending;
  const totalPages = Math.max(1, Math.ceil((membersQuery.data?.count ?? 0) / 20));
  const activeFiltersCount = Number(statusFilter !== "all") + Number(genderFilter !== "all") + Number(Boolean(searchInput.trim()));
  const paginationWindow = useMemo(() => getPaginationWindow(page, totalPages), [page, totalPages]);
  const visibleStatusCounts = useMemo(
    () => ({
      active: members.filter((member) => member.status === "active").length,
      inactive: members.filter((member) => member.status === "inactive").length,
      checked_out: members.filter((member) => member.status === "checked_out").length,
    }),
    [members],
  );

  async function submitForm(payload: MemberWritePayload) {
    setErrorMessage(null);
    setFeedback(null);

    try {
      if (editingMember) {
        await updateMemberMutation.mutateAsync({ memberId: editingMember.id, payload });
        setFeedback("Member updated successfully.");
      } else {
        await createMemberMutation.mutateAsync(payload);
        setFeedback("Member created successfully.");
      }
      setIsModalOpen(false);
      setEditingMember(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save member.");
    }
  }

  async function archiveMember(member: Member) {
    if (!canManageMembers) {
      return;
    }

    const confirmed = window.confirm(`Archive member "${member.full_name}"?`);
    if (!confirmed) {
      return;
    }

    setErrorMessage(null);
    setFeedback(null);
    setOpenActionMenuId(null);

    try {
      await deleteMemberMutation.mutateAsync(member.id);
      setFeedback("Member archived successfully.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to archive member.");
    }
  }

  async function transitionStatus(member: Member, nextStatus: MemberStatus) {
    if (!canManageMembers) {
      return;
    }

    const confirmed = window.confirm(`Change status for "${member.full_name}" to "${nextStatus.replace("_", " ")}"?`);
    if (!confirmed) {
      return;
    }

    setErrorMessage(null);
    setFeedback(null);
    setOpenActionMenuId(null);

    const payload =
      nextStatus === "active"
        ? ({ status: "active", leaving_date: null } as const)
        : ({
            status: nextStatus,
            leaving_date: new Date().toISOString().slice(0, 10),
          } as const);

    try {
      await updateMemberMutation.mutateAsync({ memberId: member.id, payload });
      setFeedback(`Member status updated to ${nextStatus.replace("_", " ")}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update status.");
    }
  }

  function openCreateModal() {
    setEditingMember(null);
    setIsModalOpen(true);
    setOpenActionMenuId(null);
  }

  function openEditModal(member: Member) {
    setEditingMember(member);
    setIsModalOpen(true);
    setOpenActionMenuId(null);
  }

  return (
    <>
      <section
        className="relative isolate overflow-hidden rounded-[30px] border px-4 py-5 shadow-[0_30px_90px_rgba(2,6,23,0.42)] sm:px-6 sm:py-6 xl:px-8"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(79,102,235,0.22), transparent 28%), linear-gradient(180deg, #101826 0%, #0b1220 100%)",
          borderColor: "rgba(120, 135, 188, 0.2)",
        }}
        onClick={() => setOpenActionMenuId(null)}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.62)_0,transparent_1px),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.4)_0,transparent_1px),radial-gradient(circle_at_28%_70%,rgba(255,255,255,0.28)_0,transparent_1px),radial-gradient(circle_at_68%_72%,rgba(255,255,255,0.22)_0,transparent_1px)] [background-size:220px_220px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="pointer-events-none absolute inset-x-8 top-28 h-px bg-white/5" />

        <div className="relative z-10 space-y-6">
          <header className="dashboard-fade-up flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="dashboard-chip">
                <Sparkles className="h-3.5 w-3.5" />
                Resident operations center
              </span>
              <p className="mt-3 text-[clamp(1.95rem,6vw,3rem)] font-semibold leading-none tracking-[-0.04em] text-white">Members List</p>
              <p className="mt-2 text-sm sm:text-base" style={{ color: "#96a5c4" }}>
                {formatCountLabel(membersQuery.data?.count ?? 0, statusFilter)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setOrdering((current) => (current === "-id" ? "full_name" : "-id"));
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-[#9eb6ff] transition hover:-translate-y-0.5 hover:border-[#4f7fff] hover:bg-[#172338]"
                style={{ borderColor: "rgba(126, 146, 205, 0.18)", backgroundColor: "rgba(17, 24, 41, 0.45)" }}
                aria-label={ordering === "-id" ? "Sort alphabetically" : "Sort by newest"}
                title={ordering === "-id" ? "Sort alphabetically" : "Sort by newest"}
              >
                <ArrowUpDown className="h-5 w-5" />
              </button>

              {canManageMembers ? (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="hidden items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#5f8cff_0%,#3758ff_58%,#2742cf_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(44,73,255,0.34)] transition hover:-translate-y-0.5 hover:brightness-110 sm:inline-flex"
                >
                  <Plus className="h-4 w-4" />
                  New Member
                </button>
              ) : null}
            </div>
          </header>

          <div className="dashboard-fade-up grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="members-overview-card">
              <span className="text-xs uppercase tracking-[0.18em] text-[#95a7ca]">Visible now</span>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">{members.length.toLocaleString("en-US")}</p>
              <p className="mt-1 text-xs text-[#8ea2ca]">Results on this page</p>
            </div>
            <div className="members-overview-card">
              <span className="text-xs uppercase tracking-[0.18em] text-[#95a7ca]">Active</span>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-sky-300">{visibleStatusCounts.active.toLocaleString("en-US")}</p>
              <p className="mt-1 text-xs text-[#8ea2ca]">Currently staying</p>
            </div>
            <div className="members-overview-card">
              <span className="text-xs uppercase tracking-[0.18em] text-[#95a7ca]">Inactive</span>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-300">{visibleStatusCounts.inactive.toLocaleString("en-US")}</p>
              <p className="mt-1 text-xs text-[#8ea2ca]">Temporarily paused</p>
            </div>
            <div className="members-overview-card">
              <span className="text-xs uppercase tracking-[0.18em] text-[#95a7ca]">Checked out</span>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-amber-200">{visibleStatusCounts.checked_out.toLocaleString("en-US")}</p>
              <p className="mt-1 text-xs text-[#8ea2ca]">Past residents</p>
            </div>
          </div>

          {feedback ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{feedback}</div>
          ) : null}
          {errorMessage ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{errorMessage}</div>
          ) : null}

          <div className="dashboard-fade-up space-y-4">
            <div
              className="members-command flex items-center gap-3 rounded-[28px] border px-4 py-3.5 sm:px-5"
              style={{
                background: "linear-gradient(135deg, rgba(40, 61, 42, 0.98) 0%, rgba(31, 48, 34, 0.98) 100%)",
                borderColor: "rgba(112, 137, 111, 0.22)",
              }}
            >
              <Search className="h-6 w-6 shrink-0 text-[#92a88b]" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => {
                  setPage(1);
                  setSearchInput(event.target.value);
                }}
                placeholder="Search name, phone, or email..."
                className="w-full bg-transparent text-base text-white outline-none placeholder:text-[#8ea0c6] sm:text-lg"
              />
              <button
                type="button"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-[#a6bd9f] transition hover:bg-white/5"
                style={{ borderColor: "rgba(131, 149, 124, 0.22)", backgroundColor: "rgba(18, 28, 22, 0.36)" }}
                title={activeFiltersCount > 0 ? `${activeFiltersCount} active filters` : "Filters"}
                aria-label={activeFiltersCount > 0 ? `${activeFiltersCount} active filters` : "Filters"}
              >
                <Filter className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-0 flex-1 gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {STATUS_FILTERS.map((filter) => {
                  const active = statusFilter === filter.value;

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => {
                        setPage(1);
                        setStatusFilter(filter.value);
                      }}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                        active
                          ? "members-filter-chip-active border-[#3f8cff] bg-[#173459] text-[#56a7ff] shadow-[inset_0_0_0_1px_rgba(115,181,255,0.22)]"
                          : "members-filter-chip border-[#38503c] bg-[#2c3e2d] text-[#e3e9dc] hover:border-[#48614c] hover:bg-[#314534]"
                      }`}
                    >
                      {active ? <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#224e7e] text-[#67b3ff]"><UserRoundCheck className="h-3.5 w-3.5" /></span> : null}
                      {filter.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <label className="sr-only" htmlFor="member-gender-filter">
                  Filter by gender
                </label>
                <select
                  id="member-gender-filter"
                  value={genderFilter}
                  onChange={(event) => {
                    setPage(1);
                    setGenderFilter(event.target.value as MemberGender | "all");
                  }}
                  className="rounded-2xl border px-4 py-3 text-sm font-medium outline-none transition"
                  style={{
                    background: "linear-gradient(135deg, rgba(45, 63, 48, 0.98) 0%, rgba(33, 46, 35, 0.98) 100%)",
                    borderColor: "rgba(94, 115, 92, 0.32)",
                    color: "#e6ebdf",
                  }}
                >
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {(searchInput || statusFilter !== "all" || genderFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setSearchInput("");
                      setStatusFilter("all");
                      setGenderFilter("all");
                    }}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-[#c8d2e7] transition hover:bg-white/5"
                    style={{ borderColor: "rgba(120, 135, 188, 0.18)", backgroundColor: "rgba(17, 24, 41, 0.45)" }}
                    aria-label="Clear filters"
                    title="Clear filters"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {membersQuery.isLoading ? (
            <MembersLoadingSkeleton />
          ) : membersQuery.isError ? (
            <div className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 px-4 py-5 text-sm text-rose-200">
              {membersQuery.error instanceof Error ? membersQuery.error.message : "Failed to load members."}
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-[28px] border border-white/8 bg-white/[0.02] px-4 py-14 text-center">
              <p className="text-base font-semibold text-white">No members found</p>
              <p className="mt-2 text-sm text-[#8fa0c4]">Try a different search or filter combination, or create a new member record.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {sections.map((section, sectionIndex) => (
                <div key={section.key} className="members-animate-rise space-y-4" style={{ animationDelay: `${sectionIndex * 90}ms` }}>
                  <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-3">
                    <div>
                      <h2 className="text-lg font-semibold uppercase tracking-[0.1em] text-[#47a2ff]">{section.title}</h2>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#7f90b4]">{section.members.length} visible on this page</p>
                    </div>
                    <span className="dashboard-chip">
                      <Users className="h-3.5 w-3.5" />
                      Segment live
                    </span>
                  </div>

                  <div className="space-y-1">
                    {section.members.map((member, memberIndex) => {
                      const statusMeta = STATUS_META[member.status];

                      return (
                        <article
                          key={member.id}
                          className={`members-animate-rise relative border-b px-1 py-4 sm:px-2 ${openActionMenuId === member.id ? "z-50" : "z-0"}`}
                          style={{
                            animationDelay: `${sectionIndex * 80 + memberIndex * 40}ms`,
                            borderColor: "rgba(148, 166, 200, 0.2)",
                          }}
                        >
                          <div className="flex items-start gap-4">
                            <div className="relative shrink-0">
                              <div
                                className="flex h-14 w-14 items-center justify-center rounded-[18px] text-lg font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.2)] sm:h-16 sm:w-16 sm:text-xl"
                                style={{ background: getAvatarBackground(member.full_name) }}
                              >
                                {getInitials(member.full_name)}
                              </div>
                              <span className={`members-status-pulse absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#0d1321] ${statusMeta.dotClass}`} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <Link href={`/members/${member.id}`} className="block truncate text-[1.2rem] font-semibold tracking-[-0.02em] text-white transition hover:text-[#a9c9ff] sm:text-[1.35rem]">
                                    {member.full_name}
                                  </Link>
                                  <p className="mt-1 truncate text-sm text-[#b3bed4]">{getMetaLine(member)}</p>
                                </div>

                                <div className="relative shrink-0" onClick={(event) => event.stopPropagation()}>
                                  <div className="flex items-center gap-2">
                                    {canManageMembers ? (
                                      <button
                                        type="button"
                                        onClick={() => setOpenActionMenuId((current) => (current === member.id ? null : member.id))}
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-[#b8c4dd] transition hover:bg-white/[0.08] hover:text-white"
                                        aria-label={`Open actions for ${member.full_name}`}
                                      >
                                        <EllipsisVertical className="h-5 w-5" />
                                      </button>
                                    ) : null}
                                  </div>

                                  {openActionMenuId === member.id ? (
                                    <div className="members-action-pop absolute right-0 top-12 z-20 w-48 rounded-2xl border border-white/10 bg-[#121a2c] p-2 shadow-[0_24px_44px_rgba(2,6,23,0.54)]">
                                      <Link
                                        href={`/members/${member.id}`}
                                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#dfe7ff] transition hover:bg-white/5"
                                      >
                                        <UserCog className="h-4 w-4" />
                                        View details
                                      </Link>
                                      <button
                                        type="button"
                                        onClick={() => openEditModal(member)}
                                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[#dfe7ff] transition hover:bg-white/5"
                                      >
                                        <Pencil className="h-4 w-4" />
                                        Edit member
                                      </button>

                                      {member.status !== "active" ? (
                                        <button
                                          type="button"
                                          onClick={() => transitionStatus(member, "active")}
                                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-emerald-300 transition hover:bg-white/5"
                                        >
                                          <UserRoundCheck className="h-4 w-4" />
                                          Activate
                                        </button>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => transitionStatus(member, "inactive")}
                                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-amber-200 transition hover:bg-white/5"
                                          >
                                            <UserMinus className="h-4 w-4" />
                                            Mark inactive
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => transitionStatus(member, "checked_out")}
                                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                                          >
                                            <UserCog className="h-4 w-4" />
                                            Checkout
                                          </button>
                                        </>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => archiveMember(member)}
                                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-300 transition hover:bg-white/5"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Archive
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs font-medium uppercase tracking-[0.08em] text-[#d9e3ff]">
                                  {member.gender}
                                </span>
                                <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs font-medium uppercase tracking-[0.08em] text-[#9eb0d7]">
                                  Hostel {member.hostel}
                                </span>
                                <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${statusMeta.pillClass}`}>{statusMeta.label}</span>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <footer className="flex flex-col gap-4 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">Page {page} of {totalPages}</p>
              <p className="text-xs text-[#8fa0c4]">Total records: {(membersQuery.data?.count ?? 0).toLocaleString("en-US")}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(value - 1, 1))}
                disabled={!membersQuery.data?.previous || membersQuery.isLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-[#d9e3ff] transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <div className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
                {paginationWindow.map((targetPage) => (
                  <button
                    key={targetPage}
                    type="button"
                    onClick={() => setPage(targetPage)}
                    className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-semibold transition ${
                      targetPage === page ? "bg-[#2f67ff] text-white shadow-[0_8px_20px_rgba(47,103,255,0.36)]" : "text-[#95a8cf] hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    {targetPage}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setPage((value) => value + 1)}
                disabled={!membersQuery.data?.next || membersQuery.isLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-[#d9e3ff] transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                {membersQuery.isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <span className="dashboard-chip">
                <BadgeCheck className="h-3.5 w-3.5" />
                Live data
              </span>
            </div>
          </footer>
        </div>
      </section>

      {canManageMembers ? (
        <button
          type="button"
          onClick={openCreateModal}
          className="fixed bottom-6 right-5 z-20 inline-flex h-16 w-16 items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,#56a8ff_0%,#2f86f7_45%,#1c6ddf_100%)] text-white shadow-[0_20px_44px_rgba(44,114,255,0.42)] transition hover:scale-[1.02] hover:brightness-110 sm:bottom-8 sm:right-8 sm:hidden"
          aria-label="Add new member"
        >
          <Plus className="h-8 w-8" />
        </button>
      ) : null}

      <MemberFormModal
        isOpen={isModalOpen}
        mode={editingMember ? "edit" : "create"}
        member={editingMember}
        showHostelField={showHostelField}
        isSubmitting={isMutating}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMember(null);
        }}
        onSubmit={submitForm}
      />
    </>
  );
}

