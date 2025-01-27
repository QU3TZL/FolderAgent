'use client'

import React, { useState, useRef, useEffect, useCallback, KeyboardEvent, ChangeEvent } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Camera, Mic, Type, Highlighter, Italic, ListOrdered, Bold, Underline as UnderlineIcon, ImageIcon, ArrowLeft } from 'lucide-react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import TextStyle from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import { motion, AnimatePresence } from "framer-motion"
import { MenuBarProps, TipTapEditorProps, Message } from '@/types/editor'

const editorStyles = `
  .tiptap {
    :first-child {
      margin-top: 0;
    }

    img {
      display: block;
      width: calc(100% + 2rem);
      max-width: none;
      margin: -1rem -1rem 1.5rem -1rem;
      aspect-ratio: 19/9;
      object-fit: cover;
    }
  }
`;

type EditorAction = {
    name: 'bold' | 'italic' | 'underline' | 'highlight' | 'bulletList' | 'heading-1' | 'heading-2' | 'heading-3';
    icon?: React.ReactNode;
    label?: string;
};

const MenuBar = ({ editor, onAddImage }: MenuBarProps) => {
    const [isAddingImage, setIsAddingImage] = useState(false);
    const [imagePrompt, setImagePrompt] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleAddImage = () => {
        if (isAddingImage && imagePrompt.trim()) {
            onAddImage(imagePrompt);
            setImagePrompt('');
            setIsAddingImage(false);
        } else {
            setIsAddingImage(!isAddingImage);
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    };

    if (!editor) {
        return null;
    }

    const actions: EditorAction[] = [
        { name: 'bold', icon: <Bold className="w-4 h-4" /> },
        { name: 'italic', icon: <Italic className="w-4 h-4" /> },
        { name: 'underline', icon: <UnderlineIcon className="w-4 h-4" /> },
        { name: 'highlight', icon: <Highlighter className="w-4 h-4" /> },
        { name: 'bulletList', icon: <ListOrdered className="w-4 h-4" /> },
        { name: 'heading-1', label: 'H1' },
        { name: 'heading-2', label: 'H2' },
        { name: 'heading-3', label: 'H3' },
    ];

    const handleAction = (action: EditorAction) => {
        if (action.name.startsWith('heading')) {
            const level = parseInt(action.name.split('-')[1]) as 1 | 2 | 3;
            editor.chain().focus().toggleHeading({ level }).run();
        } else if (action.name === 'bulletList') {
            editor.chain().focus().toggleBulletList().run();
        } else {
            switch (action.name) {
                case 'bold':
                    editor.chain().focus().toggleBold().run();
                    break;
                case 'italic':
                    editor.chain().focus().toggleItalic().run();
                    break;
                case 'underline':
                    editor.chain().focus().toggleUnderline().run();
                    break;
                case 'highlight':
                    editor.chain().focus().toggleHighlight().run();
                    break;
            }
        }
    };

    return (
        <div className="flex flex-wrap gap-2 p-2 rounded-t-lg relative overflow-hidden">
            <div className={`flex transition-all duration-300 ease-in-out ${isAddingImage ? 'opacity-0' : 'opacity-100'}`}>
                {actions.map((action) => (
                    <Button
                        key={action.name}
                        size="icon"
                        variant="outline"
                        onClick={() => handleAction(action)}
                        className={`rounded-full w-8 h-8 flex items-center justify-center ${editor.isActive(action.name) ? 'bg-primary text-primary-foreground' : 'bg-[#f4f0e8]'}`}
                    >
                        {action.icon || action.label}
                    </Button>
                ))}
                {['Serif', 'Sans'].map((font) => (
                    <Button
                        key={font}
                        variant="outline"
                        onClick={() => editor.chain().focus().setFontFamily(font === 'Serif' ? 'Georgia' : 'Inter').run()}
                        className={`rounded-full px-3 py-1 text-xs ${editor.isActive('textStyle', { fontFamily: font === 'Serif' ? 'Georgia' : 'Inter' }) ? 'bg-primary text-primary-foreground' : 'bg-[#f4f0e8]'}`}
                    >
                        {font}
                    </Button>
                ))}
            </div>
            <div
                className={`absolute right-2 top-2 flex items-center justify-end transition-all duration-300 ease-in-out ${isAddingImage ? 'w-full' : 'w-auto'}`}
            >
                <div className={`flex items-center transition-all duration-300 ease-in-out ${isAddingImage ? 'w-full' : 'w-0'} overflow-hidden`}>
                    <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Enter image description..."
                        value={imagePrompt}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setImagePrompt(e.target.value)}
                        className="w-full rounded-l-full"
                        onKeyPress={(e: KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter') {
                                handleAddImage();
                            }
                        }}
                    />
                </div>
                <Button
                    variant="outline"
                    onClick={handleAddImage}
                    className={`rounded-full px-3 py-1 text-xs bg-[#f4f0e8] whitespace-nowrap ${isAddingImage ? 'rounded-l-none' : ''}`}
                >
                    <ImageIcon className="w-4 h-4 mr-1" />
                    {isAddingImage ? 'Add' : 'Add Image'}
                </Button>
            </div>
        </div>
    )
}

