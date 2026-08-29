import * as XLSX from "xlsx";

import type { ParsedStudent, ParsedWorkbook } from "@/features/student-import/types";
import type { StudentGender } from "@/types/database.generated";

type CellValue = string | number | boolean | Date | null | undefined;

const normalizeLabel = (value: CellValue) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function detectHeaderRow(rows: CellValue[][]) {
  return rows.findIndex((row) => {
    const labels = row.map(normalizeLabel);
    const hasOrdinal = labels.some((label) => ["tt", "stt", "so thu tu"].includes(label));
    const hasName = labels.some((label) => ["ho va ten", "ho ten", "ten hoc sinh"].includes(label));
    return hasOrdinal && hasName;
  });
}

const findColumn = (headers: string[], aliases: string[]) =>
  headers.findIndex((header) => aliases.includes(header));

function normalizeDate(value: CellValue): { value: string | null; issue?: string } {
  if (value === null || value === undefined || String(value).trim() === "") return { value: null };
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { value: `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}` };
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return { value: `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}` };
  }

  const text = String(value).trim();
  const match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return { value: null, issue: "Ngày sinh không hợp lệ" };
  const [, day, month, year] = match;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return { value: null, issue: "Ngày sinh không hợp lệ" };
  return { value: iso };
}

function normalizeGender(value: CellValue, isFemaleColumn: boolean): StudentGender | null {
  const label = normalizeLabel(value);
  if (isFemaleColumn) return label && !["0", "false", "khong"].includes(label) ? "FEMALE" : "MALE";
  if (["nu", "female", "f"].includes(label)) return "FEMALE";
  if (["nam", "male", "m"].includes(label)) return "MALE";
  return label ? "OTHER" : null;
}

function normalizePhone(value: CellValue) {
  let phone = String(value ?? "").replace(/[^0-9+]/g, "");
  if (typeof value === "number" && /^\d{9}$/.test(phone)) phone = `0${phone}`;
  return phone || null;
}

export function parseStudentRows(rows: CellValue[][]): ParsedStudent[] {
  const headerRowIndex = detectHeaderRow(rows);
  if (headerRowIndex < 0) return [];
  const headers = rows[headerRowIndex].map(normalizeLabel);
  const ordinalIndex = findColumn(headers, ["tt", "stt", "so thu tu"]);
  const nameIndex = findColumn(headers, ["ho va ten", "ho ten", "ten hoc sinh"]);
  const dobIndex = findColumn(headers, ["ngay sinh", "nam sinh"]);
  const genderIndex = findColumn(headers, ["gioi tinh", "nu"]);
  const phoneIndex = findColumn(headers, ["so dien thoai", "dien thoai", "sdt"]);
  const femaleColumn = genderIndex >= 0 && headers[genderIndex] === "nu";

  return rows.slice(headerRowIndex + 1).flatMap((row, index) => {
    const rawOrdinal = row[ordinalIndex];
    const ordinal = Number(rawOrdinal);
    const fullName = String(row[nameIndex] ?? "").trim().replace(/\s+/g, " ");
    if (rawOrdinal === null || rawOrdinal === undefined || String(rawOrdinal).trim() === ""
      || !Number.isFinite(ordinal) || !Number.isInteger(ordinal) || ordinal <= 0 || !fullName) return [];
    const date = dobIndex >= 0 ? normalizeDate(row[dobIndex]) : { value: null };
    const issues: string[] = [];
    if (!date.value && !date.issue) issues.push("Thiếu ngày sinh");
    if (date.issue) issues.push(date.issue);
    const parentPhone = phoneIndex >= 0 ? normalizePhone(row[phoneIndex]) : null;
    if (parentPhone && !/^\+?[0-9]{8,15}$/.test(parentPhone)) issues.push("Số điện thoại không hợp lệ");
    return [{
      rowNumber: headerRowIndex + index + 2,
      ordinal,
      fullName,
      dateOfBirth: date.value,
      gender: genderIndex >= 0 ? normalizeGender(row[genderIndex], femaleColumn) : null,
      parentPhone,
      issues,
    }];
  });
}

export function parseWorkbook(buffer: ArrayBuffer, classroomName: string): ParsedWorkbook {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const studentsBySheet = Object.fromEntries(workbook.SheetNames.map((sheetName) => {
    const rows = XLSX.utils.sheet_to_json<CellValue[]>(workbook.Sheets[sheetName], {
      header: 1,
      raw: true,
      defval: null,
    });
    return [sheetName, parseStudentRows(rows)];
  }));
  const normalizedClass = normalizeLabel(classroomName)
    .replace(/\b(lop|class)\b/g, "")
    .replace(/ /g, "");
  const sheetsWithStudents = workbook.SheetNames.filter((name) => studentsBySheet[name].length > 0);
  const suggestedSheet = sheetsWithStudents.find((name) => normalizeLabel(name).replace(/ /g, "") === normalizedClass)
    ?? sheetsWithStudents.find((name) => {
      const normalizedSheet = normalizeLabel(name).replace(/ /g, "");
      return normalizedClass.endsWith(normalizedSheet) || normalizedSheet.endsWith(normalizedClass);
    })
    ?? sheetsWithStudents[0]
    ?? workbook.SheetNames[0]
    ?? "";
  return { sheetNames: sheetsWithStudents, suggestedSheet, studentsBySheet };
}
