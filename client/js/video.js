const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const video = document.getElementById("player");
const progressBar = document.getElementById("progressBar");

let watchLimit = 5;
lucide.createIcons();

// LOAD VIDEO
async function loadVideo() {
  const res = await fetch("/api/videos/" + id);
  const data = await res.json();
  video.src = getVideoUrl(data.videoUrl);
  document.getElementById("title").innerText = data.title;
  setWatchLimit();
}

loadVideo();

// Plan badge,avatar
const _user = JSON.parse(localStorage.getItem("user"));
if (_user) {
  const av = document.getElementById("profileAvatar");
  const badge = document.getElementById("planBadge");
  if (av && _user.name) av.textContent = _user.name.charAt(0).toUpperCase();
  if (badge && _user.plan) {
    badge.classList.remove("hidden");
    badge.textContent = _user.plan;
    const colors = {
      Free: "bg-gray-500 text-white",
      Bronze: "bg-yellow-500 text-black",
      Silver: "bg-gray-300 text-black",
      Gold: "bg-yellow-400 text-black",
    };
    badge.className =
      (colors[_user.plan] || "bg-gray-500 text-white") +
      " px-3 py-1 rounded text-sm font-semibold";
  }
}
// DELETE VIDEO
function deleteVideo() {
  if (!confirm("Delete this video?")) return;

  fetch("/api/videos/" + id, { method: "DELETE" })
    .then((res) => res.json())
    .then(() => {
      showToast("Video deleted", "success");
      setTimeout(() => (window.location.href = "/pages/index.html"), 1200);
    });
}
// WATCH LIMIT
function setWatchLimit() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || !user.plan) {
    watchLimit = 5;
    return;
  }
  if (user.plan === "Bronze") watchLimit = 7;
  if (user.plan === "Silver") watchLimit = 10;
  if (user.plan === "Gold") watchLimit = 999;
}

video.addEventListener("timeupdate", () => {
  if (video.currentTime >= watchLimit * 60) {
    video.pause();
    const popup =
      document.getElementById("watchLimitPopup") ||
      document.getElementById("upgradePopup");
    if (popup) {
      popup.classList.remove("hidden");
      popup.classList.add("flex");
    }
  }
});
// PROGRESS BAR
video.addEventListener("timeupdate", () => {
  if (!progressBar || !video.duration) return;
  progressBar.style.width = (video.currentTime / video.duration) * 100 + "%";
});
// GESTURE CONTROLS
let tapCount = 0;
let tapTimer = null;

video.addEventListener("click", (e) => {
  tapCount++;

  const width = video.offsetWidth;
  const x = e.offsetX;
  let area = "center";
  if (x < width / 3) area = "left";
  else if (x > (width * 2) / 3) area = "right";

  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => {
    if (tapCount === 1 && area === "center") {
      video.paused ? video.play() : video.pause();
    }
    if (tapCount === 2) {
      if (area === "right") video.currentTime += 10;
      if (area === "left") video.currentTime -= 10;
    }
    if (tapCount === 3) {
      if (area === "center") window.location.href = "/pages/index.html";
      if (area === "right") window.close();
      if (area === "left")
        document
          .getElementById("commentsContainer")
          .scrollIntoView({ behavior: "smooth" });
    }
    tapCount = 0;
  }, 300);
});
// RECOMMENDED VIDEOS

async function loadRecommended() {
  const res = await fetch("/api/videos");
  const data = await res.json();

  const container = document.getElementById("recommendedVideos");
  if (!container) return;
  container.innerHTML = "";

  data.videos.forEach((vid) => {
    if (vid._id === id) return;
    const card = document.createElement("div");
    card.className = "flex gap-3 cursor-pointer hover:bg-white/10 p-2 rounded";
    card.innerHTML = `
  <img src="${getThumbnailUrl(vid.thumbnail)}" class="w-28 h-20 object-cover rounded flex-shrink-0"/>
  <div class="flex flex-col justify-center min-w-0">
    <h4 class="text-sm font-semibold leading-tight line-clamp-2 break-words">${vid.title}</h4>
    <p class="text-xs text-gray-400 mt-1">VideoHub</p>
  </div>`;
    card.onclick = () =>
      (window.location.href = "/pages/video.html?id=" + vid._id);
    container.appendChild(card);
  });
}

loadRecommended();
// LOAD COMMENTS

