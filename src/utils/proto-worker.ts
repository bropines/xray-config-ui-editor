// Этот код будет выполняться в отдельном потоке
const workerCode = `
importScripts("https://cdn.jsdelivr.net/npm/protobufjs@7.2.4/dist/protobuf.min.js");

// Определения Protobuf из твоих файлов
const GEOIP_PROTO = \`
syntax = "proto3";
package router;
message CIDR {
  bytes ip = 1;
  uint32 prefix = 2;
}
message GeoIP {
  string country_code = 1;
  repeated CIDR cidr = 2;
}
message GeoIPList {
  repeated GeoIP entry = 1;
}
\`;

const GEOSITE_PROTO = \`
syntax = "proto3";
package router;
message Domain {
  enum Type { Plain = 0; Regex = 1; RootDomain = 2; Full = 3; }
  Type type = 1;
  string value = 2;
}
message GeoSite {
  string countryCode = 1;
  repeated Domain domain = 2;
}
message GeoSiteList {
  repeated GeoSite entry = 1;
}
\`;

self.onmessage = async (e) => {
    const { type } = e.data;
    
    try {
        const root = new protobuf.Root();
        
        let url, protoDef, messageType;
        
        if (type === 'geosite') {
            url = "https://cdn.jsdelivr.net/gh/v2fly/domain-list-community@release/dlc.dat";
            protoDef = GEOSITE_PROTO;
            messageType = "router.GeoSiteList";
        } else {
            url = "https://cdn.jsdelivr.net/gh/v2fly/geoip@release/geoip.dat";
            protoDef = GEOIP_PROTO;
            messageType = "router.GeoIPList";
        }

        // Парсим схему
        protobuf.parse(protoDef, root);
        const ListType = root.lookupType(messageType);

        // Качаем файл
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const arr = new Uint8Array(buffer);

        // Декодируем
        const message = ListType.decode(arr);
        const object = ListType.toObject(message, { defaults: true });

        // Упрощаем для поиска
        // Нам нужны только коды (cn, google, category-ads) и количество записей для инфо
        const result = object.entry.map(e => ({
            code: e.countryCode || e.country_code,
            count: (e.domain || e.cidr || []).length
        }));

        self.postMessage({ type, data: result });

    } catch (err) {
        console.error(err);
        self.postMessage({ type, error: err.message });
    }
};
`;

export const createProtoWorker = () => {
    const blob = new Blob([workerCode], { type: "application/javascript" });
    return new Worker(URL.createObjectURL(blob));
};