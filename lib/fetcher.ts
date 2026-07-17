/** SWR fetcher with normalized error handling. */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const error = new Error(body?.error ?? `Request failed (${res.status})`) as Error & {
      status?: number;
    };
    error.status = res.status;
    throw error;
  }
  return res.json();
}
