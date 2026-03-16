"use strict";

const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

let socket = null;
let localStream = null;
let screenStream = null;
let mediaRecorder = null;
let recordedChunks = [];

let isMuted = false;
let isCamOff = false;
let isSharing = false;
let isRecording = false;
let isChatOpen = false;

let currentRoom = "";
let currentName = "";
let callSeconds = 0;
let timerInterval = null;

const peers = {};
const $ = (id) => document.getElementById(id);

window.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("joinOverlay");
  const startOnce = () => {
    startPreview();
    overlay.removeEventListener("click", startOnce);
  };
  overlay.addEventListener("click", startOnce);
});

async function startPreview() {
  try {
    const s = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    const preview = $("previewVideo");
    preview.srcObject = s;
    preview.play().catch(() => {});
    $("previewPH").style.display = "none";
    window._previewStream = s;
  } catch (err) {
    console.warn("Preview camera error:", err.message);
  }
}

function stopPreview() {
  if (window._previewStream) {
    window._previewStream.getTracks().forEach((t) => t.stop());
    window._previewStream = null;
  }
  // Clear preview video
  const preview = $("previewVideo");
  if (preview) preview.srcObject = null;
}

// JOIN

async function joinCall() {
  const name = $("inputName").value.trim();
  const room = $("inputRoom").value.trim();

  if (!name) {
    toast("Enter your name");
    return;
  }
  if (!room) {
    toast("Enter a Room ID");
    return;
  }

  currentName = name;
  currentRoom = room;

  // Stop preview first
  stopPreview();

  // Get full camera + mic stream
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
  } catch (err) {
    toast("Camera/mic access denied: " + err.message);
    return;
  }

  // Show local video immediately
  const localVideo = $("localVideo");
  localVideo.srcObject = localStream;
  localVideo.play().catch(() => {});

  $("localLabel").textContent = name + " (you)";
  $("roomLabel").textContent = "Room: " + room;

  // Hide overlay + wait placeholder
  $("joinOverlay").classList.add("hidden");
  $("waitPlaceholder").classList.add("hidden");

  startTimer();
  addPill(name);
  connectSocket();

  fetch("/api/calls/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId: room, createdBy: name }),
  }).catch(() => {});

  if (window.lucide) lucide.createIcons();
  toast('Joined room "' + room + '"');
}
// SOCKET.IO

function connectSocket() {
  socket = io();

  socket.on("connect", () => {
    socket.emit("join-room", { roomId: currentRoom, userName: currentName });
  });

  socket.on("room-info", ({ participants }) => {
    participants.filter((n) => n !== currentName).forEach(addPill);
  });

  socket.on("user-joined", async ({ socketId, userName }) => {
    toast(userName + " joined");
    addChatLine("System", userName + " joined the call", true);
    addPill(userName);

    const pc = createPC(socketId, userName);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", {
        roomId: currentRoom,
        offer: pc.localDescription,
        targetSocketId: socketId,
      });
    } catch (e) {
      console.error("createOffer:", e);
    }
  });

  socket.on("offer", async ({ offer, fromSocketId }) => {
    const label = fromSocketId.substring(0, 6);
    const pc = createPC(fromSocketId, label);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", {
        roomId: currentRoom,
        answer: pc.localDescription,
        targetSocketId: fromSocketId,
      });
    } catch (e) {
      console.error("setRemoteDesc(offer):", e);
    }
  });

  socket.on("answer", async ({ answer, fromSocketId }) => {
    const pc = peers[fromSocketId];
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (e) {
      console.error("setRemoteDesc(answer):", e);
    }
  });

  socket.on("candidate", async ({ candidate, fromSocketId }) => {
    const pc = peers[fromSocketId];
    if (!pc || !candidate) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error("addIceCandidate:", e);
    }
  });

  socket.on("user-left", ({ socketId, userName }) => {
    toast(userName + " left");
    addChatLine("System", userName + " left the call", true);
    removeTile(socketId);
    if (peers[socketId]) {
      peers[socketId].close();
      delete peers[socketId];
    }
    updateGrid();

    const grid = $("videoGrid");
    if (grid.querySelectorAll(".peer-tile").length <= 1) {
      $("waitPlaceholder").classList.remove("hidden");
    }
  });

  socket.on("chat-message", ({ from, text }) => {
    if (from !== currentName) addChatLine(from, text, false);
  });

  socket.on("screen-share-started", ({ userName }) => {
    toast(userName + " is sharing screen");
    $("screenLabel").textContent = userName + " is sharing";
  });

  socket.on("screen-share-stopped", ({ userName }) => {
    toast(userName + " stopped sharing");
  });

  socket.on("disconnect", () => toast("Connection lost – reconnecting…"));
}
// WebRTC

