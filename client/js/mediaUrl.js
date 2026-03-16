function getVideoUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url; // Cloudinary URL
  return "/uploads/videos/" + url;        // local URL
}

function getThumbnailUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;  // Cloudinary URL
  return "/uploads/thumbnails/" + url;     // local URL
}