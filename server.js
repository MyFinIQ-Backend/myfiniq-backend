require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const FRONTEND_URL = process.env.FRONTEND_URL || "https://myfiniq.de";
const PORT = process.env.PORT || 4242;

/**
* Firebase Admin initialisieren
* Priorität:
* 1. FIREBASE_SERVICE_ACCOUNT_JSON aus Render / Environment
* 2. lokale serviceAccountKey.json
*/
function initializeFirebaseAdmin() {
if (admin.apps.length) {
return admin.firestore();
}

let credentialConfig = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
try {
credentialConfig = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} catch (error) {
throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON ist kein gültiges JSON.");
}
} else {
const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

if (!fs.existsSync(serviceAccountPath)) {
throw new Error(
"Weder FIREBASE_SERVICE_ACCOUNT_JSON noch serviceAccountKey.json wurden gefunden."
);
}

credentialConfig = require(serviceAccountPath);
}

admin.initializeApp({
credential: admin.credential.cert(credentialConfig)
});

return admin.firestore();
}

const db = initializeFirebaseAdmin();

const mailEnabled =
process.env.MAIL_HOST &&
process.env.MAIL_PORT &&
process.env.MAIL_USER &&
process.env.MAIL_PASS;

const transporter = mailEnabled
? nodemailer.createTransport({
host: process.env.MAIL_HOST,
port: Number(process.env.MAIL_PORT),
secure: String(process.env.MAIL_SECURE).toLowerCase() === "true",
auth: {
user: process.env.MAIL_USER,
pass: process.env.MAIL_PASS
}
})
: null;

app.use(cors());

app.use((req, res, next) => {
if (req.originalUrl === "/webhook") {
next();
return;
}
express.json()(req, res, next);
});

function getSubscriptionPriceId(plan) {
if (plan === "pro") return process.env.STRIPE_PRO_PRICE_ID;
if (plan === "elite") return process.env.STRIPE_ELITE_PRICE_ID;
return null;
}

function getEbookPriceId(productId) {
if (productId === "ebook1") return process.env.STRIPE_EBOOK1_PRICE_ID;
if (productId === "ebook2") return process.env.STRIPE_EBOOK2_PRICE_ID;
if (productId === "ebook3") return process.env.STRIPE_EBOOK3_PRICE_ID;
if (productId === "bundle3") return process.env.STRIPE_BUNDLE_PRICE_ID;
return null;
}

function getEbookTitle(productId) {
switch (productId) {
case "ebook1":
return "Intelligent Geld investieren: Warum 90% der Menschen falsch investieren – und wie du es ab heute besser machst";
case "ebook2":
return "Intelligent Geld investieren – Strategien, die wirklich funktionieren: Wie Du Denkfehler vermeidest, Risiken beherrschst und konsequent Vermögen aufbaust";
case "ebook3":
return "Die stille KI-Revolution: Wie Anleger jenseits des Hypes Vermögen aufbauen";
case "bundle3":
return "3er-Bundle MyFinIQ E-Books";
default:
return "Unbekanntes Produkt";
}
}

function getProductFiles(productId) {
if (productId === "ebook1") {
return [
{
key: "ebook1",
label: "Ebook 1 herunterladen",
filename: "ebook1.pdf"
}
];
}

if (productId === "ebook2") {
return [
{
key: "ebook2",
label: "Ebook 2 herunterladen",
filename: "ebook2.pdf"
}
];
}

if (productId === "ebook3") {
return [
{
key: "ebook3",
label: "Ebook 3 herunterladen",
filename: "ebook3.pdf"
}
];
}

if (productId === "bundle3") {
return [
{
key: "ebook1",
label: "Ebook 1 herunterladen",
filename: "ebook1.pdf"
},
{
key: "ebook2",
label: "Ebook 2 herunterladen",
filename: "ebook2.pdf"
},
{
key: "ebook3",
label: "Ebook 3 herunterladen",
filename: "ebook3.pdf"
}
];
}

return [];
}

function getPrivateDownloadPath(filename) {
return path.join(__dirname, "private_downloads", filename);
}

async function createDownloadTokensForOrder(orderId, sessionId, productId) {
const files = getProductFiles(productId);
const now = Date.now();
const expiresAt = now + 1000 * 60 * 60 * 24 * 7;

const result = [];

for (const file of files) {
const filePath = getPrivateDownloadPath(file.filename);

if (!fs.existsSync(filePath)) {
throw new Error(`Datei nicht gefunden: ${file.filename}`);
}

const token = crypto.randomBytes(32).toString("hex");

await db.collection("download_tokens").doc(token).set({
token,
orderId: String(orderId),
stripeSessionId: String(sessionId),
productId: String(productId),
label: file.label,
filename: file.filename,
fileKey: file.key,
createdAt: admin.firestore.FieldValue.serverTimestamp(),
expiresAtMs: expiresAt,
used: false
});

result.push({
label: file.label,
url: `${FRONTEND_URL.replace(/\/$/, "")}/api/download/${token}`
});
}

return result;
}

