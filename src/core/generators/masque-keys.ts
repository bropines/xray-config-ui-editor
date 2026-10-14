/**
 * The ECDSA P-256 key a WARP-over-MASQUE client authenticates with.
 *
 * Cloudflare enrols the public half against the device (`key_type:
 * "secp256r1"`), and the client presents a self-signed certificate made from
 * the private half on every connection. Xray builds that certificate itself
 * from `masqueSettings.warp.privateKey` (v26.10.10:transport/internet/masque/
 * warp.go:20-45), which it takes as PEM or standard base64 of PKCS #8 or SEC 1
 * DER, P-256 only (v26.10.10:infra/conf/transport_method.go:914-958).
 *
 * Made with WebCrypto, in the browser: the private key never leaves the page.
 */

const base64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
    return btoa(binary);
};

export interface MasqueKeyPair {
    /** Standard base64 of the PKCS #8 DER private key — what `warp.privateKey` takes. */
    privateKey: string;
    /** Standard base64 of the SubjectPublicKeyInfo DER — what the enrolment sends as `key`. */
    publicKey: string;
}

export const generateMasqueKeyPair = async (): Promise<MasqueKeyPair> => {
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const [pkcs8, spki] = await Promise.all([
        crypto.subtle.exportKey('pkcs8', pair.privateKey),
        crypto.subtle.exportKey('spki', pair.publicKey),
    ]);
    return { privateKey: base64(pkcs8), publicKey: base64(spki) };
};

/** PEM armour around standard base64 DER, wrapped at 64 columns. */
export const toPem = (label: string, der: string): string =>
    `-----BEGIN ${label}-----\n${der.match(/.{1,64}/g)?.join('\n') ?? ''}\n-----END ${label}-----`;

/** The base64 body of a PEM block, or the input unchanged when it is not PEM. */
export const fromPem = (text: string): string => {
    const match = /-----BEGIN [^-]+-----([\s\S]*?)-----END [^-]+-----/.exec(text);
    return match ? match[1]!.replace(/\s+/g, '') : text.trim();
};
