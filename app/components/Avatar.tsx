// Vercel-style deterministic gradient avatar.
// Hash a seed string into a stable color pair + angle.

const PALETTES: [string, string][] = [
  ["#FF0080", "#7928CA"],
  ["#FF4D4D", "#F9CB28"],
  ["#00DFD8", "#007CF0"],
  ["#7928CA", "#FF0080"],
  ["#FF4D4D", "#7928CA"],
  ["#0070F3", "#00DFD8"],
  ["#F5A623", "#F8E71C"],
  ["#50E3C2", "#0070F3"],
  ["#FF0080", "#FF4D4D"],
  ["#9333EA", "#EC4899"],
  ["#10B981", "#3B82F6"],
  ["#F59E0B", "#EF4444"],
];

function hash(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function Avatar({
  seed,
  size = 28,
  label,
  className = "",
}: {
  seed: string;
  size?: number;
  label?: string;
  className?: string;
}) {
  const h = hash(seed);
  const [a, b] = PALETTES[h % PALETTES.length];
  const angle = (h % 360);
  const initials = (label ?? seed)
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full text-foreground ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(${angle}deg, ${a}, ${b})`,
        fontSize: Math.max(9, Math.round(size * 0.36)),
        fontWeight: 600,
        letterSpacing: 0.2,
      }}
    >
      {initials}
    </div>
  );
}
