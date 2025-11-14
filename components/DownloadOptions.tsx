
import React, { useState, useMemo } from 'react';
import type { AnalysisResult, FormatOption } from '../types';
import { DownloadIcon } from '../constants';

interface DownloadOptionsProps {
  result: AnalysisResult;
  onDownload: (format: FormatOption) => void;
}

const DownloadOptions: React.FC<DownloadOptionsProps> = ({ result, onDownload }) => {
  const [fileType, setFileType] = useState<'video' | 'audio'>('video');
  const [selectedFormatId, setSelectedFormatId] = useState<string>('');

  const filteredFormats = useMemo(() => {
    return result.formats.filter(f => f.type === fileType);
  }, [result.formats, fileType]);

  const handleDownload = () => {
    const selectedFormat = result.formats.find(f => f.id === selectedFormatId);
    if (selectedFormat) {
      onDownload(selectedFormat);
    }
  };
  
  // Set default selection when filtered formats change
  React.useEffect(() => {
    if (filteredFormats.length > 0) {
      setSelectedFormatId(filteredFormats[0].id);
    } else {
      setSelectedFormatId('');
    }
  }, [filteredFormats]);

  return (
    <div className="px-6 pb-6 border-t border-dark-border">
      <div className="flex items-start space-x-4 pt-6">
        <img src={result.thumbnailUrl} alt="Video thumbnail" className="w-32 h-20 object-cover rounded-md bg-dark-surface" />
        <div className="flex-1">
          <h3 className="text-dark-text-primary font-semibold line-clamp-2">{result.title}</h3>
          <p className="text-dark-text-secondary text-sm mt-1">{result.summary}</p>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex border border-dark-border rounded-md p-1 bg-dark-bg">
          <button
            onClick={() => setFileType('video')}
            className={`w-1/2 rounded py-1.5 text-sm font-semibold transition-colors ${fileType === 'video' ? 'bg-brand-blue text-white' : 'text-dark-text-secondary hover:bg-dark-surface'}`}
          >
            Video + Audio
          </button>
          <button
            onClick={() => setFileType('audio')}
            className={`w-1/2 rounded py-1.5 text-sm font-semibold transition-colors ${fileType === 'audio' ? 'bg-brand-blue text-white' : 'text-dark-text-secondary hover:bg-dark-surface'}`}
          >
            Audio Only
          </button>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="format-select" className="block text-sm font-medium text-dark-text-secondary mb-2">
          Resolution / Quality
        </label>
        <select
          id="format-select"
          value={selectedFormatId}
          onChange={(e) => setSelectedFormatId(e.target.value)}
          className="w-full bg-dark-surface border border-dark-border text-dark-text-primary rounded-md py-2 px-3 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue outline-none transition"
        >
          {filteredFormats.map(format => (
            <option key={format.id} value={format.id}>
              {format.quality} ({format.container}) - {format.size}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleDownload}
        disabled={!selectedFormatId}
        className="mt-6 w-full bg-brand-green text-white font-bold py-3 px-4 rounded-md hover:bg-green-600 transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
      >
        <DownloadIcon />
        Start Download
      </button>
    </div>
  );
};

export default DownloadOptions;
