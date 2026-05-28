type Props = {
  size?: number;
  className?: string;
};

function Arm({ transform, path }: { transform: string; path: string }) {
  return (
    <g transform={transform}>
      <path d={path} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

export default function VegvisirSigil({ size = 32, className = '' }: Props) {
  return (
    <svg
      viewBox="0 0 400 400"
      aria-hidden="true"
      className={className}
      style={{ width: size, height: size }}
    >
      <Arm transform="translate(200 200)" path="M 0 -118 L 0 -24 M 0 -118 L -18 -136 M 0 -118 L 18 -136 M 0 -82 L -16 -96" />
      <Arm transform="translate(200 200) rotate(45)" path="M 0 -118 L 0 -24 M 0 -118 L -16 -134 M 0 -118 L 18 -128 M 0 -74 L 16 -90" />
      <Arm transform="translate(200 200) rotate(90)" path="M 0 -118 L 0 -24 M 0 -118 L -20 -132 M 0 -118 L 14 -138 M 0 -76 L -18 -88" />
      <Arm transform="translate(200 200) rotate(135)" path="M 0 -118 L 0 -24 M 0 -118 L -14 -136 M 0 -118 L 20 -130 M 0 -82 L 18 -96" />
      <Arm transform="translate(200 200) rotate(180)" path="M 0 -118 L 0 -24 M 0 -118 L -18 -136 M 0 -118 L 18 -136 M 0 -84 L 0 -98" />
      <Arm transform="translate(200 200) rotate(225)" path="M 0 -118 L 0 -24 M 0 -118 L -14 -130 M 0 -118 L 20 -138 M 0 -82 L -16 -96" />
      <Arm transform="translate(200 200) rotate(270)" path="M 0 -118 L 0 -24 M 0 -118 L -18 -132 M 0 -118 L 18 -140 M 0 -74 L 18 -90" />
      <Arm transform="translate(200 200) rotate(315)" path="M 0 -118 L 0 -24 M 0 -118 L -20 -130 M 0 -118 L 14 -136 M 0 -84 L -18 -98" />
      <circle cx="200" cy="200" r="12" fill="currentColor" opacity="0.9" />
    </svg>
  );
}
