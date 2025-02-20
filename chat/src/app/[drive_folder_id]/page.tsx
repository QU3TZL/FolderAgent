'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Camera, Mic, ArrowLeft } from 'lucide-react'
import { Editor } from "@/components/Editor"
import { motion, AnimatePresence } from 'framer-motion'
import { upgradeAuth } from "@/services/upgrade"

type Citation = {
    file_id: string;
    content_preview: string;
}

type ChatResponse = {
    query: string
    response: string
    timestamp: Date
    isStreaming?: boolean
    citations?: Citation[]
}

type DriveToken = {
    access_token: string;
    refresh_token: string;
    token_uri: string;
    client_id: string;
    client_secret: string;
    scope: string[];
};

type VerifyResponse = {
    id: string;
    email: string;
    state: string;
    drive_token?: DriveToken | null;
    [key: string]: any;
};

type RefreshResponse = {
    token: string;
    [key: string]: any;
};

interface APIResponse {
    ok: boolean;
    json(): Promise<any>;
    status: number;
}

interface ChatPageProps {
    params: {
        drive_folder_id: string;
    };
    searchParams?: {
        folder_id?: string;
    };
}

// Server Component wrapper for logging
function logServerSide(props: any) {
    console.log('[Server] Drive folder page props:', {
        params: props.params,
        searchParams: props.searchParams,
        env: process.env.NODE_ENV,
        upgradeUrl: process.env.NEXT_PUBLIC_UPGRADE_URL,
        upgradeApiUrl: process.env.NEXT_PUBLIC_UPGRADE_API_URL
    });
    return null;
}

