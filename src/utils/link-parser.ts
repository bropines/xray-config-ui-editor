export const parseWireguardConfig = (text: string, mode: 'direct' | 'chained' = 'direct'): any => {
    const lines = text.split('\n');
    const config: any = {
        Interface: {},
        Peers: [] as any[]
    };
    
    let currentSection = "";
    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;
        
        if (line.startsWith('[Interface]')) {
            currentSection = "Interface";
            continue;
        } else if (line.startsWith('[Peer]')) {
            config.Peers.push({});
            currentSection = "Peer";
            continue;
        }

        const parts = line.split('=');
        if (parts.length < 2) continue;
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();

        if (currentSection === "Interface") {
            config.Interface[key] = value;
        } else if (currentSection === "Peer") {
            config.Peers[config.Peers.length - 1][key] = value;
        }
    }

    if (!config.Interface.PrivateKey) return null;

    const outbound: any = {
        tag: "wg-imported-" + Math.floor(Math.random() * 1000),
        protocol: "wireguard",
        settings: {
            secretKey: config.Interface.PrivateKey,
            address: config.Interface.Address ? config.Interface.Address.split(',').map((s: string) => s.trim()) : [],
            mtu: config.Interface.MTU ? parseInt(config.Interface.MTU) : 1280,
            peers: config.Peers.map((p: any) => ({
                publicKey: p.PublicKey,
                endpoint: p.Endpoint,
                allowedIPs: p.AllowedIPs ? p.AllowedIPs.split(',').map((s: string) => s.trim()) : ["0.0.0.0/0", "::/0"],
                keepAlive: p.PersistentKeepalive ? parseInt(p.PersistentKeepalive) : 0
            }))
        },
        streamSettings: {
            network: "udp",
            security: "none"
        }
    };

    // --- AmneziaWG / Finalmask Noise Generation ---
    const isAWG = config.Interface.Jc || config.Interface.Jmin || config.Interface.H1 || config.Interface.I1;
    
    if (isAWG) {
        const noise: any[] = [];
        const extractHex = (val: string) => {
            if (!val) return null;
            const match = val.match(/0x([0-9a-fA-F]+)/);
            return match ? match[1] : null;
        };

        const i1Hex = extractHex(config.Interface.I1);
        if (i1Hex) noise.push({ type: "hex", packet: i1Hex, delay: "5-10" });
        const i2Hex = extractHex(config.Interface.I2);
        if (i2Hex) noise.push({ type: "hex", packet: i2Hex, delay: "5-10" });

        const jc = parseInt(config.Interface.Jc) || 0;
        const jmin = parseInt(config.Interface.Jmin) || 40;
        const jmax = parseInt(config.Interface.Jmax) || 70;
        for (let i = 0; i < jc; i++) {
            noise.push({ rand: `${jmin}-${jmax}`, delay: "5-15" });
        }

        // Smart Reserved
        const isWARP = outbound.settings.peers.some((p: any) => 
            p.endpoint?.includes('cloudflare') || p.endpoint?.includes('162.159.')
        );
        if (isWARP) {
            outbound.settings.reserved = [0, 0, 0];
        } else if (config.Interface.S1 || config.Interface.S2) {
            outbound.settings.reserved = [parseInt(config.Interface.S1) || 0, parseInt(config.Interface.S2) || 0, 0];
        }

        if (mode === 'direct') {
            // МЕТОД 1: Finalmask внутри WG (Xray 1.26+)
            outbound.streamSettings.network = "raw"; 
            outbound.streamSettings.finalmask = {
                udp: [{ type: "noise", settings: { noise } }]
            };
        } else {
            // МЕТОД 2: Цепочка через dialerProxy (Legacy / Старые ядра)
            const noiseTag = outbound.tag + "-obfuscator";
            outbound.streamSettings.sockopt = { dialerProxy: noiseTag };
            
            const obfuscator = {
                tag: noiseTag,
                protocol: "freedom",
                settings: {},
                streamSettings: {
                    network: "raw",
                    finalmask: { udp: [{ type: "noise", settings: { noise } }] }
                }
            };
            return { multiple: true, outbounds: [outbound, obfuscator] };
        }
    }

    return outbound;
};

const decodeBase64Safe = (b64: string): string => {
  try {
    const cleaned = b64.trim().replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(cleaned);
    try {
      return decodeURIComponent(escape(decoded));
    } catch {
      return decoded;
    }
  } catch (e) {
    return "";
  }
};