async function sendDeliveryEmail({
customerEmail,
customerName,
productTitle,
downloads
}) {
if (!mailEnabled || !transporter) {
console.log("E-Mail-Versand übersprungen: SMTP ist nicht vollständig eingerichtet.");
return;
}

const safeName = customerName || "dein";
const downloadHtml = downloads
.map(
(item) => `
<tr>
<td style="padding: 0 0 14px 0;">
<a href="${item.url}" style="display:inline-block;background:linear-gradient(135deg,#d4af37,#b8860b);background-color:#b8860b;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:10px;font-size:15px;">
${item.label}
</a>
</td>
</tr>
`
)
.join("");

const html = `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Dein Kauf bei MyFinIQ</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f3ee; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f3ee; margin:0; padding:30px 0;">
<tr>
<td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px; background-color:#ffffff; border-radius:20px; overflow:hidden; border:1px solid #ece7dc;">
<tr>
<td style="background-color:#111827; padding:28px 32px; text-align:center;">
<div style="font-size:34px; font-weight:800; color:#d4af37;">MyFinIQ</div>
<div style="margin-top:8px; font-size:14px; color:#e5e7eb;">Dein digitales Finanzwissen</div>
</td>
</tr>
<tr>
<td style="padding:34px 32px 18px 32px;">
<div style="display:inline-block;background-color:#ecfdf3;color:#166534;border:1px solid #b7ebc6;border-radius:999px;font-size:13px;font-weight:700;padding:8px 14px;margin-bottom:18px;">
Zahlung erfolgreich
</div>
<h1 style="margin:0 0 16px 0; font-size:34px; line-height:1.25; color:#111827;">Vielen Dank für deinen Kauf</h1>
<p style="margin:0 0 18px 0; font-size:18px; line-height:1.7; color:#374151;">Hallo ${safeName},</p>
<p style="margin:0 0 18px 0; font-size:17px; line-height:1.8; color:#374151;">
deine Zahlung für <strong>${productTitle}</strong> war erfolgreich.
</p>
</td>
</tr>
<tr>
<td style="padding:0 32px 6px 32px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fffdf5; border:1px solid #f0e2a5; border-radius:16px;">
<tr>
<td style="padding:24px 24px 10px 24px;">
<div style="font-size:20px; font-weight:700; color:#8a5a00; margin-bottom:10px;">Deine Downloads</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
${downloadHtml}
</table>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:24px 32px 34px 32px;">
<p style="margin:0 0 12px 0; font-size:15px; line-height:1.7; color:#374151;">Viel Freude mit deinem Kauf.</p>
<p style="margin:0; font-size:18px; font-weight:700; color:#111827;">MyFinIQ</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>
`;

const textDownloads = downloads
.map((item) => `${item.label}: ${item.url}`)
.join("\n");

await transporter.sendMail({
from: process.env.MAIL_FROM || process.env.MAIL_USER,
to: customerEmail,
subject: `Dein Kauf bei MyFinIQ – ${productTitle}`,
html,
text: `Vielen Dank für deinen Kauf bei MyFinIQ\n\nHallo ${safeName},\n\ndeine Zahlung für "${productTitle}" war erfolgreich.\n\n${textDownloads}`
});
}

app.get("/", (req, res) => {
res.send("MyFinIQ Backend läuft.");
});

app.post("/create-checkout-session", async (req, res) => {
try {
const { uid, plan } = req.body;

if (!uid || !plan) {
return res.status(400).json({ error: "uid und plan sind erforderlich." });
}

const normalizedPlan = String(plan).toLowerCase();
const priceId = getSubscriptionPriceId(normalizedPlan);

if (!priceId) {
return res.status(400).json({
error: "Ungültiger Plan oder fehlende Price-ID."
});
}

const session = await stripe.checkout.sessions.create({
mode: "subscription",
payment_method_types: ["card"],
line_items: [{ price: priceId, quantity: 1 }],
success_url: `${FRONTEND_URL}/dashboard.html?checkout=success&uid=${encodeURIComponent(uid)}&plan=${encodeURIComponent(normalizedPlan)}`,
cancel_url: `${FRONTEND_URL}/premium.html?checkout=cancel`,
metadata: {
uid: String(uid),
plan: normalizedPlan,
type: "subscription"
}
});

return res.json({ url: session.url });
} catch (error) {
console.error("Fehler beim Erstellen der Abo-Checkout-Session:", error);
return res.status(500).json({
error: "Serverfehler beim Erstellen des Checkouts."
});
}
});

