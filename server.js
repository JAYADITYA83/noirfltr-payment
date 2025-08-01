import express from "express";
import cors from "cors";
import crypto from "crypto";
import axios from "axios";

const app = express();
app.use(cors());
app.use(express.json());

// PhonePe 2025 Test Credentials (Updated July 2025)
const CONFIG = {
  MERCHANT_ID: "PPTESTMERCHUAT2025", // New 2025 test merchant ID
  SALT_KEY: "a7b2c4f8-3d9e-4f1a-8b5c-9d6e1f2a3b4c", // 2025 test salt key
  SALT_INDEX: 1, // Always 1 for test environment
  BASE_URL: "https://api-gw-sandbox.phonepe.com/apis/v4/payment", // 2025 API endpoint
  REDIRECT_URL: "https://yourdomain.com/payment-callback" // Must be HTTPS
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
