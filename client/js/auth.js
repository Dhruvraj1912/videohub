const SOUTH_STATES = [
  "Tamil Nadu",
  "Kerala",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
];

//REGISTER

document
  .getElementById("registerForm")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const city = document.getElementById("city").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;

    if (!name || !email || !city || !phone || !password) {
      showToast("Please fill in all fields", "warning");
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone, city }),
      });
      const data = await res.json();

      if (data.message === "Registration successful") {
        showToast("Registered successfully! Redirecting...", "success");
        setTimeout(() => (window.location.href = "/pages/login.html"), 1500);
      } else {
        showToast(data.message, "error");
      }
    } catch (err) {
      showToast("Registration failed. Please try again.", "error");
    }
  });

//LOGIN SEND OTP

async function requestLogin() {
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone")?.value.trim() || "";
  const city = document.getElementById("city").value.trim();

  if (!email || !city) {
    showToast("Email and State are required", "warning");
    return;
  }

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, phone, city }),
    });
    const data = await res.json();

    if (res.ok) {
      if (typeof applyTheme === "function") applyTheme(city);

      const otpField = document.getElementById("otp");
      const otpNote = document.getElementById("otpNote");
      const verifyBtn = document.getElementById("verifyBtn");
      const sendBtn = document.getElementById("sendOtpBtn");

      if (otpField) otpField.classList.remove("hidden");
      if (verifyBtn) verifyBtn.classList.remove("hidden");
      if (sendBtn) sendBtn.classList.add("hidden");

      const isSouth = SOUTH_STATES.includes(city);
      if (otpNote) {
        otpNote.textContent = isSouth
          ? "✉️ OTP sent to your registered email"
          : "📱 OTP sent to your registered mobile number";
        otpNote.classList.remove("hidden");
      }

      if (data.otp) {
        showToast("OTP (dev): " + data.otp, "info");
      } else {
        showToast(
          isSouth ? "OTP sent to your email!" : "OTP sent to your mobile!",
          "success",
        );
      }
    } else {
      showToast(data.message || "Something went wrong", "error");
    }
  } catch (err) {
    showToast("Login request failed. Check your connection.", "error");
  }
}

//VERIFY OTP

async function verifyOTP() {
  const emailEl = document.getElementById("email");
  const otpEl =
    document.getElementById("otp") || document.getElementById("otpInput");

  const email = emailEl?.value.trim();
  const otp = otpEl?.value.trim();

  if (!email || !otp) {
    showToast("Please enter your email and OTP", "warning");
    return;
  }

  try {
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();

    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.user.city && typeof applyTheme === "function")
        applyTheme(data.user.city);
      showToast("Login successful! Welcome back.", "success");
      setTimeout(() => (window.location.href = "/pages/index.html"), 1200);
    } else {
      showToast(data.message || "Invalid OTP", "error");
    }
  } catch (err) {
    showToast("Verification failed. Please try again.", "error");
  }
}
