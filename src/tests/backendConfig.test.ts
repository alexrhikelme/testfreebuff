import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getBackendMode,
  getConvexUrl,
  makeId,
  nowIso,
  CURRENT_USER,
  MAX_ACTIVITY,
} from "../shared/backend/config";

/**
 * Sprint 8 (D1) — configuração do backend: modo de operação, resolução da
 * URL do Convex e utilitários de id/data usados por todos os stores.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getBackendMode", () => {
  it("roda sempre em modo local durante os testes", () => {
    // Garantia de determinismo: nenhum teste conversa com o Convex.
    expect(getBackendMode()).toBe("local");
  });

  it("ignora URL do Convex configurada quando o modo é teste", () => {
    vi.stubEnv("VITE_CONVEX_URL", "https://exemplo.convex.cloud");
    expect(getBackendMode()).toBe("local");
  });
});

describe("getConvexUrl", () => {
  it("devolve a URL quando configurada e válida", () => {
    vi.stubEnv("VITE_CONVEX_URL", "https://meu-projeto.convex.cloud");
    expect(getConvexUrl()).toBe("https://meu-projeto.convex.cloud");
  });

  it("devolve undefined sem URL configurada", () => {
    vi.stubEnv("VITE_CONVEX_URL", "");
    expect(getConvexUrl()).toBeUndefined();
  });

  it("devolve undefined para URL malformada", () => {
    vi.stubEnv("VITE_CONVEX_URL", "nao-e-uma-url");
    expect(getConvexUrl()).toBeUndefined();
  });

  it("aceita URL loopback quando o próprio navegador é local (jsdom)", () => {
    vi.stubEnv("VITE_CONVEX_URL", "http://localhost:3210");
    expect(getConvexUrl()).toBe("http://localhost:3210");
  });
});

describe("makeId / nowIso", () => {
  it("makeId usa o prefixo informado", () => {
    expect(makeId("note").startsWith("note-")).toBe(true);
    expect(makeId("dash").startsWith("dash-")).toBe(true);
    expect(makeId("member").startsWith("member-")).toBe(true);
  });

  it("makeId gera ids únicos em sequência", () => {
    const ids = new Set(Array.from({ length: 200 }, () => makeId("note")));
    expect(ids.size).toBe(200);
  });

  it("nowIso devolve data ISO válida e recente", () => {
    const before = Date.now();
    const iso = nowIso();
    expect(Number.isNaN(Date.parse(iso))).toBe(false);
    expect(Date.parse(iso)).toBeGreaterThanOrEqual(before);
  });
});

describe("constantes de domínio", () => {
  it("usuário corrente e limite de atividade", () => {
    expect(CURRENT_USER).toBe("Ana Costa");
    expect(MAX_ACTIVITY).toBe(30);
  });
});
