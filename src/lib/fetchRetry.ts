const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);

      if (res.status === 429 || res.status === 529 || res.status === 503) {
        const retryAfter = res.headers.get("retry-after");
        const delay = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : BASE_DELAY_MS * Math.pow(2, attempt);

        if (attempt < retries) {
          console.warn(`[fetchRetry] ${res.status} on ${url}, retry ${attempt + 1}/${retries} in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }

      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[fetchRetry] Network error on ${url}, retry ${attempt + 1}/${retries} in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error(`Failed after ${retries} retries: ${url}`);
}