const TipTapEditor = ({ content, onUpdate, showToolbar, onFocus }: TipTapEditorProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const [editorContent, setEditorContent] = useState(content);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Highlight,
            TextStyle,
            FontFamily,
            Underline,
            Image.configure({
                HTMLAttributes: {
                    class: 'w-full h-auto',
                },
            }),
        ],
        content: editorContent,
        onUpdate: ({ editor }) => {
            const newContent = editor.getHTML();
            setEditorContent(newContent);
            onUpdate(newContent);
        },
        onFocus: () => {
            setIsFocused(true);
            onFocus();
        },
        onBlur: () => {
            setIsFocused(false);
        },
        editorProps: {
            attributes: {
                class: 'prose max-w-none focus:outline-none',
            },
        },
    }, []);

    useEffect(() => {
        if (editor && content !== editorContent) {
            editor.commands.setContent(content);
            setEditorContent(content);
        }
    }, [content, editor]);

    const addImage = (prompt: string) => {
        if (editor) {
            editor.chain().focus().setImage({
                src: `/placeholder.svg?height=900&width=1900&text=${encodeURIComponent(prompt)}`,
                alt: prompt,
                title: prompt
            }).run();
        }
    };

    return (
        <div className="w-full flex flex-col rounded-md overflow-hidden">
            {showToolbar && editor && (
                <div className="bg-[#f4f0e8] border-b">
                    <MenuBar editor={editor} onAddImage={addImage} />
                </div>
            )}
            <EditorContent
                editor={editor}
                className="prose max-w-none [&_p]:leading-[1.15] [&_li]:leading-[1.15] [&_h1]:leading-[1.15] [&_h2]:leading-[1.15] [&_h3]:leading-[1.15] [&>div>*:first-child]:mt-0 [&>div>*:first-child]:pt-1 tiptap p-4"
            />
        </div>
    )
}

