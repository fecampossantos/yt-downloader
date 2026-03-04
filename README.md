# YouTube MP3 Downloader + Metadata Editor

A simple web tool to download YouTube videos as high-quality MP3s with custom metadata (Title, Artist, Album) and cover art.

## Features

- **Fetch Info**: Retrieve video title, thumbnail, and channel name from a YouTube URL.
- **Edit Metadata**: Customize the `Title`, `Artist`, and `Album` tags before downloading.
- **High Quality**: Downloads audio in 192kbps MP3 format.
- **Cover Art**: Embeds the video thumbnail as the MP3 cover art.
- **Clean UI**: Minimalist, distraction-free interface.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- **FFmpeg**: Handled automatically! The backend installs `ffmpeg-static` via `npm` so no system installation is required.

## Installation & Running

This project is divided into a `frontend` and a `backend`, which can be run together automatically on mobile devices (Termux), or separately for traditional local development.

### Option A: Running on Termux (Android) 📱

If you are deploying this on your mobile device via Termux, use the provided script to start both servers silently and generate a public link.

1. Give execution permission to the script (only needed once):
   ```bash
   chmod +x run.sh
   ```
2. Run the script:
   ```bash
   ./run.sh
   # Or alternatively: sh run.sh
   ```
3. Wait for the servers to boot up. The terminal will print a **Localtunnel** securely-tunneled HTTPS URL (e.g. `https://some-word.loca.lt`).
4. Keep the terminal open and use that assigned URL inside your Android browser or any other internet device!
   - _Note: Background server logs are saved automatically to the `logs/` folder if you need to troubleshoot._

---

### Option B: Running Locally (PC/Desktop) 💻

If you are running this for traditional development on your desktop, run the backend and frontend in separate terminals.

#### 1. Backend API

The backend handles the YouTube download, audio extraction, and metadata embedding.

1. Open a terminal in the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server (runs on `http://localhost:3001` mapping to `http://0.0.0.0:3001`):
   ```bash
   npm start
   ```

#### 2. Frontend App

The frontend provides the Next.js user interface which automatically proxies API calls to your backend port.

1. Open a **new** terminal in the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server (runs on `http://localhost:3000`):
   ```bash
   npm run dev
   ```

## Usage

1. Go to `http://localhost:3000` in your browser.
2. Paste a YouTube video URL (e.g., `https://www.youtube.com/watch?v=...`).
3. Click **Fetch Video**.
4. Review the video details and edit the **Name**, **Artist**, or **Album** fields if you wish.
5. Click **Download MP3**.
6. The file will be processed and downloaded to your device with the correct tags.

## Tech Stack

- **Frontend**: Next.js 15, React 19
- **Backend**: Node.js, Express
- **Core Libraries**: `yt-dlp-exec` (YouTube download), `fluent-ffmpeg` (Audio conversion & tagging)
