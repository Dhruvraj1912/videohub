const express = require("express");
const router = express.Router();
const translateText = require("../utils/translator");
router.post("/", async (req, res) => {
  try {
    const { text, target } = req.body;

    if (!text || !target) {
      return res.status(400).json({ message: "text and target are required" });
    }

    const translatedText = await translateText(text, target);

    res.json({ translatedText });
  } catch (err) {
    console.error("Translate route error:", err.message);
    res.status(500).json({ message: "Translation failed" });
  }
});

module.exports = router;
