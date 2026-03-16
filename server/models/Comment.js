const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    videoId: {
      type: String,
      required: true,
    },

    user: {
      type: String,
      default: "Anonymous",
    },

    city: {
      type: String,
      default: "Unknown",
    },

    text: {
      type: String,
      required: true,
    },

    likes: {
      type: Number,
      default: 0,
    },

    dislikes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Comment", commentSchema);
