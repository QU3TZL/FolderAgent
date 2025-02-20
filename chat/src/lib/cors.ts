export const allowedOrigins = [
    // Production
    'https://vectoria.onrender.com',
    'https://tryupgrade.live',

    // Internal
    'http://vectoria:10000',
    'http://upgrade-hwae:10000',

    // Development
    'http://localhost:8000',
    'http://localhost:8001',
    'http://127.0.0.1:8000',
    'http://[::1]:8000',
    'http://127.0.0.1:8001',
    'http://[::1]:8001'
];

export function setCorsHeaders(headers: Headers, origin: string | null) {
    if (origin && allowedOrigins.includes(origin)) {
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Access-Control-Allow-Credentials', 'true');
    }
    headers.set('Vary', 'Origin');
} 