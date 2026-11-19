import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { LabProvider, useLab } from "../features/dashboards/store";

/**
 * Modo local do LabProvider (protótipo/testes): projetos e membros em
 * memória, com a mesma API usada no Firebase. Em modo teste o backend é
 * sempre "local", então as mutations são síncronas e determinísticas.
 *
 * O modelo é por projeto: o papel de cada pessoa vale DENTRO do projeto.
 */

function wrapper({ children }: { children: ReactNode }) {
  return <LabProvider>{children}</LabProvider>;
}

describe("LabProvider (modo local)", () => {
  it("começa com os projetos e membros semente", () => {
    const { result } = renderHook(() => useLab(), { wrapper });

    expect(result.current.dashboards).toHaveLength(5);
    expect(result.current.dashboards[0].id).toBe("dash-q3");
    expect(result.current.members).toHaveLength(3);
    expect(result.current.members.map((m) => m.email).sort()).toEqual([
      "ana@unicap.br",
      "bruno@unicap.br",
      "carla@unicap.br",
    ]);
  });

  it("calcula o papel por projeto (e libera a demonstração local)", () => {
    const { result } = renderHook(() => useLab(), { wrapper });

    expect(result.current.roleInProject("dash-seed-1")).toBe("admin");
    expect(result.current.canEditProject("dash-seed-1")).toBe(true);
    expect(result.current.canManageProject("dash-seed-1")).toBe(true);
    // Anotação pessoal (sem projeto) é sempre editável pelo dono.
    expect(result.current.canEditProject(undefined)).toBe(true);
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

  it("updateDashboard ignora ids inexistentes sem quebrar", () => {
    const { result } = renderHook(() => useLab(), { wrapper });

    act(() => {
      result.current.updateDashboard("nao-existe", { name: "Ghost" });
    });

    expect(result.current.dashboards.some((d) => d.name === "Ghost")).toBe(
      false,
    );
    expect(result.current.dashboards).toHaveLength(5);
  });

  it("deleteDashboard remove o projeto e os membros dele (cascade)", () => {
    const { result } = renderHook(() => useLab(), { wrapper });
    expect(
      result.current.members.filter((m) => m.dashboardId === "dash-seed-1"),
    ).toHaveLength(2);

    act(() => {
      result.current.deleteDashboard("dash-seed-1");
    });

    expect(result.current.dashboards).toHaveLength(4);
    expect(
      result.current.dashboards.some((d) => d.id === "dash-seed-1"),
    ).toBe(false);
    expect(
      result.current.members.some((m) => m.dashboardId === "dash-seed-1"),
    ).toBe(false);
    // Membros de outros projetos permanecem.
    expect(
      result.current.members.some((m) => m.dashboardId === "dash-seed-2"),
    ).toBe(true);
  });

  it("addMember usa o id determinístico projeto_uid", () => {
    const { result } = renderHook(() => useLab(), { wrapper });

    let member!: ReturnType<typeof result.current.addMember>;
    act(() => {
      member = result.current.addMember({
        uid: "uid-diego",
        name: "Diego Souza",
        email: "diego@lab.local",
        role: "editor",
        dashboardId: "dash-seed-1",
      });
    });

    expect(result.current.members).toHaveLength(4);
    expect(result.current.members[0]).toEqual(member);
    expect(member.id).toBe("dash-seed-1_uid-diego");
    expect(member.role).toBe("editor");
    expect(Number.isNaN(Date.parse(member.invitedAt))).toBe(false);
  });

  it("updateMemberRole troca somente o papel", () => {
    const { result } = renderHook(() => useLab(), { wrapper });

    act(() => {
      result.current.updateMemberRole(
        "dash-seed-2_local-carla@unicap.br",
        "admin",
      );
    });

    const member = result.current.members.find(
      (m) => m.id === "dash-seed-2_local-carla@unicap.br",
    )!;
    expect(member.role).toBe("admin");
    expect(member.name).toBe("Carla Dias");
    // Papéis dos demais não mudam.
    expect(
      result.current.members.find(
        (m) => m.id === "dash-seed-1_local-bruno@unicap.br",
      )!.role,
    ).toBe("editor");
  });

  it("removeMember remove apenas o membro indicado", () => {
    const { result } = renderHook(() => useLab(), { wrapper });

    act(() => {
      result.current.removeMember("dash-seed-1_local-bruno@unicap.br");
    });

    expect(result.current.members).toHaveLength(2);
    expect(
      result.current.members.some(
        (m) => m.id === "dash-seed-1_local-bruno@unicap.br",
      ),
    ).toBe(false);
  });

  it("useLab fora do provider lança erro claro", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useLab())).toThrow(
      "useLab must be used within LabProvider",
    );
    spy.mockRestore();
  });
});