function createPC(socketId, label) {
  if (peers[socketId]) return peers[socketId];

  const pc = new RTCPeerConnection(ICE_CONFIG);
  peers[socketId] = pc;

  if (localStream) {
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
  }

  pc.onicecandidate = ({ candidate }) => {
    if (candidate && socket) {
      socket.emit("candidate", {
        roomId: currentRoom,
        candidate,
        targetSocketId: socketId,
      });
    }
  };

  pc.ontrack = ({ streams }) => {
    showTile(socketId, label, streams[0]);
    $("waitPlaceholder").classList.add("hidden");
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed")
      toast("Connection issue with " + label);
  };

  return pc;
}
// VIDEO GRID
function showTile(socketId, label, stream) {
  if ($("tile-" + socketId)) return;

  const tile = document.createElement("div");
  tile.className = "peer-tile";
  tile.id = "tile-" + socketId;

  const vid = document.createElement("video");
  vid.autoplay = true;
  vid.playsInline = true;
  vid.srcObject = stream;

  const lbl = document.createElement("div");
  lbl.className = "peer-label";
  lbl.textContent = label;

  tile.appendChild(vid);
  tile.appendChild(lbl);
  $("videoGrid").appendChild(tile);

  updateGrid();
  addPill(label);
}

function removeTile(socketId) {
  const tile = $("tile-" + socketId);
  if (tile) tile.remove();
  updateGrid();
}

function updateGrid() {
  const grid = $("videoGrid");
  const count = grid.querySelectorAll(".peer-tile").length;
  grid.classList.remove("two-up", "three-up", "four-up");
  if (count === 2) grid.classList.add("two-up");
  if (count === 3) grid.classList.add("three-up");
  if (count >= 4) grid.classList.add("four-up");
}

// CONTROLS
function toggleMic() {
  if (!localStream) return;
  isMuted = !isMuted;
  localStream.getAudioTracks().forEach((t) => (t.enabled = !isMuted));
  const btn = $("btnMic");
  const badge = $("localMutedBadge");
  btn.classList.toggle("muted", isMuted);
  badge.style.display = isMuted ? "flex" : "none";
  swapIcon(btn, isMuted ? "mic-off" : "mic");
  toast(isMuted ? "Mic muted" : "Mic on");
}

function toggleCamera() {
  if (!localStream) return;
  isCamOff = !isCamOff;
  localStream.getVideoTracks().forEach((t) => (t.enabled = !isCamOff));
  const btn = $("btnCam");
  btn.classList.toggle("cam-off", isCamOff);
  swapIcon(btn, isCamOff ? "video-off" : "video");
  toast(isCamOff ? "Camera off" : "Camera on");
}

async function shareScreen() {
  if (isSharing) {
    stopScreenShare();
    return;
  }

  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: "always" },
      audio: true,
    });
  } catch (err) {
    if (err.name !== "NotAllowedError")
      toast("Screen share failed: " + err.message);
    return;
  }

  isSharing = true;
  const screenTrack = screenStream.getVideoTracks()[0];

  $("screenVideo").srcObject = screenStream;
  $("screenBox").classList.add("active");
  $("screenLabel").textContent = "You are sharing your screen";

  const btn = $("btnScreen");
  btn.classList.add("sharing");
  swapIcon(btn, "monitor-off");

  Object.values(peers).forEach((pc) => {
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (sender) sender.replaceTrack(screenTrack);
  });

  if (socket)
    socket.emit("screen-share-started", {
      roomId: currentRoom,
      userName: currentName,
    });
  screenTrack.onended = stopScreenShare;
  toast("Screen sharing started");
}

function stopScreenShare() {
  if (!isSharing) return;
  isSharing = false;

  if (screenStream) {
    screenStream.getTracks().forEach((t) => t.stop());
    screenStream = null;
  }

  $("screenBox").classList.remove("active");
  const btn = $("btnScreen");
  btn.classList.remove("sharing");
  swapIcon(btn, "monitor");

  const camTrack = localStream?.getVideoTracks()[0];
  if (camTrack) {
    Object.values(peers).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) sender.replaceTrack(camTrack);
    });
  }

  if (socket)
    socket.emit("screen-share-stopped", {
      roomId: currentRoom,
      userName: currentName,
    });
  toast("Screen sharing stopped");
}

async function shareYouTube() {
  toast("Select your YouTube tab in the picker");
  await shareScreen();
}
// RECORDING

function toggleRecording() {
  isRecording ? stopRecording() : startRecording();
}

