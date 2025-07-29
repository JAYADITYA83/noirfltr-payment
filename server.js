const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: "https://www.noirfltr.live",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options("*", cors());
app.use(express.json());

// ==== PhonePe OAuth Credentials ====
const clientId = "SU2507281958021038993436";
const clientSecret = "6fe24886-5b40-4863-bca5-fcc39239ea97";
const clientVersion = "1";

// ==== Payment Route ====
app.post("/initiatePayment", async (req, res) => {
  try {
    const { amount, mobile, orderId } = req.body;

    if (!amount || !mobile || !orderId) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    // Step 1: Get access token
    const tokenResp = await axios.post(
      "https://api.phonepe.com/v3/oauth/token",
      "grant_type=client_credentials",
      {
        headers: {
          "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    const accessToken = tokenResp.data.access_token;

    // Step 2: Prepare payment
    const paymentPayload = {
      merchantTransactionId: orderId,
      merchantUserId: mobile,
      amount: Math.round(amount * 100), // ₹ to paise
      redirectUrl: "https://www.noirfltr.live/checkout-success.html",
      redirectMode: "POST",
      callbackUrl: "https://webhook.site/test",
      paymentInstrument: { type: "PAY_PAGE" }
    };

    // Step 3: Send payment request
    const payResp = await axios.post(
      "https://api.phonepe.com/v3/payment/init",
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

  } catch (err) {
    console.error("Payment Error Full:", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message
    });

    res.status(500).json({
      success: false,
      message: "Server error",
      detail: err.response?.data || err.message
    });
  }
});

// ==== Start Server ====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
