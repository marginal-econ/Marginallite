import { describe, expect, it, vi } from "vitest";

import { assertKnowledgeStaff } from "./knowledge.functions";

function contextWithRoles(roles: Array<{ role: string }>) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn().mockResolvedValue({ data: roles, error: null }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return {
    context: {
      supabase: { from: vi.fn().mockReturnValue(query) },
      userId: "00000000-0000-4000-8000-000000000001",
    },
    query,
  };
}

describe("knowledge management authorization", () => {
  it("rejects a signed-in student without a staff role", async () => {
    const { context } = contextWithRoles([]);
    await expect(assertKnowledgeStaff(context as never)).rejects.toThrow(
      "Teacher or administrator access is required",
    );
  });

  it("allows a teacher or administrator", async () => {
    const teacher = contextWithRoles([{ role: "teacher" }]);
    await expect(assertKnowledgeStaff(teacher.context as never)).resolves.toBeUndefined();
  });
});
