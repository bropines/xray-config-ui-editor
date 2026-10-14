/**
 * The keys of `masqueSettings.warp`, read the way the core reads them.
 *
 * Both are strings in the config and DER underneath. The core decodes the text
 * (PEM, else standard base64), parses it with Go's crypto/x509, and refuses the
 * config when that fails — before anything is dialled:
 *
 *   decodeWarpKey         v26.10.10:infra/conf/transport_method.go:914-927
 *                         trims; empty is an error; the first PEM block of any
 *                         label wins; otherwise base64.StdEncoding (padding
 *                         required, line breaks ignored)
 *   parseWarpPublicKey    :929-938  x509.ParsePKIXPublicKey — a SubjectPublicKeyInfo
 *   parseWarpPrivateKey   :940-957  x509.ParsePKCS8PrivateKey, else
 *                         x509.ParseECPrivateKey (SEC 1), and the result must be
 *                         an ECDSA key on P-256
 *
 * A browser cannot ask Go, and WebCrypto is asynchronous where diagnostics are
 * not, so this reads the structure itself. It reports a key as bad only where
 * the structure is wrong in a way x509 refuses: a key that is the wrong kind
 * (RSA, Ed25519) or the wrong curve is called that. The checks Go makes deeper
 * than this — that a SEC 1 key's optional public half matches its private half —
 * are not repeated; a key can pass here and still be refused, never the reverse
 * (for the structures named above).
 */

export type WarpKeyFailure =
    /** Nothing but whitespace. */
    | 'empty'
    /** Neither a PEM block nor standard base64. */
    | 'encoding'
    /** Decodes, but is not a PKCS #8 or SEC 1 private key. */
    | 'private-format'
    /** A valid private key that is not ECDSA on P-256. */
    | 'curve'
    /** Decodes, but is not a PKIX public key. */
    | 'public-format';

// ── Text to bytes ─────────────────────────────────────────────────────

/**
 * pem.Decode: a BEGIN line, a body, and an END line of the same label that
 * starts its own line. Any label is taken — a public key pasted where the
 * private one belongs is a PEM block like any other, and fails later.
 */
const PEM_BLOCK = /(?:^|\n)-----BEGIN ([^\n]*?)-----[ \t]*\r?\n((?:[\s\S]*?\n)?)-----END \1-----/;

/** `base64.StdEncoding.DecodeString`: the alphabet, exact padding, and \r \n skipped. */
const decodeBase64 = (text: string): Uint8Array | null => {
    const clean = text.replace(/[\r\n]/g, '');
    if (clean.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) return null;
    try {
        const raw = atob(clean);
        return Uint8Array.from(raw, char => char.charCodeAt(0));
    } catch {
        return null;
    }
};

/** The DER of a key text, or why there is none. */
export const decodeWarpKey = (text: string): Uint8Array | 'empty' | 'encoding' => {
    const trimmed = text.trim();
    if (trimmed === '') return 'empty';
    const block = PEM_BLOCK.exec(trimmed);
    if (block) {
        // Header lines (`Key: value`) come first, the base64 after; pem.Decode
        // drops the spaces and tabs of the body and base64-decodes what is left.
        const lines = block[2]!.split(/\r?\n/).filter(line => !line.includes(':'));
        const body = decodeBase64(lines.join('').replace(/[ \t]/g, ''));
        if (body) return body;
    }
    return decodeBase64(trimmed) ?? 'encoding';
};

// ── DER ───────────────────────────────────────────────────────────────

interface Node {
    tag: number;
    value: Uint8Array;
    /** Offset just past this node. */
    end: number;
}

/** encoding/asn1: definite, minimal lengths only. */
const readNode = (bytes: Uint8Array, at: number): Node | null => {
    if (at + 2 > bytes.length) return null;
    const tag = bytes[at]!;
    let length = bytes[at + 1]!;
    let offset = at + 2;
    if (length & 0x80) {
        const count = length & 0x7f;
        if (count === 0 || count > 4 || offset + count > bytes.length || bytes[offset] === 0) return null;
        length = 0;
        for (let i = 0; i < count; i++) length = length * 256 + bytes[offset++]!;
        if (length < 0x80) return null;
    }
    if (offset + length > bytes.length) return null;
    return { tag, value: bytes.subarray(offset, offset + length), end: offset + length };
};

