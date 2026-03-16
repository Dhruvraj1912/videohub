const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const User = require("../models/User");

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "placeholder_key_id",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_key_secret",
});

const plans = {
  Bronze: { price: 10, watch: 7 },
  Silver: { price: 50, watch: 10 },
  Gold: { price: 100, watch: 999 },
};

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
    res.json({ message: "Plan upgraded successfully" });
  } catch (err) {
    console.error("Verify error:", err.message);
    res.status(500).json({ message: "Verification failed" });
  }
});

module.exports = router;
