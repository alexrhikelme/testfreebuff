import { Link } from "react-router-dom";
import { UnicapDoveMark } from "@/assets/unicap-logo";

type LogoSize = "sm" | "md" | "lg" | "xl";

type LogoProps = {
  size?: LogoSize;
  withText?: boolean;
  withTagline?: boolean;
  to?: string;
};

const MARK_BOX: Record<LogoSize, string> = {
  sm: "h-5",
  md: "h-7",
  lg: "h-10",
  xl: "h-16",
};

const NAME_SIZES: Record<LogoSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-3xl",
};

const TAGLINE_SIZES: Record<LogoSize, string> = {
  sm: "hidden",
  md: "hidden",
  lg: "text-[10px]",
  xl: "text-xs",
};

/**
 * D4 — Logo oficial UNICAP em vetor: wordmark à esquerda + pomba dourada
 * voando à direita (disposição da arte oficial), sem fundo e nítida em
 * qualquer tamanho. A cor dourada vem do gradiente da arte (#c8944a).
 */
export function Logo({
  size = "md",
  withText = true,
  withTagline = false,
  to,
}: LogoProps) {
  const mark = (
    <UnicapDoveMark
      className={`${MARK_BOX[size]} w-auto shrink-0 select-none`}
    />
  );

  const text = withText ? (
    <span className="flex flex-col leading-none">
      <span
        className={
          "font-display font-extrabold uppercase tracking-[0.22em] text-glow-gold " +
          NAME_SIZES[size]
        }
      >
        UNICAP
      </span>
      {withTagline ? (
        <span
          className={
            "mt-1.5 font-medium text-on-surface-variant/80 " + TAGLINE_SIZES[size]
          }
        >
          Agência de Soluções Interativas
        </span>
      ) : null}
    </span>
  ) : null;

  const inner = (
    <span className="inline-flex items-center gap-2">
      {text}
      {mark}
    </span>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="inline-flex items-center transition hover:opacity-90"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