export default function ChatInterface({ folderUuid }: { folderUuid: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showTipTapMenu, setShowTipTapMenu] = useState(false);
    const [activeEditorIndex, setActiveEditorIndex] = useState<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: input,
            timestamp: Date.now()
        };

        setMessages(prev => [userMessage, ...prev]);
        setInput('');
        setIsLoading(true);

        try {
            console.log('Making chat request with folder:', folderUuid);
            const token = localStorage.getItem('auth_token');
            const userData = JSON.parse(localStorage.getItem('user_data') || '{}');

            if (!token) {
                throw new Error('Authentication token missing. Please sign in again.');
            }
            if (!userData.id) {
                throw new Error('User ID missing. Please sign in again.');
            }
            if (!userData.drive_token) {
                throw new Error('Drive credentials missing. Please reconnect your Google Drive.');
            }

            const response = await fetch(`/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    query: input,
                    folder_id: folderUuid,
                    user_id: userData.id,
                    user_creds: JSON.parse(userData.drive_token)
                }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            // Start streaming the response
            const assistantMessage: Message = {
                role: 'assistant',
                content: '',
                timestamp: Date.now(),
                isStreaming: true
            };

            setMessages(prev => [assistantMessage, ...prev]);
            setActiveEditorIndex(0);

            // Stream in the response character by character
            const text = data.response;
            let currentText = '';
            for (let i = 0; i < text.length; i++) {
                currentText += text[i];
                setMessages(prev => prev.map((msg, idx) =>
                    idx === 0 ? { ...msg, content: currentText } : msg
                ));
                await new Promise(resolve => setTimeout(resolve, 20));
            }

            // Mark streaming as complete
            setMessages(prev => prev.map((msg, idx) =>
                idx === 0 ? { ...msg, isStreaming: false } : msg
            ));

        } catch (error) {
            console.error('Failed to send message:', error);
            const errorMessage: Message = {
                role: 'assistant',
                content: 'Sorry, I encountered an error processing your message. Please try again.',
                timestamp: Date.now()
            };
            setMessages(prev => [errorMessage, ...prev]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [messages]);

    const handleResponseUpdate = useCallback((index: number, newContent: string) => {
        setMessages(prev =>
            prev.map((r, i) => i === index ? { ...r, content: newContent } : r)
        );
    }, []);

    const toggleTipTapMenu = () => {
        setShowTipTapMenu(!showTipTapMenu);
        if (!showTipTapMenu) {
            setActiveEditorIndex(null);
        }
    };

    return (
        <div className="w-screen min-h-screen bg-[#f4f0e8] flex justify-center items-start pt-4 px-5">
            <Card className="w-full max-w-none min-h-screen flex flex-col border-none bg-[#f4f0e8] shadow-none">
                <CardContent className="flex-grow flex flex-col p-4">
                    <div className="sticky top-0 z-10 bg-[#f4f0e8] mb-4">
                        <div className="flex items-center justify-between mb-4">
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="rounded-full w-10 h-10 flex items-center justify-center bg-[#f4f0e8]"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Go back</span>
                            </Button>
                            <div className="text-lg font-semibold">Folder: {folderUuid}</div>
                            <div className="text-sm text-gray-500">{new Date().toLocaleDateString()}</div>
                        </div>
                        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                            <div className="flex-grow relative">
                                <Input
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type your message..."
                                    className="rounded-full bg-white pr-12 h-10 min-h-[40px]"
                                    disabled={isLoading}
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    variant="outline"
                                    disabled={isLoading}
                                    className="absolute right-0 top-0 rounded-full w-10 h-10 flex items-center justify-center bg-black text-white"
                                >
                                    <Send className="h-4 w-4" />
                                    <span className="sr-only">Send message</span>
                                </Button>
                            </div>
                            <Button
                                type="button"
                                size="icon"
                                variant={showTipTapMenu ? "default" : "outline"}
                                className={`rounded-full w-10 h-10 flex items-center justify-center ${showTipTapMenu ? 'bg-black text-white' : 'bg-[#f4f0e8]'}`}
                                onClick={toggleTipTapMenu}
                            >
                                <Type className="h-4 w-4" />
                                <span className="sr-only">Toggle TipTap menu</span>
                            </Button>
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="rounded-full w-10 h-10 flex items-center justify-center bg-[#f4f0e8]"
                            >
                                <Mic className="h-4 w-4" />
                                <span className="sr-only">Send voice message</span>
                            </Button>
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="rounded-full w-10 h-10 flex items-center justify-center bg-[#f4f0e8]"
                            >
                                <Camera className="h-4 w-4" />
                                <span className="sr-only">Send image</span>
                            </Button>
                        </form>
                    </div>
                    <div ref={scrollRef} className="flex-grow overflow-y-auto space-y-3 sm:space-y-4">
                        <motion.div layout className="space-y-4">
                            <AnimatePresence mode="popLayout" initial={false}>
                                {messages.map((message, index) => (
                                    <motion.div
                                        key={message.timestamp}
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 20 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 30,
                                            mass: 1
                                        }}
                                        layout
                                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <motion.div
                                            layout
                                            className={`max-w-[80%] rounded-lg p-4 ${message.role === 'user'
                                                ? 'bg-black text-white'
                                                : 'bg-white shadow-sm border border-gray-200'
                                                }`}
                                        >
                                            {message.role === 'assistant' ? (
                                                <TipTapEditor
                                                    content={message.content}
                                                    onUpdate={(content) => handleResponseUpdate(index, content)}
                                                    showToolbar={showTipTapMenu && activeEditorIndex === index}
                                                    onFocus={() => {
                                                        if (showTipTapMenu) {
                                                            setActiveEditorIndex(index);
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <div className={message.isStreaming ? 'animate-pulse' : ''}>
                                                    {message.content}
                                                </div>
                                            )}
                                        </motion.div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}