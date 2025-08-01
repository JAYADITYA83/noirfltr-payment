import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import axios from "axios";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const {
  PHONEPE_MERCHANT_ID,
  PHONEPE_SECRET,
  REDIRECT_URL,
  BASE_URL
} = process.env;

app.get("/", (req, res) => {
  res.send("✅ PhonePe Backend is Live!");
});
console.log("Env Check:", {
  BASE_URL,
  PHONEPE_MERCHANT_ID,
  PHONEPE_SECRET,
  REDIRECT_URL
});
app.post("/create-payment", async (req, res) => {
  const { amount, name, email } = req.body;

  const merchantTransactionId = TXN${Date.now()};
  const payUrl = "/pg/v1/pay";

  const payload = {
    clientId: PHONEPE_MERCHANT_ID,
    merchantTransactionId,
    merchantUserId: email,
    amount: amount * 100,
    redirectUrl: REDIRECT_URL,
    redirectMode: "POST",
    mobileNumber: "9999999999",
    paymentInstrument: {
      type: "PAY_PAGE"
    }
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  const stringToHash = payloadBase64 + payUrl + PHONEPE_SECRET;
  const xVerify = crypto.createHash("sha256").update(stringToHash).digest("hex") + "###1";

  try {
    const response = await axios.post(${BASE_URL}${payUrl}, {
      request: payloadBase64
    }, {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerify,
        "X-CLIENT-ID": PHONEPE_MERCHANT_ID
      }
    });

    const redirectUrl = response.data.data.instrumentResponse.redirectInfo.url;
    res.json({ paymentUrl: redirectUrl });
  } catch (error) {
    console.error("PhonePe API error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(🚀 Server running on port ${PORT}));
