import { useEffect, useState } from 'react';

function readArray(key: string): string[] {
  const value = window.localStorage.getItem(key);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function useBookmarks(): {
  savedIds: string[];
  readIds: string[];
  toggleSaved: (id: string) => void;
  toggleRead: (id: string) => void;
} {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    setSavedIds(readArray('clarity-saved'));
    setReadIds(readArray('clarity-read'));
  }, []);

  useEffect(() => {
    window.localStorage.setItem('clarity-saved', JSON.stringify(savedIds));
  }, [savedIds]);

  useEffect(() => {
    window.localStorage.setItem('clarity-read', JSON.stringify(readIds));
  }, [readIds]);

  const toggleSaved = (id: string) => {
    setSavedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleRead = (id: string) => {
    setReadIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  return { savedIds, readIds, toggleSaved, toggleRead };
}
