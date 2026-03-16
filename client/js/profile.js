// profile.js
function loadProfile() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    window.location.href = "/pages/login.html";
    return;
  }

  document.getElementById("name").innerText = user.name || "User";
  document.getElementById("email").innerText = user.email || "";
  document.getElementById("city").innerText = user.city || "Unknown";

  const plan = user.plan || "Free";
  document.getElementById("plan").innerText = plan;
  document.getElementById("planPill").innerText = plan;

  let limit = "5 minutes";
  if (plan === "Bronze") limit = "7 minutes";
  if (plan === "Silver") limit = "10 minutes";
  if (plan === "Gold") limit = "Unlimited";
  document.getElementById("limit").innerText = limit;

  const avatar = document.getElementById("avatar");
  avatar.innerText = user.name ? user.name.charAt(0).toUpperCase() : "U";
}

loadProfile();

function logout() {
  localStorage.removeItem("user");
  window.location.href = "/pages/login.html";
}

function showDeactivateConfirm() {
  document.getElementById("deactivatePopup").classList.remove("hidden");
}

async function deactivateAccount() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  try {
    const res = await fetch("/api/auth/deactivate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user._id }),
    });
    const data = await res.json();

    if (res.ok) {
      localStorage.removeItem("user");
      showToast("Account deleted successfully.", "success");
      setTimeout(() => (window.location.href = "/pages/login.html"), 1500);
    } else {
      showToast(data.message || "Deactivation failed", "error");
    }
  } catch (err) {
    showToast("Something went wrong: " + err.message, "error");
  }
}