export const parseXrayLink = (link: string): any => {
  try {
    const trimmed = link.trim();

    // --- VMess (Base64 JSON format) ---
    if (trimmed.startsWith('vmess://')) {
      const base64Part = trimmed.substring(8).split('#')[0].trim();
      const decoded = decodeBase64Safe(base64Part);
      if (!decoded) return null;
      const data = JSON.parse(decoded);

      const tag = data.ps || `vmess-${Math.floor(Math.random() * 1000)}`;
      const outbound: any = {
        tag: tag,
        protocol: "vmess",
        settings: {
          vnext: [{
            address: data.add,
            port: parseInt(data.port) || 443,
            users: [{
              id: data.id,
              alterId: parseInt(data.aid) || 0,
              security: data.scy || "auto",
              level: 0
            }]
          }]
        },
        streamSettings: {
          network: data.net || "tcp",
          security: data.tls || "none"
        }
      };

      const network = outbound.streamSettings.network;
      const security = outbound.streamSettings.security;

      if (security === 'tls' || security === 'reality') {
        const tlsSettings: any = {
          serverName: data.sni || data.host || data.add,
          fingerprint: data.fp || "chrome",
          alpn: data.alpn ? data.alpn.split(',').map((s: string) => s.trim()) : undefined
        };

        if (security === 'reality') {
          tlsSettings.publicKey = data.pbk || "";
          tlsSettings.shortId = data.sid || "";
          tlsSettings.spiderX = data.spx || data.path || "/";
          outbound.streamSettings.realitySettings = tlsSettings;
        } else {
          outbound.streamSettings.tlsSettings = tlsSettings;
        }
      }

      if (network === 'ws') {
        outbound.streamSettings.wsSettings = {
          path: data.path || "/",
          headers: { Host: data.host || "" }
        };
      } else if (network === 'grpc') {
        outbound.streamSettings.grpcSettings = {
          serviceName: data.path || data.serviceName || ""
        };
      } else if (network === 'h2' || network === 'http') {
        outbound.streamSettings.httpSettings = {
          path: data.path || "/",
          host: data.host ? data.host.split(',').map((s: string) => s.trim()) : []
        };
      } else if (network === 'xhttp' || network === 'splithttp') {
        const settings = {
          path: data.path || "/",
          mode: data.mode || "auto",
          host: data.host || ""
        };
        if (network === 'xhttp') outbound.streamSettings.xhttpSettings = settings;
        else outbound.streamSettings.splithttpSettings = settings;
      } else if (network === 'httpupgrade') {
        outbound.streamSettings.httpUpgradeSettings = {
          path: data.path || "/",
          host: data.host || ""
        };
      } else if (network === 'kcp') {
        outbound.streamSettings.kcpSettings = {
          header: {
            type: data.type || "none"
          }
        };
      } else if (network === 'tcp' && data.type === 'http') {
        outbound.streamSettings.tcpSettings = {
          header: {
            type: "http",
            request: {
              version: "1.1",
              method: "GET",
              path: [data.path || "/"],
              headers: {
                Host: data.host ? data.host.split(',').map((s: string) => s.trim()) : []
              }
            }
          }
        };
      }

      return outbound;
    }

    // --- URI-based protocols (VLESS, Shadowsocks, Trojan) ---
    const url = new URL(trimmed);
    let protocol = url.protocol.replace(':', '');
    
    if (protocol === 'ss') {
        protocol = 'shadowsocks';
    }

    const hashPart = trimmed.includes('#') ? trimmed.split('#')[1] : '';
    const tag = decodeURIComponent(hashPart);
    const query = Object.fromEntries(url.searchParams.entries());

    const baseOutbound = {
      tag: tag || `${protocol}-${Math.floor(Math.random() * 1000)}`,
      protocol: protocol,
      settings: {},
      streamSettings: {
        network: "tcp",
        security: "none",
      }
    };

    // --- VLESS ---
    if (protocol === 'vless') {
      baseOutbound.settings = {
        vnext: [{
          address: url.hostname,
          port: parseInt(url.port) || 443,
          users: [{
            id: url.username,
            email: "generated@xray",
            flow: query.flow || "",
            encryption: query.encryption || "none"
          }]
        }]
      };
    } 
    // --- TROJAN ---
    else if (protocol === 'trojan') {
      baseOutbound.settings = {
        servers: [{
          address: url.hostname,
          port: parseInt(url.port) || 443,
          password: url.username,
          email: "generated@xray",
          level: 0
        }]
      };
    }

    // --- SHADOWSOCKS ---
    else if (protocol === 'shadowsocks') { 
      let method = "";
      let password = "";
      let serverAddr = "";
      let serverPort = 443;

      // 1. Try to parse as ss://BASE64(method:password@host:port)
      const linkBody = trimmed.split('://')[1].split('#')[0];
      
      try {
        // If it's a legacy all-in-one base64 link
        if (!linkBody.includes('@')) {
            const decoded = atob(linkBody.replace(/-/g, '+').replace(/_/g, '/'));
            if (decoded.includes('@')) {
                const [userInfo, hostPort] = decoded.split('@');
                const [m, p] = userInfo.split(':');
                method = m;
                password = p;
                if (hostPort.includes(':')) {
                    const [h, port] = hostPort.split(':');
                    serverAddr = h;
                    serverPort = parseInt(port);
                } else {
                    serverAddr = hostPort;
                }
            }
        }
      } catch (e) {
        // Not a full base64 link
      }

      // 2. Try SIP002 format: ss://BASE64(method:password)@host:port
      if (!serverAddr) {
        const lastAtIndex = linkBody.lastIndexOf('@');
        if (lastAtIndex !== -1) {
          const userInfoRaw = linkBody.substring(0, lastAtIndex);
          const hostPortPart = linkBody.substring(lastAtIndex + 1);
          let decodedUserInfo = "";
          try {
              decodedUserInfo = atob(userInfoRaw.replace(/-/g, '+').replace(/_/g, '/'));
          } catch (e) {
              decodedUserInfo = userInfoRaw;
          }

          if (decodedUserInfo.includes(':')) {
              const parts = decodedUserInfo.split(':');
              method = parts[0];
              password = parts.slice(1).join(':');
          }

          // Handle host:port?query
          const [hostPort, queryStr] = hostPortPart.split('?');
          if (hostPort.includes(':')) {
              const hp = hostPort.split(':');
              serverAddr = hp[0];
              serverPort = parseInt(hp[1]);
          } else {
              serverAddr = hostPort;
          }
        }
      }

      baseOutbound.settings = {
        servers: [{
          address: serverAddr || url.hostname,
          port: serverPort || parseInt(url.port) || 443,
          method: method || "aes-256-gcm",
          password: password,
          uot: true
        }]
      };
    } else {
        throw new Error("Unsupported protocol");
    }

    // --- (Network, TLS, Reality) ---
    const network = query.type || query.net || "tcp";
    baseOutbound.streamSettings.network = network;
    
    if (query.security) baseOutbound.streamSettings.security = query.security;

    if (query.security === 'tls' || query.security === 'reality') {
      const tlsSettings: any = {
        serverName: query.sni || url.hostname,
        fingerprint: query.fp || "chrome",
        alpn: query.alpn ? query.alpn.split(',') : undefined
      };

      if (query.security === 'reality') {
        tlsSettings.publicKey = query.pbk;
        tlsSettings.shortId = query.sid;
        tlsSettings.spiderX = query.spx || query.path || query.serviceName || "/";
        baseOutbound.streamSettings.realitySettings = tlsSettings;
      } else {
        baseOutbound.streamSettings.tlsSettings = tlsSettings;
      }
    }
    
    if (network === 'ws') {
      baseOutbound.streamSettings.wsSettings = { 
          path: query.path || "/", 
          headers: { Host: query.host || "" } 
      };
    }
    else if (network === 'grpc') {
      baseOutbound.streamSettings.grpcSettings = { serviceName: query.serviceName || query.path || "" };
    }
    else if (network === 'h2' || network === 'http') {
      baseOutbound.streamSettings.httpSettings = {
        path: query.path || "/",
        host: query.host ? query.host.split(',').map((s: string) => s.trim()) : []
      };
    }
    else if (network === 'xhttp' || network === 'splithttp') {
      const settings = {
          path: query.path || "/",
          mode: query.mode || "auto",
          host: query.host || ""
      };
      if (network === 'xhttp') baseOutbound.streamSettings.xhttpSettings = settings;
      else baseOutbound.streamSettings.splithttpSettings = settings;
    }
    else if (network === 'httpupgrade') {
      baseOutbound.streamSettings.httpUpgradeSettings = {
        path: query.path || "/",
        host: query.host || ""
      };
    }
    else if (network === 'kcp') {
      baseOutbound.streamSettings.kcpSettings = {
        header: {
          type: query.headerType || query.type || "none"
        }
      };
    }
    else if (network === 'tcp' && (query.headerType === 'http' || query.type === 'http')) {
      baseOutbound.streamSettings.tcpSettings = {
        header: {
          type: "http",
          request: {
            version: "1.1",
            method: "GET",
            path: [query.path || "/"],
            headers: {
              Host: query.host ? query.host.split(',').map((s: string) => s.trim()) : []
            }
          }
        }
      };
    }

    return baseOutbound;
  } catch (e: any) {
    console.error("Parse error:", e);
    return null;
  }
};

