'use client'

import { useState, useEffect, useRef } from 'react';
import { Search } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";

// Custom hook for auto-expanding textareas
function useAutoExpand() {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textArea = textAreaRef.current;
    if (!textArea) return;

    const handleInput = () => {
      textArea.style.height = 'auto';
      textArea.style.height = `${textArea.scrollHeight}px`;
    };

    textArea.addEventListener('input', handleInput);
    return () => {
      textArea.removeEventListener('input', handleInput);
    };
  }, []);

  return textAreaRef;
}

export function AppSidebar() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const textAreaRef = useAutoExpand();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setResult(data.response);
    } catch (error) {
      console.error('Error during search:', error);
      setResult('An error occurred during search.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch(e);
    }
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-between mb-4">
            <SidebarGroupLabel className="text-3xl font-bold text-blue-800">Search Notes</SidebarGroupLabel>
            {loading && (
              <svg
                className="animate-spin h-5 w-5 text-blue-800"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                ></path>
              </svg>
            )}
          </div>
          <form onSubmit={handleSearch} className="w-full" onKeyDown={handleKeyDown}>
            <div className="relative">
              <textarea
                ref={textAreaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your search query..."
                className="w-full px-3 py-1.5 rounded-lg border-2 border-blue-300 focus:outline-none focus:border-blue-500 transition-all duration-300 ease-in-out resize-none overflow-hidden"
                rows={1}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-300 flex items-center justify-start"
            >
              <Search className="h-4 inline-block mr-2" /> Search
            </button>
          </form>
          {result && (
            <div className="mt-8 p-4 bg-white rounded-lg shadow-lg w-full animate-fadeIn">
              <h2 className="text-xl font-semibold mb-2 text-blue-800">Search Result</h2>
              <p className="text-gray-600">{result}</p>
            </div>
          )}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
