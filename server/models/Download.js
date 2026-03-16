const mongoose = require("mongoose");

const downloadSchema = new mongoose.Schema(
  {
    user: {
      type: String,
      required: true,
    },

    videoId: { type: String, required: true },
    title: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    videoUrl: { type: String, default: "" },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Download", downloadSchema);
