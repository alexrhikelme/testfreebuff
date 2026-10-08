import { describe, it, expect } from "vitest";
import {
  getDeadlineState,
  describeDeadline,
  validatePeriod,
  deadlineBadgeClasses,
} from "../features/notes/deadline";
import type { Note } from "../features/notes/types";

const mkNote = (over: Partial<Note> = {}): Note => ({
  id: "n1",
  title: "Nota",
  content: "",
  status: "in_progress",
  tags: [],
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
  ...over,
});

// Data de referência fixa: 2026-09-17
const NOW = new Date("2026-09-17T12:00:00");

describe("getDeadlineState", () => {
  it("retorna none para nota sem prazo", () => {
    expect(getDeadlineState(mkNote(), NOW)).toBe("none");
  });

  it("retorna none para nota concluída mesmo com prazo vencido", () => {
    const note = mkNote({ status: "completed", dueDate: "2026-09-01" });
    expect(getDeadlineState(note, NOW)).toBe("none");
  });

  it("retorna overdue quando prazo passou", () => {
    const note = mkNote({ dueDate: "2026-09-16" });
    expect(getDeadlineState(note, NOW)).toBe("overdue");
  });

  it("retorna today quando vence no dia atual", () => {
    const note = mkNote({ dueDate: "2026-09-17" });
    expect(getDeadlineState(note, NOW)).toBe("today");
  });

  it("retorna urgent quando vence em até 3 dias", () => {
    const note = mkNote({ dueDate: "2026-09-19" });
    expect(getDeadlineState(note, NOW)).toBe("urgent");
  });

  it("retorna ok quando vence em mais de 3 dias", () => {
    const note = mkNote({ dueDate: "2026-09-25" });
    expect(getDeadlineState(note, NOW)).toBe("ok");
  });

  it("retorna none para prazo inválido", () => {
    const note = mkNote({ dueDate: "nao-e-data" });
    expect(getDeadlineState(note, NOW)).toBe("none");
  });
});

describe("describeDeadline", () => {
  it("descreve atraso", () => {
    expect(describeDeadline(mkNote({ dueDate: "2026-09-15" }), NOW)).toBe("Atrasada");
  });

  it("descreve vencimento hoje", () => {
    expect(describeDeadline(mkNote({ dueDate: "2026-09-17" }), NOW)).toBe("Vence hoje");
  });

  it("descreve dias restantes no singular", () => {
    expect(describeDeadline(mkNote({ dueDate: "2026-09-18" }), NOW)).toBe("Vence em 1 dia");
  });

  it("descreve dias restantes no plural", () => {
    expect(describeDeadline(mkNote({ dueDate: "2026-09-19" }), NOW)).toBe("Vence em 2 dias");
  });

  it("retorna vazio para estado ok ou none", () => {
    expect(describeDeadline(mkNote({ dueDate: "2026-09-30" }), NOW)).toBe("");
    expect(describeDeadline(mkNote(), NOW)).toBe("");
  });
});

describe("validatePeriod", () => {
  it("exige prazo quando há data de início", () => {
    expect(validatePeriod("2026-09-10", undefined)).toBe(
      "Informe o prazo se houver data de início."
    );
  });

  it("aceita período válido", () => {
    expect(validatePeriod("2026-09-10", "2026-09-20")).toBeNull();
  });

  it("rejeita início depois do prazo", () => {
    expect(validatePeriod("2026-09-20", "2026-09-10")).toBe(
      "A data de início não pode ser depois do prazo."
    );
  });

  it("aceita início igual ao prazo", () => {
    expect(validatePeriod("2026-09-20", "2026-09-20")).toBeNull();
  });

  it("aceita somente prazo sem início", () => {
    expect(validatePeriod(undefined, "2026-09-20")).toBeNull();
  });

  it("rejeita datas inválidas", () => {
    expect(validatePeriod("abc", "2026-09-20")).toBe("Datas inválidas.");
  });
});

describe("deadlineBadgeClasses", () => {
  it("retorna null para estados sem badge", () => {
    expect(deadlineBadgeClasses("none")).toBeNull();
    expect(deadlineBadgeClasses("ok")).toBeNull();
  });

  it("retorna classes para estados com badge", () => {
    expect(deadlineBadgeClasses("overdue")).not.toBeNull();
    expect(deadlineBadgeClasses("today")).not.toBeNull();
    expect(deadlineBadgeClasses("urgent")).not.toBeNull();
  });
});
