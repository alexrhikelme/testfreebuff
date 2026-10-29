import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { LabProvider, useLab } from "../features/dashboards/store";

/**
 * Sprint 8 (D1) — modo local do LabProvider: os dashboards e membros do
 * protótipo em memória, com a mesma API usada pela versão Convex.
 * Em modo teste o backend é sempre "local" (getBackendMode), então as
 * mutations são síncronas e determinísticas.
 */

function wrapper({ children }: { children: ReactNode }) {
  return <LabProvider>{children}</LabProvider>;
}

describe("LabProvider (modo local)", () => {
  it("começa com os 5 dashboards e 3 membros semente", () => {
    const { result } = renderHook(() => useLab(), { wrapper });

    expect(result.current.dashboards).toHaveLength(5);
    expect(result.current.dashboards[0].id).toBe("dash-q3");
    expect(result.current.members).toHaveLength(3);
    expect(result.current.members.map((m) => m.email)).toEqual([
      "ana@lab.local",
      "bruno@lab.local",
      "carla@lab.local",
    ]);
  });

  it("usuário simulado é admin no protótipo", () => {
    const { result } = renderHook(() => useLab(), { wrapper });
    expect(result.current.currentRole).toBe("admin");
  });

  it("createDashboard adiciona no topo com id e datas gerados", () => {
    const { result } = renderHook(() => useLab(), { wrapper });

    let created!: ReturnType<typeof result.current.createDashboard>;
    act(() => {
      created = result.current.createDashboard({
        name: "Novo Projeto",
        description: "Descrição",
      });
    });

    expect(result.current.dashboards).toHaveLength(6);
    expect(result.current.dashboards[0]).toEqual(created);
    expect(created.id.startsWith("dash-")).toBe(true);
    expect(created.name).toBe("Novo Projeto");
    expect(created.createdAt).toBe(created.updatedAt);
    expect(Number.isNaN(Date.parse(created.createdAt))).toBe(false);
  });

  it("createDashboard usa descrição vazia por padrão", () => {
    const { result } = renderHook(() => useLab(), { wrapper });

    act(() => {
      result.current.createDashboard({ name: "Sem descrição" });
    });

    expect(result.current.dashboards[0].description).toBe("");
  });

  it("updateDashboard aplica o patch e atualiza updatedAt", () => {
    const { result } = renderHook(() => useLab(), { wrapper });
    const original = result.current.dashboards[0];
    expect(original.name).toBe("Q3 Product Launch");

    act(() => {
      result.current.updateDashboard("dash-q3", { name: "Q3 Renomeado" });
    });

    const updated = result.current.dashboards.find((d) => d.id === "dash-q3")!;
    expect(updated.name).toBe("Q3 Renomeado");
    // Só o campo do patch muda; os demais são preservados.
    expect(updated.description).toBe(original.description);
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.updatedAt >= original.updatedAt).toBe(true);
  });

  it("updateDashboard ignor ids inexistentes sem quebrar", () => {
    const { result } = renderHook(() => useLab(), { wrapper });

    act(() => {
      result.current.updateDashboard("nao-existe", { name: "Ghost" });
    });

    expect(result.current.dashboards.some((d) => d.name === "Ghost")).toBe(
      false
    );
    expect(result.current.dashboards).toHaveLength(5);
  });

  it("deleteDashboard remove o dashboard e os membros dele (cascade)", () => {
    const { result } = renderHook(() => useLab(), { wrapper });
    expect(
      result.current.members.filter((m) => m.dashboardId === "dash-seed-1")
    ).toHaveLength(2);

    act(() => {
      result.current.deleteDashboard("dash-seed-1");
    });

    expect(result.current.dashboards).toHaveLength(4);
    expect(
      result.current.dashboards.some((d) => d.id === "dash-seed-1")
    ).toBe(false);
    expect(
      result.current.members.some((m) => m.dashboardId === "dash-seed-1")
    ).toBe(false);
    // Membros de outros dashboards permanecem.
    expect(
      result.current.members.some((m) => m.dashboardId === "dash-seed-2")
    ).toBe(true);
  });

  it("addMember adiciona no topo com invitedAt e papéis", () => {
    const { result } = renderHook(() => useLab(), { wrapper });

    let member!: ReturnType<typeof result.current.addMember>;
    act(() => {
      member = result.current.addMember({
        name: "Diego Souza",
        email: "diego@lab.local",
        role: "editor",
        dashboardId: "dash-q3",
      });
    });

    expect(result.current.members).toHaveLength(4);
    expect(result.current.members[0]).toEqual(member);
    expect(member.id.startsWith("member-")).toBe(true);
    expect(Number.isNaN(Date.parse(member.invitedAt))).toBe(false);
  });

  it("updateMemberRole troca somente o papel", () => {
    const { result } = renderHook(() => useLab(), { wrapper });

    act(() => {
      result.current.updateMemberRole("member-seed-3", "admin");
    });

    const member = result.current.members.find(
      (m) => m.id === "member-seed-3"
    )!;
    expect(member.role).toBe("admin");
    expect(member.name).toBe("Carla Dias");
    // Papéis dos demais não mudam.
    expect(
      result.current.members.find((m) => m.id === "member-seed-2")!.role
    ).toBe("editor");
  });

  it("removeMember remove apenas o membro indicado", () => {
    const { result } = renderHook(() => useLab(), { wrapper });

    act(() => {
      result.current.removeMember("member-seed-2");
    });

    expect(result.current.members).toHaveLength(2);
    expect(
      result.current.members.some((m) => m.id === "member-seed-2")
    ).toBe(false);
  });

  it("useLab fora do provider lança erro claro", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useLab())).toThrow(
      "useLab must be used within LabProvider"
    );
    spy.mockRestore();
  });
});
