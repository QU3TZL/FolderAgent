import { NextRequest, NextResponse } from 'next/server';
import { upgradeAuth } from '@/services/upgrade';
import { supabase } from '@/lib/supabase';

// Define UpGrade response types
type DriveTokenStatus = 'VALID' | 'MISSING_TOKEN' | 'INVALID_TOKEN' | 'INVALID_CREDENTIALS';

interface ValidateTokenResponse {
    success: boolean;
    status: DriveTokenStatus;
    token?: {
        access_token: string;
        refresh_token: string;
        token_uri: string;
        client_id: string;
        client_secret: string;
        scope: string[];
    };
    error?: string;
}

async function getDriveToken(token: string): Promise<string | null> {
    try {
        const upgradeUrl = process.env.NEXT_PUBLIC_UPGRADE_API_URL?.replace('localhost', '127.0.0.1');
        if (!upgradeUrl) {
            throw new Error('NEXT_PUBLIC_UPGRADE_API_URL not configured');
        }

        // First get user data to get drive token
        console.log('[Folder API] Getting user data from UpGrade');
        const userResponse = await fetch(`${upgradeUrl}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!userResponse.ok) {
            console.error('[Folder API] Failed to get user data:', userResponse.status);
            return null;
        }

        const userData = await userResponse.json();
        if (!userData.drive_token) {
            console.error('[Folder API] No drive token in user data');
            return null;
        }

        console.log('[Folder API] Validating token with UpGrade');
        const response = await fetch(`${upgradeUrl}/api/drive/validate-token`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: userData.drive_token })
        });

        if (!response.ok) {
            console.error('[Folder API] Token validation failed:', response.status);
            return null;
        }

        const data = await response.json() as ValidateTokenResponse;
        console.log('[Folder API] Validation response:', {
            success: data.success,
            status: data.status
        });

        // Handle different token states
        switch (data.status) {
            case 'VALID':
                if (!data.token?.access_token) {
                    console.error('[Folder API] Valid status but no access token');
                    return null;
                }
                return data.token.access_token;

            case 'MISSING_TOKEN':
                console.error('[Folder API] User needs to reconnect Google Drive');
                return null;

            case 'INVALID_TOKEN':
                console.error('[Folder API] Token refresh failed');
                return null;

            case 'INVALID_CREDENTIALS':
                console.error('[Folder API] Invalid token structure');
                return null;

            default:
                console.error('[Folder API] Unknown token status:', data.status);
                return null;
        }
    } catch (error) {
        console.error('[Folder API] Token validation error:', error);
        return null;
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: { folder_id: string } }
) {
    try {
        console.log('[Folder API] Received request for folder:', params.folder_id);

        // Get token from Authorization header
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Get the drive_folder_id from header or params
        const driveFolderId = request.headers.get('X-Drive-Folder-ID') || params.folder_id;
        console.log('[Folder API] Using drive folder ID:', driveFolderId);

        // First try to get folder info from our database
        const { data: folderData, error } = await supabase
            .from('folders')
            .select('id, name, drive_folder_id')
            .eq('drive_folder_id', driveFolderId)
            .single();

        if (error) {
            console.error('[Folder API] Supabase error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch folder from database' },
                { status: 500 }
            );
        }

        if (!folderData) {
            console.error('[Folder API] No folder found in database');
            return NextResponse.json(
                { error: 'Folder not found' },
                { status: 404 }
            );
        }

        // Return folder info from our database
        return NextResponse.json({
            id: folderData.id,
            drive_folder_id: folderData.drive_folder_id,
            name: folderData.name,
            web_view_link: `https://drive.google.com/drive/folders/${driveFolderId}`
        });

    } catch (error) {
        console.error('[Folder API] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
} 