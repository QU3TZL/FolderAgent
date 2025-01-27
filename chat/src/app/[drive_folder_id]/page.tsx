'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Camera, Mic, ArrowLeft } from 'lucide-react'
import Editor from '@/components/Editor'
import { motion, AnimatePresence } from 'framer-motion'

type ChatResponse = {
    query: string
    response: string
    timestamp: Date
    isStreaming?: boolean
}

interface ChatPageProps {
    params: {
        drive_folder_id: string;
    };
}

export default function ChatPage({ params }: ChatPageProps) {
    const [responses, setResponses] = useState<ChatResponse[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [folderName, setFolderName] = useState<string>('')
    const [folderUrl, setFolderUrl] = useState<string>('')
    const [dots, setDots] = useState('...')
    const [authToken, setAuthToken] = useState<string | null>(null)
    const [authError, setAuthError] = useState<string | null>(null)
    const [userData, setUserData] = useState<any>(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // The drive_folder_id is the Google Drive folder ID
    const driveFolderId = params.drive_folder_id;

    useEffect(() => {
        const fetchFolderInfo = async () => {
            try {
                console.log('=== Starting fetchFolderInfo ===');
                console.log('Drive Folder ID:', driveFolderId);
                console.log('Current URL:', window.location.href);

                // Get token from URL or localStorage
                const urlParams = new URLSearchParams(window.location.search);
                const token = urlParams.get('token');

                if (token) {
                    // If token is in URL, store it
                    localStorage.setItem('auth_token', token);
                    setAuthToken(token);
                } else {
                    // Try to get token from localStorage
                    const storedToken = localStorage.getItem('auth_token');
                    if (!storedToken) {
                        // No token found, redirect to UpGrade
                        const upgradeUrl = process.env.NEXT_PUBLIC_UPGRADE_URL || 'http://localhost:8000';
                        console.log('No token found, redirecting to:', upgradeUrl);
                        window.location.href = upgradeUrl;
                        return;
                    }
                    setAuthToken(storedToken);
                }

                // First verify the token with UpGrade backend
                const upgradeApiUrl = process.env.NEXT_PUBLIC_UPGRADE_API_URL || 'http://localhost:8000';
                console.log('Verifying token with UpGrade API:', upgradeApiUrl);

                const verifyResponse = await fetch(`${upgradeApiUrl}/api/user/me`, {
                    headers: {
                        'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}`
                    }
                });

                if (!verifyResponse.ok) {
                    // Clear invalid token
                    localStorage.removeItem('auth_token');
                    setAuthToken(null);
                    setAuthError('Authentication failed. Please sign in to UpGrade first.');

                    // Redirect to UpGrade
                    const upgradeUrl = process.env.NEXT_PUBLIC_UPGRADE_URL || 'http://localhost:8000';
                    window.location.href = upgradeUrl;
                    return;
                }

                const userData = await verifyResponse.json();
                console.log('Token verified, raw user data:', userData);

                // Ensure we have the required fields
                if (!userData.id || !userData.drive_token) {
                    console.error('Missing required user data:', {
                        hasId: !!userData.id,
                        hasDriveToken: !!userData.drive_token
                    });
                    throw new Error('Incomplete user data. Please reconnect your Google Drive.');
                }

                // Validate drive_token is proper JSON
                try {
                    JSON.parse(userData.drive_token);
                } catch (e) {
                    console.error('Invalid drive_token format:', e);
                    throw new Error('Invalid Google Drive credentials. Please reconnect your Google Drive.');
                }

                // Store the complete user data
                setUserData(userData);
                localStorage.setItem('user_data', JSON.stringify(userData));

                // Get folder info from Vectoria using drive_folder_id
                console.log('Fetching folder info from Vectoria:', {
                    drive_folder_id: driveFolderId,
                    email: userData.email
                });

                const folderResponse = await fetch(
                    `/api/folder/${driveFolderId}`,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}`,
                            'X-User-ID': userData.id,
                            'X-User-Creds': userData.drive_token
                        }
                    }
                );

                if (!folderResponse.ok) {
                    const errorText = await folderResponse.text();
                    console.error('Failed to fetch folder from Vectoria:', {
                        status: folderResponse.status,
                        statusText: folderResponse.statusText,
                        error: errorText
                    });
                    throw new Error('Failed to access folder. Please try again.');
                }

                const folderData = await folderResponse.json();
                console.log('Folder data retrieved:', folderData);

                // Set folder info
                setFolderName(folderData.name || 'Untitled Folder');
                setFolderUrl(folderData.web_view_link || `https://drive.google.com/drive/folders/${driveFolderId}`);

                // Get vectorization status
                try {
                    console.log('Fetching vectorization status...');
                    const statusResponse = await fetch(
                        `/api/folder/${driveFolderId}/vectorization-status`,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}`,
                                'X-User-ID': userData.id,
                                'X-User-Creds': userData.drive_token
                            }
                        }
                    );

                    console.log('Vectorization status response:', statusResponse.status);
                    if (!statusResponse.ok) {
                        const errorText = await statusResponse.text();
                        console.warn('Failed to fetch vectorization status:', {
                            status: statusResponse.status,
                            statusText: statusResponse.statusText,
                            error: errorText
                        });
                    } else {
                        const statusData = await statusResponse.json();
                        console.log('Folder vectorization status:', statusData);

                        // Update folder name and URL if we got them from the status
                        if (statusData.name) {
                            setFolderName(statusData.name);
                            console.log('Updated folder name from status:', statusData.name);
                        }
                        if (statusData.web_view_link) {
                            setFolderUrl(statusData.web_view_link);
                            console.log('Updated folder URL from status:', statusData.web_view_link);
                        }

                        // Log processing status
                        if (statusData.processing_records?.length > 0) {
                            console.log('Processing records:', statusData.processing_records);
                        }
                        if (statusData.has_embeddings) {
                            console.log('Folder has embeddings');
                        }
                    }
                } catch (error) {
                    console.warn('Failed to fetch vectorization status:', {
                        error: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack : undefined
                    });
                }
            } catch (error) {
                console.error('=== fetchFolderInfo Failed ===');
                console.error('Error details:', {
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                });
                // Set a default folder name to show the error state
                setFolderName('Authentication Required');
            }
        };

        fetchFolderInfo();
    }, [driveFolderId]);

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
        if (!input.trim() || !authToken) return;

        try {
            setIsLoading(true)

            // Add combined message immediately
            const newMessage = {
                query: input,
                response: '',
                timestamp: new Date(),
                isStreaming: true
            };
            setResponses(prev => [newMessage, ...prev]);

            console.log('Making chat request to:', `/api/chat`);
            const response = await fetch(`/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    query: input,
                    folder_id: driveFolderId,
                    user_id: userData?.id,
                    user_creds: userData?.drive_token ? JSON.parse(userData.drive_token) : null
                }),
            });

            const data = await response.json();
            console.log('Chat response data:', data);

            if (!response.ok) {
                console.error('Chat request failed:', {
                    status: response.status,
                    data: data
                });
                throw new Error(data.error || data.detail || `Error ${response.status}: ${response.statusText}`);
            }

            if (data.error) {
                console.error('Chat response error:', data.error);
                throw new Error(data.error);
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
                    idx === 0 ? { ...r, response: formattedResponse } : r
                ));

                await new Promise(resolve => setTimeout(resolve, 5));
            }

            // Mark as complete
            setResponses(prev => prev.map((r, idx) =>
                idx === 0 ? { ...r, isStreaming: false } : r
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
        } finally {
            setIsLoading(false);
        }
    };

    const handleResponseUpdate = (index: number, newContent: string) => {
        setResponses(prev =>
            prev.map((r, i) => i === index ? { ...r, response: newContent } : r)
        );
    };

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
                                                <Editor
                                                    key={`editor-${response.timestamp.getTime()}`}
                                                    content={response.response}
                                                    onUpdate={(content) => handleResponseUpdate(index, content)}
                                                    showToolbar={false}
                                                    immediatelyRender={false}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    )
} 