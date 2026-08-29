import { describe, expect, it } from "vitest";
import { changePasswordSchema } from "./change-password-schema";

describe("change password validation", () => {
  it("requires a stronger replacement than the shared initial password", () => expect(changePasswordSchema.safeParse({ password: "123456", confirmPassword: "123456" }).success).toBe(false));
  it("accepts matching letters and numbers", () => expect(changePasswordSchema.safeParse({ password: "English123", confirmPassword: "English123" }).success).toBe(true));
});
