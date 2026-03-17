const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "placeholder_key_id",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_key_secret",
});

const plans = {
  Bronze: { price: 10, watch: 7, label: "Bronze Plan" },
  Silver: { price: 50, watch: 10, label: "Silver Plan" },
  Gold: { price: 100, watch: 999, label: "Gold Plan" },
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

//Send Invoice Email
async function sendInvoiceEmail(user, plan, orderId) {
  const planDetails = plans[plan];
  const date = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const invoiceNo = "INV-" + Date.now();
  const watchLabel =
    planDetails.watch === 999 ? "Unlimited" : planDetails.watch + " minutes";

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0f172a;border-radius:12px;overflow:hidden;color:white;">
      
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:28px 32px;">
        <h1 style="margin:0;font-size:24px;color:white;">VideoHub</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Payment Invoice</p>
      </div>

      <!-- Body -->
      <div style="padding:32px;">
        <p style="color:#94a3b8;font-size:14px;margin-bottom:24px;">
          Hi <strong style="color:white;">${user.name}</strong>, thank you for upgrading your plan! Here is your invoice.
        </p>

        <!-- Invoice Details -->
        <div style="background:#1e293b;border-radius:10px;padding:20px;margin-bottom:20px;">
          <table style="width:100%;font-size:13px;">
            <tr>
              <td style="color:#94a3b8;padding:6px 0;">Invoice No</td>
              <td style="color:white;text-align:right;">${invoiceNo}</td>
            </tr>
            <tr>
              <td style="color:#94a3b8;padding:6px 0;">Date</td>
              <td style="color:white;text-align:right;">${date}</td>
            </tr>
            <tr>
              <td style="color:#94a3b8;padding:6px 0;">Order ID</td>
              <td style="color:white;text-align:right;">${orderId}</td>
            </tr>
            <tr>
              <td style="color:#94a3b8;padding:6px 0;">Name</td>
              <td style="color:white;text-align:right;">${user.name}</td>
            </tr>
            <tr>
              <td style="color:#94a3b8;padding:6px 0;">Email</td>
              <td style="color:white;text-align:right;">${user.email}</td>
            </tr>
          </table>
        </div>

        <!-- Plan Details -->
        <div style="background:#1e293b;border-radius:10px;padding:20px;margin-bottom:20px;">
          <p style="margin:0 0 12px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Plan Details</p>
          <table style="width:100%;font-size:13px;">
            <tr>
              <td style="color:#94a3b8;padding:6px 0;">Plan</td>
              <td style="text-align:right;">
                <span style="background:${plan === "Gold" ? "#ca8a04" : plan === "Silver" ? "#64748b" : "#92400e"};color:white;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;">
                  ${planDetails.label}
                </span>
              </td>
            </tr>
            <tr>
              <td style="color:#94a3b8;padding:6px 0;">Watch Limit</td>
              <td style="color:white;text-align:right;">${watchLabel}</td>
            </tr>
            <tr>
              <td style="color:#94a3b8;padding:6px 0;">Downloads</td>
              <td style="color:white;text-align:right;">Unlimited</td>
            </tr>
          </table>
        </div>

        <!-- Total -->
        <div style="background:linear-gradient(135deg,rgba(124,58,237,0.2),rgba(79,70,229,0.2));border:1px solid rgba(124,58,237,0.3);border-radius:10px;padding:20px;display:flex;justify-content:space-between;align-items:center;">
          <span style="color:white;font-size:16px;font-weight:600;">Total Paid</span>
          <span style="color:#a78bfa;font-size:24px;font-weight:700;">₹${planDetails.price}</span>
        </div>

        <p style="color:#475569;font-size:12px;margin-top:24px;text-align:center;">
          This is a test payment invoice. VideoHub — Your Premium Video Platform.
        </p>
      </div>

    </div>
  `;

  await transporter.sendMail({
    from: `"VideoHub" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Invoice - ${planDetails.label} Upgrade | VideoHub`,
    html,
  });

  console.log(`Invoice sent to ${user.email}`);
}

//CREATE ORDER
router.post("/create-order", async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plans[plan]) return res.status(400).json({ message: "Invalid plan" });

    const order = await instance.orders.create({
      amount: plans[plan].price * 100,
      currency: "INR",
      receipt: "order_" + Date.now(),
    });

    res.json(order);
  } catch (err) {
    console.error("Create order error:", err.message);
    res.status(500).json({ message: "Failed to create order" });
  }
});

//VERIFY & UPGRADE
router.post("/verify", async (req, res) => {
  try {
    const { userId, plan } = req.body;

    if (!userId) return res.status(400).json({ message: "userId is required" });
    if (!plans[plan]) return res.status(400).json({ message: "Invalid plan" });

    const updated = await User.findByIdAndUpdate(
      userId,
      { plan, watchLimit: plans[plan].watch },
      { new: true },
    );

    if (!updated) return res.status(404).json({ message: "User not found" });

    console.log(`Plan upgraded: ${updated.email} → ${plan}`);

    // Send invoice email
    try {
      await sendInvoiceEmail(updated, plan, "ORD-" + Date.now());
      console.log("Invoice email sent ✅");
    } catch (emailErr) {
      console.error("Invoice email failed:", emailErr.message);
    }

    res.json({ message: "Plan upgraded successfully" });
  } catch (err) {
    console.error("Verify error:", err.message);
    res.status(500).json({ message: "Verification failed" });
  }
});

module.exports = router;
