import React from 'react';
import { FileInfo } from '@/types/vectoria';
import { motion, AnimatePresence } from 'framer-motion';

interface FileAutocompleteProps {
    files: FileInfo[];
    onSelect: (file: FileInfo) => void;
    visible: boolean;
}

export function FileAutocomplete({ files, onSelect, visible }: FileAutocompleteProps) {
    if (!visible || files.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-full left-0 w-full bg-white rounded-lg shadow-lg border border-gray-200 mb-2 overflow-hidden"
            >
                <div className="max-h-60 overflow-y-auto">
                    {files.map((file) => (
                        <button
                            key={file.file_id}
                            onClick={() => onSelect(file)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors"
                        >
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900">
                                    {file.file_name}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                                {file.web_view_link}
                            </div>
                        </button>
                    ))}
                </div>
            </motion.div>
        </AnimatePresence>
    );
} 