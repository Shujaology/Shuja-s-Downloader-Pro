import React from 'react';

const AppIcon: React.FC = () => (
    <img 
        src="data:image/png;base64,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" 
        alt="App Icon" 
        className="h-5 w-5 mr-2"
    />
);

const Header: React.FC = () => {
  return (
    <div className="bg-dark-surface p-2 rounded-t-lg flex justify-between items-center select-none drag-handle">
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
      </div>
      <div className="flex items-center">
        <AppIcon />
        <h1 className="text-dark-text-secondary font-semibold text-sm">
          Shuja's Downloader Pro
        </h1>
      </div>
      <div className="w-16"></div> {/* Spacer */}
    </div>
  );
};

export default Header;