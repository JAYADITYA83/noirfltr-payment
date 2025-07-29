const express = require("express");
const crypto = require("crypto");
const cors = require("cors");
const axios = require("axios");
const app = express();
app.use(cors());
app.use(express.json());

const merchantId = "SU2507281958021038993436";
const saltKey = "6fe24886-5b40-4863-bca5-fcc39239ea97";
const saltIndex = 1;

app.post("/initiatePayment", async (req, res) => {
  const payload = {
    merchantId,
    merchantTransactionId: "txn_" + Date.now(),
    merchantUserId: "user_" + Date.now(),
    amount: 10000, // ₹100 in paise
    redirectUrl: "https://noirfltr.live/checkout-success.html",
    redirectMode: "POST",
    callbackUrl: "https://webhook.site/test",
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
  const stringToSign = base64Payload + "/pg/v1/pay" + saltKey;
  const xVerify = crypto.createHash("sha256").update(stringToSign).digest("hex") + "###" + saltIndex;

  try {
    const response = await axios.post(
      "https://api.phonepe.com/apis/hermes/pg/v1/pay",
      { request: base64Payload },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerify,
          "X-MERCHANT-ID": merchantId,
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Payment initiation failed", details: error.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));