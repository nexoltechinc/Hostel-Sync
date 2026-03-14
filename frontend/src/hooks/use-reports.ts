"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getAttendanceReport,
  getFeeCollectionReport,
  getOccupancyReport,
  getPendingDuesReport,
  type AttendanceReportQueryParams,
  type FeeCollectionReportQueryParams,
  type OccupancyReportQueryParams,
  type PendingDuesReportQueryParams,
} from "@/lib/api";

export function useOccupancyReport(params: OccupancyReportQueryParams) {
  return useQuery({
    queryKey: ["reports", "occupancy", params],
    queryFn: () => getOccupancyReport(params),
  });
}

export function useFeeCollectionReport(params: FeeCollectionReportQueryParams) {
  return useQuery({
    queryKey: ["reports", "fee-collection", params],
    queryFn: () => getFeeCollectionReport(params),
  });
}

export function usePendingDuesReport(params: PendingDuesReportQueryParams) {
  return useQuery({
    queryKey: ["reports", "pending-dues", params],
    queryFn: () => getPendingDuesReport(params),
  });
}

export function useAttendanceReport(params: AttendanceReportQueryParams) {
  return useQuery({
    queryKey: ["reports", "attendance", params],
    queryFn: () => getAttendanceReport(params),
  });
}
