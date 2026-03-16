(function () {
  const el = document.createElement("div");
  el.id = "globalToast";
  el.style.cssText = `
    position: fixed;
    top: 1.5rem;
    left: 50%;
    transform: translateX(-50%) translateY(-10px);
    padding: 10px 24px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    opacity: 0;
    transition: all 0.3s ease;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(el);

  let _timer;

  window.showToast = function (msg, type = "success") {
    const colors = {
      success: { bg: "#22c55e", shadow: "rgba(34,197,94,0.4)" },
      error: { bg: "#ef4444", shadow: "rgba(239,68,68,0.4)" },
      info: { bg: "#3b82f6", shadow: "rgba(59,130,246,0.4)" },
      warning: { bg: "#f59e0b", shadow: "rgba(245,158,11,0.4)" },
    };
    const icons = { success: "✓", error: "✗", info: "ℹ", warning: "⚠" };
    const c = colors[type] || colors.success;

    el.style.background = c.bg;
    el.style.boxShadow = `0 4px 20px ${c.shadow}`;
    el.style.color = "white";
    el.textContent = icons[type] + " " + msg;

    // Show
    el.style.opacity = "1";
    el.style.transform = "translateX(-50%) translateY(0)";

    clearTimeout(_timer);
    _timer = setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateX(-50%) translateY(-10px)";
    }, 3000);
  };
})();
