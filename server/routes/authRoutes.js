const express = require("express");
const router = express.Router();
const otpGenerator = require("otp-generator");

const User = require("../models/User");
const Download = require("../models/Download");
const Comment = require("../models/Comment");
const sendOTP = require("../utils/sendOTP");

const SOUTH_STATES = [
  "Tamil Nadu",
  "Kerala",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
];

//REGISTER

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, city } = req.body;

    if (!name || !email || !password || !phone || !city) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const user = new User({ name, email, password, phone, city });
    await user.save();

    res.json({ message: "Registration successful" });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: "Email already registered" });
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

//LOGIN – SEND OTP

router.post("/login", async (req, res) => {
  try {
    const { email, phone, city } = req.body;

    if (!email || !city) {
      return res.status(400).json({ message: "Email and state are required" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      const fallbackName = email.split("@")[0];
      user = new User({ name: fallbackName, email, phone: phone || "", city });
      await user.save();
    } else {
      if (phone) user.phone = phone;
      if (city) user.city = city;
    }

    // Generate OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min
    await user.save();

    console.log("City received:", JSON.stringify(city));
    console.log("isSouth:", SOUTH_STATES.includes(city));
    const isSouth = SOUTH_STATES.includes(city);

    if (isSouth) {
      // South India  send OTP via email
      try {
        await sendOTP(email, otp);
        console.log(`Email OTP sent to ${email} (South India user)`);
        return res.json({ message: "OTP sent to your email" });
      } catch (emailErr) {
        console.error("Email OTP failed:", emailErr.message);
        // Fallback to returning OTP if email fails
        return res.json({
          message: "OTP sent (email failed, dev fallback)",
          otp,
        });
      }
    } else {
      // Other states  no SMS gateway, return OTP in response (dev mode)
      console.log(`DEV: OTP for ${email} (non-South user): ${otp}`);
      return res.json({ message: "OTP sent to your mobile number", otp });
    }
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

//VERIFY OTP

router.post("/verify", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP required" });

    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.otp !== otp)
      return res.status(400).json({ message: "Incorrect OTP" });

    if (user.otpExpiry && new Date() > user.otpExpiry) {
      return res
        .status(400)
        .json({ message: "OTP expired. Please request a new one." });
    }

    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.json({
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        plan: user.plan,
      },
    });
  } catch (err) {
    console.error("Verify error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

//DEACTIVATe

router.post("/deactivate", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId)
      return res.status(400).json({ message: "User ID is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    await Download.deleteMany({ user: userId });
    await Comment.deleteMany({ user: user.name });
    await User.findByIdAndDelete(userId);

    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("Deactivate error:", err.message);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

module.exports = router;
