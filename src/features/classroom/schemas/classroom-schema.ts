import { z } from "zod";

export const classroomSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên lớp.").max(120),
  gradeLevel: z.coerce.number().int().min(1).max(5),
  academicYear: z.string().trim().min(4, "Vui lòng nhập năm học.").max(20),
  endsAt: z.iso.date("Vui lòng chọn ngày kết thúc lớp."),
});
