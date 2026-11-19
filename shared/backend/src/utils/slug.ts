/** URL-safe slug helpers. Slugs are the public identity of stores and products. */

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/**
 * Returns `base`, or `base-2`, `base-3`… until the predicate reports the slug is free.
 * Bounded to 25 attempts so a pathological table cannot spin forever.
 */
export async function uniqueSlug(base: string, isTaken: (candidate: string) => Promise<boolean>): Promise<string> {
  const safeBase = slugify(base) || 'item';
  let candidate = safeBase;
  for (let attempt = 2; attempt <= 25; attempt += 1) {
    if (!(await isTaken(candidate))) return candidate;
    candidate = `${safeBase}-${attempt}`;
  }
  return `${safeBase}-${Date.now().toString(36)}`;
}
