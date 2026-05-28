type Ring = {
  label: string;
  value: number;
  max: number;
  color: string;
};

type ActivityRingsProps = {
  rings: Ring[];
  size?: number;
  strokeWidth?: number;
  gap?: number;
};

export function ActivityRings({
  rings,
  size = 180,
  strokeWidth = 14,
  gap = 4,
}: ActivityRingsProps) {
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map((ring, i) => {
        const r = size / 2 - strokeWidth / 2 - i * (strokeWidth + gap);
        const c = 2 * Math.PI * r;
        const pct = Math.min(1, ring.value / ring.max);
        const dash = c * pct;
        return (
          <g key={ring.label} transform={`rotate(-90 ${cx} ${cy})`}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={ring.color} strokeWidth={strokeWidth} strokeOpacity="0.15" />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={ring.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c - dash}`}
              style={{
                transition: 'stroke-dasharray 600ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}
