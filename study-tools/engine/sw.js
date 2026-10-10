const CACHE_NAME = 'studytools-v86';
const APP_SHELL = [
    './',
    'index.html',
    'css/styles.css',
    'js/core/utils.js',
    'js/core/progress.js',
    'js/core/achievements.js',
    'js/core/leaderboard.js',
    'tools/unit-access-core.js',
    'js/core/mastery.js',
    'js/core/command-palette.js',
    'js/core/read-aloud.js',
    'js/core/supabase-config.js',
    'js/core/app.js',
    'tools/tools.js',
    'js/data/map-1861-data.js',
    'js/data/civil-war-map-data.js',
    'js/data/civil-war-map-base.js',
    'js/data/colonial-geography-data.js',
    'js/data/underground-railroad-map-data.js',
    'js/data/underground-railroad-map-base.js',
    'js/data/fifty-states-data.js',
    'js/data/fifty-states-facts.js',
    'audio/tracks.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        // Precache straight from the server: right after a deploy the browser's
        // HTTP cache can still hold 10-minute-old copies of these files.
        caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL.map(url => new Request(url, { cache: 'reload' }))))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Network-first for API calls and Supabase
    if (url.hostname !== location.hostname) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache-first for audio files (large, rarely change)
    if (url.pathname.endsWith('.mp3')) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Network-first for the app shell, activities, and unit content; the cache
    // is only the offline fallback. The site is edited between classes, and
    // the previous stale-while-revalidate strategy could serve a mix of old
    // and new files (one activity's script from last month, the core from
    // today), which broke activities until a hard refresh.
    if (event.request.method !== 'GET') return;
    // cache: 'no-cache' revalidates with the server (ETag -> 304 when unchanged)
    // instead of trusting the browser's HTTP cache, which GitHub Pages fills
    // with 10-minute max-age entries that outlive a deploy.
    event.respondWith(
        fetch(event.request, { cache: 'no-cache' }).then(response => {
            if (response.ok) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
        }).catch(() => caches.match(event.request).then(cached =>
            cached || new Response('Offline', { status: 503, statusText: 'Offline' })
        ))
    );
});
