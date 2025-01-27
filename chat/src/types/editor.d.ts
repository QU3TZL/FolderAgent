import { Editor } from '@tiptap/react'

export interface MenuBarProps {
    editor: Editor | null;
    onAddImage: (prompt: string) => void;
}

export interface TipTapEditorProps {
    content: string;
    onUpdate: (content: string) => void;
    showToolbar: boolean;
    onFocus: () => void;
}

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    isStreaming?: boolean;
} 