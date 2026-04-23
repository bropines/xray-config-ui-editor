export const parseWireguardConfig = (text: string): any => {
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
    // If Jc, Jmin, Jmax or H/I parameters are present, we generate Finalmask noise
    const isAWG = config.Interface.Jc || config.Interface.Jmin || config.Interface.H1 || config.Interface.I1;
    
    if (isAWG) {
        const noiseTag = outbound.tag + "-obfuscator";
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

        // 1. Настраиваем основной WG на проксирование
        outbound.streamSettings.sockopt = {
            dialerProxy: noiseTag
        };

        // 2. Создаем отдельный аутбаунд-обфускатор
        const obfuscator = {
            tag: noiseTag,
            protocol: "freedom",
            settings: {},
            streamSettings: {
                network: "raw",
                finalmask: {
                    udp: [{
                        type: "noise",
                        settings: { noise }
                    }]
                }
            }
        };

        return {
            multiple: true,
            outbounds: [outbound, obfuscator]
        };
    }

    return outbound;
};

export const parseXrayLink = (link: string): any => {
  try {
    const url = new URL(link);
    let protocol = url.protocol.replace(':', '');
    
    if (protocol === 'ss') {
        protocol = 'shadowsocks';
    }

    const hashPart = link.includes('#') ? link.split('#')[1] : '';
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
      const linkBody = link.split('://')[1]; 
      const mainPart = linkBody.split('#')[0];
      
      const lastAtIndex = mainPart.lastIndexOf('@');
      let method = "";
      let password = "";
      let serverAddr = "";
      let serverPort = 443;

      if (lastAtIndex !== -1) {
        const userInfoRaw = mainPart.substring(0, lastAtIndex);
        const hostPortPart = mainPart.substring(lastAtIndex + 1);
        let decodedUserInfo = "";
        try {
            const normalizedB64 = userInfoRaw.replace(/-/g, '+').replace(/_/g, '/');
            decodedUserInfo = atob(normalizedB64);
        } catch (e) {
            decodedUserInfo = userInfoRaw;
        }

        if (decodedUserInfo.includes(':')) {
            const parts = decodedUserInfo.split(':');
            method = parts[0];
            password = parts.slice(1).join(':');
        }

        if (hostPortPart.includes(':')) {
            const hp = hostPortPart.split(':');
            serverAddr = hp[0];
            serverPort = parseInt(hp[1]);
        } else {
            serverAddr = hostPortPart;
        }
      }

      baseOutbound.settings = {
        servers: [{
          address: serverAddr,
          port: serverPort,
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
        tlsSettings.spiderX = query.spx || "/";
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
    if (network === 'grpc') {
      baseOutbound.streamSettings.grpcSettings = { serviceName: query.serviceName || "" };
    }

    return baseOutbound;
  } catch (e: any) {
    console.error("Parse error:", e);
    return null;
  }
};