import express from "express";
import cors from "cors";
import crypto from "crypto";
import axios from "axios";

const app = express();
app.use(cors());
app.use(express.json());

// PhonePe's DEFAULT TEST CREDENTIALS (SANDBOX)
const PHONEPE_MERCHANT_ID = "PGTESTPAYUAT"; // Default test merchant ID
const PHONEPE_SECRET = "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399"; // Default test secret
const BASE_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const REDIRECT_URL = "https://webhook.site/32dala65-de47-dec3-9fe2-f21481ddc56e"; // Your webhook

app.post("/create-payment", async (req, res) => {
  const { amount } = req.body;

  const payload = {
    merchantId: PHONEPE_MERCHANT_ID,
    merchantTransactionId: `MT${Date.now()}`,
    merchantUserId: `MU${Date.now()}`,
    amount: amount * 100, // in paise
    redirectUrl: REDIRECT_URL,
    redirectMode: "POST",
    callbackUrl: REDIRECT_URL,
    mobileNumber: "9999999999",
    paymentInstrument: {
      type: "PAY_PAGE"
    }
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  const stringToHash = payloadBase64 + "/pg/v1/pay" + PHONEPE_SECRET;
  const xVerify = crypto.createHash("sha256").update(stringToHash).digest("hex") + "###1";

  try {
    const response = await axios.post(`${BASE_URL}/pg/v1/pay`, {
      request: payloadBase64
    }, {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
        "X-CLIENT-ID": PHONEPE_MERCHANT_ID
      }
    });

    res.json({ 
      paymentUrl: response.data.data.instrumentResponse.redirectInfo.url 
    });
  } catch (error) {
    console.error("PhonePe Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Payment failed",
      details: error.response?.data || error.message
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