async function loadComments() {
  const res = await fetch("/api/comments/" + id);
  const comments = await res.json();

  const container = document.getElementById("commentsContainer");
  container.innerHTML = "";

  if (!comments.length) {
    container.innerHTML =
      "<p class='text-gray-500 text-sm py-4'>No comments yet. Be the first!</p>";
    return;
  }

  comments.forEach((c) => {
    const div = document.createElement("div");
    div.className =
      "comment-card bg-white/10 border border-white/20 p-3 rounded";

    const commenterName = c.user || "Anonymous";
    const commenterCity = c.city || "Unknown";

    div.innerHTML = `
      <p class="text-sm font-semibold">${commenterName} • ${commenterCity}</p>
      <p class="comment-text mt-1 text-sm">${c.text}</p>
      <div class="flex gap-4 mt-2 text-sm items-center flex-wrap">
        <button onclick="likeComment('${c._id}')" class="hover:scale-110 transition">
          👍 ${c.likes || 0}
        </button>
        <button onclick="dislikeComment('${c._id}')" class="hover:scale-110 transition">
          👎 ${c.dislikes || 0}
        </button>
        <select onchange="translateComment(this)" class="bg-gray-800 px-2 py-1 rounded text-xs">
          <option value="">Translate</option>
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="te">Telugu</option>
          <option value="ta">Tamil</option>
          <option value="ml">Malayalam</option>
          <option value="kn">Kannada</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="zh-CN">Chinese</option>
          <option value="ja">Japanese</option>
          <option value="ar">Arabic</option>
        </select>
      </div>`;

    container.appendChild(div);
  });
}

loadComments();

// POST COMMENT

async function postComment() {
  const text = document.getElementById("commentInput").value.trim();
  const stored = localStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : null;

  if (!user) {
    showToast("Please login to comment", "warning");
    setTimeout(() => (window.location.href = "/pages/login.html"), 1200);
    return;
  }

  if (!text) {
    showToast("Comment cannot be empty", "warning");
    return;
  }

  const specialRegex = /[!@#$%^&*(),.?":{}|<>]/;
  if (specialRegex.test(text)) {
    showToast("Special characters are not allowed", "warning");
    return;
  }

  try {
    const res = await fetch("/api/comments/" + id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        user: user.name || "Anonymous",
        city: user.city || "Unknown",
      }),
    });
    const data = await res.json();

    if (res.ok) {
      document.getElementById("commentInput").value = "";
      loadComments();
    } else {
      showToast(data.message || "Failed to post comment", "error");
    }
  } catch (err) {
    showToast("Something went wrong", "error");
  }
}

// LIKE / DISLIKE
async function likeComment(commentId) {
  await fetch("/api/comments/like/" + commentId, { method: "POST" });
  loadComments();
}

async function dislikeComment(commentId) {
  await fetch("/api/comments/dislike/" + commentId, { method: "POST" });
  loadComments();
}
// TRANSLATE COMMENT
async function translateComment(select) {
  const lang = select.value;
  if (!lang) return;

  const commentCard = select.closest(".comment-card");
  const textEl = commentCard.querySelector(".comment-text");

  if (!textEl.dataset.original)
    textEl.dataset.original = textEl.innerText.trim();

  try {
    select.disabled = true;
    select.options[0].text = "Translating…";

    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: textEl.dataset.original, target: lang }),
    });
    const data = await res.json();

    if (data.translatedText) {
      textEl.innerText = data.translatedText;
    } else {
      showToast("Translation failed", "error");
    }
  } catch (err) {
    showToast("Translation failed", "error");
  } finally {
    select.disabled = false;
    select.options[0].text = "Translate";
  }
}
// CHECK DOWNLOAD STATUS

async function checkDownloadStatus() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  try {
    const res = await fetch("/api/downloads/user/" + user._id);
    const downloads = await res.json();
    const already = downloads.find((d) => d.videoId === id);

    if (already) {
      const btn =
        document.getElementById("downloadBtn") ||
        document.getElementById("download");
      const badge = document.getElementById("downloadedBadge");
      if (btn) btn.classList.add("hidden");
      if (badge) badge.classList.remove("hidden");
    }
  } catch (err) {
    console.error("Download status error:", err);
  }
}

checkDownloadStatus();
// DOWNLOAD BUTTON

const downloadBtn =
  document.getElementById("downloadBtn") || document.getElementById("download");

if (downloadBtn) {
  downloadBtn.onclick = async () => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
      showToast("Please login to download", "warning");
      setTimeout(() => (window.location.href = "/pages/login.html"), 1200);
      return;
    }

    try {
      const res = await fetch("/api/downloads/" + id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: user._id }),
      });
      const data = await res.json();

      if (data.limitReached) {
        const popup = document.getElementById("upgradePopup");
        if (popup) {
          popup.classList.remove("hidden");
          popup.classList.add("flex");
        }
        return;
      }

      if (data.alreadyDownloaded) {
        showToast("You already downloaded this video", "info");
        return;
      }

      if (data.success) {
        const link = document.createElement("a");
        link.href = "/uploads/videos/" + data.videoUrl;
        link.download = data.title || "video";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        downloadBtn.classList.add("hidden");
        const badge = document.getElementById("downloadedBadge");
        if (badge) badge.classList.remove("hidden");

        showToast("Download started!", "success");
      } else {
        showToast(data.message || "Download failed", "error");
      }
    } catch (err) {
      showToast("Something went wrong", "error");
    }
  };
}
