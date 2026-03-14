"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSettings, getSettingsStatus, updateSettings } from "@/lib/api";
import type { SettingsUpdatePayload } from "@/lib/types";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
}

export function useSettingsStatus() {
  return useQuery({
    queryKey: ["settings", "status"],
    queryFn: getSettingsStatus,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SettingsUpdatePayload) => updateSettings(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      await queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}
