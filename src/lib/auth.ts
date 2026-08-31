import { verifyMessage } from 'viem';

// In-memory nonce store (resets on server restart - acceptable for college project)
// In production, use Redis or DB-backed nonce store
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const MESSAGE_PREFIX = 'SmartEscrow Authentication';

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
    
    // Delete nonce after use (one-time use)
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

  const isValid = await verifyWalletSignature(address, signature, nonce);
  return isValid ? address.toLowerCase() : null;
}
