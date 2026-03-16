const southIndiaStates = [
  "Tamil Nadu",
  "Kerala",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
];

function applyTheme(city) {
  const nowUTC = new Date();
  const istMillis = nowUTC.getTime() + (5 * 60 + 30) * 60 * 1000;
  const istTime = new Date(istMillis);
  const hour = istTime.getUTCHours();

  const isLightTime = hour >= 10 && hour < 12;
  const isSouthIndia = southIndiaStates.includes(city);

  if (isLightTime && isSouthIndia) {
    //LIGHT THEME
    document.body.style.background =
      "linear-gradient(135deg, #e0f2fe, #f0f9ff, #e8f4fd)";
    document.body.style.color = "#1e293b";
    document.body.classList.add("light-theme");
    document.body.classList.remove("dark-theme");

    // Navbar
    document.querySelectorAll("header").forEach((el) => {
      el.style.background = "#ffffff";
      el.style.borderColor = "#bae6fd";
      el.style.boxShadow = "0 2px 8px rgba(14,165,233,0.08)";
      el.style.color = "#1e293b";
    });

    // Sidebar
    document.querySelectorAll("aside").forEach((el) => {
      el.style.background = "#f0f9ff";
      el.style.borderColor = "#bae6fd";
      el.style.boxShadow = "2px 0 8px rgba(14,165,233,0.06)";
    });

    // Sidebar links
    document.querySelectorAll("aside a").forEach((el) => {
      el.style.color = "#0369a1";
    });
    document.querySelectorAll(".glass").forEach((el) => {
      el.style.background = "#ffffff";
      el.style.color = "#1e293b";
      el.style.border = "1px solid #bae6fd";
      el.style.boxShadow = "0 4px 16px rgba(14,165,233,0.1)";
    });
    document.querySelectorAll(".bg-\\[\\#1e293b\\]").forEach((el) => {
      el.style.background = "#ffffff";
      el.style.color = "#1e293b";
      el.style.border = "1px solid #bae6fd";
      el.style.boxShadow = "0 2px 8px rgba(14,165,233,0.08)";
    });

    document.querySelectorAll(".bg-\\[\\#0f172a\\]").forEach((el) => {
      el.style.background = "#f0f9ff";
    });
    document
      .querySelectorAll(".bg-gray-800, .bg-gray-900, form")
      .forEach((el) => {
        el.style.background = "#ffffff";
        el.style.color = "#1e293b";
        el.style.border = "1px solid #bae6fd";
        el.style.boxShadow = "0 4px 16px rgba(14,165,233,0.1)";
      });

    document.querySelectorAll(".bg-gray-700").forEach((el) => {
      el.style.background = "#f0f9ff";
      el.style.color = "#1e293b";
    });

    // Inputs + textareas
    document.querySelectorAll("input, textarea").forEach((el) => {
      el.style.background = "#ffffff";
      el.style.color = "#1e293b";
      el.style.border = "1px solid #7dd3fc";
    });

    // Dropdowns
    document.querySelectorAll("select").forEach((el) => {
      el.style.background = "#ffffff";
      el.style.color = "#1e293b";
      el.style.border = "1px solid #7dd3fc";
    });

    // All text elements
    document
      .querySelectorAll("p, h1, h2, h3, h4, h5, h6, label, span, li")
      .forEach((el) => {
        el.style.color = "#1e293b";
      });

    document
      .querySelectorAll(".text-gray-400, .text-gray-500")
      .forEach((el) => {
        el.style.color = "#475569";
      });

    document.querySelectorAll(".text-gray-300").forEach((el) => {
      el.style.color = "#334155";
    });
  } else {
    //DARK THEME
    document.body.style.background = "";
    document.body.style.color = "";
    document.body.classList.add("dark-theme");
    document.body.classList.remove("light-theme");

    document.querySelectorAll("header").forEach((el) => {
      el.style.background = "";
      el.style.borderColor = "";
      el.style.boxShadow = "";
      el.style.color = "";
    });

    document.querySelectorAll("aside").forEach((el) => {
      el.style.background = "";
      el.style.borderColor = "";
      el.style.boxShadow = "";
    });

    document.querySelectorAll("aside a").forEach((el) => {
      el.style.color = "";
    });

    document.querySelectorAll(".glass").forEach((el) => {
      el.style.background = "";
      el.style.color = "";
      el.style.border = "";
      el.style.boxShadow = "";
    });

    document.querySelectorAll(".bg-\\[\\#1e293b\\]").forEach((el) => {
      el.style.background = "";
      el.style.color = "";
      el.style.border = "";
      el.style.boxShadow = "";
    });

    document.querySelectorAll(".bg-\\[\\#0f172a\\]").forEach((el) => {
      el.style.background = "";
    });

    document
      .querySelectorAll(".bg-gray-800, .bg-gray-900, form")
      .forEach((el) => {
        el.style.background = "";
        el.style.color = "";
        el.style.border = "";
        el.style.boxShadow = "";
      });

    document.querySelectorAll(".bg-gray-700").forEach((el) => {
      el.style.background = "";
      el.style.color = "";
    });

    document.querySelectorAll("input, textarea").forEach((el) => {
      el.style.background = "";
      el.style.color = "";
      el.style.border = "";
    });

    document.querySelectorAll("select").forEach((el) => {
      el.style.background = "";
      el.style.color = "";
      el.style.border = "";
    });

    document
      .querySelectorAll("p, h1, h2, h3, h4, h5, h6, label, span, li")
      .forEach((el) => {
        el.style.color = "";
      });

    document
      .querySelectorAll(".text-gray-400, .text-gray-500")
      .forEach((el) => {
        el.style.color = "";
      });

    document.querySelectorAll(".text-gray-300").forEach((el) => {
      el.style.color = "";
    });
  }
}

function initTheme() {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.city) applyTheme(user.city);
  } catch (e) {}
}

initTheme();
