"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createMember, deleteMember, getMembers, type MembersQueryParams, updateMember } from "@/lib/api";
import type { MemberUpdatePayload, MemberWritePayload } from "@/lib/types";

export function useMembers(params: MembersQueryParams) {
  return useQuery({
    queryKey: ["members", params],
    queryFn: () => getMembers(params),
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: number) => deleteMember(memberId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    },
  });
}
