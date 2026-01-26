// src/utils/link-parser.ts

export const parseXrayLink = (link: string): any => {
  try {
    const url = new URL(link);
    const protocol = url.protocol.replace(':', '');
    const tag = decodeURIComponent(url.hash.slice(1));
    const query = Object.fromEntries(url.searchParams.entries());

    // Общая заготовка
    const baseOutbound = {
      tag: tag || `${protocol}-${Math.floor(Math.random() * 1000)}`,
      protocol: protocol,
      settings: {},
      streamSettings: {
        network: "tcp",
        security: "none",
        [query.net || "tcp"]: {} // placeholder for transport settings
      }
    };

    // --- VLESS & TROJAN ---
    if (protocol === 'vless' || protocol === 'trojan') {
      const user = {
        [protocol === 'vless' ? 'id' : 'password']: url.username,
        email: "generated@xray",
        flow: query.flow || "",
        encryption: query.encryption || "none"
      };

      if (protocol === 'trojan') delete user.id; // Trojan uses password only

      baseOutbound.settings = {
        vnext: [{
          address: url.hostname,
          port: parseInt(url.port),
          users: [user]
        }]
      };

      // Stream Settings
      if (query.type) baseOutbound.streamSettings.network = query.type;
      if (query.security) baseOutbound.streamSettings.security = query.security;

      // TLS / Reality Settings
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
      
      // Transport specific (ws, grpc, etc)
      if (query.type === 'ws') {
        baseOutbound.streamSettings.wsSettings = { path: query.path || "/", headers: { Host: query.host || "" } };
      }
      if (query.type === 'grpc') {
        baseOutbound.streamSettings.grpcSettings = { serviceName: query.serviceName || "" };
      }

      return baseOutbound;
    }

    // --- SHADOWSOCKS ---
    if (protocol === 'ss') {
      // ss://BASE64@host:port#tag
      // BASE64 decodes to method:password
      let userInfo = url.username;
      if (!userInfo.includes(':')) {
        try {
          userInfo = atob(url.username);
        } catch (e) {
           // fallback if base64 is separate
        }
      }
      const [method, password] = userInfo.split(':');

      baseOutbound.protocol = "shadowsocks";
      baseOutbound.settings = {
        servers: [{
          address: url.hostname,
          port: parseInt(url.port),
          method: method,
          password: password,
          uot: true
        }]
      };
      return baseOutbound;
    }

    throw new Error("Unsupported protocol");
  } catch (e) {
    console.error(e);
    alert("Ошибка парсинга ссылки: " + e.message);
    return null;
  }
};