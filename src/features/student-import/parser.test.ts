import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { detectHeaderRow, parseStudentRows, parseWorkbook } from "@/features/student-import/parser";

const rows = [
  ["TRƯỜNG TIỂU HỌC"],
  ["DANH SÁCH LỚP"],
  ["TT", "Họ và tên", "Ngày sinh", "Nữ", "Số điện thoại"],
  [1, "Nguyễn Văn An", "02/03/2017", "", "0912345678"],
  [2, "Trần Thị Bình", "03/04/2017", "x", "0987654321"],
  [null, "Tổng số: 2"],
  ["Giáo viên chủ nhiệm"],
];

describe("student Excel parser", () => {
  it("detects headers outside row 6", () => expect(detectHeaderRow(rows)).toBe(2));
  it("parses valid students and ignores footer/empty rows", () => expect(parseStudentRows(rows)).toHaveLength(2));
  it("normalizes dd/mm/yyyy", () => expect(parseStudentRows(rows)[0].dateOfBirth).toBe("2017-03-02"));
  it("keeps a leading zero in text phone", () => expect(parseStudentRows(rows)[0].parentPhone).toBe("0912345678"));
  it("restores the leading zero when Excel stored a Vietnamese phone as a number", () => {
    const parsed = parseStudentRows([["TT", "Họ và tên", "Số điện thoại"], [1, "A", 944809406]]);
    expect(parsed[0].parentPhone).toBe("0944809406");
  });
  it("detects female marker column", () => expect(parseStudentRows(rows)[1].gender).toBe("FEMALE"));
  it("reports an invalid date without failing the sheet", () => {
    const invalid = parseStudentRows([...rows.slice(0, 3), [1, "A", "99/99/2017"]]);
    expect(invalid[0].issues).toContain("Ngày sinh không hợp lệ");
  });
  it("accepts an Excel serial date", () => {
    const parsed = parseStudentRows([["TT", "Họ và tên", "Ngày sinh"], [1, "A", 43000]]);
    expect(parsed[0].dateOfBirth).toMatch(/^20\d\d-/);
  });
  it("reads an Excel Date using local calendar fields without UTC day drift", () => {
    const parsed = parseStudentRows([["TT", "Họ và tên", "Ngày sinh"], [1, "A", new Date(2020, 11, 12)]]);
    expect(parsed[0].dateOfBirth).toBe("2020-12-12");
  });

  it.each(["xlsx", "biff8"] as const)("reads %s and multiple sheets", (bookType) => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "4A1");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "4A2");
    const buffer = XLSX.write(workbook, { type: "array", bookType });
    const parsed = parseWorkbook(buffer, "4A2");
    expect(parsed.sheetNames).toEqual(["4A1", "4A2"]);
    expect(parsed.suggestedSheet).toBe("4A2");
    expect(parsed.studentsBySheet["4A2"]).toHaveLength(2);
  });

  it("skips an empty StartUp sheet and understands the Lớp prefix", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), "StartUp");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "1A1");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "1A2");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "biff8" });
    const parsed = parseWorkbook(buffer, "Lớp 1A1");
    expect(parsed.sheetNames).toEqual(["1A1", "1A2"]);
    expect(parsed.suggestedSheet).toBe("1A1");
    expect(parsed.studentsBySheet[parsed.suggestedSheet]).toHaveLength(2);
  });

  it("falls back to the first sheet containing students", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), "StartUp");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "2A1");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "biff8" });
    expect(parseWorkbook(buffer, "Tên lớp khác").suggestedSheet).toBe("2A1");
  });
});
