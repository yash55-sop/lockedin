export function parsePanelCookies(layout?: string, collapsed?: string) {
  let defaultLayout = [16, 84];
  let defaultCollapsed = false;
  try {
    const parsed: unknown = layout ? JSON.parse(layout) : null;
    if (Array.isArray(parsed) && parsed.length === 2) {
      const sizes = parsed.filter(
        (n): n is number =>
          typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100
      );
      if (sizes.length === 2 && Math.abs(sizes[0] + sizes[1] - 100) < 0.1)
        defaultLayout = sizes;
    }
  } catch {
    /* Ignore malformed browser preferences. */
  }
  try {
    const parsed: unknown = collapsed ? JSON.parse(collapsed) : null;
    if (typeof parsed === "boolean") defaultCollapsed = parsed;
  } catch {
    /* Ignore malformed browser preferences. */
  }
  return { defaultLayout, defaultCollapsed };
}
