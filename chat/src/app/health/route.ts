import { NextResponse } from 'next/server'

interface HealthStatus {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    services: {
        [key: string]: {
            status: 'healthy' | 'unhealthy' | 'unknown';
            error?: string;
        };
    };
}

export async function GET() {
    const health: HealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            upgrade: { status: 'unknown' }
        }
    };

    // Check UpGrade API
    try {
        const upgradeUrl = process.env.NEXT_PUBLIC_UPGRADE_API_URL;
        console.log('[Health] Checking UpGrade health at:', upgradeUrl);

        if (!upgradeUrl) {
            throw new Error('NEXT_PUBLIC_UPGRADE_API_URL not configured');
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        console.log('[Health] Making request to:', `${upgradeUrl}/api/health`);
        const upgradeResponse = await fetch(`${upgradeUrl}/api/health`, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            },
            cache: 'no-store'
        }).catch(error => {
            console.error('[Health] Fetch error details:', {
                name: error.name,
                message: error.message,
                cause: error.cause,
                stack: error.stack
            });
            throw error;
        });

        clearTimeout(timeout);
        console.log('[Health] Response status:', upgradeResponse.status);

        if (!upgradeResponse.ok) {
            const errorBody = await upgradeResponse.text();
            console.error('[Health] Error response body:', errorBody);
            throw new Error(`HTTP ${upgradeResponse.status}: ${upgradeResponse.statusText}`);
        }

        const responseData = await upgradeResponse.json();
        console.log('[Health] UpGrade health response:', responseData);

        health.services.upgrade = { status: 'healthy' };
    } catch (error) {
        console.error('[Health] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Health check failed' },
            { status: 500 }
        );
    }

    // Determine overall health
    const isHealthy = Object.values(health.services).every(
        service => service.status === 'healthy'
    );
    health.status = isHealthy ? 'healthy' : 'unhealthy';

    return NextResponse.json(health, {
        status: isHealthy ? 200 : 503,
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
            'Vary': 'Origin',
            'Access-Control-Max-Age': '86400'
        }
    });
} 