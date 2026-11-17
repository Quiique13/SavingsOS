type OverviewArtworkProps = {
  variant: "flow" | "signal-studio";
  className: string;
};

/** Decorative geometry, separate from the actual payment-progress charts. */
export function OverviewArtwork({ variant, className }: OverviewArtworkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 240 240"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {variant === "signal-studio" ? (
        <>
          <circle cx="120" cy="120" r="94" stroke="currentColor" strokeWidth="16" strokeDasharray="360 591" strokeLinecap="round" transform="rotate(-145 120 120)" />
          <circle cx="120" cy="120" r="65" stroke="var(--studio-chart-secondary)" strokeWidth="12" strokeDasharray="220 409" strokeLinecap="round" transform="rotate(20 120 120)" />
        </>
      ) : (
        <>
          <circle cx="120" cy="120" r="90" stroke="currentColor" strokeWidth="18" opacity=".25" />
          <circle cx="120" cy="120" r="90" stroke="currentColor" strokeWidth="18" strokeDasharray="330 566" strokeLinecap="round" transform="rotate(-110 120 120)" />
          <circle cx="120" cy="120" r="60" stroke="currentColor" strokeWidth="8" strokeDasharray="160 377" strokeLinecap="round" transform="rotate(25 120 120)" />
        </>
      )}
    </svg>
  );
}
