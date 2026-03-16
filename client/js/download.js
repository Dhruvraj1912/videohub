// VIDEO PAGE
async function handleDownload() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    showToast("Please login to download videos", "warning");
    setTimeout(() => (window.location.href = "/pages/login.html"), 1200);
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const videoId = params.get("id");

  try {
    const res = await fetch("/api/downloads/" + videoId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: user._id }),
    });
    const data = await res.json();

    if (data.limitReached) {
      showUpgradePopup();
      return;
    }

    if (data.alreadyDownloaded) {
      showToast("You have already downloaded this video", "info");
      return;
    }

    if (data.success) {
      const link = document.createElement("a");
      link.href = "/uploads/videos/" + data.videoUrl;
      link.download = data.title || "video";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const btn = document.getElementById("downloadBtn");
      const badge = document.getElementById("downloadedBadge");
      if (btn) btn.classList.add("hidden");
      if (badge) badge.classList.remove("hidden");

      showToast("Download started!", "success");
    } else {
      showToast(data.message || "Download failed", "error");
    }
  } catch (err) {
    showToast("Something went wrong. Please try again.", "error");
  }
}

function showUpgradePopup() {
  const popup = document.getElementById("upgradePopup");
  if (popup) {
    popup.classList.remove("hidden");
    popup.classList.add("flex");
  }
}

function closeUpgradePopup() {
  const popup = document.getElementById("upgradePopup");
  if (popup) {
    popup.classList.add("hidden");
    popup.classList.remove("flex");
  }
}

async function checkDownloadStatus() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  const videoId = params.get("id");
  if (!videoId) return;

  try {
    const res = await fetch("/api/downloads/user/" + user._id);
    const downloads = await res.json();
    const already = downloads.find(
      (d) => String(d.videoId) === String(videoId),
    );

    if (already) {
      const btn = document.getElementById("downloadBtn");
      const badge = document.getElementById("downloadedBadge");
      if (btn) btn.classList.add("hidden");
      if (badge) badge.classList.remove("hidden");
    }
  } catch (err) {
    console.error("Status check error:", err);
  }
}
// DOWNLOADS PAGE

async function loadDownloads() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    showToast("Please login first", "warning");
    setTimeout(() => (window.location.href = "/pages/login.html"), 1200);
    return;
  }

  const container = document.getElementById("downloadsContainer");
  if (!container) return;

  container.innerHTML = `<p class="text-gray-400 col-span-4 text-center py-8">Loading...</p>`;

  try {
    const res = await fetch("/api/downloads/user/" + user._id);

    if (!res.ok) {
      container.innerHTML = `<p class="text-red-400 col-span-4 text-center py-8">Server error: ${res.status}</p>`;
      return;
    }

    const downloads = await res.json();
    container.innerHTML = "";

    if (!downloads || downloads.length === 0) {
      container.innerHTML = `
        <div class="col-span-4 text-center py-16 text-gray-400">
          <p class="text-lg mb-2">No downloads yet</p>
          <p class="text-sm">Go to a video and click the Download button</p>
        </div>`;
      return;
    }

    const countEl = document.getElementById("downloadCount");
    if (countEl) countEl.textContent = downloads.length + " video(s)";

    downloads.forEach((item) => {
      const card = document.createElement("div");
      card.className =
        "backdrop-blur-lg bg-white/10 border border-white/20 rounded-xl overflow-hidden hover:scale-105 transition cursor-pointer";
      card.innerHTML = `
        <img src="/uploads/thumbnails/${item.thumbnail}" class="w-full h-44 object-cover"
          onerror="this.style.background='#1e293b'; this.style.height='176px';" />
        <div class="p-3 flex justify-between items-center gap-2">
          <h3 class="text-sm font-semibold truncate flex-1">${item.title || "Untitled"}</h3>
          <button onclick="event.stopPropagation(); deleteDownload('${item._id}')"
            class="text-red-400 hover:text-red-500 text-xs flex-shrink-0 px-2 py-1 rounded hover:bg-red-500/10 transition">
            Remove
          </button>
        </div>`;
      card.onclick = () =>
        (window.location.href = "/pages/video.html?id=" + item.videoId);
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `<p class="text-red-400 col-span-4 text-center py-8">Failed to load downloads</p>`;
  }
}

async function deleteDownload(downloadId) {
  if (!confirm("Remove this from your downloads?")) return;

  try {
    const res = await fetch("/api/downloads/" + downloadId, {
      method: "DELETE",
    });
    const data = await res.json();

    if (data.success) {
      showToast("Removed from downloads", "success");
      loadDownloads();
    } else {
      showToast(data.message || "Delete failed", "error");
    }
  } catch (err) {
    showToast("Something went wrong", "error");
  }
}

// AUTO-RUN
if (document.getElementById("downloadsContainer")) loadDownloads();
if (document.getElementById("downloadBtn")) checkDownloadStatus();
