//show subscription badge
function showUserPlan() {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user || !user.plan) return;

  const badge = document.getElementById("planBadge");

  if (badge) {
    badge.innerText = user.plan;

    badge.classList.remove("hidden");
  }
}

showUserPlan();
async function loadVideos() {
  try {
    const res = await fetch("/api/videos");

    const data = await res.json();
    const videos = data.videos;
    const container = document.getElementById("videoContainer");

    container.innerHTML = "";
    if (!videos || videos.length === 0) {
      container.innerHTML = "<p class='text-gray-400'>No videos found</p>";
      return;
    }
    videos.forEach((video) => {
      const card = document.createElement("div");

      card.className =
        "backdrop-blur-lg bg-white/10 border border-white/20 rounded-xl overflow-hidden hover:scale-105 transition cursor-pointer";

      card.innerHTML = `

<img
src="/uploads/thumbnails/${video.thumbnail}"
class="w-full h-44 object-cover"
/>
<div class="p-3">

<h3 class="text-sm font-semibold">
${video.title}
</h3>
</div>
`;

      card.onclick = () => {
        window.location.href = "/pages/video.html?id=" + video._id;
      };

      container.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to load videos", err);
  }
}
loadVideos();
