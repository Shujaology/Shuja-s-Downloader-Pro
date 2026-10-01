import React, { useState } from 'react';
import {
  X,
  Settings,
  FolderOpen,
  Volume2,
  Network,
  FileType,
  Monitor
} from 'lucide-react';
import type { IDMSettings } from '../types';
import { soundEffects } from '../services/soundEffects';

interface OptionsModalProps {
  isOpen: boolean;
  settings: IDMSettings;
  onClose: () => void;
  onSave: (newSettings: IDMSettings) => void;
}

export const OptionsModal: React.FC<OptionsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSave,
}) => {
  const isDark = settings.theme === 'windows-dark';
  const [activeTab, setActiveTab] = useState<'general' | 'filetypes' | 'saveto' | 'connection' | 'sound'>('general');
  const [formData, setFormData] = useState<IDMSettings>(settings);

  if (!isOpen) return null;

  const handleBrowseDir = (categoryKey: keyof typeof formData.categoriesDirs) => {
    const current = formData.categoriesDirs[categoryKey];
    const newDir = prompt(`Enter save folder path for ${categoryKey}:`, current);
    if (newDir) {
      setFormData({
        ...formData,
        categoriesDirs: {
          ...formData.categoriesDirs,
          [categoryKey]: newDir,
        },
      });
    }
  };

  const handleSave = () => {
    soundEffects.setSoundEnabled(formData.soundEnabled);
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-4 select-none">
      <div
        className={`w-full max-w-xl rounded shadow-2xl border text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
          isDark
            ? 'bg-[#252526] border-[#454545] text-[#e0e0e0]'
            : 'bg-[#f0f0f0] border-[#999999] text-[#1e1e1e]'
        }`}
      >
        {/* Title Bar */}
        <div
          className={`flex items-center justify-between px-3 py-1.5 font-semibold text-xs border-b ${
            isDark
              ? 'bg-[#1e1e1e] border-[#383838] text-gray-200'
              : 'bg-gradient-to-r from-[#005a9e] to-[#0078d4] text-white border-[#004578]'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            <span>Internet Download Manager Configuration</span>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-red-500 hover:text-white px-1.5 py-0.5 rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div
          className={`flex items-center border-b px-2 pt-1 text-xs ${
            isDark ? 'bg-[#1e1e1e] border-[#383838]' : 'bg-[#e5e5e5] border-[#c0c0c0]'
          }`}
        >
          {[
            { id: 'general', label: 'General', icon: Monitor },
            { id: 'filetypes', label: 'File Types', icon: FileType },
            { id: 'saveto', label: 'Save To', icon: FolderOpen },
            { id: 'connection', label: 'Connection', icon: Network },
            { id: 'sound', label: 'Sounds', icon: Volume2 },
          ].map(tab => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 border-t border-l border-r rounded-t font-semibold transition -mb-[1px] ${
                  isTabActive
                    ? isDark
                      ? 'bg-[#252526] border-[#454545] text-white'
                      : 'bg-[#f0f0f0] border-[#999999] text-black border-b-transparent'
                    : isDark
                    ? 'border-transparent text-gray-400 hover:text-gray-200'
                    : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-4 min-h-[260px] max-h-[360px] overflow-y-auto space-y-3.5">
          {activeTab === 'general' && (
            <div className="space-y-3">
              <div className="font-semibold text-gray-700 dark:text-gray-300">
                Browser / System Integration
              </div>
              <div className="space-y-2 p-3 rounded border border-gray-300 dark:border-gray-700 bg-black/5 dark:bg-white/5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoStartDownloads}
                    onChange={e => setFormData({ ...formData, autoStartDownloads: e.target.checked })}
                    className="rounded"
                  />
                  <span>Automatically start downloading on link capture</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showFloatingVideoBar}
                    onChange={e => setFormData({ ...formData, showFloatingVideoBar: e.target.checked })}
                    className="rounded"
                  />
                  <span>Show IDM Download panel on web videos & players</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Launch SDM Pro at Windows startup</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Integrate with Google Chrome, Edge, and Firefox</span>
                </label>
              </div>

              <div>
                <label className="font-semibold block mb-1">Theme Style:</label>
                <select
                  value={formData.theme}
                  onChange={e => setFormData({ ...formData, theme: e.target.value as 'windows-classic' | 'windows-dark' })}
                  className={`w-full px-2 py-1 rounded border outline-none ${
                    isDark ? 'bg-[#1e1e1e] border-[#444444]' : 'bg-white border-[#abadb3]'
                  }`}
                >
                  <option value="windows-classic">Classic Windows (Authentic IDM 90s/XP/7 Gray)</option>
                  <option value="windows-dark">Windows Modern Dark (Sleek Windows 11 Dark Mode)</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'filetypes' && (
            <div className="space-y-3">
              <div className="font-semibold text-gray-700 dark:text-gray-300">
                Automatically start downloading of the following file types:
              </div>
              <textarea
                rows={5}
                readOnly
                defaultValue="3GP 7Z AAC ACE AIF ARJ ASF AVI BIN BZ2 EXE GZ GZIP IMG ISO LZH M4A M4V MKV MOV MP3 MP4 MPA MPE MPEG MPG MSI MSU OGG PDF PLJ PPS PPT PPTX QT R0* R1* RA RAR TAR TGZ TIF TIFF WAV WMA WMV Z ZIP"
                className={`w-full p-2.5 rounded border outline-none font-mono text-[11px] leading-relaxed resize-none ${
                  isDark ? 'bg-[#1e1e1e] border-[#444444] text-gray-300' : 'bg-white border-[#abadb3] text-gray-800'
                }`}
              />
              <p className="text-[11px] text-gray-500">
                Separate extensions with spaces. IDM intercepts downloads for these file types from web browsers.
              </p>
            </div>
          )}

          {activeTab === 'saveto' && (
            <div className="space-y-2.5">
              <div className="font-semibold text-gray-700 dark:text-gray-300">
                Save to directories by category:
              </div>
              {(Object.keys(formData.categoriesDirs) as Array<keyof typeof formData.categoriesDirs>).map(cat => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="w-24 capitalize font-medium text-gray-500">{cat}:</span>
                  <input
                    type="text"
                    value={formData.categoriesDirs[cat]}
                    onChange={e => {
                      setFormData({
                        ...formData,
                        categoriesDirs: {
                          ...formData.categoriesDirs,
                          [cat]: e.target.value,
                        },
                      });
                    }}
                    className={`flex-1 px-2 py-1 rounded border outline-none font-mono text-[11px] ${
                      isDark ? 'bg-[#1e1e1e] border-[#444444]' : 'bg-white border-[#abadb3]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleBrowseDir(cat)}
                    className="px-2.5 py-1 rounded border hover:bg-black/10 font-bold"
                  >
                    ...
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'connection' && (
            <div className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Connection Type/Speed:</label>
                <select
                  defaultValue="high"
                  className={`w-full px-2 py-1 rounded border outline-none ${
                    isDark ? 'bg-[#1e1e1e] border-[#444444]' : 'bg-white border-[#abadb3]'
                  }`}
                >
                  <option value="high">High speed: Direct connection (Ethernet/Cable) / Wi-Fi</option>
                  <option value="medium">Medium speed: 4G/LTE / DSL</option>
                  <option value="low">Low speed: Dial-Up / 3G</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Max. connection number:</label>
                <select
                  value={formData.maxConnections}
                  onChange={e => setFormData({ ...formData, maxConnections: Number(e.target.value) })}
                  className={`w-full px-2 py-1 rounded border outline-none ${
                    isDark ? 'bg-[#1e1e1e] border-[#444444]' : 'bg-white border-[#abadb3]'
                  }`}
                >
                  <option value={1}>1 (Single connection)</option>
                  <option value={4}>4 connections</option>
                  <option value={8}>8 connections (Default)</option>
                  <option value={16}>16 connections (Maximum acceleration)</option>
                  <option value={32}>32 connections (Extreme multi-threading)</option>
                </select>
              </div>

              <div className="p-3 rounded border border-gray-300 dark:border-gray-700 bg-black/5 dark:bg-white/5 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={formData.speedLimiterEnabled}
                    onChange={e => setFormData({ ...formData, speedLimiterEnabled: e.target.checked })}
                    className="rounded"
                  />
                  <span>Enable Speed Limiter</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="256"
                    max="10240"
                    step="256"
                    disabled={!formData.speedLimiterEnabled}
                    value={formData.speedLimitKbps}
                    onChange={e => setFormData({ ...formData, speedLimitKbps: Number(e.target.value) })}
                    className="flex-1 cursor-pointer disabled:opacity-40"
                  />
                  <span className="font-mono font-bold w-20 text-right">
                    {formData.speedLimitKbps} KB/s
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sound' && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={formData.soundEnabled}
                  onChange={e => setFormData({ ...formData, soundEnabled: e.target.checked })}
                  className="rounded"
                />
                <Volume2 className="w-4 h-4 text-blue-500" />
                <span>Play sound events</span>
              </label>

              <div className="space-y-2 p-3 rounded border border-gray-300 dark:border-gray-700 bg-black/5 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <span>Download Complete:</span>
                  <button
                    type="button"
                    onClick={() => soundEffects.playComplete()}
                    className="px-3 py-1 rounded border text-[11px] font-semibold bg-emerald-500 text-white hover:brightness-110 shadow-xs"
                  >
                    ▶ Test Chime
                  </button>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-2">
                  <span>Download Start:</span>
                  <button
                    type="button"
                    onClick={() => soundEffects.playStart()}
                    className="px-3 py-1 rounded border text-[11px] font-semibold bg-blue-500 text-white hover:brightness-110 shadow-xs"
                  >
                    ▶ Test Click
                  </button>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-2">
                  <span>Download Error / Pause:</span>
                  <button
                    type="button"
                    onClick={() => soundEffects.playError()}
                    className="px-3 py-1 rounded border text-[11px] font-semibold bg-amber-500 text-white hover:brightness-110 shadow-xs"
                  >
                    ▶ Test Alert
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-2 p-3 border-t border-gray-300 dark:border-gray-700">
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-1.5 font-bold rounded bg-gradient-to-b from-[#0078d4] to-[#005a9e] text-white hover:brightness-110 active:brightness-95 shadow-sm border border-[#004578]"
          >
            OK
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded border transition ${
              isDark
                ? 'bg-[#333333] border-[#444444] hover:bg-[#3d3d3d] text-white'
                : 'bg-[#e1e1e1] border-[#adadad] hover:bg-[#e9e9e9] text-black'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