/**
 * Universal Subscription & Raw Links Parser
 * Handles:
 * 1. Single or Array of JSON Xray Configs
 * 2. Base64-encoded subscription containing links or JSON
 * 3. Line-by-line proxy links (vless://, vmess://, ss://, trojan://, etc.)
 * 4. Wireguard .conf text
 */
export const parseRawSubscriptionText = (text: string): any[] => {
    let clean = (text || "").trim();
    if (!clean) throw new Error("Input is empty");

    // 1. Try to decode Base64 if not already JSON or plain links
    if (!clean.startsWith('{') && !clean.startsWith('[') && !clean.includes('://')) {
        try {
            const b64 = clean.replace(/\s/g, '');
            const decoded = decodeBase64Safe(b64);
            if (decoded && (decoded.includes('://') || decoded.startsWith('{') || decoded.startsWith('['))) {
                clean = decoded.trim();
            }
        } catch {}
    }

    // 2. Try JSON
    if (clean.startsWith('{') || clean.startsWith('[')) {
        try {
            const data = JSON.parse(clean);
            if (Array.isArray(data)) {
                return data.filter(c => c && typeof c === 'object');
            }
            if (data && typeof data === 'object') {
                return [data];
            }
        } catch {}
    }

    // 3. Try Wireguard .conf
    if (clean.includes('[Interface]') && clean.includes('[Peer]')) {
        const wg = parseWireguardConfig(clean);
        if (wg) {
            const outbounds = wg.multiple && wg.outbounds ? wg.outbounds : [wg];
            return [{
                remarks: "WireGuard Configuration",
                outbounds
            }];
        }
    }

    // 4. Try Line-by-line Links (vless://, vmess://, ss://, trojan://)
    const lines = clean.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    const parsedOutbounds: any[] = [];

    for (const line of lines) {
        if (line.includes('://')) {
            const ob = parseXrayLink(line);
            if (ob) {
                parsedOutbounds.push(ob);
            }
        }
    }

    if (parsedOutbounds.length > 0) {
        return [{
            remarks: `Imported Node List (${parsedOutbounds.length} nodes)`,
            outbounds: parsedOutbounds
        }];
    }

    throw new Error("Could not parse as JSON config or valid proxy links");
};

