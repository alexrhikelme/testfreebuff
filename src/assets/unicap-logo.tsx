/**
 * D4 — Logo oficial UNICAP em vetor (SVG), recriada a partir da arte
 * enviada: pomba dourada voando para a direita + wordmark UNICAP.
 *
 * Vantagens sobre o PNG: nitidez em qualquer tamanho, fundo transparente
 * e possibilidade de herdar a cor via currentColor.
 */

export function UnicapDoveMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Pomba UNICAP"
    >
      <defs>
        <linearGradient
          id="unicap-gold"
          x1="0"
          y1="0"
          x2="120"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#dfb878" />
          <stop offset="0.55" stopColor="#c8944a" />
          <stop offset="1" stopColor="#8f6a2f" />
        </linearGradient>
      </defs>

      {/* Asa superior */}
      <path
        d="M8 38 C28 8, 66 2, 96 16 C82 18, 72 24, 66 34 C56 28, 34 30, 8 38 Z"
        fill="url(#unicap-gold)"
      />
      {/* Corpo + cabeça */}
      <path
        d="M66 34 C78 40, 92 44, 104 42 C112 40.5, 117 46, 113 52 C110 57, 102 60, 94 58 C86 56, 78 50, 70 46 C64 43, 62 38, 66 34 Z"
        fill="url(#unicap-gold)"
      />
      {/* Asa inferior */}
      <path
        d="M30 52 C46 48, 62 52, 72 62 C62 64, 54 70, 50 80 C42 70, 34 60, 30 52 Z"
        fill="url(#unicap-gold)"
      />
      {/* Cauda */}
      <path
        d="M28 54 L8 76 L22 78 L40 60 Z"
        fill="url(#unicap-gold)"
      />
      {/* Olho */}
      <circle cx="106" cy="46" r="2" fill="#0b132b" />
    </svg>
  );
}

export function UnicapWordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 340 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="UNICAP"
    >
      <text
        x="0"
        y="46"
        fill="#c8944a"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="52"
        letterSpacing="6"
      >
        UNICAP
      </text>
    </svg>
  );
}

/**
 * Lockup horizontal completo: wordmark à esquerda + pomba à direita,
 * na proporção da arte oficial.
 */
export function UnicapLogoLockup({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <UnicapWordmark className="h-[0.62em] w-auto" />
      <UnicapDoveMark className="h-[0.78em] w-auto" />
    </span>
  );
}
