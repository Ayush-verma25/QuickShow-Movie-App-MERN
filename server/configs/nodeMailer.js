import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Add connection timeout and retry options
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 5000, // 5 seconds
  socketTimeout: 10000, // 10 seconds
});

transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP configuration error:", error);
  } else {
    console.log("SMTP server is ready to send emails");
  }
});

const sendEmail = async ({ to, subject, body }) => {
  try {
    // Validate input parameters
    if (!to || !subject || !body) {
      throw new Error(
        "Missing required email parameters: to, subject, or body"
      );
    }

    // Validate email format (basic check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error(`Invalid email format: ${to}`);
    }

    const mailOptions = {
      from: {
        name: "QuickShow Movie App",
        address: process.env.SENDER_EMAIL,
      },
      to,
      subject,
      html: body,
      // Add text fallback
      text: body.replace(/<[^>]*>/g, ""), // Strip HTML tags for text version
    };

    const response = transporter.sendMail(mailOptions);

    console.log("Email sent successfully:", {
      messageId: response.messageId,
      to: to,
      subject: subject,
    });

    return response;
  } catch (error) {
    console.error("Error sending email:", error);

    // Provide more specific error information
    if (error.code === "ECONNECTION") {
      throw new Error(
        "Failed to connect to SMTP server. Check your network connection."
      );
    } else if (error.code === "EAUTH") {
      throw new Error("SMTP authentication failed. Check your credentials.");
    } else if (error.responseCode >= 400) {
      throw new Error(`SMTP server error: ${error.response}`);
    }

    throw error;
  }
};

export default sendEmail;
