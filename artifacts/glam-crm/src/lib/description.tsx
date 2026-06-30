/**
 * Renders a service description with proper formatting.
 * Lines starting with "- " or "• " are rendered as a bullet list.
 * Multi-line text that isn't all bullets is rendered with whitespace preserved.
 * Single-line text is rendered inline.
 */
export function renderDescription(
  text: string | null | undefined,
  className = "",
): React.ReactNode {
  if (!text?.trim()) return null;

  const lines = text.split("\n").map((l) => l.trimEnd()).filter((l) => l.length > 0);
  if (lines.length === 0) return null;

  const parsed = lines.map((l) => ({
    isBullet: /^[-•]\s+/.test(l.trim()),
    text: l.trim().replace(/^[-•]\s+/, ""),
  }));

  if (lines.length === 1) {
    return <span className={className}>{parsed[0].text}</span>;
  }

  if (parsed.every((l) => l.isBullet)) {
    return (
      <ul className={`list-disc list-inside space-y-0.5 ${className}`}>
        {parsed.map((l, i) => <li key={i}>{l.text}</li>)}
      </ul>
    );
  }

  return <span className={`whitespace-pre-wrap ${className}`}>{text.trim()}</span>;
}
