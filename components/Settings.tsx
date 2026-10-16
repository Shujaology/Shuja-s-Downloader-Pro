import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

interface SettingsProps {
  onInstall: () => void;
  canInstall: boolean;
}

const Settings: React.FC<SettingsProps> = ({ onInstall, canInstall }) => {
  return (
    <div className="px-6 py-4 bg-dark-surface rounded-b-lg border-t border-dark-border text-dark-text-secondary text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <SettingsIcon />
          <span>Save to: ~/Downloads/ShujaDownloader</span>
        </div>
        <div className="flex items-center space-x-4">
           {canInstall && (
            <button onClick={onInstall} className="text-brand-blue hover:underline text-xs font-semibold">
              Install App
            </button>
          )}
          <button className="text-brand-blue hover:underline text-xs font-semibold">
            Change
          </button>
        </div>
      </div>
       <div className="mt-3 text-xs text-center text-gray-500">
        Browser integration active. Paste a link to capture.
      </div>
    </div>
  );
};

export default Settings;
