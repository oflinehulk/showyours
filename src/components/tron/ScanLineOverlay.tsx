export function ScanLineOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60]"
      style={{
        background: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(255, 69, 0, 0.008) 2px,
          rgba(255, 69, 0, 0.008) 4px
        )`,
      }}
      aria-hidden="true"
    />
  );
}
