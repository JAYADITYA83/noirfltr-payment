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

// ==== OAuth Credentials ====
const clientId = "SU2507281958021038993436";
const clientSecret = "6fe24886-5b40-4863-bca5-fcc39239ea97";
const clientVersion = "1";

app.post("/initiatePayment", async (req, res) => {
  try {
    const { amount, mobile, orderId } = req.body;

    if (!amount || !mobile || !orderId) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    // Step 1: Get access token
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

    const accessToken = tokenResp.data.access_token;

    // Step 2: Prepare payment payload
    const paymentPayload = {
      merchantTransactionId: orderId,
      merchantUserId: mobile,
      amount: Math.round(amount * 100),
      redirectUrl: "https://www.noirfltr.live/checkout-success.html",
      redirectMode: "POST",
      callbackUrl: "https://webhook.site/test",
      paymentInstrument: { type: "PAY_PAGE" }
    };

    // Step 3: Send to correct OAuth endpoint
    const payResp = await axios.post(
      "https://api.phonepe.com/pg/v1/payment", // ✅ OAuth endpoint
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

    if (!redirectUrl) {
      throw new Error("Payment URL not received from PhonePe");
    }

    return res.json({ success: true, url: redirectUrl });

  } catch (error) {
    console.error("Payment Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      detail: error.response?.data || error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
