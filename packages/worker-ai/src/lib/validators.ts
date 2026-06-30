export function hasTwoSentences(value: string): boolean {
  return countSentences(value) === 2;
}

export function countSentences(value: string): number {
  return value
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isBoundedString(minLength = 1, maxLength = 2000) {
  return (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length >= minLength && value.trim().length <= maxLength;
}
