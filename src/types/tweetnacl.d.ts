declare module 'tweetnacl' {
    export const box: {
        keyPair: () => { publicKey: Uint8Array; secretKey: Uint8Array };
    };

    /**
     * X25519 scalar multiplication. `base` multiplies by the curve's base
     * point, which is how a REALITY public key is derived from its private
     * key (see core/generators/crypto.ts).
     */
    export const scalarMult: {
        (n: Uint8Array, p: Uint8Array): Uint8Array;
        base: (n: Uint8Array) => Uint8Array;
    };
}
