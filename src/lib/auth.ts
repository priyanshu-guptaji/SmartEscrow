import { verifyMessage } from 'viem';

// In-memory nonce store (resets on server restart - acceptable for college project)
// In production, use Redis or DB-backed nonce store
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

// In-memory session store for verified wallet sessions.
// Maintains active authentication for the duration of the session TTL without
// requiring users to sign repetitive wallet popups for every single API request.
interface WalletSession {
  address: string;
  signature: string;
  nonce: string;
  expiresAt: number;
}
const sessionStore = new Map<string, WalletSession>();

const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes (matches client cache window)
const MESSAGE_PREFIX = 'SmartEscrow Authentication';

function getSessionKey(address: string, nonce: string): string {
  return `${address.toLowerCase()}:${nonce}`;
}

export function generateNonce(address: string): string {
  const nonce = `0x${Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')}`;
  
  nonceStore.set(address.toLowerCase(), {
    nonce,
    expiresAt: Date.now() + NONCE_EXPIRY_MS,
  });
  
  return nonce;
}

export function getSignMessage(address: string, nonce: string): string {
  return `${MESSAGE_PREFIX}\n\nWallet: ${address}\nNonce: ${nonce}\n\nSign this message to authenticate with SmartEscrow.`;
}

export function createSession(address: string, signature: string, nonce: string): void {
  const normalizedAddress = address.toLowerCase();
  const sessionKey = getSessionKey(normalizedAddress, nonce);
  sessionStore.set(sessionKey, {
    address: normalizedAddress,
    signature,
    nonce,
    expiresAt: Date.now() + SESSION_EXPIRY_MS,
  });
}

export function getActiveSession(
  address: string,
  signature: string,
  nonce: string
): WalletSession | null {
  const normalizedAddress = address.toLowerCase();
  const sessionKey = getSessionKey(normalizedAddress, nonce);
  const session = sessionStore.get(sessionKey);
  if (!session) return null;

  // Reject expired sessions and clean up
  if (session.expiresAt < Date.now()) {
    sessionStore.delete(sessionKey);
    return null;
  }

  // Ensure address, signature, and nonce strictly match the authenticated session
  if (
    session.address !== normalizedAddress ||
    session.signature !== signature ||
    session.nonce !== nonce
  ) {
    return null;
  }

  return session;
}

export function clearSession(address: string, nonce?: string): void {
  const normalizedAddress = address.toLowerCase();
  if (nonce) {
    sessionStore.delete(getSessionKey(normalizedAddress, nonce));
  } else {
    for (const [key, session] of sessionStore.entries()) {
      if (session.address === normalizedAddress) {
        sessionStore.delete(key);
      }
    }
  }
}

export async function verifyWalletSignature(
  address: string,
  signature: string,
  nonce: string
): Promise<boolean> {
  try {
    // Verify nonce exists and hasn't expired
    const stored = nonceStore.get(address.toLowerCase());
    if (!stored) return false;
    if (stored.expiresAt < Date.now()) {
      nonceStore.delete(address.toLowerCase());
      return false;
    }
    if (stored.nonce !== nonce) return false;

    // Verify cryptographic signature
    const message = getSignMessage(address, nonce);
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    
    // Delete nonce after use (one-time use to prevent starting another session with same nonce)
    if (isValid) {
      nonceStore.delete(address.toLowerCase());
    }
    
    return isValid;
  } catch {
    return false;
  }
}

/**
 * Extract and verify wallet address from request headers.
 * Returns the verified address or null if verification fails.
 * 
 * Headers expected:
 *   X-Wallet-Address: 0x...
 *   X-Wallet-Signature: 0x... (signature of the nonce)
 *   X-Wallet-Nonce: 0x... (the nonce provided by /api/auth/nonce)
 */
export async function verifyRequestAuth(
  request: Request
): Promise<string | null> {
  const address = request.headers.get('X-Wallet-Address');
  const signature = request.headers.get('X-Wallet-Signature');
  const nonce = request.headers.get('X-Wallet-Nonce');

  if (!address || !signature || !nonce) return null;

  // Basic address format validation
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return null;

  // 1. Check if there is already an active, valid session for this wallet & nonce
  const activeSession = getActiveSession(address, signature, nonce);
  if (activeSession) {
    return activeSession.address;
  }

  // 2. No active session yet: perform initial cryptographic verification of the nonce signature
  const isValid = await verifyWalletSignature(address, signature, nonce);
  if (!isValid) return null;

  // 3. Signature verified: establish a session so subsequent requests from the same session succeed
  createSession(address, signature, nonce);

  return address.toLowerCase();
}
