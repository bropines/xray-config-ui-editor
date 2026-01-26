import { generateKeyPair } from '@stablelib/x25519';
import { randomBytes } from '@stablelib/random';

// Хелпер: Uint8Array -> Base64 URL-Safe String
// Xray использует этот формат (без padding "=" в конце)
const toBase64Url = (arr: Uint8Array): string => {
    return btoa(String.fromCharCode(...arr))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

export const generateX25519Keys = () => {
    // Генерируем пару ключей для Curve25519 (X25519), используя безопасный рандом
    const pair = generateKeyPair(randomBytes);

    return {
        privateKey: toBase64Url(pair.secretKey),
        publicKey: toBase64Url(pair.publicKey)
    };
};