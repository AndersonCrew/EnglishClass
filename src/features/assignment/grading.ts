export function normalizeText(value: string, caseSensitive = false) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return caseSensitive ? normalized : normalized.toLocaleLowerCase("vi");
}

export function gradeFillBlank(answer: string, accepted: string[], caseSensitive = false) {
  const actual = normalizeText(answer, caseSensitive);
  return accepted.some((item) => normalizeText(item, caseSensitive) === actual);
}

export function gradeExactAnswer(answer: Record<string, unknown>, key: Record<string, unknown>) {
  return JSON.stringify(answer) === JSON.stringify(key);
}
