// Логотип-фонарик. Лучи анимируются классами .beam-* из globals.css.
export default function FlashlightIcon({ width = 24, height = 16, className = '' }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 16"
      fill="none"
      aria-hidden="true"
      className={`text-brand shrink-0 ${className}`}
    >
      <rect x="2" y="5" width="8" height="6" rx="1.4" fill="currentColor" />
      <rect x="10" y="4" width="3" height="8" rx="0.6" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <line className="beam beam-top"    x1="14" y1="7" x2="20.4" y2="3.4"  />
        <line className="beam beam-center" x1="14" y1="8" x2="22"   y2="8"    />
        <line className="beam beam-bottom" x1="14" y1="9" x2="20.4" y2="12.6" />
      </g>
    </svg>
  );
}
