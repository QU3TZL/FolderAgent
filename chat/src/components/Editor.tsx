import React from 'react';
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
    const [text, setText] = React.useState(content);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onSubmit(text);
            setText("");
        }
    };

    React.useEffect(() => {
        if (onUpdate) {
            onUpdate(text);
        }
    }, [text, onUpdate]);

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t">
            <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="flex-1"
            />
            <Button type="submit" disabled={disabled || !text.trim()}>
                Send
            </Button>
        </form>
    );
} 