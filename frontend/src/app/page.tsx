'use client';

import { useState, useRef, useEffect } from 'react';

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
  
  // Extended Metadata
  const [albumArtist, setAlbumArtist] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [track, setTrack] = useState('');
  const [composer, setComposer] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Use refs for focusing inputs
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'input' && urlInputRef.current) {
        urlInputRef.current.focus();
    }
  }, [step]);

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
      setName(data.title.replace(/[^\w\s-]/gi, '')); // Basic clean up
      setArtist(data.author);
      // Reset others
      setAlbum('');
      setAlbumArtist('');
      setGenre('');
      setYear(new Date().getFullYear().toString());
      setTrack('');
      setComposer('');
      
      setStep('edit');
      setMessage('');
    } catch (err) {
      setMessage('Failed to find video. Please check the URL.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('downloading');
    setMessage('Processing audio...');
    
    try {
        const params = new URLSearchParams({
            url: url,
            name: name,
            artist: artist,
            album: album,
            album_artist: albumArtist,
            genre: genre,
            year: year,
            track: track,
            composer: composer
        });

      const response = await fetch(`http://localhost:3001/download?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      
      // Try to get filename from header, or fallback
      let filename = `${name.trim() || 'audio'} - ${artist.trim() || 'Unknown'}.mp3`;
      const contentDisposition = response.headers.get('Content-Disposition');
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
      setMessage('Download Ready');
      
      setTimeout(() => reset(), 5000);
      
    } catch (err) {
       setStep('edit'); 
       setMessage('Download failed. Server might be busy.');
       setTimeout(() => setMessage(''), 4000);
    }
  };

  const reset = () => {
      setStep('input');
      setUrl('');
      setVideoData(null);
      setName('');
      setArtist('');
      setAlbum('');
      setAlbumArtist('');
      setGenre('');
      setYear('');
      setTrack('');
      setComposer('');
      setMessage('');
  };

  return (
    <main>
      <div className="container" style={{maxWidth: '600px'}}>
        
        {/* HEADER */}
        <div>
          <h1>Audio Downloader</h1>
          <p className="subtitle">
            {step === 'input' && "Paste a YouTube link below."}
            {step === 'edit' && "Edit valid iPod metadata."}
            {step === 'downloading' && "Adding tags & converting..."}
            {step === 'finished' && "All done! Saved to specific folder."}
          </p>
        </div>

        {/* STEP 1: INPUT */}
        {step === 'input' && (
             <form onSubmit={handleFetch}>
                <div className="input-group">
                    <input
                        ref={urlInputRef}
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://youtube.com/..."
                        className="input-field"
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading ? 'Searching...' : 'Fetch Video'}
                </button>
             </form>
        )}

        {/* STEP 2: EDIT */}
        {step === 'edit' && videoData && (
            <form onSubmit={handleDownload}>
                
                {/* Preview Card */}
                <div className="video-preview">
                    <img src={videoData.thumbnail} alt="" className="video-thumb" />
                    <div className="video-info">
                        <div className="video-title">{videoData.title}</div>
                        <div className="video-author">{videoData.author}</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                    
                    {/* Primary Info */}
                    <div className="input-group">
                        <label className="input-label">Title (Name)</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input-field"
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="input-group">
                            <label className="input-label">Artist</label>
                            <input
                                type="text"
                                value={artist}
                                onChange={(e) => setArtist(e.target.value)}
                                className="input-field"
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Album Artist</label>
                            <input
                                type="text"
                                value={albumArtist}
                                onChange={(e) => setAlbumArtist(e.target.value)}
                                className="input-field"
                                placeholder="Optional"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                        <div className="input-group">
                            <label className="input-label">Album</label>
                            <input
                                type="text"
                                value={album}
                                onChange={(e) => setAlbum(e.target.value)}
                                className="input-field"
                                placeholder="Optional"
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Year</label>
                            <input
                                type="text"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                className="input-field"
                                placeholder="YYYY"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                         <div className="input-group">
                            <label className="input-label">Genre</label>
                            <input
                                type="text"
                                value={genre}
                                onChange={(e) => setGenre(e.target.value)}
                                className="input-field"
                                placeholder="Pop"
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Track #</label>
                            <input
                                type="text"
                                value={track}
                                onChange={(e) => setTrack(e.target.value)}
                                className="input-field"
                                placeholder="1"
                            />
                        </div>
                         <div className="input-group">
                            <label className="input-label">Composer</label>
                            <input
                                type="text"
                                value={composer}
                                onChange={(e) => setComposer(e.target.value)}
                                className="input-field"
                                placeholder="Name"
                            />
                        </div>
                    </div>

                </div>

                <div className="btn-row">
                    <button type="button" onClick={reset} className="btn btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                        Download MP3
                    </button>
                </div>
            </form>
        )}

        {/* STATUS MESSAGE */}
        {message && (
            <div className="status-msg">
                {message}
            </div>
        )}

      </div>
    </main>
  );
}
