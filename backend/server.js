const express = require('express');
const cors = require('cors');
const ytDlp = require('yt-dlp-exec'); 
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg'); // Use fluent-ffmpeg for easy metadata handling

const app = express();
const PORT = 3001;

app.use(cors({
    exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json());

// Set ffmpeg path for fluent-ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

app.get('/info', async (req, res) => {
    const videoURL = req.query.url;
    if (!videoURL) return res.status(400).json({ error: 'No URL provided' });

    console.log(`Getting info for: ${videoURL}`);
    try {
        const info = await ytDlp(videoURL, {
            dumpSingleJson: true,
            noWarnings: true,
            noCallHome: true,
            preferFreeFormats: true,
        });
        
        // Return relevant metadata for the form
        res.json({
            title: info.title,
            thumbnail: info.thumbnail,
            author: info.uploader,
            channel: info.channel,
        });

    } catch (error) {
        console.error('Info Error:', error);
        res.status(500).json({ error: 'Failed to fetch video info', details: error.message });
    }
});

app.get('/download', (req, res) => {
    const videoURL = req.query.url;
    // Sanitize filename
    const name = req.query.name || 'audio';
    const artist = req.query.artist || 'Unknown';
    const album = req.query.album || '';

    const filename = `${name} - ${artist}`.replace(/[^\w\s-]/gi, '') + '.mp3';

    if (!videoURL) return res.status(400).json({ error: 'No URL provided' });

    console.log(`Downloading: ${filename}`);

    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.header('Content-Type', 'audio/mpeg');

    // Spawn yt-dlp to output raw audio (best quality, whatever format) to stdout
    const ytDlpProcess = ytDlp.exec(videoURL, {
        output: '-',
        format: 'bestaudio', // Get best audio (usually webm/opus or m4a)
        noPlaylist: true,
        // We don't convert here, we let ffmpeg do it
    });

    // Pipe into fluent-ffmpeg
    ffmpeg(ytDlpProcess.stdout)
        .audioBitrate(192) // Good quality MP3
        .format('mp3')
        .outputOptions(
            '-id3v2_version', '3',
            '-metadata', `title=${name}`,
            '-metadata', `artist=${artist}`,
            '-metadata', `album=${album}`
        )
        .on('error', (err) => {
            console.error('FFmpeg error:', err);
             // Cannot send JSON if headers sent, but we can try to close stream
             if(!res.headersSent) res.status(500).end();
        })
        .pipe(res, { end: true });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
