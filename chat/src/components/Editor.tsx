import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface EditorProps {
    onSubmit: (text: string) => void;
    placeholder?: string;
    disabled?: boolean;
    content?: string;
    onUpdate?: (content: string) => void;
    showToolbar?: boolean;
    immediatelyRender?: boolean;
}

export function Editor({
    onSubmit,
    placeholder = "Type your message...",
    disabled = false,
    content = "",
    onUpdate,
    showToolbar = true,
    immediatelyRender = true
}: EditorProps) {
    const [text, setText] = useState(content);

    // Sync with external content changes
    useEffect(() => {
        if (content !== text) {
            setText(content);
        }
    }, [content]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onSubmit(text);
            setText("");
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newText = e.target.value;
        setText(newText);
        if (onUpdate && immediatelyRender) {
            onUpdate(newText);
        }
    };

    return (
        <div className="prose max-w-none text-gray-700">
            {showToolbar ? (
                <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t">
                    <Input
                        value={text}
                        onChange={handleChange}
                        placeholder={placeholder}
                        disabled={disabled}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={disabled || !text.trim()}>
                        Send
                    </Button>
                </form>
            ) : (
                <div dangerouslySetInnerHTML={{ __html: text }} />
            )}
        </div>
    );
} 