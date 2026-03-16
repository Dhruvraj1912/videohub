const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: "yourmail@gmail.com",
    pass: "app-password",
  },
});

function sendInvoice(email, plan) {
  transporter.sendMail({
    from: "Video Platform",

    to: email,

    subject: "Subscription Invoice",

    text: `You upgraded to ${plan}`,
  });
}

module.exports = sendInvoice;
