import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

interface ChatResponse {
    response: string;
}

interface ErrorResponse {
    error: string;
    detail?: string;
    status?: number;
}

export async function POST(request: Request, { params }: { params: { drive_folder_id: string } }) {
    const startTime = Date.now();
    console.log(`[Chat] Starting chat request for folder ${params.drive_folder_id}`);

    try {
        // Parse request body
        const { query } = await request.json();
        if (!query) {
            console.error('[Chat] Missing query in request body');
            return NextResponse.json({
                error: 'Query is required',
                detail: 'The query parameter is missing from the request body'
            }, { status: 400 });
        }

        // Get backend URL
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (!backendUrl) {
            console.error('[Chat] Backend URL not configured');
            return NextResponse.json({
                error: 'Configuration error',
                detail: 'Backend URL not configured'
            }, { status: 500 });
        }

        // Forward request to UpGrade backend
        const url = `${backendUrl}/mini/api/chat/folder/${params.drive_folder_id}`;
        console.log(`[Chat] Forwarding request to ${url}`);

        try {
            // Get session cookie
            const cookieStore = cookies();
            const sessionCookie = cookieStore.get('session');

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(sessionCookie && { 'Cookie': `session=${sessionCookie.value}` })
                },
                body: JSON.stringify({ query }),
                credentials: 'include'
            });

            console.log(`[Chat] Backend responded with status ${response.status}`);
            const responseText = await response.text();

            // Handle non-200 responses
            if (!response.ok) {
                console.error(`[Chat] Backend error: ${responseText}`);
                let errorDetail: ErrorResponse;
                try {
                    errorDetail = JSON.parse(responseText);
                } catch {
                    errorDetail = { error: responseText };
                }

                return NextResponse.json({
                    error: 'Chat request failed',
                    detail: errorDetail.detail || errorDetail.error || 'Unknown error',
                    status: response.status
                }, { status: response.status });
            }

            // Parse successful response
            try {
                const data: ChatResponse = JSON.parse(responseText);
                const duration = Date.now() - startTime;
                console.log(`[Chat] Request completed in ${duration}ms`);
                return NextResponse.json(data);
            } catch (parseError: any) {
                console.error('[Chat] Failed to parse backend response:', parseError);
                return NextResponse.json({
                    error: 'Invalid response format',
                    detail: 'The backend returned an invalid JSON response',
                    responseText
                }, { status: 500 });
            }
        } catch (fetchError: any) {
            console.error('[Chat] Network error:', fetchError);
            return NextResponse.json({
                error: 'Network error',
                detail: `Failed to connect to backend: ${fetchError.message}`,
                url
            }, { status: 503 });
        }
    } catch (error: any) {
        console.error('[Chat] Unexpected error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            detail: error.message
        }, { status: 500 });
    }
} 