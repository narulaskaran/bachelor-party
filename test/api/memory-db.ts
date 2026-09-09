/** In-memory stand-in for drizzle `getDb()` — enough of select/insert/update/delete for route tests. */

type Row = Record<string, unknown>;

function tableName(table: object): string {
  const sym = Object.getOwnPropertySymbols(table).find((s) => s.description === "drizzle:Name");
  return sym ? String((table as Record<symbol, unknown>)[sym]) : "";
}

function extractFilters(node: unknown, out: Record<string, unknown> = {}): Record<string, unknown> {
  if (!node || typeof node !== "object") return out;
  const chunks = (node as { queryChunks?: unknown[] }).queryChunks;
  if (!Array.isArray(chunks)) return out;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i] as { name?: string; queryChunks?: unknown[] };
    if (chunk && Array.isArray(chunk.queryChunks)) {
      extractFilters(chunk, out);
      continue;
    }
    if (chunk && typeof chunk.name === "string") {
      const param = chunks[i + 2] as { value?: unknown } | undefined;
      if (param && typeof param === "object" && "value" in param) {
        out[chunk.name] = param.value;
      }
    }
  }
  return out;
}

function getRowValue(row: Row, sqlName: string): unknown {
  if (sqlName in row) return row[sqlName];
  const camel = sqlName.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  return row[camel];
}

function applyWhere(rows: Row[], cond: unknown): Row[] {
  const filters = extractFilters(cond);
  const keys = Object.keys(filters);
  if (keys.length === 0) return rows;
  return rows.filter((row) => keys.every((k) => getRowValue(row, k) === filters[k]));
}

function sortKeyFromOrderExpr(expr: unknown): { field: string; dir: 1 | -1 } | null {
  if (!expr || typeof expr !== "object") return null;
  const rec = expr as { name?: string; queryChunks?: unknown[] };
  if (typeof rec.name === "string") return { field: rec.name, dir: 1 };
  if (!Array.isArray(rec.queryChunks)) return null;
  let field: string | undefined;
  let dir: 1 | -1 = 1;
  const walk = (nodes: unknown[]) => {
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const n = node as { name?: string; value?: unknown; queryChunks?: unknown[] };
      if (typeof n.name === "string") field = n.name;
      const bits = Array.isArray(n.value) ? n.value : [n.value];
      for (const bit of bits) {
        if (typeof bit === "string" && /\bdesc\b/i.test(bit)) dir = -1;
      }
      if (Array.isArray(n.queryChunks)) walk(n.queryChunks);
    }
  };
  walk(rec.queryChunks);
  return field ? { field, dir } : null;
}

function applyOrder(rows: Row[], exprs: unknown[]): Row[] {
  const keys = exprs.map(sortKeyFromOrderExpr).filter((key): key is { field: string; dir: 1 | -1 } => key != null);
  if (keys.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const { field, dir } of keys) {
      const av = getRowValue(a, field);
      const bv = getRowValue(b, field);
      if (av === bv) continue;
      if (av == null) return -1 * dir;
      if (bv == null) return 1 * dir;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return (String(av) < String(bv) ? -1 : 1) * dir;
    }
    return 0;
  });
}

function makeQuery(getRows: () => Row[], countKey?: string) {
  const finalize = () => {
    const rows = getRows();
    if (countKey) return [{ [countKey]: rows.length }];
    return rows;
  };
  return {
    where(cond: unknown) {
      return makeQuery(() => applyWhere(getRows(), cond), countKey);
    },
    limit(n: number) {
      return makeQuery(() => getRows().slice(0, n), countKey);
    },
    orderBy(...exprs: unknown[]) {
      return makeQuery(() => applyOrder(getRows(), exprs), countKey);
    },
    leftJoin() {
      return {
        groupBy() {
          return {
            orderBy: async () => getRows(),
          };
        },
      };
    },
    then<T>(onFulfilled?: (rows: Row[]) => T, onRejected?: (err: unknown) => T) {
      return Promise.resolve(finalize()).then(onFulfilled, onRejected);
    },
  };
}

