/**
 * Type definitions for Vectoria API interactions
 * Generated from Vectoria's OpenAPI specification
 */

/**
 * Request parameters for similarity search
 */
export interface SimilaritySearchRequest {
    folder_id: string;
    query: string;
    min_similarity?: number;
    limit?: number;
    file_id?: string;  // Optional file ID to limit search to specific file
    file_name?: string;  // Optional file name to search for matching files
}

/**
 * File information from Vectoria
 */
export interface FileInfo {
    file_id: string;
    file_name: string;
    web_view_link: string;
    folder_id: string;
    last_modified: string;
    mime_type: string;
}

/**
 * Response for file search
 */
export interface FileSearchResponse {
    files: FileInfo[];
    total_count: number;
}

/**
 * Request parameters for chat endpoint
 */
export interface ChatRequest {
    folder_id: string;
    query: string;
    temperature?: number;
    max_tokens?: number;
    system_context?: string;
    relevant_chunks?: ContextDocument[];  // Allow passing pre-fetched relevant chunks
    file_id?: string;  // Optional file ID to limit chat context to specific file
}

/**
 * Information about a specific citation from source documents
 */
export interface Citation {
    quote: string;
    chunk_index: number;
    chunk_start: number;
    chunk_end: number;
    file_name: string;
    file_id: string;
    web_view_link: string;
    similarity_score: number;
}

/**
 * Represents a specific chunk of text from a document
 */
export interface ContextChunk {
    chunk_index: number;
    chunk_text: string;
    chunk_start: number;
    chunk_end: number;
}

/**
 * Information about a document used for context
 */
export interface ContextDocument {
    file_name: string;
    file_id: string;
    web_view_link: string;
    similarity_score: number;
    chunks_used: ContextChunk[];
}

/**
 * Complete response from the chat endpoint
 */
export interface ChatResponse {
    response: string;
    citations: Citation[];
    context_used: ContextDocument[];
}

/**
 * Error response from Vectoria
 */
export interface VectoriaError {
    detail: string;
} 