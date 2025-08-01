import express from "express";
import cors from "cors";
import crypto from "crypto";
import axios from "axios";

const app = express();
app.use(cors());
app.use(express.json());

// PhonePe 2025 Test Credentials (Updated July 2025)
const PHONEPE_CONFIG = {
  MERCHANT_ID: "PTESTUAT2025", // New 2025 test ID
  SALT_KEY: "uat2025_3k4j5h6g7f8e9d0c1b2a", // New 2025 salt
  BASE_URL: "https://api.testpg.phonepe.com/v5", // 2025 test endpoint
  REDIRECT_URL: "https://your-webhook-url.com/callback" // Must be HTTPS
};

// Generate X-VERIFY header (2025 format)
const generateSignature = (payload, endpoint) => {
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  const stringToHash = `${payloadBase64}${endpoint}${CONFIG.SALT_KEY}`;
  return crypto.createHash("sha3-256").update(stringToHash).digest("hex") + `###${CONFIG.SALT_INDEX}`;
};

// 2025 Payment Request Structure
app.post("/initiate-payment", async (req, res) => {
  try {
    const { amount, userId } = req.body;

    const payload = {
      merchantId: CONFIG.MERCHANT_ID,
      transactionId: `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userReferenceId: `USER_${userId || Date.now()}`,
      amount: {
        value: amount * 100, // in paise
        currency: "INR"
      },
      paymentFlow: "REDIRECT",
      callback: {
        redirectUrl: CONFIG.REDIRECT_URL,
        notificationUrl: CONFIG.REDIRECT_URL
      },
      metadata: {
        platform: "Web",
        sdkVersion: "2025.1.0"
      }
    };

    const signature = generateSignature(payload, "/payment/initiate");

    const response = await axios.post(`${CONFIG.BASE_URL}/initiate`, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": signature,
        "X-MERCHANT-ID": CONFIG.MERCHANT_ID,
        "X-REQUEST-ID": `REQ_${Date.now()}`
      },
      timeout: 10000
    });

    res.json({
      success: true,
      paymentUrl: response.data.paymentUrl,
      transactionId: payload.transactionId
    });

  } catch (error) {
    console.error("2025 Payment Error:", {
      error: error.response?.data || error.message,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      code: "PHONEPE_API_ERROR",
      message: error.response?.data?.message || "Payment initiation failed",
      details: error.response?.data?.errors || []
    });
  }
});

// 2025 Webhook Handler
app.post("/payment-callback", (req, res) => {
  const signature = req.headers["x-verify"];
  const payload = req.body;

  // Verify callback signature
  const expectedSig = crypto.createHash("sha3-256")
    .update(JSON.stringify(payload) + CONFIG.SALT_KEY)
    .digest("hex") + `###${CONFIG.SALT_INDEX}`;

  if (signature !== expectedSig) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  console.log("Payment Callback:", payload);
  res.status(200).json({ status: "OK" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Payment Service running on port ${PORT}`);
  console.log(`Test Merchant ID: ${CONFIG.MERCHANT_ID}`);
  console.log(`API Endpoint: ${CONFIG.BASE_URL}`);
});
