import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { FileInfo } from '@/types/vectoria';
import { VectoriaClient } from '@/services/vectoria';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface FileChatProps {
    file: FileInfo;
    authToken: string;
}

export function FileChat({ file, authToken }: FileChatProps) {
    const [summary, setSummary] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function generateSummary() {
            try {
                const vectoria = new VectoriaClient();
                const response = await vectoria.chat({
                    folder_id: file.folder_id,
                    file_id: file.file_id,
                    query: "Please provide a concise summary of this document in less than 400 words. Focus on the main points and key takeaways.",
                }, authToken);

                setSummary(response.response);
            } catch (error) {
                console.error('Failed to generate summary:', error);
                setSummary('Unable to generate summary at this time.');
            } finally {
                setIsLoading(false);
            }
        }

        generateSummary();
    }, [file, authToken]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isSending) return;

        const userMessage: Message = {
            role: 'user',
            content: input,
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsSending(true);

        try {
            const vectoria = new VectoriaClient();
            const response = await vectoria.chat({
                folder_id: file.folder_id,
                file_id: file.file_id,
                query: input,
            }, authToken);

            const assistantMessage: Message = {
                role: 'assistant',
                content: response.response,
                timestamp: Date.now(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Failed to send message:', error);
            const errorMessage: Message = {
                role: 'assistant',
                content: 'Sorry, I encountered an error processing your message. Please try again.',
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Card className="w-full p-6 bg-gray-50 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-4">
                {/* File Title */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {file.file_name}
                    </h3>
                    <a
                        href={file.web_view_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                    >
                        View in Drive
                    </a>
                </div>

                {/* Summary Section */}
                <div className="prose prose-sm max-w-none">
                    {isLoading ? (
                        <div className="animate-pulse space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        </div>
                    ) : (
                        <div className="text-gray-700 text-sm leading-relaxed">
                            {summary}
                        </div>
                    )}
                </div>

                {/* Chat Messages */}
                <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
                    {messages.map((message, index) => (
                        <div
                            key={message.timestamp}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-900 border border-gray-200'
                                    }`}
                            >
                                {message.content}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
                    <Input
                        type="text"
                        placeholder="Ask about this document..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isSending}
                        className="flex-1"
                    />
                    <Button
                        type="submit"
                        disabled={isSending}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </Card>
    );
} 