app.post("/api/create-ebook-checkout-session", async (req, res) => {
try {
const { orderId, productId, customerEmail } = req.body;

if (!orderId || !productId || !customerEmail) {
return res.status(400).json({
error: "orderId, productId und customerEmail sind erforderlich."
});
}

const priceId = getEbookPriceId(String(productId));

if (!priceId) {
return res.status(400).json({
error: "Ungültige productId oder fehlende Price-ID."
});
}

const session = await stripe.checkout.sessions.create({
mode: "payment",
payment_method_types: ["card"],
customer_email: String(customerEmail),
line_items: [{ price: priceId, quantity: 1 }],
success_url: `${FRONTEND_URL}/ebook-success.html?session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `${FRONTEND_URL}/ebook-cancel.html?productId=${encodeURIComponent(productId)}`,
metadata: {
orderId: String(orderId),
productId: String(productId),
productTitle: getEbookTitle(String(productId)),
type: "ebook_order"
}
});

await db.collection("ebook_orders").doc(String(orderId)).set(
{
stripeSessionId: session.id,
checkoutUrl: session.url,
updatedAt: admin.firestore.FieldValue.serverTimestamp()
},
{ merge: true }
);

return res.json({ url: session.url });
} catch (error) {
console.error("Fehler beim Erstellen der E-Book-Checkout-Session:", error);
return res.status(500).json({
error: "E-Book-Checkout konnte nicht erstellt werden."
});
}
});

app.post("/api/create-upsell-checkout-session", async (req, res) => {
try {
const bundlePriceId = process.env.STRIPE_BUNDLE_PRICE_ID;

if (!bundlePriceId) {
return res.status(400).json({
error: "Bundle-Price-ID fehlt in der .env Datei."
});
}

const session = await stripe.checkout.sessions.create({
mode: "payment",
payment_method_types: ["card"],
line_items: [{ price: bundlePriceId, quantity: 1 }],
success_url: `${FRONTEND_URL}/ebook-success.html?session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `${FRONTEND_URL}/ebook-cancel.html?productId=bundle3`,
metadata: {
orderId: `upsell_${Date.now()}`,
productId: "bundle3",
productTitle: getEbookTitle("bundle3"),
type: "ebook_order",
isUpsell: "true"
}
});

return res.json({ url: session.url });
} catch (error) {
console.error("Fehler beim Erstellen der Upsell-Checkout-Session:", error);
return res.status(500).json({
error: "Upsell-Checkout konnte nicht erstellt werden."
});
}
});

app.get("/api/checkout-session/:sessionId", async (req, res) => {
try {
const { sessionId } = req.params;

if (!sessionId) {
return res.status(400).json({ error: "sessionId fehlt." });
}

const session = await stripe.checkout.sessions.retrieve(sessionId);

return res.json({
id: session.id,
payment_status: session.payment_status,
customer_email:
session.customer_details?.email || session.customer_email || "",
metadata: session.metadata || {}
});
} catch (error) {
console.error("Fehler beim Abrufen der Checkout-Session:", error);
return res.status(500).json({
error: "Checkout-Session konnte nicht geladen werden."
});
}
});

app.get("/api/ebook-delivery/:sessionId", async (req, res) => {
try {
const { sessionId } = req.params;

if (!sessionId) {
return res.status(400).json({ error: "sessionId fehlt." });
}

const snapshot = await db
.collection("ebook_orders")
.where("stripeSessionId", "==", String(sessionId))
.limit(1)
.get();

if (snapshot.empty) {
return res.status(404).json({
error: "Keine Bestellung zu dieser Session gefunden."
});
}

const doc = snapshot.docs[0];
const data = doc.data() || {};

if (!data.paid && data.status !== "paid") {
return res.status(403).json({
error: "Diese Bestellung ist noch nicht bezahlt."
});
}

const deliveryItems = await createDownloadTokensForOrder(
doc.id,
String(sessionId),
data.productId
);

return res.json({
success: true,
productId: data.productId || "",
productTitle: data.productTitle || "",
downloads: deliveryItems
});
} catch (error) {
console.error("Fehler bei der Auto-Auslieferung:", error);
return res.status(500).json({
error: "Die Auto-Auslieferung konnte nicht vorbereitet werden."
});
}
});

