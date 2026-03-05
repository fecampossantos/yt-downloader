const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");
const { getVideoInfo, getAudioStream } = require("./youtubeFetcher");

const app = express();
const PORT = 3001;

app.use(
  cors({
    exposedHeaders: ["Content-Disposition"],
  })
);
app.use(express.json());

async function handleInfoRequest(req, res) {
  const videoURL = req.query.url;
  if (!videoURL) return res.status(400).json({ error: "No URL provided" });

  console.log(`Getting info for: ${videoURL}`);

  try {
    const info = await getVideoInfo(videoURL);
    res.json(info);
  } catch (error) {
    console.error("Custom Fetcher Info Error:");
    console.error(error);
    if (error.stack) console.error(error.stack);
    res
      .status(500)
      .json({ error: "Failed to fetch video info", details: error.message });
  }
}

async function handleDownloadRequest(req, res) {
  const videoURL = req.query.url;
  const name = req.query.name || "audio";
  const artist = req.query.artist || "Unknown";
  const album = req.query.album || "";
  const album_artist = req.query.album_artist || "";
  const genre = req.query.genre || "";
  const year = req.query.year || "";
  const track = req.query.track || "";
  const composer = req.query.composer || "";

  const filename = `${name} - ${artist}`.replace(/[^\w\s-]/gi, "") + ".mp3";

  if (!videoURL) return res.status(400).json({ error: "No URL provided" });

  console.log(`Downloading Custom (No Dependencies): ${filename}`);

  try {
    // Get the direct audio stream using play-dl
    const audioStream = await getAudioStream(videoURL);

    res.header("Content-Disposition", `attachment; filename="${filename}"`);
    res.header("Content-Type", "audio/mpeg");

    // ffmpeg arguments
    const ffmpegArgs = [
      "-i",
      "pipe:0", // Read input from stdin
      "-b:a",
      "192k",
      "-f",
      "mp3",
      "-id3v2_version",
      "3",
      "-metadata",
      `title=${name}`,
      "-metadata",
      `artist=${artist}`,
      "-metadata",
      `album=${album}`,
      "-metadata",
      `album_artist=${album_artist}`,
      "-metadata",
      `genre=${genre}`,
      "-metadata",
      `date=${year}`,
      "-metadata",
      `track=${track}`,
      "-metadata",
      `composer=${composer}`,
      "pipe:1", // Write MP3 back to stdout
    ];

    // We use ffmpeg-static binary from node_modules instead of the system PATH
    const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs, { shell: false });

    // Pipe the audio stream into FFmpeg's STDIN.
    audioStream.pipe(ffmpegProcess.stdin);
    audioStream.on("error", (err) => {
      console.error("Audio Stream Fetch Error:", err);
    });

    // Pipe ffmpeg's stdout (the converted MP3 with metadata) directly to the response object
    ffmpegProcess.stdout.pipe(res);

    ffmpegProcess.stderr.on("data", (data) => {
      console.log(`[ffmpeg stderr] ${data.toString()}`);
    });

    ffmpegProcess.on("error", (err) => {
      console.error("Native FFmpeg spawn error:", err);
      if (!res.headersSent) res.status(500).end();
    });

    ffmpegProcess.on("close", (code) => {
      if (code !== 0 && code !== null) {
        console.error(`Native FFmpeg process exited with code ${code}`);
      }
    });
  } catch (error) {
    console.error("Failed to extract or pipe custom audio stream:");
    console.error(error);
    if (error.stack) console.error(error.stack);
    if (!res.headersSent)
      res.status(500).json({
        error: "Failed to download raw video details",
        details: error.message,
      });
  }
}

app.get("/info", handleInfoRequest);
app.get("/download", handleDownloadRequest);

app.listen(PORT, () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
