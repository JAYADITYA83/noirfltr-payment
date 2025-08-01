import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import axios from 'axios';
import { setDefaultResultOrder } from 'dns';

// Force IPv4 DNS resolution
setDefaultResultOrder('ipv4first');

const app = express();
app.use(cors());
app.use(express.json());

// PhonePe 2025 Configuration
const PHONEPE_CONFIG = {
  MERCHANT_ID: "PTESTUAT2025", // Test merchant ID
  SALT_KEY: "uat2025_3k4j5h6g7f8e9d0c1b2a", // Test salt key
  BASE_URL: "https://api.testpg.phonepe.com/v5", // 2025 test endpoint
  REDIRECT_URL: "https://your-webhook-url.com/callback" // Must be HTTPS
};

// Health check endpoint
app.get('/', (req, res) => {
  res.send('PhonePe 2025 Integration Server');
});

// Payment initiation endpoint
app.post('/initiate-payment', async (req, res) => {
  const { amount } = req.body;

  const payload = {
    merchantId: PHONEPE_CONFIG.MERCHANT_ID,
    transactionId: `TXN${Date.now()}`,
    amount: {
      value: amount * 100, // in paise
      currency: "INR"
    },
    paymentFlow: "REDIRECT",
    callbackUrls: {
      success: PHONEPE_CONFIG.REDIRECT_URL,
      failure: PHONEPE_CONFIG.REDIRECT_URL
    }
  };

  try {
    const xVerify = crypto
      .createHash('sha3-256')
      .update(JSON.stringify(payload) + PHONEPE_CONFIG.SALT_KEY)
      .digest('hex') + '###1';

    const response = await axios.post(
      `${PHONEPE_CONFIG.BASE_URL}/pay/initiate`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': xVerify,
          'X-MERCHANT-ID': PHONEPE_CONFIG.MERCHANT_ID
        },
        timeout: 8000
      }
    );

    res.json({
      success: true,
      paymentUrl: response.data.paymentUrl
    });
  } catch (error) {
    console.error("Payment Error:", {
      error: error.response?.data || error.message,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test Merchant ID: ${PHONEPE_CONFIG.MERCHANT_ID}`);
  console.log(`API Endpoint: ${PHONEPE_CONFIG.BASE_URL}`);
});
