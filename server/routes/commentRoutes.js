const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");

// LIKE COMMENT
router.post("/like/:id", async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    comment.likes++;
    await comment.save();

    res.json({ message: "Liked", likes: comment.likes });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
// DISLIKE  AUTO DELETE

router.post("/dislike/:id", async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    comment.dislikes++;

    if (comment.dislikes >= 2) {
      await Comment.findByIdAndDelete(req.params.id);
      return res.json({ message: "Comment removed due to dislikes" });
    }

    await comment.save();
    res.json({ message: "Disliked", dislikes: comment.dislikes });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
// POST COMMENT
router.post("/:videoId", async (req, res) => {
  try {
    const { text, user, city } = req.body;

    if (!text) {
      return res.status(400).json({ message: "Comment cannot be empty" });
    }

    // Block special characters
    const specialRegex = /[!@#$%^&*(),.?":{}|<>]/;
    if (specialRegex.test(text)) {
      return res
        .status(400)
        .json({ message: "Special characters are not allowed" });
    }

    const comment = new Comment({
      videoId: req.params.videoId,
      text,
      user: user || "Anonymous",
      city: city || "Unknown",
    });

    await comment.save();
    res.json({ message: "Comment posted" });
  } catch (err) {
    console.error("Post comment error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET COMMENTS
router.get("/:videoId", async (req, res) => {
  try {
    const comments = await Comment.find({ videoId: req.params.videoId }).sort({
      createdAt: -1,
    });

    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