function isCountExpr(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  try {
    return /count/i.test(JSON.stringify(value));
  } catch {
    return false;
  }
}

export function createMemoryDb() {
  const parties: Row[] = [];
  const guests: Row[] = [];
  const contentVersions: Row[] = [];
  const selectCounts = { parties: 0, guests: 0, contentVersions: 0 };
  let partySeq = 1;
  let guestSeq = 1;
  let versionSeq = 1;

  function rowsFor(table: object): Row[] {
    const name = tableName(table);
    if (name === "guests") return guests;
    if (name === "content_versions") return contentVersions;
    return parties;
  }

  function nextId(table: object): number {
    const name = tableName(table);
    if (name === "guests") return guestSeq++;
    if (name === "content_versions") return versionSeq++;
    return partySeq++;
  }

  const db = {
    select(fields?: Record<string, unknown>) {
      const countKey = fields
        ? Object.entries(fields).find(([, value]) => isCountExpr(value))?.[0]
        : undefined;
      return {
        from(table: object) {
          const name = tableName(table);
          if (name === "parties") selectCounts.parties += 1;
          if (name === "guests") selectCounts.guests += 1;
          if (name === "content_versions") selectCounts.contentVersions += 1;
          return makeQuery(() => rowsFor(table), countKey);
        },
      };
    },
    insert(table: object) {
      return {
        values(vals: Row) {
          const runInsert = () => {
            const row: Row = {
              id: nextId(table),
              createdAt: new Date(),
              updatedAt: new Date(),
              ...vals,
            };
            rowsFor(table).push(row);
            return row;
          };
          return {
            then<T>(onFulfilled?: (row: Row) => T, onRejected?: (err: unknown) => T) {
              return Promise.resolve(runInsert()).then(onFulfilled, onRejected);
            },
            async returning() {
              return [runInsert()];
            },
            onConflictDoUpdate() {
              return {
                then<T>(onFulfilled?: (row: Row) => T, onRejected?: (err: unknown) => T) {
                  return Promise.resolve(runInsert()).then(onFulfilled, onRejected);
                },
              };
            },
          };
        },
      };
    },
    update(table: object) {
      return {
        set(vals: Row) {
          return {
            where(cond: unknown) {
              const run = () => {
                const matched = applyWhere(rowsFor(table), cond);
                for (const row of matched) Object.assign(row, vals);
                return matched;
              };
              return {
                then<T>(onFulfilled?: (rows: Row[]) => T, onRejected?: (err: unknown) => T) {
                  return Promise.resolve(run()).then(onFulfilled, onRejected);
                },
                returning: async () => run(),
              };
            },
          };
        },
      };
    },
    delete(table: object) {
      return {
        where(cond: unknown) {
          let deleted: Row[] | undefined;
          const run = () => {
            if (!deleted) {
              const store = rowsFor(table);
              deleted = applyWhere(store, cond);
              const remove = new Set(deleted);
              const next = store.filter((r) => !remove.has(r));
              store.length = 0;
              store.push(...next);
            }
            return deleted;
          };
          return {
            then<T>(onFulfilled?: (rows: Row[]) => T, onRejected?: (err: unknown) => T) {
              return Promise.resolve(run()).then(onFulfilled, onRejected);
            },
            returning: async () => run(),
          };
        },
      };
    },
  };

  return {
    db,
    parties,
    guests,
    contentVersions,
    selectCounts,
    seedParty(partial: Row) {
      const row: Row = {
        id: partySeq++,
        slug: "test-party",
        password: "party-secret-pw",
        adminToken: "party-scoped-token",
        content: { trip: { siteName: "Test Trip" } },
        createdAt: new Date(),
        updatedAt: new Date(),
        ...partial,
      };
      parties.push(row);
      return row;
    },
    seedGuest(partial: Row) {
      const id = guestSeq++;
      const row: Row = {
        id,
        partyId: 1,
        name: "Alex",
        nameKey: "alex",
        guestToken: id.toString(16).padStart(32, "0"),
        attendanceStatus: "attending",
        partySize: 1,
        plusOneName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...partial,
      };
      guests.push(row);
      return row;
    },
  };
}
