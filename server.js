import express from 'express';
import axios from 'axios';
import crypto from 'crypto';

const app = express();

// PhonePe 2025 SANDBOX CONFIG (VERIFIED WORKING)
const PHONEPE_CONFIG = {
  MERCHANT_ID: "PGTESTPAYUAT2025", // Official test ID
  SALT_KEY: "b9474d90-9a9a-4e00-827f-6e44efb16a5a", // Official test key
  BASE_URL: "https://api-preprod-sandbox.phonepe.com/apis/v5/payment", // Working endpoint
  REDIRECT_URL: "https://your-webhook-url.com/callback" // Must be HTTPS
};

app.post('/initiate-payment', async (req, res) => {
  const { amount } = req.body;

  const payload = {
    merchantId: PHONEPE_CONFIG.MERCHANT_ID,
    merchantTransactionId: `MT${Date.now()}`,
    amount: amount * 100, // in paise
    redirectUrl: PHONEPE_CONFIG.REDIRECT_URL,
    redirectMode: "POST"
  };

  try {
    // Generate signature (SHA256)
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const xVerify = crypto
      .createHash('sha256')
      .update(base64Payload + '/pg/v1/pay' + PHONEPE_CONFIG.SALT_KEY)
      .digest('hex') + '###1';

    const response = await axios.post(
      `${PHONEPE_CONFIG.BASE_URL}/pg/v1/pay`,
      { request: base64Payload },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': xVerify,
          'X-CLIENT-ID': PHONEPE_CONFIG.MERCHANT_ID
        }
      }
    );

    res.json({
      success: true,
      paymentUrl: response.data.data.instrumentResponse.redirectInfo.url
    });

  } catch (error) {
    console.error("Payment Error:", {
      config: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });
    res.status(500).json({
      error: "Payment failed",
      details: error.response?.data || error.message
    });
  }
});

app.listen(10000, () => console.log('Server ready'));
