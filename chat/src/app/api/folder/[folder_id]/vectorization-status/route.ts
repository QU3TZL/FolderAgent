import { NextResponse } from 'next/server'

const VECTORIA_URL = process.env.VECTORIA_INTERNAL_URL || 'http://localhost:3000'

export async function GET(
    request: Request,
    { params }: { params: { folder_id: string } }
) {
    try {
        // Get vectorization status from Vectoria
        const statusResponse = await fetch(`${VECTORIA_URL}/api/folder/${params.folder_id}/status`);
        if (!statusResponse.ok) {
            console.error('[Vectorization API] Failed to get status:', statusResponse.status);
            return NextResponse.json(
                { error: 'Failed to get vectorization status' },
                { status: statusResponse.status }
            );
        }

        const statusData = await statusResponse.json();
        return NextResponse.json(statusData);
    } catch (error) {
        console.error('[Vectorization API] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get vectorization status' },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    });
} 