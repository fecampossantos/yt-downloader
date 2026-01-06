'use client';

import { useState } from 'react';

type Step = 'input' | 'edit' | 'downloading' | 'finished';

interface VideoData {
  title: string;
  thumbnail: string;
  author: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<Step>('input');
  
  // Metadata state
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [name, setName] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorCount, setErrorCount] = useState(0); // Simple error shake effect trigger

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setMessage('Fetching video details...');
    
    try {
      const res = await fetch(`http://localhost:3001/info?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('Could not fetch video info');
      
      const data = await res.json();
      setVideoData(data);
      
      // Auto-fill form
      setName(data.title);
      setArtist(data.author);
      setAlbum(''); // Default empty
      
      setStep('edit');
      setMessage('');
    } catch (err) {
      triggerError('Failed to fetch video. Check URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('downloading');
    setMessage('Starting download...');
    
    try {
        // Construct query params
        const params = new URLSearchParams({
            url: url,
            name: name,
            artist: artist,
            album: album
        });

      const response = await fetch(`http://localhost:3001/download?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      setMessage('Converting and Tagging...');
      const blob = await response.blob();
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'audio.mp3';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+?)"/);
        if (match) filename = match[1];
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      setStep('finished');
      setMessage('Done!');
      setTimeout(() => reset(), 3000);
      
    } catch (err: any) {
       setStep('edit'); // Go back to edit on error
       triggerError('Download failed. Please try again.');
    }
  };

  const triggerError = (msg: string) => {
      setMessage(msg);
      setErrorCount(c => c + 1);
      setTimeout(() => setMessage(''), 3000);
  };

  const reset = () => {
      setStep('input');
      setUrl('');
      setVideoData(null);
      setName('');
      setArtist('');
      setAlbum('');
      setMessage('');
  };

  return (
    <main>
      <div className="container">
        
        <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <h1>Audio Downloader</h1>
          <p className="subtitle">
            {step === 'input' && "Enter a YouTube URL to get started."}
            {step === 'edit' && "Edit metadata before downloading."}
            {step === 'downloading' && "Processing your file..."}
            {step === 'finished' && "Download complete!"}
          </p>
        </div>

        <div className="form-card">
            
          {/* STEP 1: INPUT */}
          {step === 'input' && (
             <form onSubmit={handleFetch} className="input-wrapper">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="input-field"
                  required
                  autoFocus
                />
                <div className="spacer" style={{ height: '1rem' }} />
                <button type="submit" className="btn-primary" disabled={isLoading}>
                    {isLoading ? message : 'Fetch Video'}
                </button>
             </form>
          )}

          {/* STEP 2: EDIT METADATA */}
          {step === 'edit' && videoData && (
              <form onSubmit={handleDownload} className="flex flex-col gap-4">
                  
                  {/* Video Preview */}
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <img 
                        src={videoData.thumbnail} 
                        alt="Thumb" 
                        style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} 
                      />
                      <div>
                          <p style={{ fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.2 }}>{videoData.title}</p>
                          <p style={{ fontSize: '0.8rem', color: '#888' }}>{videoData.author}</p>
                      </div>
                  </div>

                  <div className="input-wrapper">
                    <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px' }}>Name (Title)</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div className="input-wrapper">
                    <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px' }}>Author (Artist)</label>
                    <input
                      type="text"
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div className="input-wrapper">
                    <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px' }}>Album</label>
                    <input
                      type="text"
                      value={album}
                      onChange={(e) => setAlbum(e.target.value)}
                      className="input-field"
                      placeholder="Optional"
                    />
                  </div>

                  <div className="spacer" style={{ height: '1rem' }} />
                  
                  <div style={{ display: 'flex', gap: '1rem' }}>
                      <button 
                        type="button" 
                        onClick={reset}
                        className="btn-primary" 
                        style={{ background: '#222', color: '#fff' }}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary">
                        Download MP3
                      </button>
                  </div>
              </form>
          )}

           {/* LOADING / STATUS */}
           {(isLoading || step === 'downloading' || message) && step !== 'input' && (
              <div style={{ marginTop: '1rem', textAlign: 'center', color: step === 'finished' ? '#4ade80' : '#888' }}>
                  {message}
              </div>
           )}

        </div>
      </div>
    </main>
  );
}
