import nacl from 'tweetnacl';

// Хелпер: Uint8Array -> Base64 URL-Safe String
// Xray использует этот формат (без padding "=" в конце)
const toBase64Url = (arr: Uint8Array): string => {
    return btoa(String.fromCharCode(...arr))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

export const generateX25519Keys = () => {
    // TweetNaCl box.keyPair генерирует ключи на кривой Curve25519 (X25519),
    // которая используется в REALITY.
    const keyPair = nacl.box.keyPair();

    return {
        privateKey: toBase64Url(keyPair.secretKey),
        publicKey: toBase64Url(keyPair.publicKey)
    };
};