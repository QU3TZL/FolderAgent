import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase';

// Use internal URL for server-to-server communication
const VECTORIA_URL = process.env.VECTORIA_INTERNAL_URL || process.env.VECTORIA_BASE_URL || 'http://localhost:8001';
// Use public URL for CORS origin
const VECTORIA_PUBLIC = process.env.VECTORIA_PUBLIC_URL || 'http://localhost:8001';
const UPGRADE_PUBLIC = process.env.UPGRADE_PUBLIC_URL || process.env.NEXT_PUBLIC_UPGRADE_URL || 'http://localhost:8000';

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 100): Promise<Response> {
    try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            console.log(`[Vectorization API] Retrying request (${retries} attempts left)`);
            return fetchWithRetry(url, options, retries - 1, delay * 2);
        }
        throw error;
    }
}

export async function GET(
    request: Request,
    { params }: { params: { folder_id: string } }
) {
    try {
        const driveFolderId = request.headers.get('X-Drive-Folder-ID');
        const folderId = params.folder_id;

        // If we have a drive_folder_id, use it directly
        let targetFolderId = driveFolderId || folderId;

        // If we don't have a drive_folder_id, look up the folder in Supabase first
        if (!driveFolderId) {
            const { data: folderData, error } = await supabase
                .from('folders')
                .select('drive_folder_id')
                .eq('id', folderId)
                .single();

            if (error) {
                console.error('[Vectorization API] Supabase error:', error);
                return NextResponse.json(
                    { error: 'Failed to fetch folder from database', detail: error.message },
                    { status: 500 }
                );
            }

            if (!folderData) {
                return NextResponse.json(
                    { error: 'Folder not found' },
                    { status: 404 }
                );
            }

            targetFolderId = folderData.drive_folder_id;
        }

        // Get vectorization status from Vectoria
        console.log('[Vectorization API] Requesting status from Vectoria:', {
            url: `${VECTORIA_URL}/api/folder/${targetFolderId}/status`,
            vectoriaUrl: VECTORIA_URL,
            targetFolderId,
            env: process.env.NODE_ENV
        });

        try {
            const statusResponse = await fetchWithRetry(
                `${VECTORIA_URL}/api/folder/${targetFolderId}/status`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Origin': UPGRADE_PUBLIC,
                        'Host': new URL(VECTORIA_URL).host
                    },
                    mode: 'cors',
                    credentials: 'include',
                    next: { revalidate: 0 }
                }
            );

            const statusData = await statusResponse.json();
            console.log('[Vectorization API] Status received:', {
                status: statusData.status,
                has_embeddings: statusData.has_embeddings,
                total_files: statusData.total_files,
                completed_files: statusData.completed_files
            });
            return NextResponse.json(statusData);
        } catch (error) {
            console.error('[Vectorization API] Fetch error:', {
                error: error instanceof Error ? {
                    message: error.message,
                    stack: error.stack,
                    cause: error.cause
                } : String(error),
                vectoriaUrl: VECTORIA_URL,
                env: process.env.NODE_ENV,
                request: {
                    url: `${VECTORIA_URL}/api/folder/${targetFolderId}/status`,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Origin': UPGRADE_PUBLIC,
                        'Host': new URL(VECTORIA_URL).host
                    }
                }
            });

            // Return a default response when vectorization service is unavailable
            // Check database for embeddings instead of assuming none exist
            const { data: embeddingsData, error: embeddingsError } = await supabase
                .from('document_chunks')
                .select('id', { count: 'exact' })
                .eq('folder_id', folderId)
                .limit(1);

            const hasEmbeddings = !embeddingsError && embeddingsData && embeddingsData.length > 0;

            return NextResponse.json({
                status: 'COMPLETED',
                has_embeddings: hasEmbeddings,
                total_files: hasEmbeddings ? 1 : 0,
                completed_files: hasEmbeddings ? 1 : 0,
                unsupported_files: 0
            });
        }
    } catch (error) {
        console.error('[Vectorization API] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get vectorization status' },
            { status: 500 }
        );
    }
} 