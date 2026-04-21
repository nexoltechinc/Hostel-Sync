"use client";

import { Download, RotateCcw, X } from "lucide-react";
import { useEffect } from "react";

type ExportColumnOption = {
  id: string;
  label: string;
  description?: string;
};

type ExportColumnModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  columns: ExportColumnOption[];
  selectedColumnIds: string[];
  rowCount: number;
  isProcessing?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSelectAll: () => void;
  onReset: () => void;
  onToggleColumn: (columnId: string) => void;
  confirmLabel?: string;
  processingLabel?: string;
  rowLabel?: string;
};

export function ExportColumnModal({
  isOpen,
  title,
  description,
  columns,
  selectedColumnIds,
  rowCount,
  isProcessing = false,
  onClose,
  onConfirm,
  onSelectAll,
  onReset,
  onToggleColumn,
  confirmLabel = "Export Excel",
  processingLabel = "Preparing Excel...",
  rowLabel = "rows",
}: ExportColumnModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const allSelected = selectedColumnIds.length === columns.length;
  const selectedCount = selectedColumnIds.length;

  return (
    <div className="app-modal-backdrop fixed inset-0 z-[80] px-4 py-6 backdrop-blur-sm sm:grid sm:place-items-center sm:p-6" onClick={onClose}>
      <div
        className="panel panel-elevated flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] border"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b bg-[var(--color-surface)]/95 px-5 py-4 backdrop-blur md:px-6" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="dashboard-chip">
                <Download className="h-3.5 w-3.5" />
                Excel export
              </span>
              <h2 className="mt-2 text-xl font-semibold text-[var(--color-text-strong)]">{title}</h2>
              <p className="mt-1 text-sm text-[var(--color-text-soft)]">{description}</p>
            </div>
            <button aria-label="Close export options" className="app-modal-close" onClick={onClose} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-card-muted)] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-strong)]">
                {selectedCount} of {columns.length} columns selected
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {rowCount} filtered {rowLabel} will be included in the export file.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button className="app-secondary-button inline-flex min-h-10 items-center gap-2 rounded-[14px] px-4 text-sm font-medium" disabled={isProcessing} onClick={onSelectAll} type="button">
                {allSelected ? "All selected" : "Select all"}
              </button>
              <button className="app-secondary-button inline-flex min-h-10 items-center gap-2 rounded-[14px] px-4 text-sm font-medium" disabled={isProcessing} onClick={onReset} type="button">
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {columns.map((column) => {
              const checked = selectedColumnIds.includes(column.id);

              return (
                <label
                  key={column.id}
                  className={`cursor-pointer rounded-[18px] border px-4 py-3 transition ${
                    checked
                      ? "border-[var(--color-brand-500)] bg-[var(--color-overlay-soft)]"
                      : "border-[var(--color-border)] bg-[var(--color-card-muted)] hover:border-[var(--color-border-strong)]"
                  }`}
                  style={
                    checked
                      ? {
                          boxShadow: "0 0 0 1px color-mix(in srgb, var(--color-brand-500) 28%, transparent)",
                        }
                      : undefined
                  }
                >
                  <div className="flex items-start gap-3">
                    <input
                      checked={checked}
                      className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-brand-600)]"
                      onChange={() => onToggleColumn(column.id)}
                      type="checkbox"
                    />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-strong)]">{column.label}</p>
                      {column.description ? (
                        <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{column.description}</p>
                      ) : null}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="border-t px-5 py-4 md:px-6" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--color-text-muted)]">Tip: leave only the fields your team needs for Excel review and sharing.</p>
            <div className="flex flex-wrap items-center gap-2">
              <button className="app-secondary-button inline-flex min-h-10 items-center gap-2 rounded-[14px] px-4 text-sm font-medium" disabled={isProcessing} onClick={onClose} type="button">
                Cancel
              </button>
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-[14px] bg-[var(--color-brand-600)] px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[var(--color-brand-500)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isProcessing || selectedCount === 0 || rowCount === 0}
                onClick={onConfirm}
                type="button"
              >
                <Download className="h-4 w-4" />
                {isProcessing ? processingLabel : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
