export const generateLink = (outbound: any): string => {
    try {
        const proto = outbound.protocol;
        const tag = outbound.tag || "";
        const stream = outbound.streamSettings || {};
        const settings = outbound.settings || {};

        // --- 1. SHADOWSOCKS ---
        if (proto === 'shadowsocks') {
            // Поддержка и servers (стандарт), и плоской структуры
            const server = settings.servers?.[0] || settings;
            if (!server || !server.address) return "";
            
            const userInfo = btoa(`${server.method}:${server.password}`);
            return `ss://${userInfo}@${server.address}:${server.port}#${encodeURIComponent(tag)}`;
        }

        // --- 2. VLESS / TROJAN / VMESS ---
        if (['vless', 'trojan', 'vmess'].includes(proto)) {
            let address, port, uuid, flow, encryption, security;

            // ПОПЫТКА 1: Стандартный Xray (settings.vnext[0].users[0])
            if (settings.vnext && settings.vnext.length > 0) {
                const vnext = settings.vnext[0];
                address = vnext.address;
                port = vnext.port;
                if (vnext.users && vnext.users.length > 0) {
                    const user = vnext.users[0];
                    uuid = user.id || user.password; // Trojan uses password
                    flow = user.flow;
                    encryption = user.encryption;
                    security = user.security;
                }
            } 
            // ПОПЫТКА 2: Плоская структура (Твой случай)
            else if (settings.address) {
                address = settings.address;
                port = settings.port;
                uuid = settings.id || settings.password; // id для vmess/vless, password для trojan
                flow = settings.flow;
                encryption = settings.encryption;
                security = settings.security;
            }

            // Если обязательные поля не найдены - выходим
            if (!address || !port || !uuid) return "";

            // --- VMESS (JSON Format) ---
            if (proto === 'vmess') {
                const vmessJson = {
                    v: "2",
                    ps: tag,
                    add: address,
                    port: port,
                    id: uuid,
                    aid: "0",
                    scy: security || "auto",
                    net: stream.network || "tcp",
                    type: stream.kcpSettings?.header?.type || "none",
                    host: stream.wsSettings?.headers?.Host || 
                          stream.httpSettings?.host?.[0] || 
                          stream.xhttpSettings?.host || "",
                    path: stream.wsSettings?.path || 
                          stream.xhttpSettings?.path || 
                          stream.httpSettings?.path || "",
                    tls: stream.security === "tls" || stream.security === "reality" ? "tls" : "",
                    sni: stream.tlsSettings?.serverName || 
                         stream.realitySettings?.serverName || "",
                    alpn: "",
                    fp: stream.tlsSettings?.fingerprint || 
                        stream.realitySettings?.fingerprint || ""
                };
                return `vmess://${btoa(JSON.stringify(vmessJson))}`;
            }

            // --- VLESS / TROJAN (Query String Format) ---
            const params = new URLSearchParams();
            
            params.set("type", stream.network || "tcp");
            params.set("security", stream.security || "none");

            if (proto === 'vless' && flow) params.set("flow", flow);
            if (proto === 'vless' && encryption) params.set("encryption", encryption);

            // Transport details
            if (stream.network === 'ws') {
                if(stream.wsSettings?.path) params.set("path", stream.wsSettings.path);
                if(stream.wsSettings?.headers?.Host) params.set("host", stream.wsSettings.headers.Host);
            }
            if (stream.network === 'grpc') {
                if(stream.grpcSettings?.serviceName) params.set("serviceName", stream.grpcSettings.serviceName);
                if(stream.grpcSettings?.multiMode) params.set("mode", "multi");
            }
            if (stream.network === 'xhttp') {
                if(stream.xhttpSettings?.mode) params.set("mode", stream.xhttpSettings.mode);
                if(stream.xhttpSettings?.path) params.set("path", stream.xhttpSettings.path);
                if(stream.xhttpSettings?.host) params.set("host", stream.xhttpSettings.host);
                if(stream.xhttpSettings?.extra) params.set("extra", JSON.stringify(stream.xhttpSettings.extra));
            }

            // TLS / Reality
            if (stream.security === 'tls') {
                if(stream.tlsSettings?.serverName) params.set("sni", stream.tlsSettings.serverName);
                if(stream.tlsSettings?.fingerprint) params.set("fp", stream.tlsSettings.fingerprint);
                if(stream.tlsSettings?.alpn?.length) params.set("alpn", stream.tlsSettings.alpn.join(','));
                if(stream.tlsSettings?.allowInsecure) params.set("allowInsecure", "1");
            }
            if (stream.security === 'reality') {
                if(stream.realitySettings?.serverName) params.set("sni", stream.realitySettings.serverName);
                if(stream.realitySettings?.publicKey) params.set("pbk", stream.realitySettings.publicKey);
                if(stream.realitySettings?.shortId) params.set("sid", stream.realitySettings.shortId);
                if(stream.realitySettings?.fingerprint) params.set("fp", stream.realitySettings.fingerprint);
                if(stream.realitySettings?.spiderX) params.set("spx", stream.realitySettings.spiderX);
                // Для Reality параметр type остается из network (tcp/h2/grpc), security игнорируется клиентами обычно, но ссылка должна быть валидной
            }

            return `${proto}://${uuid}@${address}:${port}?${params.toString()}#${encodeURIComponent(tag)}`;
        }

        return "";
    } catch (e) {
        console.error("Link gen error", e);
        return "";
    }
};