/**
 * Парсит JSON-подписку (массив полных конфигов или объектов с remarks)
 * Возвращает массив Outbounds
 */
export const parseJsonSubscription = (jsonText: string): any[] => {
    try {
        const data = JSON.parse(jsonText);
        const outbounds: any[] = [];

        const processConfig = (conf: any) => {
            if (!conf || typeof conf !== 'object') return;
            
            if (Array.isArray(conf.outbounds)) {
                const proxies = conf.outbounds.filter((o: any) => 
                    !['freedom', 'dns', 'blackhole', 'direct', 'block'].includes(o.protocol)
                );

                proxies.forEach((proxy: any, idx: number) => {
                    if (conf.remarks) {
                        const baseTag = conf.remarks.trim();
                        proxy.tag = proxies.length > 1 ? `${baseTag}-${idx + 1}` : baseTag;
                    }
                    outbounds.push(proxy);
                });

                if (proxies.length === 0 && conf.outbounds.length > 0) {
                    outbounds.push(conf.outbounds[0]);
                }
            } else if (conf.protocol && conf.settings) {
                outbounds.push(conf);
            }
        };

        if (Array.isArray(data)) {
            data.forEach(processConfig);
        } else {
            processConfig(data);
        }

        return outbounds;
    } catch {
        return [];
    }
};