'use client';

export default function AnimatedRaven() {
  return (
    <div
      className="absolute right-10 top-8 z-20 cursor-pointer select-none"
      title="Hugin — the thought-raven"
      aria-label="Raven guardian"
    >
      <svg
        viewBox="0 0 120 120"
        width={90}
        height={90}
        xmlns="http://www.w3.org/2000/svg"
        className="raven-idle drop-shadow-[0_0_12px_oklch(75%_0.13_80_/_0.35)]"
        aria-hidden="true"
      >
        {/* body */}
        <path
          d="M60 72 C48 72 38 65 34 56 C30 47 32 36 40 30 C46 24 54 22 60 24 C66 22 74 24 80 30 C88 36 90 47 86 56 C82 65 72 72 60 72Z"
          fill="oklch(18% 0.006 250)"
          stroke="oklch(75% 0.13 80 / 0.6)"
          strokeWidth="0.8"
        />
        {/* head */}
        <ellipse
          cx="60"
          cy="26"
          rx="11"
          ry="10"
          fill="oklch(16% 0.005 250)"
          stroke="oklch(75% 0.13 80 / 0.5)"
          strokeWidth="0.8"
        />
        {/* beak */}
        <path
          d="M68 24 L78 28 L68 30Z"
          fill="oklch(55% 0.08 80)"
        />
        {/* eye — glowing gold */}
        <circle cx="64" cy="24" r="2.5" fill="oklch(75% 0.18 80)" className="raven-eye" />
        <circle cx="64" cy="24" r="1.2" fill="oklch(92% 0.05 80)" />

        {/* left wing */}
        <path
          className="raven-wing-left origin-[60px_55px]"
          d="M60 55 C52 52 42 54 32 62 C28 65 26 70 30 72 C40 68 50 62 60 62Z"
          fill="oklch(22% 0.008 250)"
          stroke="oklch(75% 0.13 80 / 0.25)"
          strokeWidth="0.6"
        />
        {/* right wing */}
        <path
          className="raven-wing-right origin-[60px_55px]"
          d="M60 55 C68 52 78 54 88 62 C92 65 94 70 90 72 C80 68 70 62 60 62Z"
          fill="oklch(22% 0.008 250)"
          stroke="oklch(75% 0.13 80 / 0.25)"
          strokeWidth="0.6"
        />

        {/* tail feathers */}
        <path
          d="M52 70 C50 78 48 86 44 90 M60 72 C60 80 60 88 60 93 M68 70 C70 78 72 86 76 90"
          stroke="oklch(30% 0.01 250)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* perch feet */}
        <path
          d="M52 91 L48 98 M52 91 L52 98 M52 91 L56 97"
          stroke="oklch(45% 0.05 80)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M68 91 L64 98 M68 91 L68 98 M68 91 L72 97"
          stroke="oklch(45% 0.05 80)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* subtle wing sheen */}
        <path
          d="M38 64 C42 60 48 57 55 56"
          stroke="oklch(75% 0.13 80 / 0.15)"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M82 64 C78 60 72 57 65 56"
          stroke="oklch(75% 0.13 80 / 0.15)"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
