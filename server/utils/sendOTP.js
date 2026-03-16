const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOTP(email, otp) {
  const mailOptions = {
    from: `"VideoHub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your VideoHub Login OTP",
    text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    html: `
      <div style="font-family:sans-serif; max-width:400px; margin:auto; padding:24px; background:#1e293b; border-radius:12px; color:white;">
        <h2 style="margin-bottom:8px;">VideoHub Login</h2>
        <p style="color:#94a3b8; margin-bottom:20px;">Use the OTP below to complete your login.</p>
        <div style="background:#0f172a; padding:16px 24px; border-radius:8px; text-align:center; font-size:32px; font-weight:bold; letter-spacing:8px; color:#818cf8;">
          ${otp}
        </div>
        <p style="color:#64748b; font-size:13px; margin-top:16px;">This OTP expires in 5 minutes. Do not share it with anyone.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = sendOTP;
