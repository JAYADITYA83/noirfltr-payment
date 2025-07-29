const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

// CORS fix for Render + your domain
app.use(cors({
  origin: "https://www.noirfltr.live",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options("*", cors());

app.use(express.json());

// Credentials you already confirmed
const clientId = "SU2507281958021038993436";
const clientSecret = "6fe24886-5b40-4863-bca5-fcc39239ea97";
const clientVersion = "1";

const redirectUrl = "https://www.noirfltr.live/checkout-success.html";

app.post("/initiatePayment", async (req, res) => {
  try {
    const { amount, mobile, orderId } = req.body;

    if (!amount || !mobile || !orderId) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    // Step 1: Get OAuth access token
    const tokenResponse = await axios.post(
      "https://api-preprod.phonepe.com/oauth2/token",
      "grant_type=client_credentials",
      {
        headers: {
          "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Step 2: Make payment request
    const paymentPayload = {
      merchantTransactionId: orderId,
      merchantUserId: mobile,
      amount: Math.round(amount * 100),
      redirectUrl,
      redirectMode: "POST",
      callbackUrl: "https://webhook.site/test",
      paymentInstrument: { type: "PAY_PAGE" }
    };

    const paymentResponse = await axios.post(
      "https://api-preprod.phonepe.com/pg/v1/pay",
      paymentPayload,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "X-CLIENT-ID": clientId,
          "X-CLIENT-VERSION": clientVersion,
          "Content-Type": "application/json"
        }
      }
    );

    const redirectUrlResponse = paymentResponse.data?.data?.instrumentResponse?.redirectInfo?.url;
    if (!redirectUrlResponse) throw new Error("Payment URL not returned from PhonePe");

    res.json({ success: true, url: redirectUrlResponse });

  } catch (err) {
    console.error("Payment Error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      detail: err.response?.data || err.message
    });
  }
});

app.listen(3000, () => {
  console.log("✅ Server running on port 3000");
});
