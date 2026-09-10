import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { executeSql } from "@/lib/db-execute";

describe("executeSql", () => {
  it("returns false when execute is missing so callers can fall back", async () => {
    await expect(executeSql({}, sql`SELECT 1`)).resolves.toBe(false);
  });

  it("invokes execute as a method so dialect stays on this", async () => {
    class NeonLike {
      dialect = { name: "neon-http" };
      async execute(query: unknown) {
        if (this == null || this.dialect === undefined) {
          throw new TypeError("Cannot read properties of undefined (reading 'dialect')");
        }
        return query;
      }
    }

    await expect(executeSql(new NeonLike(), sql`SELECT 1`)).resolves.toBe(true);
  });
});
