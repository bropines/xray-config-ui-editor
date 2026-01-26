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
        // Плейсхолдеры для настроек будут заполнены ниже
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

      if (protocol === 'trojan') delete user.id;

      baseOutbound.settings = {
        vnext: [{
          address: url.hostname,
          port: parseInt(url.port),
          users: [user]
        }]
      };

      // Stream Settings
      // Поддержка параметра `net` (стандарт) и `type` (старые клиенты)
      const network = query.type || query.net || "tcp";
      baseOutbound.streamSettings.network = network;
      
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
      
      // --- TRANSPORT SPECIFIC ---
      
      // WebSocket
      if (network === 'ws') {
        baseOutbound.streamSettings.wsSettings = { 
            path: query.path || "/", 
            headers: { Host: query.host || "" } 
        };
      }
      
      // gRPC
      if (network === 'grpc') {
        baseOutbound.streamSettings.grpcSettings = { 
            serviceName: query.serviceName || "" 
        };
      }

      // XHTTP (New!)
      if (network === 'xhttp') {
        baseOutbound.streamSettings.xhttpSettings = {
            mode: query.mode || "auto",
            path: query.path || "/",
            host: query.host || "",
            // Если есть extra параметры в JSON строке (редкость для ссылок, но возможно)
            extra: query.extra ? JSON.parse(query.extra) : {}
        };
      }

      return baseOutbound;
    }

    // --- SHADOWSOCKS ---
    if (protocol === 'ss') {
      let userInfo = url.username;
      // Обработка Base64 (старый формат ss)
      if (!userInfo.includes(':')) {
        try { userInfo = atob(url.username); } catch (e) {}
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