const SEQUENCE = 0x30;
const INTEGER = 0x02;
const OCTET_STRING = 0x04;
const BIT_STRING = 0x03;
const OID = 0x06;
/** `[0] EXPLICIT`, constructed, context class. */
const EXPLICIT_0 = 0xa0;

const children = (node: Node): Node[] | null => {
    const out: Node[] = [];
    for (let at = 0; at < node.value.length;) {
        const child = readNode(node.value, at);
        if (!child) return null;
        out.push(child);
        at = child.end;
    }
    return out;
};

const hex = (bytes: Uint8Array): string => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

// DER contents of the object identifiers x509 recognises here.
const OID_EC_PUBLIC_KEY = '2a8648ce3d0201'; // 1.2.840.10045.2.1
const OID_RSA = '2a864886f70d010101'; // 1.2.840.113549.1.1.1
const OID_ED25519 = '2b6570'; // 1.3.101.112
const OID_X25519 = '2b656e'; // 1.3.101.110
const OID_CURVES: Record<string, 'P-224' | 'P-256' | 'P-384' | 'P-521'> = {
    '2b81040021': 'P-224', // 1.3.132.0.33
    '2a8648ce3d030107': 'P-256', // 1.2.840.10045.3.1.7
    '2b81040022': 'P-384', // 1.3.132.0.34
    '2b81040023': 'P-521', // 1.3.132.0.35
};

// ── P-256 ─────────────────────────────────────────────────────────────

/** FIPS 186-4 D.1.2.3: the field prime, the order, and b in y² = x³ − 3x + b. */
const P256_P = 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn;
const P256_N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
const P256_B = 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn;

const bigint = (bytes: Uint8Array): bigint => (bytes.length ? BigInt(`0x${hex(bytes)}`) : 0n);

/** `elliptic.Unmarshal`: an uncompressed point (0x04 || X || Y) that lies on the curve. */
const p256Point = (point: Uint8Array): boolean => {
    if (point.length !== 65 || point[0] !== 0x04) return false;
    const x = bigint(point.subarray(1, 33));
    const y = bigint(point.subarray(33));
    if (x >= P256_P || y >= P256_P) return false;
    const left = (y * y) % P256_P;
    const right = (((x * x) % P256_P) * x - 3n * x + P256_B) % P256_P;
    return left === ((right + P256_P) % P256_P);
};

// ── Private keys ──────────────────────────────────────────────────────

/** The curve of an `ECPrivateKey` (SEC 1), when it parses as one for `named` or its own `[0]`. */
const sec1Curve = (der: Uint8Array, named?: string): 'P-224' | 'P-256' | 'P-384' | 'P-521' | null => {
    const outer = readNode(der, 0);
    if (!outer || outer.tag !== SEQUENCE) return null;
    const parts = children(outer);
    if (!parts || parts.length < 2) return null;
    const [version, key, ...optional] = parts as [Node, Node, ...Node[]];
    if (version.tag !== INTEGER || version.value.length !== 1 || version.value[0] !== 1) return null;
    if (key.tag !== OCTET_STRING) return null;

    let curveOid = named;
    const explicit = optional.find(node => node.tag === EXPLICIT_0);
    if (explicit) {
        const inner = readNode(explicit.value, 0);
        if (!inner || inner.tag !== OID) return null;
        curveOid = curveOid ?? hex(inner.value);
    }
    const curve = curveOid ? OID_CURVES[curveOid] : undefined;
    if (!curve) return null;

    // encoding/asn1 hands back the scalar as written; x509 drops leading zeros
    // beyond the curve's size and refuses a scalar of zero or one past the order.
    const size = curve === 'P-224' ? 28 : curve === 'P-256' ? 32 : curve === 'P-384' ? 48 : 66;
    let scalar = key.value;
    while (scalar.length > size) {
        if (scalar[0] !== 0) return null;
        scalar = scalar.subarray(1);
    }
    if (curve === 'P-256') {
        const k = bigint(scalar);
        if (k === 0n || k >= P256_N) return null;
    }
    return curve;
};