function startRecording() {
  if (!localStream) {
    toast("No stream to record");
    return;
  }

  recordedChunks = [];
  const tracks = [...localStream.getTracks()];
  if (screenStream) screenStream.getTracks().forEach((t) => tracks.push(t));
  const combined = new MediaStream(tracks);

  const mime = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ].find((t) => {
    try {
      return MediaRecorder.isTypeSupported(t);
    } catch {
      return false;
    }
  });

  try {
    mediaRecorder = mime
      ? new MediaRecorder(combined, { mimeType: mime })
      : new MediaRecorder(combined);
  } catch {
    toast("Recording not supported in this browser");
    return;
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data?.size > 0) recordedChunks.push(e.data);
  };
  mediaRecorder.onstop = saveRecording;
  mediaRecorder.start(1000);

  isRecording = true;
  $("recBadge").style.display = "flex";
  $("btnRec").classList.add("recording");
  swapIcon($("btnRec"), "square");
  toast("Recording started");
}

function stopRecording() {
  if (mediaRecorder?.state !== "inactive") mediaRecorder.stop();
  isRecording = false;
  $("recBadge").style.display = "none";
  $("btnRec").classList.remove("recording");
  swapIcon($("btnRec"), "circle");
  toast("Recording stopped – saving…");
}

function saveRecording() {
  if (!recordedChunks.length) return;
  const blob = new Blob(recordedChunks, { type: "video/webm" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `videohub-call-${currentRoom}-${nowStamp()}.webm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast("Recording saved!");
}
// CHAT

function toggleChat() {
  isChatOpen = !isChatOpen;
  $("chatPanel").classList.toggle("open", isChatOpen);
  $("btnChat").classList.toggle("chat-open", isChatOpen);
}

function sendChat() {
  const input = $("chatInput");
  const text = input.value.trim();
  if (!text || !socket) return;
  addChatLine(currentName, text, false, true);
  socket.emit("chat-message", { roomId: currentRoom, from: currentName, text });
  input.value = "";
}

function addChatLine(from, text, isSystem, isSelf = false) {
  const c = $("chatMessages");
  const ph = c.querySelector("[data-ph]");
  if (ph) ph.remove();

  const wrap = document.createElement("div");

  if (isSystem) {
    wrap.style.cssText =
      "text-align:center;color:#475569;font-size:11px;padding:4px 0;";
    wrap.textContent = text;
  } else {
    wrap.style.cssText = `display:flex;flex-direction:column;align-items:${isSelf ? "flex-end" : "flex-start"};gap:2px;`;
    wrap.innerHTML = `
      <span style="font-size:10px;color:#64748b;">${from}</span>
      <div style="
        background:${isSelf ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.06)"};
        border:1px solid ${isSelf ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.08)"};
        padding:6px 12px;
        border-radius:${isSelf ? "12px 12px 2px 12px" : "12px 12px 12px 2px"};
        font-size:13px;color:#e2e8f0;max-width:90%;word-break:break-word;
      ">${text}</div>`;
  }

  c.appendChild(wrap);
  c.scrollTop = c.scrollHeight;

  if (!isSelf && !isChatOpen) {
    const btn = $("btnChat");
    btn.style.boxShadow = "0 0 14px rgba(124,58,237,0.6)";
    setTimeout(() => (btn.style.boxShadow = ""), 2000);
  }
}
// END CALL
async function endCall() {
  if (isRecording) stopRecording();

  try {
    await fetch("/api/calls/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: currentRoom, duration: callSeconds }),
    });
  } catch {}

  if (socket) {
    socket.emit("leave-room", { roomId: currentRoom, duration: callSeconds });
    socket.disconnect();
  }

  localStream?.getTracks().forEach((t) => t.stop());
  screenStream?.getTracks().forEach((t) => t.stop());
  Object.values(peers).forEach((pc) => pc.close());
  clearInterval(timerInterval);

  toast("Call ended  •  " + formatTime(callSeconds));
  setTimeout(() => {
    window.location.href = "/pages/index.html";
  }, 2200);
}
// HELPERS

function copyRoomId() {
  if (!currentRoom) {
    toast("Join a call first");
    return;
  }
  navigator.clipboard
    .writeText(currentRoom)
    .then(() => toast("Room ID copied: " + currentRoom))
    .catch(() => toast("Room ID: " + currentRoom));
}

function addPill(name) {
  const wrap = $("pillsWrap");
  if ([...wrap.children].some((c) => c.dataset.name === name)) return;
  const pill = document.createElement("span");
  pill.className = "p-pill";
  pill.dataset.name = name;
  pill.title = name;
  pill.textContent = name.substring(0, 2).toUpperCase();
  wrap.appendChild(pill);
}

function startTimer() {
  callSeconds = 0;
  timerInterval = setInterval(() => {
    callSeconds++;
    $("callTimer").textContent = formatTime(callSeconds);
  }, 1000);
}

function formatTime(s) {
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

function nowStamp() {
  return new Date().toISOString().slice(0, 19).replace(/:/g, "-");
}

function swapIcon(btn, name) {
  const i = btn.querySelector("i[data-lucide]");
  if (i) {
    i.setAttribute("data-lucide", name);
    if (window.lucide) lucide.createIcons({ nodes: [i] });
  }
}

let _toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}
