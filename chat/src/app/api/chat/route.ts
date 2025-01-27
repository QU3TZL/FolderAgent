import { NextRequest, NextResponse } from 'next/server'

const VECTORIA_URL = process.env.VECTORIA_INTERNAL_URL || 'http://localhost:3000'
console.log('[Chat API] Initialized with VECTORIA_URL:', VECTORIA_URL);

export async function POST(request: NextRequest) {
    try {
        console.log('[Chat API] Received POST request');
        const { query, folder_id, user_id, user_creds } = await request.json();

        if (!query) {
            console.log('[Chat API] No query provided');
            return NextResponse.json({ error: 'No query provided' }, { status: 400 });
        }

        if (!folder_id) {
            console.log('[Chat API] No folder_id provided');
            return NextResponse.json({ error: 'No folder_id provided' }, { status: 400 });
        }

        if (!user_id || !user_creds) {
            console.log('[Chat API] Missing user credentials');
            return NextResponse.json({ error: 'Missing user credentials' }, { status: 400 });
        }

        // Get token from Authorization header
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!token) {
            console.log('[Chat API] No token provided');
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        console.log('[Chat API] Making request to vectoria chat endpoint');
        if (!VECTORIA_URL) {
            console.log('[Chat API] No VECTORIA_URL configured');
            return NextResponse.json({ error: 'Vectoria URL not configured' }, { status: 500 });
        }

        const chatEndpoint = `${VECTORIA_URL}/api/chat`;
        console.log('[Chat API] Using chat endpoint:', chatEndpoint);

        const response = await fetch(chatEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                folder_id,
                query,
                user_id,
                user_creds
            }),
        });

        if (!response.ok) {
            console.log('[Chat API] Error from chat endpoint:', response.status, await response.text());
            return NextResponse.json({ error: 'Chat request failed' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('[Chat API] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, X-User-Creds',
        }
    });
} 