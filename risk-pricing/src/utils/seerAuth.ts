export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

// 60s margin so a token that is about to expire isn't used for a
// request that would land after expiry.
const EXPIRY_MARGIN_MS = 60_000;

export function isTokenExpired(token: string): boolean {
  try {
    const [, payload] = token.split(".");
    const decodedPayload = JSON.parse(atob(payload));
    return Date.now() + EXPIRY_MARGIN_MS > decodedPayload.exp * 1000;
  } catch {
    return true;
  }
}

export async function fetchSeerAuth<T>(
  token: string,
  fn: "sign-in" | "me" | "collections",
  method: "GET" | "POST",
  body?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`/api/seer/${fn}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    throw new UnauthorizedError();
  }
  if (!response.ok) {
    throw new Error(`Request to ${fn} failed: ${response.status}`);
  }
  return response.json();
}
