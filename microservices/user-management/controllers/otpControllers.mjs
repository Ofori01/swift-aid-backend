import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Send OTP
export async function sendOTP(req, res) {
  try {
    const phone = process.env.TWILIO_VERIFIED_NUMBER; // restrict to verified number only

    const verification = await client.verify.v2
      .services(process.env.TWILIO_SERVICE_SID)
      .verifications.create({
        to: phone,
        channel: "sms",
      });

    res.status(200).json({
      message: "OTP sent successfully",
      status: verification.status,
    });
  } catch (error) {
    console.error("OTP Send Error:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

// Verify OTP
export async function verifyOTP(req, res) {
  try {
    const { code } = req.body;
    const phone = process.env.TWILIO_VERIFIED_NUMBER;

    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_SERVICE_SID)
      .verificationChecks.create({
        to: phone,
        code,
      });

    if (verificationCheck.status === "approved") {
      res.status(200).json({ message: "OTP verified successfully", status: verificationCheck.status });
    } else {
      res.status(401).json({ message: "Incorrect OTP", status: verificationCheck.status });
    }
  } catch (error) {
    console.error("OTP Verification Error:", error);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
};
