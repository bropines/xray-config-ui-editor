/**
 * The two facts about a Shadowsocks 2022 method that both what is written and
 * what is checked need: which names they are, and how long a key each takes.
 *
 * 16 bytes for 2022-blake3-aes-128-gcm, 32 for the other two
 * (sing-shadowsocks@v0.2.7:shadowaead_2022/service.go:84-94 for the lines
 * that run up to 26.9; v26.9.30:proxy/shadowsocks_2022/cipher.go:19-21 for
 * v26.9.30 and 26.10, the same lines at v26.10.10). What each line does with
 * a key of another length is in
 * shadowsocks-inbound.ts.
 */
import { SS_2022 } from './versions/features.inbound';

/** Whether a method name is one of the 2022 methods, in any case (a line may be stricter; see shadowsocks-inbound). */
export const isShadowsocks2022Method = (method: string): boolean => SS_2022.includes(method.toLowerCase());

/** Key bytes a 2022 method takes. */
export const ss2022KeyBytes = (method: string): number => (method.toLowerCase().endsWith('aes-128-gcm') ? 16 : 32);
