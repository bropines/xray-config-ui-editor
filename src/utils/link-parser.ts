export const parseXrayLink = (link: string): any => {
  try {
    const url = new URL(link);
    const protocol = url.protocol.replace(':', '');
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

    // --- VLESS & TROJAN ---
    if (protocol === 'vless' || protocol === 'trojan') {
      const user = {
        [protocol === 'vless' ? 'id' : 'password']: url.username,
        email: "generated@xray",
        flow: query.flow || "",
        encryption: query.encryption || "none"
      };

      if (protocol === 'trojan') delete (user as any).id;

      baseOutbound.settings = {
        vnext: [{
          address: url.hostname,
          port: parseInt(url.port),
          users: [user]
        }]
      };

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
    }

    // --- SHADOWSOCKS (Исправленный парсинг) ---
    if (protocol === 'ss') {
      // 1. Извлекаем часть после ss:// и до #
      const mainPart = link.split('#')[0].replace('ss://', '');
      
      // 2. Находим последний символ @, который отделяет userInfo от host:port
      const lastAtIndex = mainPart.lastIndexOf('@');
      
      let method = "";
      let password = "";
      let serverAddr = "";
      let serverPort = 443;

      if (lastAtIndex !== -1) {
        // Формат с Base64 или обычным текстом: [userInfo]@[host]:[port]
        const userInfoRaw = mainPart.substring(0, lastAtIndex);
        const hostPortPart = mainPart.substring(lastAtIndex + 1);

        // Пытаемся декодировать userInfo
        let decodedUserInfo = "";
        try {
            // Исправляем возможные проблемы с URL-safe Base64
            const normalizedB64 = userInfoRaw.replace(/-/g, '+').replace(/_/g, '/');
            decodedUserInfo = atob(normalizedB64);
        } catch (e) {
            // Если не Base64, значит это plain text (метод:пароль)
            decodedUserInfo = userInfoRaw;
        }

        if (decodedUserInfo.includes(':')) {
            const parts = decodedUserInfo.split(':');
            method = parts[0];
            // Пароль может содержать двоеточие, поэтому объединяем остаток
            password = parts.slice(1).join(':');
        }

        // Парсим хост и порт
        if (hostPortPart.includes(':')) {
            const hp = hostPortPart.split(':');
            serverAddr = hp[0];
            serverPort = parseInt(hp[1]);
        } else {
            serverAddr = hostPortPart;
        }
      }

      baseOutbound.protocol = "shadowsocks";
      baseOutbound.settings = {
        servers: [{
          address: serverAddr,
          port: serverPort,
          method: method || "aes-256-gcm",
          password: password,
          uot: true
        }]
      };
      return baseOutbound;
    }

    throw new Error("Unsupported protocol");
  } catch (e: any) {
    console.error("Parse error:", e);
    return null;
  }
};