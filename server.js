const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

// ✅ CORS for your frontend
app.use(cors({
  origin: "https://www.noirfltr.live",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options("*", cors());

app.use(express.json());

// ✅ PhonePe OAuth Production Keys
const clientId = "SU2507281958021038993436";
const clientSecret = "6fe24886-5b40-4863-bca5-fcc39239ea97";
const clientVersion = "1";

// ✅ Payment Route
app.post("/initiatePayment", async (req, res) => {
  try {
    const { amount, mobile, orderId } = req.body;

    if (!amount || !mobile || !orderId) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    // ✅ Step 1: Get Access Token
    const tokenResp = await axios.post(
      "https://api.phonepe.com/oauth2/token",
      "grant_type=client_credentials",
      {
        headers: {
          "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    const accessToken = tokenResp.data?.access_token;

    if (!accessToken) throw new Error("No access token received");

    // ✅ Step 2: Make Payment Request
    const paymentPayload = {
      merchantTransactionId: orderId,
      merchantUserId: mobile,
      amount: Math.round(amount * 100), // ₹ to paise
      redirectUrl: "https://www.noirfltr.live/checkout-success.html",
      redirectMode: "POST",
      callbackUrl: "https://webhook.site/test", // optional
      paymentInstrument: { type: "PAY_PAGE" }
    };

    const payResp = await axios.post(
      "https://api.phonepe.com/apis/hermes/pg/v1/pay",
      paymentPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-CLIENT-ID": clientId,
          "X-CLIENT-VERSION": clientVersion,
          "Content-Type": "application/json"
        }
      }
    );

    const redirectUrl = payResp.data?.data?.instrumentResponse?.redirectInfo?.url;

    if (!redirectUrl) throw new Error("Payment URL not received from PhonePe");

    res.json({ success: true, url: redirectUrl });

  } catch (error) {
    console.error("Payment Error Full:", {
      status: error?.response?.status,
      data: error?.response?.data,
      message: error?.message
    });
    res.status(500).json({
      success: false,
      message: "Payment failed",
      detail: error?.response?.data || error?.message
    });
  }
});

// ✅ Use Render’s dynamic PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
