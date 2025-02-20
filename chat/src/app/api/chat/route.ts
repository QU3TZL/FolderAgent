import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'
import { supabase } from '@/lib/supabase'
import { upgradeAuth } from '@/services/upgrade'
import { allowedOrigins, setCorsHeaders } from '@/lib/cors'

interface DocumentChunk {
    file_id: string;
    content: string;
    chunk_index: number;
    metadata: any;
    similarity: number;
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function getFolderUuid(drive_folder_id: string): Promise<string> {
    console.log('[Chat API] Getting Supabase UUID for Drive folder:', drive_folder_id);

    // Query the folders table
    const { data, error } = await supabase
        .from('folders')
        .select('id, drive_folder_id')
        .eq('drive_folder_id', drive_folder_id)
        .single();

    if (error) {
        console.error('[Chat API] Supabase error getting folder UUID:', error);
        console.error('[Chat API] Query details:', {
            table: 'folders',
            drive_folder_id,
            error_code: error.code,
            error_message: error.message,
            error_details: error.details
        });
        throw error;
    }

    if (!data) {
        console.error('[Chat API] No folder found with drive_folder_id:', drive_folder_id);
        throw new Error(`Folder not found in Supabase with drive_folder_id: ${drive_folder_id}`);
    }

    console.log('[Chat API] Found Supabase folder:', data);
    return data.id;
}

async function getRelevantContext(folder_id: string, query: string) {
    console.log('[Chat API] Generating embedding for query:', query);
    const embedding = await generateEmbedding(query);
    console.log('[Chat API] Generated embedding');

    console.log('[Chat API] Searching for relevant documents in folder:', folder_id);
    const rpcParams = {
        match_count: 5,
        match_threshold: 0.3,
        p_folder_id: folder_id,
        query_embedding: embedding
    };
    console.log('[Chat API] RPC params:', {
        match_count: rpcParams.match_count,
        match_threshold: rpcParams.match_threshold,
        p_folder_id: rpcParams.p_folder_id
    });

    const { data: chunks, error } = await supabase
        .rpc('match_documents_v2', rpcParams);

    if (error) {
        console.error('[Chat API] Supabase RPC error:', {
            error: String(error),
            params: rpcParams
        });
        // Don't throw error, just return empty array
        return [] as DocumentChunk[];
    }

    if (!chunks || chunks.length === 0) {
        console.log('[Chat API] No relevant chunks found, proceeding with general conversation');
        return [] as DocumentChunk[];
    }

    console.log('[Chat API] Found chunks:', {
        count: chunks?.length || 0,
        hasChunks: !!chunks,
        firstChunk: chunks?.[0] ? {
            file_id: chunks[0].file_id,
            content_preview: chunks[0].content.substring(0, 100) + '...',
            similarity: chunks[0].similarity,
            metadata: chunks[0].metadata
        } : null
    });

    return chunks as DocumentChunk[];
}

async function generateEmbedding(text: string) {
    try {
        console.log('[Chat API] Calling OpenAI embeddings API');
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text,
        });
        console.log('[Chat API] Successfully generated embedding');
        return response.data[0].embedding;
    } catch (error) {
        console.error('[Chat API] OpenAI embedding error:', error);
        throw error;
    }
}

async function refreshUpgradeToken(token: string): Promise<string | null> {
    try {
        const upgradeUrl = process.env.NEXT_PUBLIC_UPGRADE_API_URL?.replace('localhost', '127.0.0.1');
        if (!upgradeUrl) {
            throw new Error('NEXT_PUBLIC_UPGRADE_API_URL not configured');
        }

        const response = await fetch(`${upgradeUrl}/api/auth/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.token;
        }
        return null;
    } catch (error) {
        console.error('[Chat API] Token refresh failed:', error);
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        console.log('[Chat API] Received POST request');
        const body = await request.json();
        console.log('[Chat API] Request body:', {
            query: body.query,
            folder_id: body.folder_id,
            user_id: body.user_id
        });

        const { query, folder_id, user_id } = body;

        // Validate required fields
        if (!query) {
            console.log('[Chat API] No query provided');
            return NextResponse.json({ error: 'No query provided' }, { status: 400 });
        }

        if (!folder_id) {
            console.log('[Chat API] No folder_id provided');
            return NextResponse.json({ error: 'No folder_id provided' }, { status: 400 });
        }

        // Get token from Authorization header for basic auth
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!token) {
            console.log('[Chat API] No token provided');
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Set token in upgradeAuth client before making request
        upgradeAuth.setToken(token);

        // Basic auth check
        const authResponse = await upgradeAuth.getMe();
        if (!authResponse.ok) {
            console.log('[Chat API] Authentication failed:', await authResponse.text());
            return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
        }
        console.log('[Chat API] Authentication successful');

        console.log('[Chat API] Starting context retrieval');
        // Get relevant context from vector store using the folder UUID
        const relevantChunks = await getRelevantContext(folder_id, query);

        // Construct prompt with context
        console.log('[Chat API] Constructing prompt with', relevantChunks.length, 'chunks');
        let systemPrompt;

        if (relevantChunks.length > 0) {
            const contextText = relevantChunks.map(chunk => {
                const fileName = chunk.metadata?.file_name || chunk.file_id;
                return `Content from ${fileName}:\n${chunk.content}`;
            }).join('\n\n');

            systemPrompt = `You are a helpful assistant answering questions about documents. 
Use the following context to answer the question, and cite your sources using [file_name].
If you cannot answer the question based on the context, say so.

Context:
${contextText}`;
        } else {
            systemPrompt = `You are a helpful assistant answering questions about documents in this folder.
I can only answer questions about content that has already been processed and stored.
If you're asking about a specific document, it might not be processed yet.
I'll try to help with what information I have available.`;
        }

        // Generate response using OpenAI
        console.log('[Chat API] Calling OpenAI chat completion');
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });
        console.log('[Chat API] Received completion response');

        const response = {
            response: completion.choices[0].message.content,
            citations: relevantChunks.map(chunk => ({
                file_id: chunk.file_id,
                content_preview: chunk.content.substring(0, 200) + "..."
            }))
        };
        console.log('[Chat API] Sending response with', response.citations.length, 'citations');

        return NextResponse.json(response);

    } catch (error) {
        console.error('[Chat API] Error:', error);
        if (error instanceof Error) {
            console.error('[Chat API] Error stack:', error.stack);
        }
        return NextResponse.json(
            { error: 'Failed to process chat request' },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': allowedOrigins.join(','),
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400'
        }
    });
} 