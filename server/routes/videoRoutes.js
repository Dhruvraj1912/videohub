const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Video = require("../models/Video");

// ─── Create upload dirs if they don't exist ───
const videosDir = path.join(__dirname, "../uploads/videos");
const thumbnailsDir = path.join(__dirname, "../uploads/thumbnails");
if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
if (!fs.existsSync(thumbnailsDir))
  fs.mkdirSync(thumbnailsDir, { recursive: true });

// ─── Local disk storage ───
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "video") {
      cb(null, videosDir);
    } else {
      cb(null, thumbnailsDir);
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ─── UPLOAD VIDEO ───
router.post(
  "/upload",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const title = req.body.title;
      const videoFile = req.files.video[0].filename;
      const thumbnailFile = req.files.thumbnail[0].filename;

      const newVideo = new Video({
        title,
        videoUrl: videoFile,
        thumbnail: thumbnailFile,
      });

      await newVideo.save();
      res.json({ message: "Video uploaded successfully" });
    } catch (err) {
      console.error("Upload error:", err.message);
      res.status(500).json({ message: "Upload error: " + err.message });
    }
  },
);

// ─── GET SINGLE VIDEO ───
router.get("/:id", async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });
    res.json(video);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── GET ALL VIDEOS ───
router.get("/", async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.json({ videos });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ─── DELETE VIDEO ───
router.delete("/:id", async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });
    await Video.findByIdAndDelete(req.params.id);
    res.json({ message: "Video deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;
