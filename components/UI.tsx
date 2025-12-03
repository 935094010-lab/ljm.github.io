import React, { useRef } from 'react';
import { AppState } from '../types';

interface UIProps {
  appState: AppState;
  onStart: () => void;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const UI: React.FC<UIProps> = ({ appState, onStart, onUpload, videoRef }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">
      {/* Hidden File Input */}
      <input 
        type="file" 
        multiple 
        accept="image/*" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={onUpload}
        onClick={(e) => (e.currentTarget.value = '')} 
      />

      {/* Header */}
      <header className="flex justify-between items-start pointer-events-auto">
        <div>
          <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500 drop-shadow-lg tracking-wider">
            LUMINA
          </h1>
          <p className="text-amber-100/60 text-sm md:text-base mt-2 font-light tracking-widest uppercase">
            Interactive Holiday Memory Gallery
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
            {/* Webcam Feed (Miniature) */}
            <div className={`relative overflow-hidden rounded-lg border border-amber-500/30 transition-opacity duration-500 ${appState === AppState.RUNNING ? 'opacity-100' : 'opacity-0'}`}>
                <video 
                    ref={videoRef} 
                    className="w-32 h-24 object-cover transform scale-x-[-1]" 
                    autoPlay 
                    playsInline 
                    muted 
                />
                <div className="absolute bottom-0 w-full bg-black/50 text-[10px] text-center text-white py-1">
                    AI Vision Active
                </div>
            </div>
            
            {/* Run-time Upload Button */}
            {appState === AppState.RUNNING && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 px-4 py-2 bg-amber-900/50 hover:bg-amber-800/80 active:scale-95 text-amber-100 text-xs border border-amber-500/30 rounded backdrop-blur-sm transition-all shadow-lg"
                >
                  + Add Photos
                </button>
            )}
        </div>
      </header>

      {/* Center Messages */}
      <main className="flex-1 flex items-center justify-center pointer-events-auto">
        {appState === AppState.READY && (
          <div className="text-center bg-black/60 backdrop-blur-md p-8 rounded-2xl border border-amber-500/20 shadow-2xl animate-fade-in flex flex-col gap-4">
            <h2 className="text-2xl text-amber-100 mb-2 font-serif">Welcome to the Gallery</h2>
            <p className="text-gray-300 mb-4 max-w-md mx-auto">
              Enable your camera to interact with the tree or upload your own memories to customize the gallery.
            </p>
            
            <div className="flex flex-col md:flex-row gap-4 justify-center">
                <button 
                onClick={onStart}
                className="px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 active:scale-95 text-white font-bold rounded-full transition-all transform shadow-lg ring-2 ring-amber-500/50 flex items-center justify-center gap-2"
                >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
                Open Camera
                </button>

                <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-8 py-3 bg-transparent hover:bg-white/10 active:scale-95 text-amber-200 border border-amber-500/50 font-bold rounded-full transition-all flex items-center justify-center gap-2"
                >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Upload Photos
                </button>
            </div>
          </div>
        )}

        {appState === AppState.LOADING && (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-amber-200 tracking-widest text-sm">INITIALIZING AI MODELS...</p>
          </div>
        )}
        
        {appState === AppState.ERROR && (
           <div className="text-center bg-red-900/80 p-6 rounded-xl border border-red-500/50">
             <h3 className="text-white font-bold text-lg mb-2">System Error</h3>
             <p className="text-red-200">Could not access camera or load AI models.</p>
             <p className="text-red-300 text-sm mt-2">Please allow camera permissions and reload.</p>
           </div>
        )}
      </main>

      {/* Footer Instructions */}
      <footer className={`transition-opacity duration-1000 ${appState === AppState.RUNNING ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex flex-col md:flex-row gap-4 justify-center md:justify-start items-center text-xs text-amber-100/50 font-mono">
           <div className="flex items-center gap-2">
             <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
             <span>GESTURE CONTROL ACTIVE</span>
           </div>
           <div className="hidden md:block">|</div>
           <div>OPEN PALM: DISPERSE</div>
           <div className="hidden md:block">|</div>
           <div>MOVE LEFT/RIGHT: ROTATE</div>
        </div>
      </footer>
    </div>
  );
};