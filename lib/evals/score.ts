export type KeywordScore = {
  passed: boolean;
  matched: string[];
  missing: string[];
};

/** Case-insensitive substring check for each expected keyword. */
export function scoreKeywords(
  answer: string,
  expectedKeywords: string[]
): KeywordScore {
  const haystack = answer.toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];

  for (const raw of expectedKeywords) {
    const kw = raw.trim();
    if (!kw) continue;
    if (haystack.includes(kw.toLowerCase())) matched.push(kw);
    else missing.push(kw);
  }

  // Pass if every keyword matched, or at least half when ≥2 keywords
  const total = matched.length + missing.length;
  const passed =
    total === 0
      ? Boolean(answer.trim())
      : missing.length === 0 || matched.length >= Math.ceil(total / 2);

  return { passed, matched, missing };
}
