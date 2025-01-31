import { NextRequest, NextResponse } from 'next/server'
import { VectoriaClient } from '@/services/vectoria'
import { ChatRequest } from '@/types/vectoria'

const VECTORIA_URL = process.env.VECTORIA_INTERNAL_URL || 'http://localhost:3000'
console.log('[Chat API] Initialized with VECTORIA_URL:', VECTORIA_URL);

export async function POST(request: NextRequest) {
    try {
        console.log('[Chat API] Received POST request');
        const { query, folder_id } = await request.json();

        // Validate required fields
        if (!query) {
            console.log('[Chat API] No query provided');
            return NextResponse.json({ error: 'No query provided' }, { status: 400 });
        }

        if (!folder_id) {
            console.log('[Chat API] No folder_id provided');
            return NextResponse.json({ error: 'No folder_id provided' }, { status: 400 });
        }

        // Get token from Authorization header
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!token) {
            console.log('[Chat API] No token provided');
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Create chat request
        const chatRequest: ChatRequest = {
            folder_id,
            query,
        };

        // Initialize Vectoria client and send request
        console.log('[Chat API] Sending request to Vectoria');
        const vectoria = new VectoriaClient();
        const response = await vectoria.chat(chatRequest, token);

        console.log('[Chat API] Successfully received response from Vectoria');
        return NextResponse.json(response);

    } catch (error) {
        console.error('[Chat API] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    });
} 