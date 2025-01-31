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
import { FileChat } from './FileChat'
import { FileAutocomplete } from './FileAutocomplete'
import { useFileIndex } from '@/hooks/useFileIndex'
import { FileInfo } from '@/types/vectoria'

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

interface ChatInterfaceProps {
    folderId: string;
    authToken: string;
}

export function ChatInterface({ folderId, authToken }: ChatInterfaceProps) {
    const [input, setInput] = useState('');
    const [activeFiles, setActiveFiles] = useState<FileInfo[]>([]);
    const { files, isLoading, error, searchFiles } = useFileIndex(folderId, authToken);
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const matchingFiles = searchFiles(input);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInput(value);
        setShowAutocomplete(value.startsWith('file/'));
    };

    const handleFileSelect = (file: FileInfo) => {
        // Only add if not already active
        if (!activeFiles.find(f => f.file_id === file.file_id)) {
            setActiveFiles(prev => [file, ...prev]);
        }
        setInput('');
        setShowAutocomplete(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle regular chat submission here
    };

    return (
        <div className="space-y-4">
            {/* Active File Chats */}
            {activeFiles.map(file => (
                <FileChat
                    key={file.file_id}
                    file={file}
                    authToken={authToken}
                />
            ))}

            {/* Main Chat Input */}
            <Card className="p-4 bg-white">
                <form onSubmit={handleSubmit} className="relative">
                    <FileAutocomplete
                        files={matchingFiles}
                        onSelect={handleFileSelect}
                        visible={showAutocomplete}
                    />
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            placeholder='Type "file/" to search documents, or ask a question...'
                            value={input}
                            onChange={handleInputChange}
                            className="flex-1"
                        />
                        <Button type="submit">
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}