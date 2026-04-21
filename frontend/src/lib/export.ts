import * as XLSX from "xlsx-js-style";

export type ExportableValue = string | number | boolean | Date | null | undefined;
export type ExportColumnValueType = "text" | "number" | "currency" | "date" | "datetime" | "percent" | "boolean";
export type ExportColumnAlignment = "left" | "center" | "right";

export type ExportColumnDefinition<T> = {
  id: string;
  label: string;
  description?: string;
  defaultSelected?: boolean;
  width?: number;
  align?: ExportColumnAlignment;
  kind?: ExportColumnValueType;
  valueType?: ExportColumnValueType;
  getValue: (row: T) => ExportableValue;
};

export type ExportSummaryMetric = {
  label: string;
  value: ExportableValue;
  helper?: string;
  kind?: ExportColumnValueType;
};

export type ExportFilterDefinition = {
  label: string;
  value: ExportableValue;
  kind?: ExportColumnValueType;
};

export type ExportSheetDefinition<T> = {
  rows?: T[];
  columns?: ExportColumnDefinition<T>[];
  sheetName: string;
  title: string;
  subtitle?: string;
  filters?: ExportFilterDefinition[];
  summary?: ExportSummaryMetric[];
};

export type ExportWorkbookBranding = {
  organizationName: string;
  reportTitle?: string;
  reportSubtitle?: string;
  generatedAt?: string;
  metadata?: Array<{ label: string; value: string }>;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  primaryColor?: string;
  accentColor?: string;
  currencyCode?: string;
};

type ExportRowsToExcelOptions<T> = {
  rows: T[];
  columns: ExportColumnDefinition<T>[];
  fileName: string;
  sheetName?: string;
  title?: string;
  subtitle?: string;
  workbookTitle?: string;
  filters?: ExportFilterDefinition[];
  summary?: ExportSummaryMetric[];
  branding?: ExportWorkbookBranding;
};

type ExportWorkbookToExcelOptions = {
  fileName: string;
  // Different workbook sheets intentionally carry different row shapes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sheets: ExportSheetDefinition<any>[];
  title?: string;
  subject?: string;
  branding?: ExportWorkbookBranding;
};

type StyleMap = {
  title: Record<string, unknown>;
  reportTitle: Record<string, unknown>;
  subtitle: Record<string, unknown>;
  contact: Record<string, unknown>;
  metaLabel: Record<string, unknown>;
  metaValue: Record<string, unknown>;
  tableHeader: Record<string, unknown>;
  text: Record<string, unknown>;
  textMuted: Record<string, unknown>;
  centered: Record<string, unknown>;
  number: Record<string, unknown>;
  currency: Record<string, unknown>;
  percent: Record<string, unknown>;
  date: Record<string, unknown>;
  datetime: Record<string, unknown>;
  boolean: Record<string, unknown>;
};

type BuildWorksheetOptions<T> = {
  rows?: T[];
  columns?: ExportColumnDefinition<T>[];
  sheetName: string;
  title: string;
  subtitle?: string;
  filters?: ExportFilterDefinition[];
  summary?: ExportSummaryMetric[];
  branding?: ExportWorkbookBranding;
};

