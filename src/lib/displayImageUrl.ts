export function displayImageUrl(source: string): string {
  if (!import.meta.env.DEV) return source;

  try {
    const url = new URL(source);
    if (url.hostname === 'res.cloudinary.com') {
      return `/__cloudinary${url.pathname}${url.search}`;
    }
  } catch {
    // Local assets and unfinished admin form values can pass through unchanged.
  }

  return source;
}
