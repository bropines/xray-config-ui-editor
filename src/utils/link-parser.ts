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