export const createProtoWorker = () => {
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

self.onmessage = async (e) => {
    const msg = e.data;
    const { type, dataType, targetCode, customUrl, fileBuffer, cachedMeta, force, query } = msg;
    const isGeoSite = type === 'geosite' || dataType === 'geosite';

    try {
        let buffer = fileBuffer;

        const getBuffer = async () => {
            const url = customUrl || (isGeoSite ? "https://cdn.jsdelivr.net/gh/v2fly/domain-list-community@release/dlc.dat" : "https://cdn.jsdelivr.net/gh/v2fly/geoip@release/geoip.dat");
            const targets = [url, \`https://crs.bropines.workers.dev/\${url}\`, \`https://mirror.ghproxy.com/\${url}\`];
            for (const t of targets) {
                try {
                    const res = await fetch(t);
                    if (res.ok) return await res.arrayBuffer();
                } catch(err) {}
            }
            throw new Error("Failed to download DAT file");
        };

        if (!buffer && (type === 'get_details' || type === 'deep_search')) {
            buffer = await getBuffer();
        }

        // ==========================================
        // НОВАЯ ФИЧА: ГЛУБОКИЙ ПОИСК ПО СОДЕРЖИМОМУ
        // ==========================================
        if (type === 'deep_search') {
            const root = new protobuf.Root();
            protobuf.parse(isGeoSite ? GEOSITE_PROTO : GEOIP_PROTO, root);
            const ListType = root.lookupType(isGeoSite ? "router.GeoSiteList" : "router.GeoIPList");
            const message = ListType.decode(new Uint8Array(buffer));
            const object = ListType.toObject(message, { defaults: true });

            const q = query.toLowerCase();
            const results = [];

            for (const en of object.entry) {
                let match = false;
                if (isGeoSite) {
                    const domains = en.domain || [];
                    for (let i = 0; i < domains.length; i++) {
                        if (domains[i].value && domains[i].value.toLowerCase().includes(q)) {
                            match = true; break;
                        }
                    }
                } else {
                    const cidrs = en.cidr || [];
                    for (let i = 0; i < cidrs.length; i++) {
                        const ipStr = formatIp(cidrs[i].ip);
                        if (ipStr.includes(q)) { match = true; break; }
                    }
                }

                if (match) {
                    results.push({
                        code: en.countryCode || en.country_code,
                        count: (en.domain || en.cidr || []).length
                    });
                }
            }
            self.postMessage({ type: 'deep_search_result', data: results });
            return;
        }

        // ==========================================
        // ИЗВЛЕЧЕНИЕ ТЕКСТА ДЛЯ МОНАКО ЭДИТОРА
        // ==========================================
        if (type === 'get_details') {
            const root = new protobuf.Root();
            protobuf.parse(isGeoSite ? GEOSITE_PROTO : GEOIP_PROTO, root);
            const ListType = root.lookupType(isGeoSite ? "router.GeoSiteList" : "router.GeoIPList");
            const message = ListType.decode(new Uint8Array(buffer));
            const object = ListType.toObject(message, { defaults: true });

            const targetList = object.entry.find(en => (en.countryCode || en.country_code) === targetCode);
            if (!targetList) {
                self.postMessage({ type: 'details', data: '' });
                return;
            }

            let resultStr = "";
            if (isGeoSite) {
                resultStr = (targetList.domain || []).map(d => {
                    let prefix = "";
                    if (d.type === 1) prefix = "regexp:";
                    else if (d.type === 2) prefix = "domain:";
                    else if (d.type === 3) prefix = "full:";
                    return prefix + d.value;
                }).join('\\n');
            } else {
                resultStr = (targetList.cidr || []).map(c => \`\${formatIp(c.ip)}/\${c.prefix}\`).join('\\n');
            }

            self.postMessage({ type: 'details', data: resultStr });
            return;
        }

        // ==========================================
        // СТАНДАРТНАЯ ЗАГРУЗКА СПИСКА КАТЕГОРИЙ
        // ==========================================
        let meta = { timestamp: Date.now() };
        if (!buffer) {
            const url = isGeoSite ? "https://cdn.jsdelivr.net/gh/v2fly/domain-list-community@release/dlc.dat" : "https://cdn.jsdelivr.net/gh/v2fly/geoip@release/geoip.dat";
            if (!force && cachedMeta) {
                try {
                    const res = await fetch(url, { method: 'HEAD' });
                    if (res.ok) {
                        const etag = res.headers.get('etag');
                        const size = res.headers.get('content-length');
                        if ((etag && etag === cachedMeta.etag) || (size && size === cachedMeta.size)) {
                            self.postMessage({ type: 'cache_hit', targetType: type });
                            return;
                        }
                        meta.etag = etag; meta.size = size;
                    }
                } catch(err) {}
            }
            buffer = await getBuffer();
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
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
};