import { ChatRequest, ChatResponse, VectoriaError, SimilaritySearchRequest, ContextDocument, FileInfo, FileSearchResponse } from '@/types/vectoria';

/**
 * Client for interacting with Vectoria API
 */
export class VectoriaClient {
    private baseUrl: string;
    private maxRetries: number;

    constructor() {
        // In production, use the internal Render.com network URL
        this.baseUrl = process.env.VECTORIA_INTERNAL_URL || 'http://localhost:8001';
        if (!this.baseUrl) {
            throw new Error('VECTORIA_INTERNAL_URL environment variable is not set');
        }
        console.log('[VectoriaClient] Initialized with baseUrl:', this.baseUrl);
        this.maxRetries = 3;
    }

    /**
     * Search for files in a folder by name
     */
    async searchFiles(folder_id: string, file_name: string, authToken: string): Promise<FileInfo[]> {
        console.log('[VectoriaClient] Searching for files', {
            folder_id,
            file_name,
        });

        const response = await fetch(`${this.baseUrl}/api/folder/${folder_id}/files?name=${encodeURIComponent(file_name)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
        });

        if (!response.ok) {
            const errorData: VectoriaError = await response.json();
            throw new Error(errorData.detail || `Vectoria API error: ${response.status}`);
        }

        const data: FileSearchResponse = await response.json();
        console.log('[VectoriaClient] File search returned results', {
            folder_id,
            file_count: data.files.length,
        });

        return data.files;
    }

    /**
     * Generate current date and time context
     */
    private generateTimeContext(): string {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const timeStr = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
        });

        return `Current date and time: ${dateStr} at ${timeStr}`;
    }

    /**
     * Perform similarity search against folder documents
     * Can be limited to a specific file if file_id is provided
     */
    async searchSimilarDocuments(request: SimilaritySearchRequest, authToken: string): Promise<ContextDocument[]> {
        console.log('[VectoriaClient] Performing similarity search', {
            folder_id: request.folder_id,
            min_similarity: request.min_similarity,
            limit: request.limit,
            file_id: request.file_id,
            file_name: request.file_name,
        });

        const response = await fetch(`${this.baseUrl}/api/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const errorData: VectoriaError = await response.json();
            throw new Error(errorData.detail || `Vectoria API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('[VectoriaClient] Search returned results', {
            folder_id: request.folder_id,
            result_count: data.length,
            file_specific: !!request.file_id,
        });

        return data;
    }

    async getVectorizationStatus(folder_id: string, authToken: string): Promise<string> {
        // Implementation of getVectorizationStatus method
        throw new Error('Method not implemented');
    }
} 