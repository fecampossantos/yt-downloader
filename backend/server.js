const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const https = require("https");
const { getVideoInfo, getAudioStreamUrl } = require("./youtubeFetcher");

const app = express();
const PORT = 3001;

app.use(
  cors({
    exposedHeaders: ["Content-Disposition"],
  })
);
app.use(express.json());

// Remove fluent-ffmpeg setup

app.get("/info", async (req, res) => {
  const videoURL = req.query.url;
  if (!videoURL) return res.status(400).json({ error: "No URL provided" });

  console.log(`Getting info for: ${videoURL}`);

  try {
    const info = await getVideoInfo(videoURL);
    res.json(info);
  } catch (error) {
    console.error("Custom Fetcher Info Error:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch video info", details: error.message });
  }
});

app.get("/download-raw", async (req, res) => {
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
    // Custom logic to get the direct Googlevideo raw audio stream URL
    const audioStreamUrl = await getAudioStreamUrl(videoURL);

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

    // We assume ffmpeg is installed and available in the system PATH
    const ffmpegProcess = spawn("ffmpeg", ffmpegArgs, { shell: false });

    // Stream the raw audio data over HTTP from Googlevideo DIRECTLY into FFmpeg's STDIN.
    // This entirely replaces the need for yt-dlp.
    const reqOpts = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      },
    };

    https
      .get(audioStreamUrl, reqOpts, (audioRes) => {
        // Redirect tracking (YouTube streams might redirect once or twice)
        if (
          audioRes.statusCode >= 300 &&
          audioRes.statusCode < 400 &&
          audioRes.headers.location
        ) {
          https
            .get(audioRes.headers.location, reqOpts, (redirectRes) => {
              redirectRes.pipe(ffmpegProcess.stdin);
            })
            .on("error", (err) => console.error("Redirect HTTP Error", err));
          return;
        }

        audioRes.pipe(ffmpegProcess.stdin);
      })
      .on("error", (err) => {
        console.error("Native Audio Stream Fetch Error:", err);
      });

    // Pipe ffmpeg's stdout (the converted MP3 with metadata) directly to the response object
    ffmpegProcess.stdout.pipe(res);

    ffmpegProcess.stderr.on("data", (data) => {
      // Note: FFmpeg logs all its processing info to stderr, even when successful.
      // console.log(`ffmpeg info: ${data.toString()}`);
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
    console.error("Failed to extract or pipe custom audio stream:", error);
    if (!res.headersSent)
      res.status(500).json({
        error: "Failed to download raw video details",
        details: error.message,
      });
  }
});

const HOST =
  process.env.npm_lifecycle_event === "dev" ? "localhost" : "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
