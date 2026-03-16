const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const Video = require("../models/Video");
//stroage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "video") {
      cb(null, "server/uploads/videos");
    } else {
      cb(null, "server/uploads/thumbnails");
    }
  },

  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });
//upload video
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
        title: title,
        videoUrl: videoFile,
        thumbnail: thumbnailFile,
      });

      await newVideo.save();

      res.json({
        message: "Video uploaded successfully",
      });
    } catch (err) {
      console.log(err);

      res.status(500).json({
        message: "Upload error",
      });
    }
  },
);

router.get("/:id", async (req, res) => {
  const video = await Video.findById(req.params.id);
  res.json(video);
});

// GET ALL VIDEOS
router.get("/", async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });

    res.json({
      videos,
    });
  } catch (err) {
    res.status(500).json({
      message: "Server error",
    });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    await Video.findByIdAndDelete(req.params.id);

    res.json({ message: "Video deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});
module.exports = router;
