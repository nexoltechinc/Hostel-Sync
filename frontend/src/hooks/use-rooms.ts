"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createBed,
  createRoom,
  deleteBed,
  deleteRoom,
  getBeds,
  getRooms,
  type BedsQueryParams,
  type RoomsQueryParams,
  updateBed,
  updateRoom,
} from "@/lib/api";
import type { BedUpdatePayload, BedWritePayload, RoomUpdatePayload, RoomWritePayload } from "@/lib/types";

export function useRooms(params: RoomsQueryParams) {
  return useQuery({
    queryKey: ["rooms", params],
    queryFn: () => getRooms(params),
  });
}

export function useBeds(params: BedsQueryParams) {
  return useQuery({
    queryKey: ["beds", params],
    queryFn: () => getBeds(params),
  });
}

function useRoomsMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
      await queryClient.invalidateQueries({ queryKey: ["beds"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
    },
  });
}

export function useCreateRoom() {
  return useRoomsMutation((payload: RoomWritePayload) => createRoom(payload));
}

export function useUpdateRoom() {
  return useRoomsMutation(({ roomId, payload }: { roomId: number; payload: RoomUpdatePayload }) =>
    updateRoom(roomId, payload),
  );
}

export function useDeleteRoom() {
  return useRoomsMutation((roomId: number) => deleteRoom(roomId));
}

export function useCreateBed() {
  return useRoomsMutation((payload: BedWritePayload) => createBed(payload));
}

export function useUpdateBed() {
  return useRoomsMutation(({ bedId, payload }: { bedId: number; payload: BedUpdatePayload }) => updateBed(bedId, payload));
}

export function useDeleteBed() {
  return useRoomsMutation((bedId: number) => deleteBed(bedId));
}