app.get("/api/download/:token", async (req, res) => {
try {
const { token } = req.params;

if (!token) {
return res.status(400).send("Token fehlt.");
}

const tokenDoc = await db.collection("download_tokens").doc(String(token)).get();

if (!tokenDoc.exists) {
return res.status(404).send("Download-Link ungültig.");
}

const tokenData = tokenDoc.data() || {};

if (!tokenData.expiresAtMs || Date.now() > tokenData.expiresAtMs) {
return res.status(403).send("Dieser Download-Link ist abgelaufen.");
}

const filePath = getPrivateDownloadPath(tokenData.filename);

if (!fs.existsSync(filePath)) {
return res.status(404).send("Datei nicht gefunden.");
}

return res.download(filePath, tokenData.filename);
} catch (error) {
console.error("Fehler beim Download:", error);
return res.status(500).send("Download konnte nicht gestartet werden.");
}
});

app.post("/api/activate-plan", async (req, res) => {
try {
const { uid, plan } = req.body;

if (!uid || !plan) {
return res.status(400).json({ error: "uid und plan sind erforderlich." });
}

const normalizedPlan = String(plan).toLowerCase();

if (!["free", "pro", "elite"].includes(normalizedPlan)) {
return res.status(400).json({ error: "Ungültiger Plan." });
}

await db.collection("users").doc(String(uid)).set(
{
plan: normalizedPlan,
updatedAt: admin.firestore.FieldValue.serverTimestamp()
},
{ merge: true }
);

return res.json({ success: true, plan: normalizedPlan });
} catch (error) {
console.error("Fehler beim Aktivieren des Plans:", error);
return res.status(500).json({ error: "Plan konnte nicht gespeichert werden." });
}
});

app.get("/api/user-premium/:uid", async (req, res) => {
try {
const { uid } = req.params;

if (!uid) {
return res.status(400).json({ error: "uid fehlt." });
}

const userDoc = await db.collection("users").doc(String(uid)).get();

if (!userDoc.exists) {
return res.json({ plan: "free" });
}

const data = userDoc.data() || {};
return res.json({
plan: data.plan || "free"
});
} catch (error) {
console.error("Fehler beim Laden des Nutzerplans:", error);
return res.status(500).json({ error: "Nutzerplan konnte nicht geladen werden." });
}
});

app.post(
"/webhook",
express.raw({ type: "application/json" }),
async (req, res) => {
const signature = req.headers["stripe-signature"];

let event;

try {
event = stripe.webhooks.constructEvent(
req.body,
signature,
process.env.STRIPE_WEBHOOK_SECRET
);
} catch (error) {
console.error("Webhook-Signatur ungültig:", error.message);
return res.status(400).send(`Webhook Error: ${error.message}`);
}

try {
if (event.type === "checkout.session.completed") {
const session = event.data.object;
const metadata = session.metadata || {};

if (metadata.type === "ebook_order" && metadata.orderId) {
const orderId = String(metadata.orderId);
const productId = metadata.productId || "";
const productTitle = metadata.productTitle || "";
const customerEmail =
session.customer_details?.email || session.customer_email || "";
const customerName = session.customer_details?.name || "";

await db.collection("ebook_orders").doc(orderId).set(
{
status: "paid",
paid: true,
paymentStatus: session.payment_status || "paid",
stripeSessionId: session.id,
stripeCustomerEmail: customerEmail,
productId,
productTitle,
paidAt: admin.firestore.FieldValue.serverTimestamp(),
updatedAt: admin.firestore.FieldValue.serverTimestamp(),
isUpsell: metadata.isUpsell === "true"
},
{ merge: true }
);

const downloads = await createDownloadTokensForOrder(
orderId,
session.id,
productId
);

try {
await sendDeliveryEmail({
customerEmail,
customerName,
productTitle,
downloads
});

await db.collection("ebook_orders").doc(orderId).set(
{
deliveryEmailSent: true,
deliveryEmailSentAt: admin.firestore.FieldValue.serverTimestamp()
},
{ merge: true }
);
} catch (mailError) {
console.error("E-Mail Fehler:", mailError.message);

await db.collection("ebook_orders").doc(orderId).set(
{
deliveryEmailSent: false,
deliveryEmailError: mailError.message,
deliveryEmailTriedAt: admin.firestore.FieldValue.serverTimestamp()
},
{ merge: true }
);
}
}
}

return res.json({ received: true });
} catch (error) {
console.error("Fehler bei der Webhook-Verarbeitung:", error);
return res.status(500).json({ error: "Webhook konnte nicht verarbeitet werden." });
}
}
);

app.listen(PORT, "0.0.0.0", () => {
console.log(`Server läuft auf Port ${PORT}`);
});
