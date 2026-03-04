/**
 * Run once after deploy to set Telegram webhook:
 * npx tsx scripts/set-telegram-webhook.ts
 */
const token = process.env.TELEGRAM_BOT_TOKEN;
const url = process.env.NEXT_PUBLIC_APP_URL || "https://stanmetrics.vercel.app";

if (!token) {
  console.error("Set TELEGRAM_BOT_TOKEN in env");
  process.exit(1);
}

const webhookUrl = `${url}/api/webhooks/telegram`;
const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: webhookUrl }),
});
const data = await res.json();
console.log(data.ok ? `Webhook set: ${webhookUrl}` : data);