function sanitizedFileName(fileName: string) {
  return fileName.trim().replace(/[<>:"/\\|?*\x00-\x1F]+/g, "-").replace(/\s+/g, "-").toLowerCase();
}

function sanitizedSheetName(sheetName: string) {
  const trimmed = sheetName.trim().replace(/[\\/?*\[\]:]/g, " ").replace(/\s+/g, " ");
  return trimmed.slice(0, 31) || "Export";
}

function normalizeHex(color: string | undefined, fallback: string) {
  const normalized = color?.trim().replace(/^#/, "").toUpperCase();
  if (!normalized || !/^[0-9A-F]{6}$/.test(normalized)) {
    return fallback;
  }
  return normalized;
}

function escapeExcelFormatText(value: string) {
  return value.replace(/"/g, '""');
}

function getCurrencySymbol(currencyCode: string | undefined) {
  if (!currencyCode) {
    return "$";
  }

  try {
    const part = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .formatToParts(0)
      .find((entry) => entry.type === "currency");

    return part?.value || currencyCode;
  } catch {
    return currencyCode;
  }
}

function formatDateLabel(value: string | undefined) {
  if (!value) {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date());
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function parseDateValue(value: ExportableValue, includeTime: boolean) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  if (!includeTime && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeTextValue(value: ExportableValue) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function resolveValueType(
  definition:
    | Pick<ExportColumnDefinition<unknown>, "kind" | "valueType">
    | Pick<ExportFilterDefinition, "kind">
    | Pick<ExportSummaryMetric, "kind">,
) {
  return ("valueType" in definition ? definition.valueType : undefined) ?? definition.kind ?? "text";
}

function formatMetadataValue(value: ExportableValue, valueType: ExportColumnValueType = "text") {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (valueType === "boolean" || typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (valueType === "currency" && typeof value === "number") {
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (valueType === "number" && typeof value === "number") {
    return value.toLocaleString("en-US");
  }

  if (valueType === "percent" && typeof value === "number") {
    return `${value.toFixed(1)}%`;
  }

  if (valueType === "date") {
    const dateValue = parseDateValue(value, false);
    if (dateValue) {
      return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(dateValue);
    }
  }

  if (valueType === "datetime") {
    const dateValue = parseDateValue(value, true);
    if (dateValue) {
      return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(dateValue);
    }
  }

  return normalizeTextValue(value);
}

function buildColumnWidth<T>(column: ExportColumnDefinition<T>, rows: T[]) {
  const longestCell = Math.max(
    column.label.length,
    ...rows.map((row) => String(column.getValue(row) ?? "").length),
  );

  return {
    wch: column.width ?? Math.min(Math.max(longestCell + 2, 12), 42),
  };
}

function createStyles(branding?: ExportWorkbookBranding): StyleMap {
  const primary = normalizeHex(branding?.primaryColor, "214E91");
  const accent = normalizeHex(branding?.accentColor, "2F7BE5");
  const border = "D7E2F0";
  const headingBorder = normalizeHex(branding?.primaryColor, "214E91");
  const softFill = "F7FAFC";
  const metaFill = "EEF4FB";
  const mutedFill = "F9FBFD";
  const darkText = "15314B";
  const mutedText = "5C7087";
  const whiteText = "FFFFFF";
  const currencySymbol = getCurrencySymbol(branding?.currencyCode);
  const currencyFormat = `"${escapeExcelFormatText(currencySymbol)}"#,##0.00;[Red]-"${escapeExcelFormatText(currencySymbol)}"#,##0.00`;

  const thinBorder = {
    top: { style: "thin", color: { rgb: border } },
    right: { style: "thin", color: { rgb: border } },
    bottom: { style: "thin", color: { rgb: border } },
    left: { style: "thin", color: { rgb: border } },
  };

  return {
    title: {
      font: { bold: true, sz: 18, color: { rgb: whiteText }, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: primary } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: headingBorder } },
        right: { style: "thin", color: { rgb: headingBorder } },
        bottom: { style: "thin", color: { rgb: headingBorder } },
        left: { style: "thin", color: { rgb: headingBorder } },
      },
    },
    reportTitle: {
      font: { bold: true, sz: 14, color: { rgb: darkText }, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: "EAF2FE" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: thinBorder,
    },
    subtitle: {
      font: { sz: 11, color: { rgb: mutedText }, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: softFill } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: thinBorder,
    },
    contact: {
      font: { sz: 10, color: { rgb: mutedText }, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: thinBorder,
    },
    metaLabel: {
      font: { bold: true, sz: 10, color: { rgb: darkText }, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: metaFill } },
      alignment: { horizontal: "left", vertical: "center" },
      border: thinBorder,
    },
    metaValue: {
      font: { sz: 10, color: { rgb: darkText }, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
      border: thinBorder,
    },
    tableHeader: {
      font: { bold: true, sz: 11, color: { rgb: whiteText }, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: accent } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: accent } },
        right: { style: "thin", color: { rgb: accent } },
        bottom: { style: "thin", color: { rgb: accent } },
        left: { style: "thin", color: { rgb: accent } },
      },
    },
    text: {
      font: { sz: 10, color: { rgb: darkText }, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
      border: thinBorder,
    },
    textMuted: {
      font: { sz: 10, color: { rgb: darkText }, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: mutedFill } },
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
      border: thinBorder,
    },
    centered: {
      font: { sz: 10, color: { rgb: darkText }, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: thinBorder,
    },
    number: {
      font: { sz: 10, color: { rgb: darkText }, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: thinBorder,
      numFmt: "#,##0.00",
    },
    currency: {
      font: { sz: 10, color: { rgb: darkText }, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: thinBorder,
      numFmt: currencyFormat,
    },
    percent: {
      font: { sz: 10, color: { rgb: darkText }, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: thinBorder,
      numFmt: "0.0%",
    },
    date: {
      font: { sz: 10, color: { rgb: darkText }, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: thinBorder,
      numFmt: "dd mmm yyyy",
    },
    datetime: {
      font: { sz: 10, color: { rgb: darkText }, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: thinBorder,
      numFmt: "dd mmm yyyy hh:mm AM/PM",
    },
    boolean: {
      font: { sz: 10, color: { rgb: darkText }, name: "Calibri" },
      fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: thinBorder,
    },
  };
}

function buildBodyCell<T>(
  row: T,
  column: ExportColumnDefinition<T>,
  styles: StyleMap,
  useMutedFill: boolean,
) {
  const rawValue = column.getValue(row);
  const valueType = resolveValueType(column);
  const defaultHorizontal =
    column.align ??
    (valueType === "number" || valueType === "currency" || valueType === "percent"
      ? "right"
      : valueType === "date" || valueType === "datetime" || valueType === "boolean"
        ? "center"
        : "left");

  const withAlignment = (style: Record<string, unknown>) => ({
    ...style,
    alignment: {
      ...((style.alignment as Record<string, unknown> | undefined) ?? {}),
      horizontal: defaultHorizontal,
    },
  });

  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return {
      v: "",
      t: "s",
      s: withAlignment(useMutedFill ? styles.textMuted : styles.text),
    };
  }

  if (valueType === "currency" || valueType === "number" || valueType === "percent") {
    const numericValue = typeof rawValue === "number" ? rawValue : Number(rawValue);
    if (Number.isFinite(numericValue)) {
      return {
        v: valueType === "percent" ? numericValue / 100 : numericValue,
        t: "n",
        s: withAlignment(
          valueType === "currency" ? styles.currency : valueType === "percent" ? styles.percent : styles.number,
        ),
      };
    }
  }

  if (valueType === "date" || valueType === "datetime") {
    const dateValue = parseDateValue(rawValue, valueType === "datetime");
    if (dateValue) {
      return {
        v: dateValue,
        t: "d",
        s: withAlignment(valueType === "datetime" ? styles.datetime : styles.date),
      };
    }
  }

  if (valueType === "boolean") {
    return {
      v: rawValue ? "Yes" : "No",
      t: "s",
      s: withAlignment(styles.boolean),
    };
  }

  return {
    v: normalizeTextValue(rawValue),
    t: "s",
    s: withAlignment(column.align === "center" ? styles.centered : useMutedFill ? styles.textMuted : styles.text),
  };
}

function buildWorksheet<T>({
  rows = [],
  columns = [],
  sheetName,
  title,
  subtitle,
  filters,
  summary,
  branding,
}: BuildWorksheetOptions<T>) {
  const styles = createStyles(branding);
  const organizationName = branding?.organizationName?.trim() || "Hostel Sync";
  const reportTitle = title?.trim() || branding?.reportTitle?.trim() || sheetName;
  const reportSubtitle = subtitle?.trim() || branding?.reportSubtitle?.trim() || "Prepared from the Hostel Sync workspace.";
  const generatedAt = formatDateLabel(branding?.generatedAt);
  const contactLine = [
    branding?.address?.trim(),
    branding?.phone?.trim(),
    branding?.email?.trim(),
    branding?.website?.trim(),
  ]
    .filter(Boolean)
    .join(" | ");

  const metadata = [
    ...(branding?.metadata ?? []),
    ...(filters ?? []).map((filter) => ({
      label: filter.label,
      value: formatMetadataValue(filter.value, resolveValueType(filter)),
    })),
    ...(summary ?? []).map((item) => ({
      label: `Summary - ${item.label}`,
      value: `${formatMetadataValue(item.value, resolveValueType(item))}${item.helper ? ` (${item.helper})` : ""}`,
    })),
    { label: "Generated At", value: generatedAt },
    { label: "Rows Exported", value: String(rows.length) },
    { label: "Selected Columns", value: String(columns.length) },
    ...(branding?.currencyCode ? [{ label: "Currency", value: branding.currencyCode }] : []),
  ];

  const rowHeights: Array<{ hpt: number }> = [];
  const sheetRows: unknown[][] = [];
  const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
  const lastColumnIndex = Math.max(columns.length - 1, 1);

  const pushMergedRow = (value: string, style: Record<string, unknown>, height: number) => {
    const rowIndex = sheetRows.length;
    sheetRows.push([{ v: value, t: "s", s: style }]);
    rowHeights.push({ hpt: height });

    merges.push({
      s: { r: rowIndex, c: 0 },
      e: { r: rowIndex, c: lastColumnIndex },
    });
  };

  pushMergedRow(organizationName, styles.title, 28);
  pushMergedRow(reportTitle, styles.reportTitle, 22);
  pushMergedRow(reportSubtitle, styles.subtitle, 18);

  if (contactLine) {
    pushMergedRow(contactLine, styles.contact, 18);
  }

  sheetRows.push([]);
  rowHeights.push({ hpt: 8 });

  for (const meta of metadata) {
    const rowIndex = sheetRows.length;
    sheetRows.push([
      { v: meta.label, t: "s", s: styles.metaLabel },
      { v: meta.value, t: "s", s: styles.metaValue },
    ]);
    rowHeights.push({ hpt: 18 });

    merges.push({
      s: { r: rowIndex, c: 1 },
      e: { r: rowIndex, c: lastColumnIndex },
    });
  }

  if (columns.length > 0) {
    sheetRows.push([]);
    rowHeights.push({ hpt: 8 });

    const tableHeaderRowIndex = sheetRows.length;
    sheetRows.push(
      columns.map((column) => ({
        v: column.label,
        t: "s",
        s: styles.tableHeader,
      })),
    );
    rowHeights.push({ hpt: 22 });

    rows.forEach((row, rowIndex) => {
      const useMutedFill = rowIndex % 2 === 1;
      sheetRows.push(columns.map((column) => buildBodyCell(row, column, styles, useMutedFill)));
      rowHeights.push({ hpt: 19 });
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
    worksheet["!cols"] = columns.map((column) => buildColumnWidth(column, rows));
    worksheet["!rows"] = rowHeights;
    worksheet["!merges"] = merges;
    worksheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: tableHeaderRowIndex, c: 0 },
        e: { r: sheetRows.length - 1, c: columns.length - 1 },
      }),
    };
    return worksheet;
  }

  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  worksheet["!cols"] = [{ wch: 22 }, { wch: 56 }];
  worksheet["!rows"] = rowHeights;
  worksheet["!merges"] = merges;
  return worksheet;
}

export function exportWorkbookToExcel({
  fileName,
  sheets,
  title,
  subject,
  branding,
}: ExportWorkbookToExcelOptions) {
  const workbook = XLSX.utils.book_new();
  const organizationName = branding?.organizationName?.trim() || "Hostel Sync";
  const workbookTitle = title?.trim() || branding?.reportTitle?.trim() || fileName;

  workbook.Props = {
    Title: workbookTitle,
    Subject: subject ?? workbookTitle,
    Author: "Hostel Sync",
    Company: organizationName,
  };

  sheets.forEach((sheet) => {
    const worksheet = buildWorksheet({
      rows: sheet.rows,
      columns: sheet.columns,
      sheetName: sheet.sheetName,
      title: sheet.title,
      subtitle: sheet.subtitle,
      filters: sheet.filters,
      summary: sheet.summary,
      branding,
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, sanitizedSheetName(sheet.sheetName));
  });

  XLSX.writeFile(workbook, `${sanitizedFileName(fileName)}.xlsx`, {
    cellStyles: true,
    cellDates: true,
    compression: true,
  });
}

export function exportRowsToExcel<T>({
  rows,
  columns,
  fileName,
  sheetName = "Export",
  title,
  subtitle,
  workbookTitle,
  filters,
  summary,
  branding,
}: ExportRowsToExcelOptions<T>) {
  exportWorkbookToExcel({
    fileName,
    sheets: [
      {
        rows,
        columns,
        sheetName,
        title: title ?? sheetName,
        subtitle,
        filters,
        summary,
      },
    ],
    title: workbookTitle ?? title ?? branding?.reportTitle ?? sheetName,
    subject: subtitle ?? branding?.reportSubtitle,
    branding,
  });
}
