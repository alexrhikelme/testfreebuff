const MONTHS_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

/** Formata "YYYY-MM-DD" como "28 Out" (dia + mês curto, estilo do board). */
export function formatDayMonth(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  if (!m || !d) return iso;
  return `${d} ${MONTHS_SHORT[m - 1] ?? ""}`.trim();
}

/** Período curto dos cartões: "20 Out – 25 Out", "25 Out" ou "Sem prazo". */
export function formatPeriodShort(
  startDate?: string,
  dueDate?: string
): string {
  if (startDate && dueDate)
    return `${formatDayMonth(startDate)} – ${formatDayMonth(dueDate)}`;
  if (dueDate) return formatDayMonth(dueDate);
  if (startDate) return `Início ${formatDayMonth(startDate)}`;
  return "Sem prazo";
}

/** Hash estável de string — base para cores e códigos determinísticos. */
export function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Código curto do cartão ("#SPR-188") derivado do id da nota. */
export function noteCode(id: string): string {
  return `#SPR-${(hashString(id) % 900) + 100}`;
}

/** Iniciais do responsável para o avatar ("Ana Costa" → "AC"). */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_CLASSES = [
  "border-brand/40 bg-brand/20 text-orange-300",
  "border-sky-500/40 bg-sky-500/20 text-sky-300",
  "border-emerald-500/40 bg-emerald-500/20 text-emerald-300",
  "border-violet-500/40 bg-violet-500/20 text-violet-300",
  "border-amber-500/40 bg-amber-500/20 text-amber-300",
  "border-rose-500/40 bg-rose-500/20 text-rose-300",
] as const;

/** Classe de avatar determinística por nome (paleta do tema escuro). */
export function avatarClasses(name: string): string {
  return AVATAR_CLASSES[hashString(name) % AVATAR_CLASSES.length];
}

const TAG_CLASSES = [
  "border-brand/40 bg-brand/15 text-brand-glow",
  "border-error/40 bg-error/15 text-red-300",
  "border-tertiary/40 bg-tertiary/15 text-emerald-300",
  "border-sky-500/40 bg-sky-500/15 text-sky-300",
  "border-violet-500/40 bg-violet-500/15 text-violet-300",
  "border-warning/40 bg-warning/15 text-amber-300",
] as const;

/** Cor de tag determinística — cartões com tags multimarcas como no board. */
export function tagClasses(tag: string): string {
  return TAG_CLASSES[hashString(tag) % TAG_CLASSES.length];
}

/** Formats an ISO date string as pt-BR short date; falls back to the raw value. */
export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
      new Date(iso)
    );
  } catch {
    return iso;
  }
}
