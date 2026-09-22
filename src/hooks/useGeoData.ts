import { useState, useEffect } from 'react';
import { getDefaultGeoList } from '../utils/geo-data';
import { getSharedProtoWorker } from '../utils/proto-worker';

export const useGeoData = () => {
    const [geoSites, setGeoSites] = useState<string[]>([]);
    const [geoIps, setGeoIps] = useState<string[]>([]);
    // The fetch starts on mount, so the first render is already a loading one.
    const [loadingGeo, setLoadingGeo] = useState(true);

    useEffect(() => {
        // Ensure shared worker is initialized if needed
        getSharedProtoWorker();

        let isMounted = true;
        Promise.all([
            getDefaultGeoList('geosite'),
            getDefaultGeoList('geoip')
        ]).then(([sites, ips]) => {
            if (isMounted) {
                setGeoSites(sites);
                setGeoIps(ips);
                setLoadingGeo(false);
            }
        });
        return () => { isMounted = false; };
    }, []);

    return { geoSites, geoIps, loadingGeo };
};
