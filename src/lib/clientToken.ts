const KEY = 'poker_client_token';

export function getClientToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  let token = localStorage.getItem(KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(KEY, token);
  }
  return token;
}