export default function ChatPage({ params, searchParams }: ChatPageProps) {
    // Force server-side logging
    logServerSide({ params, searchParams });

    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [responses, setResponses] = useState<ChatResponse[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [folderName, setFolderName] = useState<string>('')
    const [folderUrl, setFolderUrl] = useState<string>('')
    const [dots, setDots] = useState('...')
    const [authToken, setAuthToken] = useState<string | null>(null)
    const [authError, setAuthError] = useState<string | null>(null)
    const [userData, setUserData] = useState<any>(null)
    const [hasEmbeddings, setHasEmbeddings] = useState<boolean>(true)
    const [vectorizationError, setVectorizationError] = useState<string | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // The drive_folder_id is the Google Drive folder ID
    const driveFolderId = params.drive_folder_id;
    // The folder_id is the Supabase UUID
    const folderId = searchParams?.folder_id;

    // Add more verbose client-side logging
    useEffect(() => {
        console.log('[Client] Initial mount:', {
            params,
            searchParams,
            env: process.env.NODE_ENV,
            upgradeUrl: process.env.NEXT_PUBLIC_UPGRADE_URL,
            upgradeApiUrl: process.env.NEXT_PUBLIC_UPGRADE_API_URL,
            localStorage: {
                hasToken: !!localStorage.getItem('auth_token'),
                token: localStorage.getItem('auth_token')?.substring(0, 20) + '...'
            }
        });
    }, [params, searchParams]);

    useEffect(() => {
        let isSubscribed = true;
        let retryCount = 0;
        const MAX_RETRIES = 3;
        const basePath = process.env.BASE_PATH || '/chat';

        const fetchFolderInfo = async () => {
            try {
                setIsAuthChecking(true);
                // 1. Get token (URL or localStorage)
                const urlParams = new URLSearchParams(window.location.search);
                const token = urlParams.get('token');
                let currentToken = token || localStorage.getItem('auth_token');

                console.log('[Auth Debug] Token check:', {
                    hasUrlToken: !!token,
                    urlToken: token ? token.substring(0, 20) + '...' : null,
                    hasLocalStorageToken: !!localStorage.getItem('auth_token'),
                    localStorageToken: localStorage.getItem('auth_token')?.substring(0, 20) + '...',
                    currentToken: currentToken ? currentToken.substring(0, 20) + '...' : 'missing',
                    upgradeUrl: process.env.NEXT_PUBLIC_UPGRADE_URL,
                    upgradeApiUrl: process.env.NEXT_PUBLIC_UPGRADE_API_URL,
                    nodeEnv: process.env.NODE_ENV,
                    searchParams: Object.fromEntries(urlParams.entries()),
                    pathname: window.location.pathname,
                    href: window.location.href
                });

                if (!currentToken) {
                    console.log('[Auth Debug] No token found:', {
                        url: process.env.NEXT_PUBLIC_UPGRADE_URL || 'http://localhost:8000',
                        currentLocation: window.location.href
                    });
                    // Redirect to upgrade for authentication
                    const upgradeUrl = process.env.NEXT_PUBLIC_UPGRADE_URL || 'http://localhost:8000';
                    window.location.href = upgradeUrl;
                    return;
                }

                // 2. Set initial state and clean URL
                if (isSubscribed) {
                    setAuthToken(currentToken);
                    localStorage.setItem('auth_token', currentToken);
                }
                if (token) {
                    const newUrl = window.location.pathname +
                        (searchParams?.folder_id ? `?folder_id=${searchParams.folder_id}` : '');
                    window.history.replaceState({}, '', newUrl);
                }

                // 3. Verify/refresh token and get user data
                const upgradeApiUrl = process.env.NEXT_PUBLIC_UPGRADE_API_URL || 'http://localhost:8000';
                upgradeAuth.setToken(currentToken);
                const verifyResponse = await upgradeAuth.getMe();

                let userData = null;
                if (verifyResponse.ok) {
                    console.log('[Debug] Auth response OK, getting user data');
                    userData = await verifyResponse.json();

                    // Log the full user data for debugging
                    console.log('[Debug] Full user data:', userData);

                    console.log('[Debug] User data received:', {
                        hasData: !!userData,
                        id: userData?.id,
                        email: userData?.email,
                        hasDriveToken: !!userData?.drive_token,
                        driveTokenType: typeof userData?.drive_token,
                        driveTokenKeys: userData?.drive_token ? Object.keys(userData.drive_token) : [],
                        driveTokenPreview: userData?.drive_token ?
                            (typeof userData.drive_token === 'string' ?
                                userData.drive_token.substring(0, 50) :
                                JSON.stringify(userData.drive_token).substring(0, 50)) + '...' : null,
                        fullDriveToken: userData?.drive_token // Temporary for debugging
                    });

                    if (!userData) {
                        console.log('[Debug] No user data received');
                        throw new Error('No user data received from UpGrade');
                    }

                    if (!userData.drive_token) {
                        console.log('[Debug] No drive token in user data:', userData);
                        throw new Error('No drive token in user data');
                    }

                    if (typeof userData.drive_token === 'string') {
                        try {
                            console.log('[Debug] Drive token is string:', userData.drive_token);
                            // Try to parse if it's a stringified JSON
                            const parsed = JSON.parse(userData.drive_token);
                            console.log('[Debug] Successfully parsed drive token:', {
                                parsedType: typeof parsed,
                                hasAccessToken: !!parsed.access_token,
                                hasRefreshToken: !!parsed.refresh_token,
                                keys: Object.keys(parsed),
                                fullParsed: parsed // Temporary for debugging
                            });
                            userData.drive_token = parsed;
                        } catch (e) {
                            console.error('[Debug] Failed to parse drive token:', {
                                error: e,
                                token: userData.drive_token
                            });
                            throw new Error('Invalid drive token format');
                        }
                    }

                    // Validate drive token structure if present
                    if (userData.drive_token) {
                        console.log('[Debug] Validating drive token structure:', {
                            tokenType: typeof userData.drive_token,
                            hasAccessToken: !!userData.drive_token?.access_token,
                            hasRefreshToken: !!userData.drive_token?.refresh_token,
                            hasTokenUri: !!userData.drive_token?.token_uri,
                            hasClientId: !!userData.drive_token?.client_id,
                            hasClientSecret: !!userData.drive_token?.client_secret,
                            hasScope: Array.isArray(userData.drive_token?.scope),
                            keys: Object.keys(userData.drive_token || {}),
                        });

                        // Only validate structure if drive token exists
                        if (typeof userData.drive_token !== 'object' ||
                            !userData.drive_token.access_token) {
                            console.warn('[Debug] Invalid drive token structure, proceeding without drive access:', {
                                hasToken: !!userData.drive_token,
                                tokenType: typeof userData.drive_token,
                                hasAccessToken: userData.drive_token && 'access_token' in userData.drive_token,
                                tokenKeys: userData.drive_token ? Object.keys(userData.drive_token) : []
                            });
                            // Set drive_token to null instead of throwing error
                            userData.drive_token = null;
                        }
                    }
                } else {
                    // Try refresh
                    const refreshResponse = await upgradeAuth.authenticatedRequest('POST', '/api/auth/refresh');

                    if (!refreshResponse.ok) {
                        throw new Error('Failed to refresh token');
                    }

                    const refreshData = await refreshResponse.json();
                    currentToken = refreshData.token;
                    if (isSubscribed && currentToken) {
                        localStorage.setItem('auth_token', currentToken);
                        setAuthToken(currentToken);
                        upgradeAuth.setToken(currentToken);
                    }

                    // Try verify again with new token
                    const retryVerify = await upgradeAuth.getMe();

                    if (!retryVerify.ok) {
                        throw new Error('Failed to verify token after refresh');
                    }

                    userData = await retryVerify.json();
                }

                if (!userData || !isSubscribed) {
                    throw new Error('Failed to get user data');
                }

                // 4. Store user data
                setUserData(userData);

                // 5. Get folder info if we have drive access
                if (userData.drive_token) {
                    try {
                        const folderResponse = await fetch(
                            `${basePath}/api/folder/${folderId || driveFolderId}`,
                            {
                                headers: {
                                    'Authorization': `Bearer ${currentToken}`,
                                    'X-User-ID': userData.id,
                                    'X-User-Creds': JSON.stringify(userData.drive_token),
                                    'X-Drive-Folder-ID': driveFolderId
                                }
                            }
                        );

                        if (!folderResponse.ok) {
                            const errorText = await folderResponse.text();
                            console.warn('Folder request failed:', {
                                status: folderResponse.status,
                                error: errorText
                            });
                            // Set default folder name but don't block chat
                            if (isSubscribed) {
                                setFolderName('Untitled Folder');
                                setFolderUrl(`https://drive.google.com/drive/folders/${driveFolderId}`);
                            }
                        } else {
                            const folderData = await folderResponse.json();
                            console.log('[Debug] Folder info response:', {
                                folderData,
                                name: folderData.name,
                                web_view_link: folderData.web_view_link,
                                driveFolderId,
                                folder_id: folderData.id
                            });
                            if (isSubscribed) {
                                setFolderName(folderData.name || 'Untitled Folder');
                                setFolderUrl(folderData.web_view_link || `https://drive.google.com/drive/folders/${driveFolderId}`);
                                // Store the Supabase UUID if we got it
                                if (folderData.id) {
                                    localStorage.setItem('folder_uuid', folderData.id);
                                }
                            }
                        }
                    } catch (error) {
                        console.warn('Failed to fetch folder info:', error);
                        // Set default folder name but don't block chat
                        if (isSubscribed) {
                            setFolderName('Untitled Folder');
                            setFolderUrl(`https://drive.google.com/drive/folders/${driveFolderId}`);
                        }
                    }
                } else {
                    // No drive access, set default folder name
                    if (isSubscribed) {
                        setFolderName('UpGrade Chat');
                        setFolderUrl('');
                    }
                }

                // 6. Get vectorization status
                try {
                    const statusResponse = await fetch(
                        `${basePath}/api/folder/${folderId || driveFolderId}/vectorization-status`,
                        {
                            headers: {
                                'Authorization': `Bearer ${currentToken}`,
                                'X-User-ID': userData.id,
                                'X-User-Creds': userData.drive_token,
                                'X-Drive-Folder-ID': driveFolderId
                            }
                        }
                    );

                    if (statusResponse.ok && isSubscribed) {
                        const statusData = await statusResponse.json();
                        console.log('[Debug] Vectorization status:', statusData);
                        // Only set hasEmbeddings to false if we explicitly know there are no embeddings
                        setHasEmbeddings(statusData.status === 'COMPLETED' || !!statusData.has_embeddings);
                        setVectorizationError(null);
                    } else {
                        // If we can't get status, assume embeddings are ready
                        console.log('[Debug] Vectorization status check failed, assuming embeddings exist');
                        setHasEmbeddings(true);
                    }
                } catch (error) {
                    // Don't block the UI for vectorization status errors
                    console.error('[Debug] Error checking vectorization status:', error);
                    setHasEmbeddings(false);
                }
            } catch (error) {
                console.error('Initialization failed:', error);
                if (isSubscribed) {
                    setFolderName('Error Loading Folder');
                    if (error instanceof Error) {
                        const errorMessage = error.message.toLowerCase();
                        console.log('[Auth Debug] Error details:', {
                            error: error.message,
                            stack: error.stack,
                            isTokenError: errorMessage.includes('token'),
                            isAuthError: errorMessage.includes('auth'),
                            isUnauthorized: errorMessage.includes('unauthorized'),
                            upgradeUrl: process.env.NEXT_PUBLIC_UPGRADE_URL,
                            nodeEnv: process.env.NODE_ENV
                        });

                        // DEBUGGING: Remove redirect
                        if (errorMessage.includes('token') ||
                            errorMessage.includes('auth') ||
                            errorMessage.includes('unauthorized')) {
                            console.log('[Auth Debug] Auth error would redirect to:', process.env.NEXT_PUBLIC_UPGRADE_URL || 'http://localhost:8000');
                        }
                    }
                }
            } finally {
                if (isSubscribed) {
                    setIsAuthChecking(false);
                }
            }
        };

        fetchFolderInfo();

        return () => {
            isSubscribed = false;
        };
    }, [driveFolderId, searchParams?.folder_id]);

    // Animate loading dots
    useEffect(() => {
        if (isLoading) {
            const interval = setInterval(() => {
                setDots(prev => prev.length >= 3 ? '.' : prev + '.');
            }, 500);
            return () => clearInterval(interval);
        }
    }, [isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim()) return;

        // Check for valid token
        const currentToken = authToken || localStorage.getItem('auth_token');
        if (!currentToken) {
            console.error('[Chat] No auth token available');
            const upgradeUrl = process.env.NEXT_PUBLIC_UPGRADE_URL || 'http://localhost:8000';
            window.location.href = upgradeUrl;
            return;
        }

        let queryNote = '';
        if (!hasEmbeddings) {
            queryNote = '\n\nNote: This folder is still being processed. Responses may be less accurate until processing completes.';
        }

        try {
            setIsLoading(true)

            // Add combined message immediately
            const newMessage = {
                query: input + queryNote,
                response: '',
                timestamp: new Date(),
                isStreaming: true,
                citations: []
            };
            setResponses(prev => [newMessage, ...prev]);

            console.log('Making chat request to:', `/chat/api/chat`);
            const storedFolderUuid = localStorage.getItem('folder_uuid');
            const response = await fetch(`/chat/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify({
                    query: input,
                    folder_id: storedFolderUuid || folderId,
                    drive_folder_id: driveFolderId,
                    user_id: userData?.id,
                    user_creds: userData?.drive_token ? userData.drive_token : null
                }),
            });

            // Check if response is ok before trying to parse JSON
            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                let errorMessage;

                if (contentType?.includes('application/json')) {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.detail || `Error ${response.status}: ${response.statusText}`;
                } else {
                    // Handle non-JSON responses
                    const text = await response.text();
                    console.error('Non-JSON error response:', text);
                    errorMessage = `Server error (${response.status}). Please try again.`;
                }

                throw new Error(errorMessage);
            }

            // Now we know we have a JSON response
            const data = await response.json();

            if (data.error) {
                console.error('Chat response error:', data.error);
                throw new Error(data.error);
            }

            // Validate the response structure
            if (!data.response || typeof data.response !== 'string') {
                throw new Error('Invalid response format from server');
            }

            // Stream in the response
            let streamedResponse = '';
            const responseText = data.response;

            for (let i = 0; i < responseText.length; i++) {
                streamedResponse += responseText[i];

                // Format the streamed text with paragraphs
                const formattedResponse = streamedResponse
                    .split('\n\n')
                    .map(p => p.trim())
                    .map(p => {
                        // Remove code block markers
                        p = p.replace(/^```(?:html|)\s*/, '').replace(/\s*```$/, '');
                        return `<p>${p}</p>`;
                    })
                    .join('');

                setResponses(prev => prev.map((r, idx) =>
                    idx === 0 ? {
                        ...r,
                        response: formattedResponse,
                        citations: data.citations
                    } : r
                ));

                await new Promise(resolve => setTimeout(resolve, 5));
            }

            // Mark as complete
            setResponses(prev => prev.map((r, idx) =>
                idx === 0 ? {
                    ...r,
                    isStreaming: false,
                    citations: data.citations
                } : r
            ));

            // Clear input
            setInput('');
            if (inputRef.current) {
                inputRef.current.focus();
            }

        } catch (error) {
            console.error('Chat request failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to get response';

            // Update the response with error
            setResponses(prev => prev.map((r, idx) =>
                idx === 0 ? {
                    ...r,
                    response: `Error: ${errorMessage}`,
                    isStreaming: false
                } : r
            ));

            // If it's an authentication error, redirect to upgrade
            if (errorMessage.includes('401') || errorMessage.includes('Authentication')) {
                const upgradeUrl = process.env.NEXT_PUBLIC_UPGRADE_URL || 'http://localhost:8000';
                window.location.href = upgradeUrl;
                return;
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResponseUpdate = (index: number, newContent: string) => {
        setResponses(prev =>
            prev.map((r, i) => i === index ? { ...r, response: newContent } : r)
        );
    };

    if (isAuthChecking) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="mb-4 text-lg font-semibold text-gray-700">Checking authentication...</div>
                    <div className="text-sm text-gray-500">Please wait while we verify your credentials</div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-screen min-h-screen bg-gray-50 flex justify-center items-start pt-4 px-5">
            <div className="w-full max-w-none min-h-screen flex flex-col border-none bg-white shadow-sm rounded-lg">
                <div className="flex-grow flex flex-col p-4">
                    <div className="sticky top-0 z-10 bg-white mb-4">
                        <div className="flex items-center justify-between mb-4">
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="rounded-full w-10 h-10 flex items-center justify-center bg-white border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                                onClick={() => window.history.back()}
                            >
                                <ArrowLeft className="h-4 w-4 text-gray-700" />
                                <span className="sr-only">Go back</span>
                            </Button>
                            <div className="text-lg font-semibold text-gray-900">
                                <a
                                    href={folderUrl || `https://drive.google.com/drive/folders/${params.drive_folder_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-blue-600 transition-colors"
                                >
                                    {folderName || 'UpGrade Chat'}
                                </a>
                            </div>
                            <div className="text-xs text-gray-600">{new Date().toLocaleDateString()}</div>
                        </div>
                        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                            <div className="flex-grow relative">
                                <Input
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={isLoading ? "Processing..." : "Type your message..."}
                                    className="rounded-full bg-white pr-12 h-10 min-h-[40px] border-gray-200 text-gray-900 placeholder:text-gray-500 focus:border-gray-300 focus:ring-gray-300 hover:border-gray-300 transition-colors"
                                    disabled={isLoading}
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    variant="outline"
                                    className="absolute right-0 top-0 rounded-full w-10 h-10 flex items-center justify-center bg-gray-900 hover:bg-gray-800 text-white border-transparent transition-colors disabled:bg-gray-300"
                                    disabled={isLoading}
                                >
                                    <Send className={`h-4 w-4 ${isLoading ? 'animate-pulse' : ''}`} />
                                    <span className="sr-only">Send message</span>
                                </Button>
                            </div>
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="rounded-full w-10 h-10 flex items-center justify-center bg-white border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors disabled:bg-gray-50"
                                disabled={isLoading}
                            >
                                <Mic className="h-4 w-4 text-gray-700" />
                                <span className="sr-only">Send voice message</span>
                            </Button>
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="rounded-full w-10 h-10 flex items-center justify-center bg-white border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors disabled:bg-gray-50"
                                disabled={isLoading}
                            >
                                <Camera className="h-4 w-4 text-gray-700" />
                                <span className="sr-only">Send image</span>
                            </Button>
                        </form>
                    </div>
                    <div ref={scrollRef} className="flex-grow overflow-y-auto space-y-3 sm:space-y-4">
                        <AnimatePresence mode="popLayout" initial={false}>
                            {responses.map((response, index) => (
                                <motion.div
                                    key={response.timestamp.getTime()}
                                    initial={{ opacity: 0, y: -20, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: 20, height: 0 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 30,
                                        mass: 1
                                    }}
                                    className="p-3 sm:p-4 rounded-lg bg-white border border-gray-100 hover:border-gray-200 transition-colors"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-baseline gap-2">
                                            <div className="text-xs text-gray-600 shrink-0">
                                                {response.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="flex-grow">
                                                <div dangerouslySetInnerHTML={{ __html: response.query }} className="text-sm text-gray-900" />
                                            </div>
                                        </div>
                                        <div className="prose max-w-none text-gray-700 [&_.tiptap]:px-0 [&_.tiptap]:py-0 [&_p]:mb-4 [&_p:last-child]:mb-0 text-[14px] leading-[1.35]">
                                            {response.isStreaming ? (
                                                <div className="min-h-[24px] [&_p]:mb-4 [&_p:last-child]:mb-0">
                                                    <div className="text-sm text-gray-500 italic">thinking{dots}</div>
                                                    {response.response && (
                                                        <div className="leading-[1.35]" dangerouslySetInnerHTML={{ __html: response.response }} />
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    <Editor
                                                        key={`editor-${response.timestamp.getTime()}`}
                                                        content={response.response}
                                                        onUpdate={(content) => {
                                                            // Only update if content has changed
                                                            if (content !== response.response) {
                                                                handleResponseUpdate(index, content);
                                                            }
                                                        }}
                                                        showToolbar={false}
                                                        immediatelyRender={false}
                                                        onSubmit={() => { }}
                                                    />
                                                    {response.citations && response.citations.length > 0 && (
                                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                                            <div className="text-xs text-gray-500 mb-2">Sources:</div>
                                                            <div className="space-y-2">
                                                                {response.citations.map((citation, idx) => (
                                                                    <div key={idx} className="text-xs text-gray-600">
                                                                        <div className="font-medium">{citation.file_id}</div>
                                                                        <div className="text-gray-500">{citation.content_preview}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
            {vectorizationError && (
                <div className="p-4 mb-4 text-amber-800 bg-amber-50 rounded-lg">
                    <p>{vectorizationError}</p>
                    <p className="text-sm mt-2">This usually takes a few minutes. The page will update automatically when ready.</p>
                </div>
            )}
        </div>
    )
} 