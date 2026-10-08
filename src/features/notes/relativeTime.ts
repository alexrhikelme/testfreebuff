/** Formats an ISO timestamp as relative time in pt-BR ("há 5 min"). */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = now.getTime() - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} dia${days === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30);
  return `há ${months} ${months === 1 ? "mês" : "meses"}`;
}

/**
 * Sprint 6: considera a nota "recentemente alterada" quando a última edição
 * foi feita há menos de N segundos — base para o pulso visual de colaboração.
 */
export const RECENT_WINDOW_MS = 12_000;

export function isRecentlyUpdated(iso: string, now: Date = new Date()): boolean {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return false;
  const diff = now.getTime() - then;
  return diff >= 0 && diff < RECENT_WINDOW_MS;
}
