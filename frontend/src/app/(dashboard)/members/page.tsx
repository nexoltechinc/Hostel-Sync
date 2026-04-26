"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  EllipsisVertical,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCog,
  UserMinus,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { MemberFormModal } from "@/components/members/member-form-modal";
import { ExportColumnModal } from "@/components/ui/export-column-modal";
import { useCreateMember, useDeleteMember, useMembers, useUpdateMember } from "@/hooks/use-members";
import { useSession } from "@/hooks/use-session";
import { exportRowsToExcel, type ExportColumnDefinition } from "@/lib/export";
import { getMembers, type MembersQueryParams } from "@/lib/api";
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
    badgeClass: string;
    summaryValueClass: string;
    summaryNote: string;
    indicatorColor: string;
  }
> = {
  active: {
    label: "Active",
    badgeClass: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
    summaryValueClass: "text-emerald-200",
    summaryNote: "Currently staying",
    indicatorColor: "#4ade80",
  },
  inactive: {
    label: "Inactive",
    badgeClass: "border-slate-400/25 bg-slate-500/10 text-slate-200",
    summaryValueClass: "text-slate-200",
    summaryNote: "Temporarily inactive",
    indicatorColor: "#94a3b8",
  },
  checked_out: {
    label: "Checked Out",
    badgeClass: "border-amber-400/25 bg-amber-500/10 text-amber-200",
    summaryValueClass: "text-amber-200",
    summaryNote: "Former residents",
    indicatorColor: "#fbbf24",
  },
};

