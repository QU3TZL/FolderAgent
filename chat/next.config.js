const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    basePath: '/chat',
    async headers() {
        const upgradeUrl = process.env.NEXT_PUBLIC_UPGRADE_URL || 'http://localhost:8000';
        const vectoriaUrl = process.env.NEXT_PUBLIC_VECTORIA_URL || 'http://localhost:8001';
        const upgradeInternalUrl = process.env.UPGRADE_INTERNAL_URL;
        const vectoriaInternalUrl = process.env.VECTORIA_INTERNAL_URL;

        // Define allowed origins based on environment
        const allowedOrigins = process.env.NODE_ENV === 'development'
            ? [
                // Development URLs
                'http://localhost:8000', 'http://127.0.0.1:8000',
                'http://localhost:8001', 'http://127.0.0.1:8001',
                'http://localhost:3000', 'http://127.0.0.1:3000',
                // IPv6 localhost
                'http://[::1]:8000',
                'http://[::1]:8001',
                'http://[::1]:3000'
            ]
            : [
                // Production URLs
                'https://vectoria.onrender.com',
                'https://tryupgrade.live',
                'https://admin.vectoria.live',
                // Dynamic service URLs
                upgradeUrl,
                vectoriaUrl,
                // Internal service URLs (if configured)
                ...(upgradeInternalUrl ? [upgradeInternalUrl] : []),
                ...(vectoriaInternalUrl ? [vectoriaInternalUrl] : []),
                // Internal Kubernetes service URLs
                'http://vectoria:10000',
                'http://upgrade-hwae:10000'
            ];

        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: process.env.NODE_ENV === 'development'
                            ? '*'  // In development, allow all origins
                            : allowedOrigins.filter(Boolean).join(',')  // In production, be specific
                    },
                    {
                        key: 'Access-Control-Allow-Methods',
                        value: 'GET, POST, OPTIONS'
                    },
                    {
                        key: 'Access-Control-Allow-Headers',
                        value: 'Content-Type, Authorization, X-Drive-Folder-ID, X-User-ID, X-User-Creds'
                    },
                    {
                        key: 'Access-Control-Allow-Credentials',
                        value: 'true'
                    },
                    {
                        key: 'Access-Control-Max-Age',
                        value: '86400'
                    },
                    {
                        key: 'Vary',
                        value: 'Origin'
                    }
                ]
            }
        ];
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.googleusercontent.com',
            },
        ],
        domains: ['localhost', 'upgrade-alpha-ui.onrender.com', 'upgrade-alpha-api.onrender.com'],
    },
    experimental: {
        esmExternals: 'loose'
    },
    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            '@': path.resolve(__dirname, './src')
        };
        // Add fallback for node modules
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            net: false,
            tls: false
        };
        return config;
    }
}

module.exports = nextConfig 