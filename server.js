const express = require("express");
const crypto = require("crypto");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors({
  origin: "https://www.noirfltr.live"
}));
app.use(express.json());

const merchantId = "SU2507281958021038993436";
const saltKey = "6fe24886-5b40-4863-bca5-fcc39239ea97";
const saltIndex = 1;

app.post("/initiatePayment", async (req, res) => {
  try {
    const { amount, mobile, orderId } = req.body;

    if (!amount || !mobile || !orderId) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const payload = {
      merchantId,
      merchantTransactionId: orderId,
      merchantUserId: mobile,
      amount: Math.round(amount * 100), // ₹ to paise
      redirectUrl: "https://noirfltr.live/checkout-success.html",
      redirectMode: "POST",
      callbackUrl: "https://webhook.site/test", // optional
      paymentInstrument: {
        type: "PAY_PAGE"
      }
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
    const stringToSign = base64Payload + "/pg/v1/pay" + saltKey;
    const xVerify = crypto.createHash("sha256").update(stringToSign).digest("hex") + "###" + saltIndex;

    const response = await axios.post(
      "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay",
      { request: base64Payload },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerify,
          "X-MERCHANT-ID": merchantId
        }
      }
    );

    const paymentUrl = response.data?.data?.instrumentResponse?.redirectInfo?.url;

    if (!paymentUrl) {
      throw new Error("Payment URL not received from PhonePe");
    }

    res.json({ success: true, url: paymentUrl });
  } catch (err) {
    console.error("Payment Error:", err.message);
    res.status(500).json({ success: false, message: "Server error", detail: err.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
