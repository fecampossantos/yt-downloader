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
- **FFmpeg**: The backend uses `ffmpeg-static` so it should work automatically. If you encounter issues, ensure FFmpeg is installed on your system path.

## Installation & Running

This project is divided into a `frontend` and a `backend`. You need to run both terminals simultaneously.

### 1. Backend API
The backend handles the YouTube download, audio extraction, and metadata embedding.

1. Open a terminal in the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
   The server will start on **http://localhost:3001**.

### 2. Frontend App
The frontend provides the user interface.

1. Open a **new** terminal in the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be available at **http://localhost:3000**.

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
