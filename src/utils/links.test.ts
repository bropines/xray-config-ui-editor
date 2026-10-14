import { expect, test, describe, it } from "bun:test";
import { parseXrayLink, parseWireguardConfig, parseWireguardConfigDetailed, parseRawSubscriptionText } from "./link-parser";
import { generateXrayLink, linkProblem } from "./link-generator";

describe("Link Parser & Generator", () => {
    
    describe("VLESS parsing & generation", () => {
        const vlessLink = "vless://00000000-0000-0000-0000-000000000000@89.46.38.91:443?security=reality&sni=google.com&fp=chrome&pbk=pubkey&sid=shortid&spx=%2F&type=grpc&serviceName=vless-grpc#MyServer";

        test("should parse VLESS link correctly", () => {
            const parsed = parseXrayLink(vlessLink);
            expect(parsed).not.toBeNull();
            expect(parsed.protocol).toBe("vless");
            expect(parsed.tag).toBe("MyServer");
            expect(parsed.settings.vnext[0].address).toBe("89.46.38.91");
            expect(parsed.settings.vnext[0].port).toBe(443);
            expect(parsed.settings.vnext[0].users[0].id).toBe("00000000-0000-0000-0000-000000000000");
            expect(parsed.streamSettings.security).toBe("reality");
            expect(parsed.streamSettings.network).toBe("grpc");
            expect(parsed.streamSettings.realitySettings.publicKey).toBe("pubkey");
        });

        test("should generate VLESS link from object", () => {
            const obj = parseXrayLink(vlessLink);
            const generated = generateXrayLink(obj);
            expect(generated).toContain("vless://");
            expect(generated).toContain("89.46.38.91:443");
            expect(generated).toContain("security=reality");
            expect(generated).toContain("type=grpc");
            expect(generated).toContain("MyServer");
        });

        test("should parse xhttp + reality correctly", () => {
            const link = "vless://645fe702bf804f968d6c6e1d078de119@38.180.38.126:8443?encryption=none&type=xhttp&security=reality&sni=ya.ru&fp=random&pbk=2focynRNhiclDiJQF7pWuJcZMdWsRzHun80Bnp8YLBY&sid=aabbccdd&path=/x&mode=auto#%F0%9F%87%B0%F0%9F%87%BFNEO-KZ";
            const parsed = parseXrayLink(link);
            expect(parsed.streamSettings.network).toBe("xhttp");
            expect(parsed.streamSettings.xhttpSettings.path).toBe("/x");
            expect(parsed.streamSettings.xhttpSettings.mode).toBe("auto");
            expect(parsed.streamSettings.realitySettings.spiderX).toBe("/x");
            expect(parsed.tag).toBe("🇰🇿NEO-KZ");
        });
    });

    describe("Shadowsocks parsing", () => {
        test("should parse modern SS link (base64 userinfo)", () => {
            // aes-256-gcm:pass
            const ssLink = "ss://YWVzLTI1Ni1nY206cGFzcw@89.46.38.91:443#SS-Server";
            const parsed = parseXrayLink(ssLink);
            expect(parsed.protocol).toBe("shadowsocks");
            expect(parsed.settings.servers[0].method).toBe("aes-256-gcm");
            expect(parsed.settings.servers[0].password).toBe("pass");
        });

        test("should parse legacy SS link (full base64)", () => {
            // aes-256-gcm:pass@89.46.38.91:443
            const ssLink = "ss://YWVzLTI1Ni1nY206cGFzc0A4OS40Ni4zOC45MTo0NDM#SS-Legacy";
            const parsed = parseXrayLink(ssLink);
            expect(parsed.protocol).toBe("shadowsocks");
            expect(parsed.tag).toBe("SS-Legacy");
            expect(parsed.settings.servers[0].address).toBe("89.46.38.91");
            expect(parsed.settings.servers[0].port).toBe(443);
            expect(parsed.settings.servers[0].method).toBe("aes-256-gcm");
            expect(parsed.settings.servers[0].password).toBe("pass");
        });

        test("writes the protocol Xray knows, whatever the link's scheme says", () => {
            // The loader registers `shadowsocks` alone (v26.7.28:infra/conf/xray.go:44) and
            // stops at any other name; a 2022 cipher is the method, not a protocol.
            const body = "YWVzLTI1Ni1nY206cGFzcw@89.46.38.91:443#SS";
            for (const scheme of ["ss", "SS", "shadowsocks"]) {
                expect(parseXrayLink(`${scheme}://${body}`).protocol).toBe("shadowsocks");
            }
        });

        test("does not turn a shadowsocks-2022 link into an outbound of that name", () => {
            const quiet = console.error;
            console.error = () => {};
            try {
                expect(parseXrayLink("shadowsocks-2022://YWVzLTI1Ni1nY206cGFzcw@89.46.38.91:443#SS")).toBeNull();
            } finally {
                console.error = quiet;
            }
        });
    });

    describe("VMess parsing & generation", () => {
        const vmessLink = "vmess://eyJhZGQiOiI4OS40Ni4zOC45MSIsImFpZCI6IjAiLCJhbHBuIjoiaDIsaHR0cC8xLjEiLCJmcCI6ImNocm9tZSIsImhvc3QiOiJnb29nbGUuY29tIiwiaWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJuZXQiOiJ3cyIsInBhdGgiOiIvY2hhdCIsInBzIjoiVk1lc3MtU2VydmVyIiwicG9ydCI6IjQ0MyIsInNjeSI6ImF1dG8iLCJzbmkiOiJnb29nbGUuY29tIiwidGxzIjoidGxzIiwidiI6IjIifQ==";

        test("should parse VMess link correctly", () => {
            const parsed = parseXrayLink(vmessLink);
            expect(parsed).not.toBeNull();
            expect(parsed.protocol).toBe("vmess");
            expect(parsed.tag).toBe("VMess-Server");
            expect(parsed.settings.vnext[0].address).toBe("89.46.38.91");
            expect(parsed.settings.vnext[0].port).toBe(443);
            expect(parsed.settings.vnext[0].users[0].id).toBe("00000000-0000-0000-0000-000000000000");
            expect(parsed.streamSettings.security).toBe("tls");
            expect(parsed.streamSettings.network).toBe("ws");
            expect(parsed.streamSettings.wsSettings.path).toBe("/chat");
            expect(parsed.streamSettings.wsSettings.host).toBe("google.com");
        });

        test("should generate VMess link from object", () => {
            const obj = parseXrayLink(vmessLink);
            const generated = generateXrayLink(obj);
            expect(generated).toContain("vmess://");
            // Decode and check fields
            const b64 = generated.substring(8);
            const decoded = JSON.parse(atob(b64));
            expect(decoded.add).toBe("89.46.38.91");
            expect(decoded.ps).toBe("VMess-Server");
        });
    });

    describe("WireGuard / AmneziaWG parser", () => {
        const wgConfig = `
[Interface]
PrivateKey = myprivatekey
Address = 10.0.0.2/32
DNS = 1.1.1.1
MTU = 1420
Jc = 4
Jmin = 40
Jmax = 70
S1 = 5
S2 = 10
H1 = 0x01020304

[Peer]
PublicKey = peerpubkey
AllowedIPs = 0.0.0.0/0
Endpoint = 89.46.38.91:51820
        `;

        test("should parse AmneziaWG (finalmask) correctly", () => {
            const parsed = parseWireguardConfig(wgConfig, 'direct');
            expect(parsed.protocol).toBe("wireguard");
            expect(parsed.settings.secretKey).toBe("myprivatekey");
            expect(parsed.streamSettings.network).toBe("raw");
            expect(parsed.streamSettings.finalmask).toBeDefined();
            // Jc = 4 junk packets, and no I lines in this profile.
            expect(parsed.streamSettings.finalmask.udp[0].settings.noise)
                .toEqual([...Array(4)].map(() => ({ rand: "40-70" })));
        });

        test("leaves reserved alone: S1/S2 are not what it holds", () => {
            // S1/S2 are padding lengths on WireGuard's handshake messages
            // (device/send.go:149,199). `reserved` substitutes three bytes of
            // the header for Cloudflare WARP. Writing one into the other, as
            // this importer used to, corrupts the handshake — and this peer is
            // not WARP, so nothing should be written at all.
            const parsed = parseWireguardConfig(wgConfig, 'direct');
            expect(parsed.settings.reserved).toBeUndefined();
        });

        test("says what it could not bring across", () => {
            const { notes } = parseWireguardConfigDetailed(wgConfig, 'direct');
            const said = (match: string) => notes.filter(note => note.message.includes(match));
            // S1/S2 ask for padded handshakes, which Xray cannot send.
            expect(said("S1 (handshake initiation)")).toHaveLength(1);
            // H1 renumbers the initiation message, so this peer is unreachable.
            const renumbered = said("renumbers");
            expect(renumbered).toHaveLength(1);
            expect(renumbered[0]!.severity).toBe("critical");
        });

        test("keeps every I line, and every tag within one", () => {
            const withPackets = wgConfig.replace(
                "Jc = 4",
                ["I1 = <b 0xdeadbeef><r 4>", "I2 = <b 0xcafe>", "I3 = <b 0xfeed>",
                 "I4 = <b 0xf00d>", "I5 = <b 0xbeef>", "Jc = 4"].join("\n"),
            );
            const noise = parseWireguardConfig(withPackets, 'direct')
                .streamSettings.finalmask.udp[0].settings.noise;
            // Five packets then the junk, the order AmneziaWG sends them in.
            expect(noise.filter((item: any) => item.packet)).toHaveLength(5);
            expect(noise.slice(5).every((item: any) => item.rand === "40-70")).toBe(true);
            // I1 carries a second tag: four random bytes after the fixed four.
            // Reading only the first <b ...> used to drop them.
            expect(noise[0].packet).toHaveLength(("deadbeef".length) + 8);
            expect(noise[0].packet.startsWith("deadbeef")).toBe(true);
        });

        test("should parse AmneziaWG (chained) correctly", () => {
            const result = parseWireguardConfig(wgConfig, 'chained');
            expect(result.multiple).toBe(true);
            expect(result.outbounds).toHaveLength(2);
            expect(result.outbounds[0].streamSettings.sockopt.dialerProxy).toBeDefined();
            expect(result.outbounds[1].tag).toBe(result.outbounds[0].streamSettings.sockopt.dialerProxy);
        });
    });

    describe("Raw Subscription & Multi-link parsing", () => {
        test("should parse multiple vless links with URL-encoded remarks", () => {
            const multiLinks = `
vless://6923c575-962e-4208-8dea-f17d45b245d3@0.0.0.0:1?security=&type=tcp&headerType=&path=&host=#%D0%9F%D1%80%D0%B8%D0%BB%D0%BE%D0%B6%D0%B5%D0%BD%D0%B8%D0%B5%20%D0%BD%D0%B5%20%D0%BF%D0%BE%D0%B4%D1%85%D0%BE%D0%B4%D0%B8%D1%82%20%E2%9A%A0%EF%B8%8F
vless://31cf0a25-eeb5-45fb-9c09-2ce40bebb76f@0.0.0.0:1?security=&type=tcp&headerType=&path=&host=#%D0%A1%D0%BF%D0%B8%D1%81%D0%BE%D0%BA%20%D0%BD%D1%83%D0%B6%D0%BD%D1%8B%D1%85%20%D0%BF%D1%80%D0%B8%D0%BB%D0%BE%D0%B6%D0%B5%D0%BD%D0%B8%D0%B9%3A
vless://7a216a91-cd18-4034-adf3-c3dec4a85a24@0.0.0.0:1?security=&type=tcp&headerType=&path=&host=#%D0%B2%20%D0%B1%D0%BE%D1%82%D0%B5%20%40blackvpn_bot
            `.trim();

            const configs = parseRawSubscriptionText(multiLinks);
            expect(configs).toHaveLength(1);
            expect(configs[0].outbounds).toHaveLength(3);
            expect(configs[0].outbounds[0].tag).toBe("Приложение не подходит ⚠️");
            expect(configs[0].outbounds[1].tag).toBe("Список нужных приложений:");
            expect(configs[0].outbounds[2].tag).toBe("в боте @blackvpn_bot");
        });
    });
});

describe('a Shadowsocks link without a method', () => {
    it('is not made up: no link, and a reason the editor can show', () => {
        // It used to say aes-256-gcm, which hands a client a cipher the server
        // does not use.
        const outbound = { tag: 'ss', protocol: 'shadowsocks', settings: { servers: [{ address: '1.2.3.4', port: 8388, password: 'p' }] } };
        expect(generateXrayLink(outbound)).toBe('');
        expect(linkProblem(outbound)).not.toBeNull();
    });

    it('uses the method the config holds, flat or in the first server', () => {
        const servers = { tag: 'ss', protocol: 'shadowsocks', settings: { servers: [{ address: '1.2.3.4', port: 8388, method: 'chacha20-ietf-poly1305', password: 'p' }] } };
        expect(atob(generateXrayLink(servers).slice(5).split('@')[0]!)).toBe('chacha20-ietf-poly1305:p');
        expect(linkProblem(servers)).toBeNull();
    });
});
