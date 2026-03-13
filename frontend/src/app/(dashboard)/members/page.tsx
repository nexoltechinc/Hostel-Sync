"use client";

import { LoaderCircle, Pencil, Plus, Search, Trash2, UserCog, UserMinus, UserRoundCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { MemberFormModal } from "@/components/members/member-form-modal";
import { useMembers, useCreateMember, useDeleteMember, useUpdateMember } from "@/hooks/use-members";
import { useSession } from "@/hooks/use-session";
import type { MembersQueryParams } from "@/lib/api";
import type { Member, MemberGender, MemberStatus, MemberWritePayload } from "@/lib/types";

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function statusBadge(status: MemberStatus) {
  if (status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "inactive") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-300 bg-slate-100 text-slate-700";
}

function isManageMembersAllowed(permissions: string[]) {
  return permissions.includes("*") || permissions.includes("manage_members");
}

function isSuperuser(permissions: string[]) {
  return permissions.includes("*");
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

  const members = membersQuery.data?.results ?? [];
  const isMutating = createMemberMutation.isPending || updateMemberMutation.isPending || deleteMemberMutation.isPending;

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

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Module 3</p>
          <h1 className="text-2xl font-semibold text-slate-900">Member Management</h1>
          <p className="text-sm text-slate-600">
            Manage resident profiles, onboarding records, lifecycle status, and integration-ready data quality.
          </p>
        </div>

        {canManageMembers ? (
          <button
            type="button"
            onClick={() => {
              setEditingMember(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-brand-700)]"
          >
            <Plus className="h-4 w-4" />
            New Member
          </button>
        ) : (
          <p className="text-xs uppercase tracking-[0.1em] text-slate-500">View-only access</p>
        )}
      </header>

      {feedback ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedback}</div> : null}
      {errorMessage ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</div> : null}

      <section className="panel p-4 md:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => {
                setPage(1);
                setSearchInput(event.target.value);
              }}
              placeholder="Search by name, code, phone, or id number"
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => {
              setPage(1);
              setStatusFilter(event.target.value as MemberStatus | "all");
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="checked_out">Checked Out</option>
          </select>

          <select
            value={genderFilter}
            onChange={(event) => {
              setPage(1);
              setGenderFilter(event.target.value as MemberGender | "all");
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-300)]"
          >
            <option value="all">All genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </section>

      <section className="panel overflow-hidden">
        {membersQuery.isLoading ? (
          <div className="grid min-h-[260px] place-items-center text-sm text-slate-500">
            <div className="inline-flex items-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading members...
            </div>
          </div>
        ) : membersQuery.isError ? (
          <div className="p-5 text-sm text-rose-700">
            {membersQuery.error instanceof Error ? membersQuery.error.message : "Failed to load members."}
          </div>
        ) : members.length === 0 ? (
          <div className="grid min-h-[180px] place-items-center p-5 text-center">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-700">No members found</p>
              <p className="text-xs text-slate-500">Adjust search/filter criteria or create a new member record.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Leaving</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{member.full_name}</p>
                        <p className="text-xs text-slate-500">{member.member_code}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{member.phone}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusBadge(member.status)}`}>
                          {member.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(member.joining_date)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(member.leaving_date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManageMembers ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMember(member);
                                  setIsModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>

                              {member.status !== "active" ? (
                                <button
                                  type="button"
                                  onClick={() => transitionStatus(member, "active")}
                                  disabled={isMutating}
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <UserRoundCheck className="h-3.5 w-3.5" />
                                  Activate
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => transitionStatus(member, "inactive")}
                                    disabled={isMutating}
                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <UserMinus className="h-3.5 w-3.5" />
                                    Inactive
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => transitionStatus(member, "checked_out")}
                                    disabled={isMutating}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <UserCog className="h-3.5 w-3.5" />
                                    Checkout
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                onClick={() => archiveMember(member)}
                                disabled={isMutating}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Archive
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">Read only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {members.map((member) => (
                <article key={member.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{member.full_name}</p>
                      <p className="text-xs text-slate-500">{member.member_code}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusBadge(member.status)}`}>
                      {member.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{member.phone}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Joined: {formatDate(member.joining_date)} | Leaving: {formatDate(member.leaving_date)}
                  </p>
                  {canManageMembers ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMember(member);
                          setIsModalOpen(true);
                        }}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveMember(member)}
                        className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
                      >
                        Archive
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Total records: {membersQuery.data?.count ?? 0}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(value - 1, 1))}
            disabled={!membersQuery.data?.previous || membersQuery.isLoading}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">Page {page}</span>
          <button
            type="button"
            onClick={() => setPage((value) => value + 1)}
            disabled={!membersQuery.data?.next || membersQuery.isLoading}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
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
    </section>
  );
}
