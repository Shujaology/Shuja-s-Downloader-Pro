import React, { useState, useEffect, useCallback } from 'react';
import type { AnalysisResult, DownloadItem, FormatOption } from './types';
import { MOCK_FORMATS } from './constants';
import { generateVideoSummary } from './services/geminiService';
import Header from './components/Header';
import UrlInput from './components/UrlInput';
import DownloadOptions from './components/DownloadOptions';
import DownloadList from './components/DownloadList';
import Settings from './components/Settings';

// Define the type for the install prompt event, which is not standard in all libraries
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string,
  }>;
  prompt(): Promise<void>;
}

const getYouTubeId = (url: string): string | null => {
  try {
    const urlObject = new URL(url);
    if (urlObject.hostname === 'youtu.be') {
        return urlObject.pathname.slice(1);
    }
    if (urlObject.hostname.includes('youtube.com')) {
        if (urlObject.pathname.includes('/embed/')) {
            return urlObject.pathname.split('/embed/')[1].split('?')[0];
        }
        const videoId = urlObject.searchParams.get('v');
        if (videoId) {
            return videoId;
        }
    }
  } catch (e) {
    // Fallback for non-URL strings or other formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return match[2];
    }
  }
  return null;
};


const App: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  
  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) {
      return;
    }
    // Show the install prompt
    installPrompt.prompt();
    // Wait for the user to respond to the prompt
    installPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      // We can only use the prompt once, so clear it.
      setInstallPrompt(null);
    });
  };
  
  const handleAnalyze = async (url: string) => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    // Simulate network delay for analysis
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const videoId = getYouTubeId(url);

      if (!videoId) {
        setError("Please enter a valid YouTube video URL.");
        setIsAnalyzing(false);
        return;
      }
      
      const videoTitle = `Your Favorite YouTube Video (ID: ${videoId})`;

      const summary = await generateVideoSummary(videoTitle);

      setAnalysisResult({
        title: videoTitle,
        thumbnailUrl: `https://i3.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        formats: MOCK_FORMATS,
        summary,
      });

    } catch (e) {
      setError("Analysis failed. Please try a different YouTube link.");
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownload = useCallback((format: FormatOption) => {
    if (!analysisResult) return;
    
    // Prevent re-downloading the exact same file
    const alreadyExists = downloads.some(d => d.title === analysisResult.title && d.format.id === format.id);
    if(alreadyExists) return;

    const newDownload: DownloadItem = {
      id: `${Date.now()}-${format.id}`,
      title: analysisResult.title,
      format: format,
      progress: 0,
      speed: '0 MB/s',
      status: 'downloading',
    };
    
    setDownloads(prev => [newDownload, ...prev]);
  }, [analysisResult, downloads]);

  useEffect(() => {
    const activeDownloads = downloads.filter(d => d.status === 'downloading');
    if (activeDownloads.length === 0) return;

    const interval = setInterval(() => {
      setDownloads(prev =>
        prev.map(d => {
          if (d.status === 'downloading' && d.progress < 100) {
            const increment = Math.random() * 5 + 1;
            const newProgress = Math.min(d.progress + increment, 100);
            const newSpeed = `${(Math.random() * 5 + 3).toFixed(2)} MB/s`;

            return {
              ...d,
              progress: newProgress,
              speed: newSpeed,
              status: newProgress >= 100 ? 'completed' : 'downloading',
            };
          }
          return d;
        })
      );
    }, 500);

    return () => clearInterval(interval);
  }, [downloads]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans bg-black bg-opacity-30">
        <div className="w-full max-w-lg mx-auto bg-dark-bg rounded-lg shadow-2xl border border-dark-border overflow-hidden">
            <Header />
            <main>
                <UrlInput onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
                {error && <div className="text-red-400 text-center pb-4 px-6 -mt-4">{error}</div>}
                {analysisResult && <DownloadOptions result={analysisResult} onDownload={handleDownload} />}
                <DownloadList downloads={downloads} />
            </main>
            <Settings canInstall={!!installPrompt} onInstall={handleInstallClick} />
        </div>
    </div>
  );
};

export default App;