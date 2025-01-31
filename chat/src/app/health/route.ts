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
            upgrade: { status: 'unknown' },
            vectoria: { status: 'unknown' }
        }
    };

    // Check UpGrade API
    try {
        const upgradeUrl = process.env.NEXT_PUBLIC_UPGRADE_API_URL;
        if (!upgradeUrl) {
            throw new Error('NEXT_PUBLIC_UPGRADE_API_URL not configured');
        }

        const upgradeResponse = await fetch(`${upgradeUrl}/health`);
        if (!upgradeResponse.ok) {
            throw new Error(`HTTP ${upgradeResponse.status}: ${upgradeResponse.statusText}`);
        }
        health.services.upgrade = { status: 'healthy' };
    } catch (error) {
        console.error('[Health] UpGrade health check failed:', error);
        health.services.upgrade = {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : String(error)
        };
    }

    // Check Vectoria API
    try {
        const vectoriaUrl = process.env.VECTORIA_INTERNAL_URL;
        if (!vectoriaUrl) {
            throw new Error('VECTORIA_INTERNAL_URL not configured');
        }

        const vectoriaResponse = await fetch(`${vectoriaUrl}/health`);
        if (!vectoriaResponse.ok) {
            throw new Error(`HTTP ${vectoriaResponse.status}: ${vectoriaResponse.statusText}`);
        }
        health.services.vectoria = { status: 'healthy' };
    } catch (error) {
        console.error('[Health] Vectoria health check failed:', error);
        health.services.vectoria = {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : String(error)
        };
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
            'Expires': '0'
        }
    });
}

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
} 