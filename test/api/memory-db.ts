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

function makeQuery(getRows: () => Row[]) {
  return {
    where(cond: unknown) {
      return makeQuery(() => applyWhere(getRows(), cond));
    },
    limit(n: number) {
      return Promise.resolve(getRows().slice(0, n));
    },
    orderBy() {
      return Promise.resolve(getRows());
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
      return Promise.resolve(getRows()).then(onFulfilled, onRejected);
    },
  };
}

export function createMemoryDb() {
  const parties: Row[] = [];
  const guests: Row[] = [];
  let partySeq = 1;
  let guestSeq = 1;

  function rowsFor(table: object): Row[] {
    return tableName(table) === "guests" ? guests : parties;
  }

  function nextId(table: object): number {
    return tableName(table) === "guests" ? guestSeq++ : partySeq++;
  }

  const db = {
    select() {
      return {
        from(table: object) {
          return makeQuery(() => rowsFor(table));
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
      const row: Row = {
        id: guestSeq++,
        partyId: 1,
        name: "Alex",
        nameKey: "alex",
        createdAt: new Date(),
        updatedAt: new Date(),
        ...partial,
      };
      guests.push(row);
      return row;
    },
  };
}
