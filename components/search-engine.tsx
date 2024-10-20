'use client'

import React, { useState } from 'react';
import { Search } from 'lucide-react';

export default function SearchEngine() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(`${data.response}`);
    } catch (error) {
      console.error('Error during search:', error);
      setResult('An error occurred during search.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-8 text-purple-800 animate-pulse">Search Notes</h1>
      <form onSubmit={handleSearch} className="w-full max-w-md">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your search query..."
            className="w-full px-4 py-2 rounded-full border-2 border-purple-300 focus:outline-none focus:border-purple-500 transition-all duration-300 ease-in-out"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-purple-500 text-white p-2 rounded-full hover:bg-purple-600 transition-colors duration-300"
            disabled={loading}
          >
            {loading ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
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
            ) : (
              <Search className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
      {result && (
        <div className="mt-8 p-4 bg-white rounded-lg shadow-lg w-full max-w-md animate-fadeIn">
          <h2 className="text-xl font-semibold mb-2 text-purple-800">Search Result</h2>
          <p className="text-gray-600">{result}</p>
        </div>
      )}
    </div>
  );
} 