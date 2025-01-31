import { useState, useEffect } from 'react';
import { FileInfo } from '@/types/vectoria';
import { VectoriaClient } from '@/services/vectoria';

interface UseFileIndexResult {
    files: FileInfo[];
    isLoading: boolean;
    error: string | null;
    searchFiles: (query: string) => FileInfo[];
}

export function useFileIndex(folderId: string, authToken: string): UseFileIndexResult {
    const [files, setFiles] = useState<FileInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadFiles() {
            try {
                const vectoria = new VectoriaClient();
                // Get all files recursively from the folder
                const allFiles = await vectoria.searchFiles(folderId, '', authToken);
                setFiles(allFiles);
                setError(null);
            } catch (err) {
                console.error('Failed to load files:', err);
                setError('Failed to load file index');
            } finally {
                setIsLoading(false);
            }
        }

        loadFiles();
    }, [folderId, authToken]);

    const searchFiles = (query: string): FileInfo[] => {
        if (!query.startsWith('file/')) return [];

        const searchTerm = query.slice(5).toLowerCase().trim();
        if (!searchTerm) return files;

        return files.filter(file =>
            file.file_name.toLowerCase().includes(searchTerm)
        ).sort((a, b) => {
            // Exact matches first, then by string length
            const aStartsWith = a.file_name.toLowerCase().startsWith(searchTerm);
            const bStartsWith = b.file_name.toLowerCase().startsWith(searchTerm);
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
            return a.file_name.length - b.file_name.length;
        }).slice(0, 5); // Limit to 5 results
    };

    return {
        files,
        isLoading,
        error,
        searchFiles
    };
} 