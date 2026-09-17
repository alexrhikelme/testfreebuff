import { Link } from "react-router-dom";

type LogoSize = "sm" | "md" | "lg" | "xl";

type LogoProps = {
  size?: LogoSize;
  withText?: boolean;
  withTagline?: boolean;
  to?: string;
};

const ICON_BOX: Record<LogoSize, string> = {
  sm: "h-7 w-7",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
};

const NAME_SIZES: Record<LogoSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-3xl",
};

const SUB_SIZES: Record<LogoSize, string> = {
  sm: "text-[7px]",
  md: "text-[10px]",
  lg: "text-xs",
  xl: "text-sm",
};

const TAGLINE_SIZES: Record<LogoSize, string> = {
  sm: "hidden",
  md: "hidden",
  lg: "text-[10px]",
  xl: "text-xs",
};

/**
 * Mandala Combogó — recriação vetorial fiel da logo oficial:
 * 8 pétalas radiais, anel central, 4 diamantes, arcos de borda e quarter-discs nos cantos.
 */
const PETAL_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const DIAMOND_ANGLES = [67.5, 112.5, 247.5, 292.5];
const QUARTER_ANGLES = [0, 90, 180, 270];

export function MandalaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Combogó Unicap">
      <rect width="100" height="100" rx="6" fill="var(--color-brand, #E85D04)" />
      <g fill="#FFFFFF">
        {QUARTER_ANGLES.map((a) => (
          <path
            key={`corner-${a}`}
            d="M4 4 L26 4 A22 22 0 0 1 4 26 Z"
            transform={`rotate(${a} 50 50)`}
          />
        ))}
        {QUARTER_ANGLES.map((a) => (
          <g key={`edge-${a}`} transform={`rotate(${a} 50 50)`}>
            <path d="M28 2 L46 2 Q37 24 28 2 Z" />
            <path d="M54 2 L72 2 Q63 24 54 2 Z" />
          </g>
        ))}
        {PETAL_ANGLES.map((a) => (
          <path
            key={`petal-${a}`}
            d="M63 50 C68 39 82 41 88.5 50 C82 59 68 61 63 50 Z"
            transform={`rotate(${a} 50 50)`}
          />
        ))}
        {DIAMOND_ANGLES.map((a) => {
          const rad = (a * Math.PI) / 180;
          const cx = +(50 + 17.5 * Math.cos(rad)).toFixed(2);
          const cy = +(50 - 17.5 * Math.sin(rad)).toFixed(2);
          const d = 3.4;
          return (
            <path
              key={`diamond-${a}`}
              d={`M${cx} ${cy - d} L${cx + d} ${cy} L${cx} ${cy + d} L${cx - d} ${cy} Z`}
            />
          );
        })}
      </g>
      <circle cx="50" cy="50" r="10" fill="none" stroke="#FFFFFF" strokeWidth="6.5" />
    </svg>
  );
}

export function Logo({ size = "md", withText = true, withTagline = false, to }: LogoProps) {
  const icon = <MandalaMark className={ICON_BOX[size] + " shrink-0 rounded-lg shadow-md shadow-brand/30"} />;

  const text = withText ? (
    <span className="flex flex-col leading-none">
      <span
        className={
          "font-display font-extrabold tracking-tight text-on-surface " + NAME_SIZES[size]
        }
      >
        COMBOGÓ
      </span>
      <span
        className={
          "mt-1 font-semibold uppercase tracking-[0.35em] text-on-surface-variant " +
          SUB_SIZES[size]
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
    <span className="inline-flex items-center gap-3">
      {icon}
      {text}
    </span>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex items-center transition hover:opacity-90">
        {inner}
      </Link>
    );
  }
  return inner;
}