const AVATAR_BACKGROUNDS = [
  "linear-gradient(135deg, #355c7d 0%, #1e3a5f 100%)",
  "linear-gradient(135deg, #4c5c96 0%, #26335f 100%)",
  "linear-gradient(135deg, #6b4f7d 0%, #3f3157 100%)",
  "linear-gradient(135deg, #2f6d63 0%, #19473f 100%)",
  "linear-gradient(135deg, #7a5b3b 0%, #503822 100%)",
  "linear-gradient(135deg, #475569 0%, #27313f 100%)",
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

function formatLongDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatCountLabel(total: number) {
  return `${total.toLocaleString("en-US")} total member${total === 1 ? "" : "s"}`;
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

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function isManageMembersAllowed(permissions: string[]) {
  return permissions.includes("*") || permissions.includes("manage_members");
}

function isSuperuser(permissions: string[]) {
  return permissions.includes("*");
}

function getPaginationWindow(page: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const start = Math.max(1, Math.min(page - 1, totalPages - 4));
  return Array.from({ length: 5 }, (_, idx) => start + idx);
}

const MEMBER_EXPORT_COLUMNS: ExportColumnDefinition<Member>[] = [
  {
    id: "member_code",
    label: "Member Code",
    description: "Unique resident identifier used by the hostel team.",
    width: 16,
    getValue: (member) => member.member_code,
  },
  {
    id: "full_name",
    label: "Full Name",
    description: "Resident full name for roster and billing review.",
    width: 24,
    getValue: (member) => member.full_name,
  },
  {
    id: "hostel",
    label: "Hostel",
    description: "Assigned hostel or building reference.",
    width: 14,
    getValue: (member) => `Hostel ${member.hostel}`,
  },
  {
    id: "gender",
    label: "Gender",
    description: "Resident gender profile value.",
    width: 12,
    getValue: (member) => titleCase(member.gender),
  },
  {
    id: "status",
    label: "Status",
    description: "Current resident lifecycle status.",
    width: 15,
    getValue: (member) => STATUS_META[member.status].label,
  },
  {
    id: "phone",
    label: "Phone",
    description: "Primary contact number.",
    width: 18,
    getValue: (member) => member.phone,
  },
  {
    id: "guardian_name",
    label: "Guardian Name",
    description: "Guardian or family contact name.",
    width: 20,
    getValue: (member) => member.guardian_name,
  },
  {
    id: "emergency_contact",
    label: "Emergency Contact",
    description: "Emergency phone number or backup contact.",
    width: 20,
    getValue: (member) => member.emergency_contact,
  },
  {
    id: "joining_date",
    label: "Joining Date",
    description: "Original resident start date.",
    kind: "date",
    width: 16,
    getValue: (member) => member.joining_date,
  },
  {
    id: "leaving_date",
    label: "Leaving Date",
    description: "Checkout or inactive effective date when available.",
    defaultSelected: false,
    kind: "date",
    width: 16,
    getValue: (member) => member.leaving_date,
  },
  {
    id: "id_number",
    label: "ID Number",
    description: "Government or institution ID reference.",
    defaultSelected: false,
    width: 20,
    getValue: (member) => member.id_number,
  },
  {
    id: "address",
    label: "Address",
    description: "Resident address captured in the profile.",
    defaultSelected: false,
    width: 34,
    getValue: (member) => member.address,
  },
  {
    id: "remarks",
    label: "Remarks",
    description: "Internal notes or operational remarks.",
    defaultSelected: false,
    width: 30,
    getValue: (member) => member.remarks,
  },
  {
    id: "created_at",
    label: "Created At",
    description: "Record creation timestamp.",
    defaultSelected: false,
    kind: "datetime",
    width: 22,
    getValue: (member) => member.created_at,
  },
  {
    id: "updated_at",
    label: "Updated At",
    description: "Latest profile update timestamp.",
    defaultSelected: false,
    kind: "datetime",
    width: 22,
    getValue: (member) => member.updated_at,
  },
];

const memberExportColumnOptions = MEMBER_EXPORT_COLUMNS.map(({ id, label, description }) => ({
  id,
  label,
  description,
}));

const defaultMemberExportColumnIds = MEMBER_EXPORT_COLUMNS
  .filter((column) => column.defaultSelected !== false)
  .map((column) => column.id);

function MembersLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }, (_, index) => (
        <article
          key={index}
          className="members-animate-rise members-skeleton relative overflow-hidden rounded-[22px] border px-4 py-4 sm:px-5"
          style={{
            animationDelay: `${index * 45}ms`,
            borderColor: "var(--color-border)",
          }}
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_180px_220px_auto] lg:items-center">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-[18px] bg-white/6" />
              <div className="space-y-2">
                <div className="h-4 w-44 rounded-full bg-white/8" />
                <div className="h-3 w-36 rounded-full bg-white/6" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-16 rounded-full bg-white/6" />
              <div className="h-4 w-24 rounded-full bg-white/8" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-20 rounded-full bg-white/6" />
              <div className="h-8 w-20 rounded-full bg-white/6" />
              <div className="h-8 w-24 rounded-full bg-white/6" />
            </div>
            <div className="ml-auto h-10 w-24 rounded-xl bg-white/6" />
          </div>
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
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportingMembers, setIsExportingMembers] = useState(false);
  const [selectedMemberExportColumnIds, setSelectedMemberExportColumnIds] = useState<string[]>(
    defaultMemberExportColumnIds,
  );

  const params = useMemo<MembersQueryParams>(
    () => ({
      search: searchInput,
      status: statusFilter,
      gender: genderFilter,
      page,
      ordering: "-id",
    }),
    [genderFilter, page, searchInput, statusFilter],
  );

  const membersQuery = useMembers(params);
  const createMemberMutation = useCreateMember();
  const updateMemberMutation = useUpdateMember();
  const deleteMemberMutation = useDeleteMember();

  const members = useMemo(() => membersQuery.data?.results ?? [], [membersQuery.data?.results]);
  const isMutating = createMemberMutation.isPending || updateMemberMutation.isPending || deleteMemberMutation.isPending;
  const totalRecords = membersQuery.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / 20));
  const paginationWindow = useMemo(() => getPaginationWindow(page, totalPages), [page, totalPages]);
  const visibleStatusCounts = useMemo(
    () => ({
      active: members.filter((member) => member.status === "active").length,
      inactive: members.filter((member) => member.status === "inactive").length,
      checked_out: members.filter((member) => member.status === "checked_out").length,
    }),
    [members],
  );

  const summaryCards = [
    {
      key: "total",
      label: "Total Members",
      value: totalRecords.toLocaleString("en-US"),
      note: statusFilter === "all" && genderFilter === "all" && !searchInput.trim() ? "All member records" : "Matching current filters",
      valueClass: "text-[var(--color-text-strong)]",
    },
    {
      key: "active",
      label: "Active",
      value: visibleStatusCounts.active.toLocaleString("en-US"),
      note: STATUS_META.active.summaryNote,
      valueClass: STATUS_META.active.summaryValueClass,
    },
    {
      key: "inactive",
      label: "Inactive",
      value: visibleStatusCounts.inactive.toLocaleString("en-US"),
      note: STATUS_META.inactive.summaryNote,
      valueClass: STATUS_META.inactive.summaryValueClass,
    },
    {
      key: "checked_out",
      label: "Checked Out",
      value: visibleStatusCounts.checked_out.toLocaleString("en-US"),
      note: STATUS_META.checked_out.summaryNote,
      valueClass: STATUS_META.checked_out.summaryValueClass,
    },
  ];

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

  function openExportModal() {
    if (totalRecords === 0) {
      setFeedback("No matching members are available to export.");
      setErrorMessage(null);
      return;
    }

    setIsExportModalOpen(true);
  }

  function toggleMemberExportColumn(columnId: string) {
    setSelectedMemberExportColumnIds((current) =>
      current.includes(columnId) ? current.filter((item) => item !== columnId) : [...current, columnId],
    );
  }

  function resetMemberExportColumns() {
    setSelectedMemberExportColumnIds(defaultMemberExportColumnIds);
  }

  function selectAllMemberExportColumns() {
    setSelectedMemberExportColumnIds(MEMBER_EXPORT_COLUMNS.map((column) => column.id));
  }

  async function fetchAllMembersForExport() {
    const collected: Member[] = [];
    let exportPage = 1;

    while (true) {
      const response = await getMembers({
        gender: genderFilter,
        ordering: "-id",
        page: exportPage,
        search: searchInput,
        status: statusFilter,
      });

      collected.push(...response.results);

      if (!response.next || response.results.length === 0) {
        break;
      }

      exportPage += 1;
    }

    return collected;
  }

  async function confirmMemberExport() {
    if (selectedMemberExportColumnIds.length === 0) {
      setErrorMessage("Select at least one member column before exporting.");
      setFeedback(null);
      return;
    }

    setIsExportingMembers(true);
    setErrorMessage(null);

    try {
      const exportMembers = await fetchAllMembersForExport();

      if (exportMembers.length === 0) {
        setFeedback("No matching members are available to export.");
        setIsExportModalOpen(false);
        return;
      }

      const selectedColumns = MEMBER_EXPORT_COLUMNS.filter((column) =>
        selectedMemberExportColumnIds.includes(column.id),
      );

      exportRowsToExcel({
        columns: selectedColumns,
        fileName: `members-directory-${new Date().toISOString().slice(0, 10)}`,
        filters: [
          { label: "Search", value: searchInput.trim() || "All members" },
          { label: "Status Filter", value: statusFilter === "all" ? "All statuses" : STATUS_META[statusFilter].label },
          { label: "Gender Filter", value: genderFilter === "all" ? "All genders" : titleCase(genderFilter) },
        ],
        rows: exportMembers,
        sheetName: "Members",
        subtitle: "Operational resident directory export with the current members screen filters applied.",
        summary: [
          { label: "Matching Members", kind: "number", value: exportMembers.length },
          {
            label: "Active Residents",
            kind: "number",
            value: exportMembers.filter((member) => member.status === "active").length,
            helper: "Currently staying in the hostel system.",
          },
          {
            label: "Inactive Residents",
            kind: "number",
            value: exportMembers.filter((member) => member.status === "inactive").length,
            helper: "Temporarily inactive member profiles.",
          },
          {
            label: "Checked Out Residents",
            kind: "number",
            value: exportMembers.filter((member) => member.status === "checked_out").length,
            helper: "Former residents kept for operational history.",
          },
        ],
        title: "Members Directory Export",
        workbookTitle: "Members Directory Workbook",
      });

      setFeedback(
        `Members Excel exported successfully with ${exportMembers.length} records and ${selectedColumns.length} selected columns.`,
      );
      setIsExportModalOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to export members.");
    } finally {
      setIsExportingMembers(false);
    }
  }

  return (
    <>
      <section className="space-y-5 pb-3" onClick={() => setOpenActionMenuId(null)}>
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-[var(--color-text-strong)] sm:text-[2.35rem]">
              Members List
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-soft)] sm:text-base">{formatCountLabel(totalRecords)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openExportModal();
              }}
              className="dashboard-cta dashboard-cta-secondary"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </button>

            {canManageMembers ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  openCreateModal();
                }}
                className="dashboard-cta dashboard-cta-primary"
              >
                <Plus className="h-4 w-4" />
                Add Member
              </button>
            ) : null}
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <article key={card.key} className="panel panel-soft rounded-[22px] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">{card.label}</p>
              <p className={`mt-3 text-[1.9rem] font-semibold tracking-[-0.05em] ${card.valueClass}`}>{card.value}</p>
              <p className="mt-1 text-sm text-[var(--color-text-soft)]">{card.note}</p>
            </article>
          ))}
        </div>

        <section className="panel panel-soft rounded-[24px] p-4 md:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => {
                  setPage(1);
                  setSearchInput(event.target.value);
                }}
                placeholder="Search by name, phone, or email"
                className="members-input w-full py-3 pl-10 pr-3"
              />
            </label>

            <label className="block">
              <span className="sr-only">Gender</span>
              <select
                value={genderFilter}
                onChange={(event) => {
                  setPage(1);
                  setGenderFilter(event.target.value as MemberGender | "all");
                }}
                className="members-select w-full py-3"
              >
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
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
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "border-blue-400/35 bg-blue-500/15 text-blue-100"
                      : "border-[var(--color-border)] bg-white/[0.03] text-[var(--color-text-soft)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-strong)]"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </section>

        {feedback ? (
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{feedback}</div>
        ) : null}
        {errorMessage ? (
          <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{errorMessage}</div>
        ) : null}

        <section className="panel panel-soft overflow-hidden rounded-[24px]">
          <div className="border-b px-4 py-4 sm:px-5" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-strong)]">Members</h2>
                <p className="mt-1 text-sm text-[var(--color-text-soft)]">
                  {members.length.toLocaleString("en-US")} shown on this page
                </p>
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">Total records: {totalRecords.toLocaleString("en-US")}</p>
            </div>
          </div>

          <div className="px-4 py-4 sm:px-5">
            {membersQuery.isLoading ? (
              <MembersLoadingSkeleton />
            ) : membersQuery.isError ? (
              <div className="rounded-[22px] border border-rose-400/25 bg-rose-500/10 px-4 py-5 text-sm text-rose-200">
                {membersQuery.error instanceof Error ? membersQuery.error.message : "Failed to load members."}
              </div>
            ) : members.length === 0 ? (
              <div className="rounded-[22px] border px-4 py-12 text-center" style={{ borderColor: "var(--color-border)", background: "var(--color-overlay-soft)" }}>
                <p className="text-base font-semibold text-[var(--color-text-strong)]">No members found</p>
                <p className="mt-2 text-sm text-[var(--color-text-soft)]">
                  Try a different search or filter combination, or create a new member record.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member, index) => {
                  const statusMeta = STATUS_META[member.status];

                  return (
                    <article
                      key={member.id}
                      className={`members-card members-animate-rise relative rounded-[22px] border px-4 py-4 sm:px-5 ${openActionMenuId === member.id ? "z-30" : "z-0"}`}
                      style={{
                        animationDelay: `${index * 40}ms`,
                      }}
                    >
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_180px_240px_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="flex items-start gap-4">
                            <div
                              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] text-sm font-semibold text-white"
                              style={{ background: getAvatarBackground(member.full_name) }}
                            >
                              {getInitials(member.full_name)}
                            </div>

                            <div className="min-w-0">
                              <Link
                                href={`/members/${member.id}`}
                                className="block truncate text-base font-semibold text-[var(--color-text-strong)] transition hover:text-[var(--color-brand-600)] sm:text-lg"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {member.full_name}
                              </Link>
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--color-text-soft)]">
                                <span>{member.member_code}</span>
                                <span>{member.phone || "Phone not provided"}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Join date</p>
                          <p className="text-sm font-medium text-[var(--color-text-strong)]">{formatLongDate(member.joining_date)}</p>
                          {member.status === "checked_out" && member.leaving_date ? (
                            <p className="text-xs text-[var(--color-text-muted)]">Checked out {formatShortDate(member.leaving_date)}</p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-text-soft)]">
                            {member.gender}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-text-soft)]">
                            Hostel {member.hostel}
                          </span>
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${statusMeta.badgeClass}`}>
                            {statusMeta.label}
                          </span>
                        </div>

                        <div className="relative" onClick={(event) => event.stopPropagation()}>
                          {canManageMembers ? (
                            <button
                              type="button"
                              onClick={() => setOpenActionMenuId((current) => (current === member.id ? null : member.id))}
                              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-[var(--color-text-soft)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-strong)]"
                              aria-label={`Open actions for ${member.full_name}`}
                            >
                              <span>Actions</span>
                              <EllipsisVertical className="h-4 w-4" />
                            </button>
                          ) : null}

                          {openActionMenuId === member.id ? (
                            <div className="members-action-pop absolute right-0 top-12 z-20 w-52 rounded-2xl border border-white/10 bg-[var(--color-surface-strong)] p-2 shadow-[0_24px_44px_rgba(2,6,23,0.54)]">
                              <Link
                                href={`/members/${member.id}`}
                                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--color-text-strong)] transition hover:bg-white/5"
                              >
                                <UserCog className="h-4 w-4" />
                                View details
                              </Link>
                              <button
                                type="button"
                                onClick={() => openEditModal(member)}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[var(--color-text-strong)] transition hover:bg-white/5"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit member
                              </button>

                              {member.status !== "active" ? (
                                <button
                                  type="button"
                                  onClick={() => transitionStatus(member, "active")}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-emerald-200 transition hover:bg-white/5"
                                >
                                  <UserRoundCheck className="h-4 w-4" />
                                  Mark active
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
                                    Mark checked out
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
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <footer className="border-t px-4 py-4 sm:px-5" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-strong)]">
                  Showing {members.length.toLocaleString("en-US")} {members.length === 1 ? "member" : "members"} on page {page}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">Total records: {totalRecords.toLocaleString("en-US")}</p>
              </div>

              {totalPages > 1 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(value - 1, 1))}
                    disabled={!membersQuery.data?.previous || membersQuery.isLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[var(--color-text-soft)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                    {paginationWindow.map((targetPage) => (
                      <button
                        key={targetPage}
                        type="button"
                        onClick={() => setPage(targetPage)}
                        className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold transition ${
                          targetPage === page
                            ? "bg-blue-500/20 text-blue-100"
                            : "text-[var(--color-text-muted)] hover:bg-white/8 hover:text-[var(--color-text-strong)]"
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
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[var(--color-text-soft)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    {membersQuery.isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
              ) : null}
            </div>
          </footer>
        </section>
      </section>

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

      <ExportColumnModal
        columns={memberExportColumnOptions}
        confirmLabel="Export Members Excel"
        description="Choose the member profile fields to include. The export will gather all matching members across paginated results."
        isOpen={isExportModalOpen}
        isProcessing={isExportingMembers}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={confirmMemberExport}
        onReset={resetMemberExportColumns}
        onSelectAll={selectAllMemberExportColumns}
        onToggleColumn={toggleMemberExportColumn}
        processingLabel="Preparing members workbook..."
        rowCount={totalRecords}
        rowLabel="member records"
        selectedColumnIds={selectedMemberExportColumnIds}
        title="Export Members Workbook"
      />
    </>
  );
}
