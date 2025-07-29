const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();

app.use(cors({ origin: "https://www.noirfltr.live" }));
app.use(express.json());

// 🔐 Your OAuth credentials
const clientId = "SU2507281958021038993436";
const clientSecret = "6fe24886-5b40-4863-bca5-fcc39239ea97";
const clientVersion = "1";

// 📦 Sandbox API base URL
const baseUrl = "https://api-preprod.phonepe.com";
const redirectUrl = "https://www.noirfltr.live/checkout-success.html"; // 👈 Change if needed

app.post("/initiatePayment", async (req, res) => {
  try {
    const { amount, mobile, orderId } = req.body;

    if (!amount || !mobile || !orderId) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    // 1️⃣ Generate OAuth token
    const tokenResponse = await axios.post(
      `${baseUrl}/oauth2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) throw new Error("Access token not received from PhonePe");

    // 2️⃣ Prepare payment payload
    const payload = {
      merchantTransactionId: orderId,
      merchantUserId: mobile,
      amount: Math.round(amount * 100),
      redirectUrl: redirectUrl,
      redirectMode: "POST",
      callbackUrl: "https://webhook.site/test", // optional for now
      paymentInstrument: {
        type: "PAY_PAGE"
      }
    };

    // 3️⃣ Make payment request
    const paymentResponse = await axios.post(
      `${baseUrl}/pg/v1/pay`,
      payload,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "X-CLIENT-ID": clientId,
          "X-CLIENT-VERSION": clientVersion,
          "Content-Type": "application/json"
        }
      }
    );

    const paymentUrl = paymentResponse.data?.data?.instrumentResponse?.redirectInfo?.url;
    if (!paymentUrl) throw new Error("Payment URL not received");

    res.json({ success: true, url: paymentUrl });

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
