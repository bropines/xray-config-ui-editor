import nacl from 'tweetnacl';

/**
 * Generates a v4 UUID using native crypto when available.
 */
export const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

/**
 * Generates a random hex string of given length.
 * Used for XHTTP shortId and similar fields.
 */
export const generateShortId = (length = 8): string => {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Generates a Reality X25519 key pair (url-safe base64, no padding).
 */
export const generateRealityKeyPair = (): { privateKey: string; publicKey: string } => {
    const keypair = nacl.box.keyPair();
    const encode = (bytes: Uint8Array) =>
        btoa(String.fromCharCode(...bytes))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    return {
        privateKey: encode(keypair.secretKey),
        publicKey: encode(keypair.publicKey),
    };
};

const b64urlDecode = (value: string): Uint8Array => {
    const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, c => c.charCodeAt(0));
};

const b64urlEncode = (bytes: Uint8Array): string =>
    btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

/**
 * Derive a REALITY public key from its private key (X25519 base point
 * multiplication) — the same relationship `xray x25519` prints as a pair.
 *
 * A server inbound stores only the private half; a client needs the public
 * half. Deriving it is what lets a client outbound be built from a server
 * config instead of asking the user to copy a key they may not have.
 *
 * Returns null for input that is not a 32-byte url-safe base64 key, since the
 * alternative is silently emitting a key that cannot work.
 */
export const publicKeyFromPrivateKey = (privateKey: string): string | null => {
    if (!privateKey || typeof privateKey !== 'string') return null;
    try {
        const bytes = b64urlDecode(privateKey.trim());
        if (bytes.length !== 32) return null;
        return b64urlEncode(nacl.scalarMult.base(bytes));
    } catch {
        return null;
    }
};

/**
 * Alias kept for call sites that historically imported this name from the
 * now-removed `utils/crypto.ts` duplicate. Functionally identical to
 * generateRealityKeyPair — same X25519 keypair, same encoding.
 */
export const generateX25519Keys = generateRealityKeyPair;

/**
 * Generates a random Reality spiderX path.
 * Usually a / followed by 4-8 random chars.
 */
export const generateRealitySpiderX = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '/';
    const len = 4 + Math.floor(Math.random() * 5);
    for (let i = 0; i < len; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Generates a list of Reality shortIds.
 */
export const generateRealityShortIds = (count = 1): string[] => {
    return Array.from({ length: count }, () => generateShortId(Math.random() > 0.5 ? 8 : 16));
};
