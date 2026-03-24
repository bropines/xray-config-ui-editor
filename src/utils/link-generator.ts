export const generateLink = (outbound: any): string | null => {
    if (!outbound || !outbound.protocol) return null;

    try {
        const proto = outbound.protocol;
        const settings = outbound.settings || {};
        const stream = outbound.streamSettings || {};
        const tag = outbound.tag || "Proxy";

        let address = "";
        let port = 0;
        let id = "";
        let flow = "";
        let method = "";
        
        if (settings.vnext && settings.vnext.length > 0) {
            address = settings.vnext[0].address;
            port = settings.vnext[0].port;
            id = settings.vnext[0].users?.[0]?.id || "";
            flow = settings.vnext[0].users?.[0]?.flow || "";
        } else if (settings.servers && settings.servers.length > 0) {
            address = settings.servers[0].address;
            port = settings.servers[0].port;
            id = settings.servers[0].password || settings.servers[0].id || "";
            method = settings.servers[0].method || "aes-256-gcm";
        } else {
            address = settings.address || "";
            port = settings.port || 0;
            id = settings.password || settings.id || settings.secretKey || "";
            method = settings.method || "aes-256-gcm";
        }

        if (!address || !port) return null;

        const network = stream.network || "tcp";
        const security = stream.security || "none";
        const sni = stream.tlsSettings?.serverName || stream.realitySettings?.serverName || "";
        const pbk = stream.realitySettings?.publicKey || "";
        const sid = stream.realitySettings?.shortId || "";
        const fp = stream.tlsSettings?.fingerprint || stream.realitySettings?.fingerprint || "";
        const alpn = (stream.tlsSettings?.alpn || stream.realitySettings?.alpn || []).join(",");
        
        const netSettings = stream[`${network}Settings`] || {};
        const path = netSettings.path || "";
        const host = netSettings.host?.join ? netSettings.host.join(",") : (netSettings.host || "");
        const type = netSettings.header?.type || "none";

        const params = new URLSearchParams();
        if (security !== "none") params.set("security", security);
        if (sni) params.set("sni", sni);
        if (pbk) params.set("pbk", pbk);
        if (sid) params.set("sid", sid);
        if (fp) params.set("fp", fp);
        if (alpn) params.set("alpn", alpn);

        params.set("type", network);
        
        if (network === "tcp" && type !== "none") params.set("headerType", type);
        if (network === "kcp") params.set("headerType", netSettings.header?.type || "none");
        if (network === "ws") {
            if (path) params.set("path", path);
            if (host) params.set("host", host);
        }
        if (network === "grpc") {
            if (netSettings.serviceName) params.set("serviceName", netSettings.serviceName);
            if (netSettings.multiMode) params.set("mode", "multi");
        }
        if (network === "xhttp") {
            if (netSettings.path) params.set("path", netSettings.path);
            if (netSettings.host) params.set("host", netSettings.host);
        }

        if (proto === "vless") {
            if (flow) params.set("flow", flow);
            return `vless://${id}@${address}:${port}?${params.toString()}#${encodeURIComponent(tag)}`;
        }

        if (proto === "vmess") {
            const vmessObj = {
                v: "2",
                ps: tag,
                add: address,
                port: port,
                id: id,
                aid: 0,
                scy: "auto",
                net: network,
                type: network === "tcp" ? type : (network === "kcp" ? netSettings.header?.type : "none"),
                host: host,
                path: path,
                tls: security === "tls" ? "tls" : "",
                sni: sni,
                alpn: alpn,
                fp: fp
            };
            return `vmess://${btoa(JSON.stringify(vmessObj))}`;
        }

        if (proto === "trojan") {
            return `trojan://${id}@${address}:${port}?${params.toString()}#${encodeURIComponent(tag)}`;
        }

        if (proto === "shadowsocks") {
            const userInfo = btoa(`${method}:${id}`);
            return `ss://${userInfo}@${address}:${port}#${encodeURIComponent(tag)}`;
        }

        return null;
    } catch (e) {
        console.error("Link generation failed", e);
        return null;
    }
};