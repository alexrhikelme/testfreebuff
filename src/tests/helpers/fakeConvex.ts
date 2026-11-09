/**
 * Sprint 11 (P1) — Banco Convex falso em memória.
 *
 * Os testes de execução chamam o `_handler` real das funções do backend
 * (`convex/*.ts`) passando este contexto: `ctx.db` (get/insert/patch/
 * replace/delete/query com withIndex) e `ctx.auth.getUserIdentity` para
 * simular a sessão do Convex Auth. Nada de rede, nada de deployment.
 */

type Row = Record<string, any>;

export type FakeConvex = {
  /** Contexto mínimo do Convex (db + auth), tipado como `any` de propósito. */
  ctx: any;
  /** Linhas de uma tabela (para inspeção direta). */
  table: (name: string) => Row[];
  /** Insere uma linha com id fixo (fixtures). */
  seed: (table: string, id: string, doc: Record<string, unknown>) => void;
  /** Define a sessão atual; `null` = deslogado. */
  setUser: (user: { id: string; name: string; email: string } | null) => void;
};

export function createFakeConvex(): FakeConvex {
  const tables = new Map<string, Row[]>();
  let sequence = 0;
  let identity: { subject: string } | null = null;

  const table = (name: string): Row[] => {
    let rows = tables.get(name);
    if (!rows) {
      rows = [];
      tables.set(name, rows);
    }
    return rows;
  };

  const locate = (id: string): { rows: Row[]; index: number } | null => {
    for (const rows of tables.values()) {
      const index = rows.findIndex((row) => row._id === id);
      if (index >= 0) return { rows, index };
    }
    return null;
  };

  const withoutSystemFields = (doc: Row): Row => {
    const { _id, _creationTime, ...rest } = doc;
    void _id;
    void _creationTime;
    return rest;
  };

  const db = {
    get: async (id: string) => {
      const hit = locate(id);
      return hit ? { ...hit.rows[hit.index] } : null;
    },
    insert: async (name: string, doc: Row) => {
      const id = `${name}:${++sequence}`;
      table(name).push({ ...doc, _id: id, _creationTime: sequence });
      return id;
    },
    patch: async (id: string, patch: Row) => {
      const hit = locate(id);
      if (!hit) throw new Error(`[fake-convex] documento inexistente: ${id}`);
      Object.assign(hit.rows[hit.index], patch);
    },
    replace: async (id: string, doc: Row) => {
      const hit = locate(id);
      if (!hit) throw new Error(`[fake-convex] documento inexistente: ${id}`);
      hit.rows[hit.index] = {
        ...withoutSystemFields(doc),
        _id: id,
        _creationTime: hit.rows[hit.index]._creationTime,
      };
    },
    delete: async (id: string) => {
      const hit = locate(id);
      if (hit) hit.rows.splice(hit.index, 1);
    },
    query: (name: string) => {
      const filters: Array<[string, unknown]> = [];
      const matching = () =>
        table(name).filter((row) =>
          filters.every(([field, value]) => row[field] === value)
        );

      const builder = {
        withIndex(_indexName: string, range: (q: any) => unknown) {
          const q = {
            eq(field: string, value: unknown) {
              filters.push([field, value]);
              return q;
            },
          };
          range(q);
          return builder;
        },
        collect: async () => matching().map((row) => ({ ...row })),
        first: async () => {
          const rows = matching();
          return rows[0] ? { ...rows[0] } : null;
        },
        unique: async () => {
          const rows = matching();
          if (rows.length > 1) {
            throw new Error(`[fake-convex] unique retornou ${rows.length} linhas`);
          }
          return rows[0] ? { ...rows[0] } : null;
        },
      };
      return builder;
    },
  };

  return {
    ctx: { db, auth: { getUserIdentity: async () => identity } },
    table,
    seed(name, id, doc) {
      table(name).push({ ...doc, _id: id, _creationTime: ++sequence });
    },
    setUser(user) {
      identity = user ? { subject: `${user.id}|session` } : null;
      if (!user) return;
      const existing = table("users").find((row) => row._id === user.id);
      if (existing) {
        existing.name = user.name;
        existing.email = user.email;
        return;
      }
      table("users").push({
        _id: user.id,
        _creationTime: ++sequence,
        name: user.name,
        email: user.email,
      });
    },
  };
}

/** Executa o handler real de uma função Convex registrada. */
export function runHandler<T = unknown>(
  fn: unknown,
  ctx: unknown,
  args: unknown = {}
): Promise<T> {
  return (
    fn as { _handler: (c: unknown, a: unknown) => Promise<T> }
  )._handler(ctx, args);
}
