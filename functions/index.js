const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const stripe = Stripe(functions.config().stripe.secret);

const app = express();
app.use(cors({ origin: true }));

// 🔥 Wichtig für Stripe Webhook
app.use("/webhook", express.raw({ type: "application/json" }));

// Für normale Requests
app.use(express.json());


// 🚀 Checkout erstellen
app.post("/create-checkout-session", async (req, res) => {
try {
const { priceId, userId, plan } = req.body;

const session = await stripe.checkout.sessions.create({
payment_method_types: ["card"],
mode: "subscription",
line_items: [
{
price: priceId,
quantity: 1,
},
],
success_url: "https://myfiniq.de/success",
cancel_url: "https://myfiniq.de/cancel",
metadata: {
userId: userId,
plan: plan,
},
});

res.json({ url: session.url });
} catch (error) {
console.error(error);
res.status(500).send("Fehler beim Checkout");
}
});


// 🔥 Webhook (Zahlung erfolgreich)
app.post("/webhook", async (req, res) => {
const sig = req.headers["stripe-signature"];

let event;

try {
event = stripe.webhooks.constructEvent(
req.body,
sig,
functions.config().stripe.webhook
);
} catch (err) {
console.error("Webhook Fehler:", err.message);
return res.status(400).send(`Webhook Error: ${err.message}`);
}

// ✅ Zahlung abgeschlossen
if (event.type === "checkout.session.completed") {
const session = event.data.object;

const userId = session.metadata.userId;
const plan = session.metadata.plan;

const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

await db.collection("users").doc(userId).set({
plan: plan,
updatedAt: new Date(),
}, { merge: true });

console.log("User aktualisiert:", userId, plan);
}

res.json({ received: true });
});


exports.api = functions.https.onRequest(app);