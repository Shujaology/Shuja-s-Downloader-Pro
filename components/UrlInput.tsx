import React, { useState } from 'react';
import { LinkIcon } from '../constants';

interface UrlInputProps {
  onAnalyze: (url: string) => void;
  isAnalyzing: boolean;
}

const UrlInput: React.FC<UrlInputProps> = ({ onAnalyze, isAnalyzing }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onAnalyze(url);
    }
  };

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit}>
        <label htmlFor="url-input" className="block text-sm font-medium text-dark-text-secondary mb-2">
          Paste a YouTube video URL to get started
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-text-secondary">
             <LinkIcon />
          </div>
          <input
            id="url-input"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            className="w-full bg-dark-bg border border-dark-border text-dark-text-primary rounded-md py-3 pl-10 pr-4 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue outline-none transition"
            disabled={isAnalyzing}
          />
        </div>
        <button
          type="submit"
          disabled={isAnalyzing || !url.trim()}
          className="mt-4 w-full bg-brand-blue text-white font-bold py-3 px-4 rounded-md hover:bg-blue-600 transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isAnalyzing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </>
          ) : (
            'Analyze Link'
          )}
        </button>
      </form>
    </div>
  );
};

export default UrlInput;