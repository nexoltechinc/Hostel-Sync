"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createMember, deleteMember, getMember, getMembers, type MembersQueryParams, updateMember } from "@/lib/api";
import type { MemberUpdatePayload, MemberWritePayload } from "@/lib/types";

export function useMembers(params: MembersQueryParams) {
  return useQuery({
    queryKey: ["members", params],
    queryFn: () => getMembers(params),
  });
}

export function useMember(memberId: number | null) {
  return useQuery({
    queryKey: ["member", memberId],
    queryFn: () => getMember(memberId as number),
    enabled: typeof memberId === "number" && Number.isFinite(memberId),
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MemberWritePayload) => createMember(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, payload }: { memberId: number; payload: MemberUpdatePayload }) =>
      updateMember(memberId, payload),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      await queryClient.invalidateQueries({ queryKey: ["member", variables.memberId] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: number) => deleteMember(memberId),
    onSuccess: async (_, memberId) => {
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      await queryClient.removeQueries({ queryKey: ["member", memberId] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    },
  });
}
