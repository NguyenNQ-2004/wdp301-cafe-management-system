// sessionStorage is tab-scoped; retain the key after network failures/reloads.
// A changed payload gets a new key but stays in the same checkout session.
export function checkoutIdentity(owner: string, payload: unknown) {
  const storageKey = `aura-checkout:${owner}`;
  const signature = JSON.stringify(payload);
  let saved: { sessionId: string; signature: string; key: string } | null = null;
  try { saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch { /* replace malformed local state */ }
  const sessionId = saved?.sessionId || crypto.randomUUID();
  const key = saved?.signature === signature ? saved.key : crypto.randomUUID();
  sessionStorage.setItem(storageKey, JSON.stringify({ sessionId, signature, key }));
  return { checkoutSessionId: sessionId, idempotencyKey: key };
}
