async function buyPlan(plan) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    showToast("Please login first", "warning");
    setTimeout(() => (window.location.href = "/pages/login.html"), 1200);
    return;
  }

  const res = await fetch("/api/payments/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const order = await res.json();

  const options = {
    key: "rzp_test_SK4kxxCpGyt8la",
    amount: order.amount,
    currency: "INR",
    order_id: order.id,

    handler: async function () {
      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, plan }),
      });
      const data = await verifyRes.json();

      if (verifyRes.ok) {
        user.plan = plan;
        if (plan === "Bronze") user.watchLimit = 7;
        if (plan === "Silver") user.watchLimit = 10;
        if (plan === "Gold") user.watchLimit = 999;
        localStorage.setItem("user", JSON.stringify(user));

        showToast("Plan upgraded to " + plan + "!", "success");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast(data.message || "Upgrade failed", "error");
      }
    },
  };

  const rzp = new Razorpay(options);
  rzp.open();
}
