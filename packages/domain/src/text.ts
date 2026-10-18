export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(value: string): Set<string> {
  const normalized = normalizeText(value);
  if (normalized.length === 0) {
    return new Set();
  }

  return new Set(normalized.split(" ").filter((token) => token.length > 1));
}

export function tokenOverlapScore(left: string, right: string): number {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(leftTokens.size, rightTokens.size);
}

export function hasAnyTextMatch(haystack: string, needles: string[]): boolean {
  const normalizedHaystack = normalizeText(haystack);
  return needles.some((needle) => normalizedHaystack.includes(normalizeText(needle)));
}

export function countMatches(values: string[], candidates: string[]): number {
  const normalizedValues = new Set(values.map(normalizeText));
  return candidates.filter((candidate) => normalizedValues.has(normalizeText(candidate))).length;
}

