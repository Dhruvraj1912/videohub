const sidebar = document.getElementById("sidebar");
const labels = document.querySelectorAll(".label");
const mainContent = document.getElementById("mainContent");

let collapsed = false;

function toggleSidebar() {
  if (collapsed) {
    sidebar.classList.remove("w-16");
    sidebar.classList.add("w-60");

    labels.forEach((label) => {
      label.style.display = "inline";
    });

    mainContent.classList.remove("ml-16");
    mainContent.classList.add("ml-60");
  } else {
    sidebar.classList.remove("w-60");
    sidebar.classList.add("w-16");

    labels.forEach((label) => {
      label.style.display = "none";
    });

    mainContent.classList.remove("ml-60");
    mainContent.classList.add("ml-16");
  }

  collapsed = !collapsed;
}
