export const API_BASE = 'https://ezanvakti.emushaf.net';

export function createApiClient() {
    const requestCache = new Map();

    async function fetchJson(url, useCache = true) {
        if (useCache && requestCache.has(url)) {
            return requestCache.get(url);
        }

        const request = fetch(url).then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        });

        if (!useCache) {
            return request;
        }

        requestCache.set(url, request);
        try {
            return await request;
        } catch (err) {
            requestCache.delete(url);
            throw err;
        }
    }

    return { fetchJson };
}
