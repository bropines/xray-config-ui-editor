/**
 * VLESS Encryption keys and strings, made the way `xray vlessenc` makes them,
 * and the client half worked out from the server half.
 *
 * Pure but for the random bytes, which come in as a parameter so a test can
 * pin them. The grammar, and what the core refuses of it, is in
 * core/xray/vless-encryption.ts; this file only produces strings that grammar
 * accepts and reads the keys out of ones it already has.
 *
 * What `xray vlessenc` does, v26.10.10:main/commands/all/vlessenc.go:23-37
 * (the file is the same on every supported line):
 *   - X25519: 32 random bytes, clamped (curve25519.go:51-53); the server holds
 *     them, the client holds the public key (curve25519.go:60). Both
 *     base64.RawURLEncoding.
 *   - ML-KEM-768: 64 random bytes are the seed the server holds
 *     (mlkem768.go:50-55); the client holds the encapsulation key the seed
 *     makes, `mlkem.NewDecapsulationKey768(seed).EncapsulationKey().Bytes()`,
 *     1184 bytes (mlkem768.go:56-57).
 *   - the strings are `mlkem768x25519plus.native.600s.KEY` and
 *     `mlkem768x25519plus.native.0rtt.KEY`, no padding blocks (vlessenc.go:27-28
 *     and :32-33). The handshake name says both: whichever key authenticates,
 *     the session key exchange is ML-KEM-768 and X25519 together.
 *
 * The seed-to-public-key step is @noble/post-quantum's ml_kem768.keygen(seed):
 * FIPS 203 KeyGen with the 64-byte seed d || z, the form Go's
 * NewDecapsulationKey768 takes. generators/vless-encryption.test.ts holds it
 * to the keys the v26.10.10 binary printed for fixed seeds (`xray mlkem768 -i`,
 * `xray x25519 -i`), so a different implementation or a library upgrade that
 * disagrees with the core fails there.
 */
import nacl from 'tweetnacl';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import {
    DEFAULT_LIFETIME,
    KEY_BYTES,
    NO_VLESS_ENCRYPTION,
    composeVlessEncryption,
    encodeRawUrlBase64,
    lifetimeCeiling,
    readVlessEncryption,
    type Appearance,
    type Resumption,
    type VlessEncryptionProblem,
} from '../xray/vless-encryption';

export type VlessAuthentication = 'x25519' | 'mlkem768';

/** What the two strings say besides their keys; the defaults are `xray vlessenc`'s. */
export interface VlessEncryptionOptions {
    /** Both strings. */
    appearance: Appearance;
    /** The server's ticket lifetime, as written: "600s", "300-600s". */
    lifetime: string;
    /** The client's: 0rtt resumes with a ticket, 1rtt never does. */
    resumption: Resumption;
    /** Padding blocks for both strings, joined by dots; "" leaves it to Xray's own. */
    padding: string;
}

export const DEFAULT_VLESS_ENCRYPTION_OPTIONS: Readonly<VlessEncryptionOptions> = {
    appearance: 'native',
    lifetime: DEFAULT_LIFETIME,
    resumption: '0rtt',
    padding: '',
};

export type RandomBytes = (length: number) => Uint8Array;

const systemRandom: RandomBytes = length => crypto.getRandomValues(new Uint8Array(length));

/** The X25519 public key for a private key; the curve clamps the scalar itself, as Go's does. */
export const x25519PublicKey = (privateKey: Uint8Array): Uint8Array => nacl.scalarMult.base(privateKey);

/** The 1184-byte ML-KEM-768 public key for a 64-byte seed. */
export const mlkem768PublicKey = (seed: Uint8Array): Uint8Array => ml_kem768.keygen(seed).publicKey;

export interface VlessKeyPair {
    /** What the server keeps: a clamped X25519 private key, or an ML-KEM-768 seed. */
    privateKey: Uint8Array;
    /** What the client keeps. */
    publicKey: Uint8Array;
}

/** Random bytes, with the private key clamped the way `xray vlessenc` prints it. */
export const generateVlessKeyPair = (authentication: VlessAuthentication, random: RandomBytes = systemRandom): VlessKeyPair => {
    if (authentication === 'x25519') {
        const privateKey = Uint8Array.from(random(KEY_BYTES.x25519));
        privateKey[0] = privateKey[0]! & 248;
        privateKey[31] = (privateKey[31]! & 127) | 64;
        return { privateKey, publicKey: x25519PublicKey(privateKey) };
    }
    const seed = Uint8Array.from(random(KEY_BYTES.mlkem768Seed));
    return { privateKey: seed, publicKey: mlkem768PublicKey(seed) };
};

export interface VlessEncryptionPair {
    authentication: VlessAuthentication;
    /** For the inbound's `settings.decryption`. */
    decryption: string;
    /** For each client's outbound `encryption`. */
    encryption: string;
}

/**
 * A fresh key pair and both strings. With no options this is what `xray
 * vlessenc` prints: native, a 600 second ticket, 0rtt, no padding blocks.
 */
export const generateVlessEncryption = (
    authentication: VlessAuthentication,
    options: Partial<VlessEncryptionOptions> = {},
    random: RandomBytes = systemRandom,
): VlessEncryptionPair => {
    const { appearance, lifetime, resumption, padding } = { ...DEFAULT_VLESS_ENCRYPTION_OPTIONS, ...options };
    const { privateKey, publicKey } = generateVlessKeyPair(authentication, random);
    return {
        authentication,
        decryption: composeVlessEncryption({ appearance, ticket: lifetime, padding, keys: [encodeRawUrlBase64(privateKey)] }),
        encryption: composeVlessEncryption({ appearance, ticket: resumption, padding, keys: [encodeRawUrlBase64(publicKey)] }),
    };
};

export type DeriveResult =
    | { ok: true; encryption: string }
    | { ok: false; problems: VlessEncryptionProblem[] };

export interface DeriveOptions {
    /**
     * 0rtt or 1rtt for the client. Left out: 0rtt, as `vlessenc` writes it,
     * unless the server issues no tickets (a lifetime of 0), where there is
     * nothing to resume and 1rtt says so.
     */
    resumption?: Resumption;
    /** Padding blocks for the client. Left out: the server's, which is how the Xray documentation pairs them. */
    padding?: string;
}

/**
 * The string a client needs for a server's `decryption`: the same appearance
 * and padding, the ticket field turned into 0rtt or 1rtt, and each private key
 * replaced by its public half — X25519 by the curve's base-point product,
 * ML-KEM-768 by the key the seed generates. Several keys keep their order.
 *
 * "none" gives "none": a plain server has nothing to tell its clients. A
 * string the core would refuse, or that holds nothing to derive from, gives
 * the reasons rather than a guess.
 */
export const deriveClientEncryption = (decryption: unknown, options: DeriveOptions = {}): DeriveResult => {
    const reading = readVlessEncryption(decryption, 'server', 'decryption');
    if (reading.none) return { ok: true, encryption: NO_VLESS_ENCRYPTION };
    if (!reading.usable || !reading.parts) return { ok: false, problems: reading.problems };

    const resumption = options.resumption ?? (lifetimeCeiling(reading.parts.ticket) === 0n ? '1rtt' : '0rtt');
    return {
        ok: true,
        encryption: composeVlessEncryption({
            appearance: reading.parts.appearance,
            ticket: resumption,
            padding: options.padding ?? reading.parts.padding,
            keys: reading.keys.map(key =>
                encodeRawUrlBase64(key.kind === 'x25519' ? x25519PublicKey(key.bytes) : mlkem768PublicKey(key.bytes))),
        }),
    };
};
