/* The four-point star that marks the one AI-backed thing on this site. One
   definition, used by the tab strip, the launcher and the chat itself, so the
   mark never drifts between them. Its glow is CSS (.ask-star), so it follows
   the theme and stops under reduced motion. */
export default function Sparkle({ className }: { className?: string }) {
  return (
    <svg className={`ask-star${className ? " " + className : ""}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 1.6l2.1 6.6a4 4 0 0 0 2.6 2.6l6.6 2.1-6.6 2.1a4 4 0 0 0-2.6 2.6L12 24.2l-2.1-6.6a4 4 0 0 0-2.6-2.6L.7 12.9l6.6-2.1a4 4 0 0 0 2.6-2.6z" />
      <path className="ask-star-sm" d="M19.2 1.2l.7 2.1a1.4 1.4 0 0 0 .9.9l2.1.7-2.1.7a1.4 1.4 0 0 0-.9.9l-.7 2.1-.7-2.1a1.4 1.4 0 0 0-.9-.9l-2.1-.7 2.1-.7a1.4 1.4 0 0 0 .9-.9z" />
    </svg>
  );
}
