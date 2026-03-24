const workerCode = `
importScripts("https://cdn.jsdelivr.net/npm/protobufjs@7.2.4/dist/protobuf.min.js");

const GEOIP_PROTO = \`
syntax = "proto3";
package router;
message CIDR { bytes ip = 1; uint32 prefix = 2; }
message GeoIP { string country_code = 1; repeated CIDR cidr = 2; }
message GeoIPList { repeated GeoIP entry = 1; }
\`;

const GEOSITE_PROTO = \`
syntax = "proto3";
package router;
message Domain { enum Type { Plain = 0; Regex = 1; RootDomain = 2; Full = 3; } Type type = 1; string value = 2; }
message GeoSite { string countryCode = 1; repeated Domain domain = 2; }
message GeoSiteList { repeated GeoSite entry = 1; }
\`;

const formatIp = (bytes) => {
    if (!bytes) return '';
    if (bytes.length === 4) return Array.from(bytes).join('.');
    if (bytes.length === 16) {
        const hex = [];
        for(let i=0; i<16; i+=2) hex.push(((bytes[i]<<8)|bytes[i+1]).toString(16));
        return hex.join(':').replace(/(^|:)0(:0)+/g, '::'); 
    }
    return '';
};

const fetchWithFallback = async (url, method = 'GET') => {
    let targets = [];
    const myProxy = \`https://crs.bropines.workers.dev/\${url}\`;
    
    if (url.includes('raw.githubusercontent.com')) {
        targets = [url, myProxy, \`https://mirror.ghproxy.com/\${url}\`];
    } else if (url.includes('github.com')) {
        targets = [myProxy, \`https://mirror.ghproxy.com/\${url}\`, \`https://ghproxy.net/\${url}\`, url];
    } else {
        targets = [url, myProxy];
    }
    
    let lastErr;
    for (const target of targets) {
        try {
            const res = await fetch(target, { method });
            if (res.ok) return res;
        } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("Failed to fetch from all proxies");
};

self.onmessage = async (e) => {
    const { type, customUrl, dataType, targetCode, cachedMeta, force, fileBuffer } = e.data;
    
    try {
        const isGeoSite = dataType === 'geosite' || type === 'geosite';
        const defaultUrl = isGeoSite 
            ? "https://cdn.jsdelivr.net/gh/v2fly/domain-list-community@release/dlc.dat" 
            : "https://cdn.jsdelivr.net/gh/v2fly/geoip@release/geoip.dat";
        const url = customUrl || defaultUrl;

        // БЕЗОПАСНАЯ ПРОВЕРКА Cache API (чтобы не падало на HTTP)
        const hasCacheApi = typeof caches !== 'undefined';
        let cache = null;
        
        if (hasCacheApi) {
            cache = await caches.open('geo-dat-binary-cache');
            if (force) await cache.delete(url);
        }

        const getBuffer = async () => {
            if (fileBuffer) return fileBuffer;
            
            if (hasCacheApi && cache) {
                const cachedRes = await cache.match(url);
                if (cachedRes) return await cachedRes.arrayBuffer();
            }

            let res;
            if (url.includes('jsdelivr.net')) res = await fetch(url);
            else res = await fetchWithFallback(url, 'GET');
            
            if (!res.ok) throw new Error("HTTP " + res.status);
            
            if (hasCacheApi && cache) {
                await cache.put(url, res.clone());
            }
            return await res.arrayBuffer();
        };

        // 1. Детализация тегов
        if (type === 'get_details') {
            const buffer = await getBuffer();
            
            const root = new protobuf.Root();
            protobuf.parse(isGeoSite ? GEOSITE_PROTO : GEOIP_PROTO, root);
            const ListType = root.lookupType(isGeoSite ? "router.GeoSiteList" : "router.GeoIPList");
            const object = ListType.toObject(ListType.decode(new Uint8Array(buffer)), { defaults: true });

            const target = object.entry.find(en => (en.countryCode || en.country_code) === targetCode);
            let list = [];
            if (target) {
                if (target.domain) list = target.domain.map(d => d.value);
                if (target.cidr) list = target.cidr.map(c => \`\${formatIp(c.ip)}/\${c.prefix}\`);
            }
            self.postMessage({ type: 'details', data: list.join('\\n') });
            return;
        }

        // 2. Обработка основных списков
        let meta = { etag: null, lastModified: null, size: null };
        let buffer;

        if (fileBuffer) {
            buffer = fileBuffer;
        } else {
            if (cachedMeta && !force) {
                try {
                    let headRes;
                    if (url.includes('jsdelivr.net')) headRes = await fetch(url, { method: 'HEAD' });
                    else headRes = await fetchWithFallback(url, 'HEAD');
                    
                    meta.etag = headRes.headers.get('etag');
                    meta.lastModified = headRes.headers.get('last-modified');
                    meta.size = headRes.headers.get('content-length');

                    const matchEtag = meta.etag && meta.etag === cachedMeta.etag;
                    const matchLastMod = meta.lastModified && meta.lastModified === cachedMeta.lastModified;
                    const matchSize = meta.size && meta.size === cachedMeta.size;

                    if (matchEtag || matchLastMod || matchSize) {
                        self.postMessage({ type: 'cache_hit', targetType: type });
                        return;
                    }
                } catch(err) { /* Игнорируем ошибки HEAD */ }
            }

            buffer = await getBuffer();

            if (hasCacheApi && cache) {
                const cachedRes = await cache.match(url);
                if (cachedRes) {
                     meta.etag = cachedRes.headers.get('etag');
                     meta.lastModified = cachedRes.headers.get('last-modified');
                     meta.size = cachedRes.headers.get('content-length');
                }
            }
        }

        const root = new protobuf.Root();
        protobuf.parse(isGeoSite ? GEOSITE_PROTO : GEOIP_PROTO, root);
        const ListType = root.lookupType(isGeoSite ? "router.GeoSiteList" : "router.GeoIPList");
        
        const message = ListType.decode(new Uint8Array(buffer));
        const object = ListType.toObject(message, { defaults: true });

        const result = object.entry.map(en => ({
            code: en.countryCode || en.country_code,
            count: (en.domain || en.cidr || []).length
        }));

        self.postMessage({ type: 'success', targetType: type, data: result, meta });

    } catch (err) {
        self.postMessage({ type: 'error', targetType: type, error: err.message });
    }
};
`;

export const createProtoWorker = () => {
    const blob = new Blob([workerCode], { type: "application/javascript" });
    return new Worker(URL.createObjectURL(blob));
};