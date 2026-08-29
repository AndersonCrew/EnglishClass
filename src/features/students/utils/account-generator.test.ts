import { describe, expect, it } from "vitest";

import { buildUsernameCandidate, generateTemporaryPassword, toAsciiSlug } from "@/features/students/utils/account-generator";

describe("student credentials", () => {
  it("removes Vietnamese accents", () => expect(toAsciiSlug("Nguyễn Văn Đăng")).toBe("nguyenvandang"));
  it("creates a short, typeable username", () => {
    const username = buildUsernameCandidate("Nguyễn Văn An", "4A1", "27");
    expect(username).toBe("nguyenvanan.4a1.27");
    expect(username.length).toBeLessThanOrEqual(40);
  });
  it("generates a temporary password without ambiguous characters", () => {
    const password = generateTemporaryPassword();
    expect(password).not.toMatch(/[0O1lI]/);
    expect(password.length).toBeGreaterThanOrEqual(12);
  });
});
