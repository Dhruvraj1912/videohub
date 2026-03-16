const express = require("express");
const router = express.Router();

const Download = require("../models/Download");
const Video = require("../models/Video");
const User = require("../models/User");

//GET  USER'S DOWNLOADS

router.get("/user/:userId", async (req, res) => {
  try {
    const downloads = await Download.find({ user: req.params.userId }).sort({
      createdAt: -1,
    });

    res.json(downloads);
  } catch (err) {
    console.error("Fetch downloads error:", err);
    res.status(500).json({ message: "Failed to fetch downloads" });
  }
});

//POST DOWNLOAD A VIDEO

router.post("/:videoId", async (req, res) => {
  try {
    const { user: userId } = req.body;
    const { videoId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already downloaded
    const already = await Download.findOne({ user: userId, videoId });
    if (already) {
      return res.json({
        alreadyDownloaded: true,
        message: "Already downloaded",
      });
    }

    // Free plan: only 1 download per day
    if (!user.plan || user.plan === "Free") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todayCount = await Download.countDocuments({
        user: userId,
        createdAt: { $gte: startOfDay },
      });

      if (todayCount >= 1) {
        return res.json({
          limitReached: true,
          message:
            "Free users can only download 1 video per day. Upgrade to download more.",
        });
      }
    }

    // Save download record
    const download = new Download({
      user: userId,
      videoId: video._id.toString(),
      title: video.title,
      thumbnail: video.thumbnail,
      videoUrl: video.videoUrl,
    });

    await download.save();

    res.json({
      success: true,
      message: "Download saved",
      videoUrl: video.videoUrl,
      title: video.title,
    });
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ message: "Download failed" });
  }
});
router.delete("/:downloadId", async (req, res) => {
  try {
    await Download.findByIdAndDelete(req.params.downloadId);
    res.json({ success: true, message: "Download removed" });
  } catch (err) {
    console.error("Delete download error:", err);
    res.status(500).json({ message: "Delete failed" });
  }
});

module.exports = router;