/**
 * What a decoded private key is to x509: `curve` when it parses but is not
 * ECDSA on P-256, `private-format` when it does not parse, null when it is
 * the key `parseWarpPrivateKey` accepts.
 */
const privateKeyFailure = (der: Uint8Array): WarpKeyFailure | null => {
    const outer = readNode(der, 0);
    if (outer && outer.tag === SEQUENCE) {
        const parts = children(outer);
        // PKCS #8: INTEGER version, AlgorithmIdentifier, OCTET STRING.
        if (parts && parts.length >= 3 && parts[0]!.tag === INTEGER && parts[1]!.tag === SEQUENCE && parts[2]!.tag === OCTET_STRING) {
            const algorithm = children(parts[1]!);
            const oid = algorithm?.[0];
            if (!algorithm || !oid || oid.tag !== OID) return 'private-format';
            const algorithmId = hex(oid.value);
            if (algorithmId === OID_EC_PUBLIC_KEY) {
                const curve = algorithm[1] && algorithm[1].tag === OID ? OID_CURVES[hex(algorithm[1].value)] : undefined;
                if (!curve) return 'private-format';
                if (!sec1Curve(parts[2]!.value, hex(algorithm[1]!.value))) return 'private-format';
                return curve === 'P-256' ? null : 'curve';
            }
            // RSA, Ed25519 and X25519 parse; they are simply not ECDSA.
            return [OID_RSA, OID_ED25519, OID_X25519].includes(algorithmId) ? 'curve' : 'private-format';
        }
        // SEC 1 ECPrivateKey, which has to name its own curve.
        const curve = sec1Curve(der);
        if (curve) return curve === 'P-256' ? null : 'curve';
    }
    return 'private-format';
};

/** Why `privateKey` is refused, or null when the core takes it. */
export const warpPrivateKeyFailure = (text: string): WarpKeyFailure | null => {
    const der = decodeWarpKey(text);
    if (typeof der === 'string') return der;
    return privateKeyFailure(der);
};

// ── Public keys ───────────────────────────────────────────────────────

const publicKeyFailure = (der: Uint8Array): WarpKeyFailure | null => {
    const outer = readNode(der, 0);
    // ParsePKIXPublicKey refuses trailing data after the structure.
    if (!outer || outer.tag !== SEQUENCE || outer.end !== der.length) return 'public-format';
    const parts = children(outer);
    if (!parts || parts.length !== 2 || parts[0]!.tag !== SEQUENCE || parts[1]!.tag !== BIT_STRING) return 'public-format';
    const algorithm = children(parts[0]!);
    const oid = algorithm?.[0];
    if (!algorithm || !oid || oid.tag !== OID) return 'public-format';
    // A BIT STRING starts with its count of unused bits; a key is whole bytes.
    const bits = parts[1]!.value;
    if (bits.length < 1 || bits[0] !== 0) return 'public-format';
    const key = bits.subarray(1);

    switch (hex(oid.value)) {
        case OID_EC_PUBLIC_KEY: {
            const curve = algorithm[1] && algorithm[1].tag === OID ? OID_CURVES[hex(algorithm[1].value)] : undefined;
            if (!curve) return 'public-format';
            if (curve === 'P-256') return p256Point(key) ? null : 'public-format';
            // The other curves: the point is checked by Go against the curve,
            // which is not repeated here; the shape of one is.
            const size = curve === 'P-224' ? 28 : curve === 'P-384' ? 48 : 66;
            return key.length === 1 + 2 * size && key[0] === 0x04 ? null : 'public-format';
        }
        case OID_RSA: {
            const rsa = readNode(key, 0);
            const numbers = rsa && rsa.tag === SEQUENCE ? children(rsa) : null;
            return numbers && numbers.length === 2 && numbers.every(node => node.tag === INTEGER) ? null : 'public-format';
        }
        case OID_ED25519:
        case OID_X25519:
            return key.length === 32 ? null : 'public-format';
        default:
            return 'public-format';
    }
};

/** Why `publicKey` is refused, or null when the core takes it. */
export const warpPublicKeyFailure = (text: string): WarpKeyFailure | null => {
    const der = decodeWarpKey(text);
    if (typeof der === 'string') return der;
    return publicKeyFailure(der);
};
