export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Gestion des alertes (Webhook venant de TradingView ou autre)
    // URL attendue: POST /alert
    // Payload JSON: { "secret": "...", "ticker": "...", ... }
    if (request.method === "POST" && url.pathname === "/alert") {
      return await handleAlert(request, env);
    }

    // 2. Gestion du Webhook Telegram (Messages envoyés au bot)
    // URL attendue: POST /webhook/${WEBHOOK_SECRET}
    if (request.method === "POST" && url.pathname === `/webhook/${env.WEBHOOK_SECRET}`) {
      return await handleTelegramUpdate(request, env);
    }

    // 3. Fallback pour les tests ou requêtes inconnues
    return new Response("🤖 ORB_STEROID_BOT is active. Send POST /alert with valid secret.", { status: 200 });
  }
};

async function handleAlert(request, env) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let data = {};

    if (contentType.includes("application/json")) {
      data = await request.json();
    } else {
      const raw = await request.text();
      data = JSON.parse(raw);
    }

    // Vérification du secret
    if (data.secret !== env.WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Extraction des données (valeurs par défaut si manquantes)
    const direction = data.direction || "N/A";
    const ticker = data.ticker || "N/A";
    const setup = data.setup || "N/A";
    const entry = data.entry || "N/A";
    const sl = data.sl || "N/A";
    const tp = data.tp || "N/A";
    const qty = data.qty || "N/A";
    const mode = data.mode || "N/A";
    const session = data.session || "N/A";
    const timeframe = data.timeframe || "N/A";
    const t = data.time || "N/A";

    const text = `📡 **ORB PRO ALERT**
Ticker: ${ticker}
Direction: ${direction}
Setup: ${setup}
Mode: ${mode}
Session: ${session}
TF: ${timeframe}
Entry: ${entry}
SL: ${sl}
TP: ${tp}
Qty: ${qty}
Time: ${t}`;

    const tgResp = await sendToTelegram(env, text);
    const tgJson = await tgResp.json();

    if (!tgResp.ok) {
      return new Response(JSON.stringify(tgJson), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: String(err)
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}

async function handleTelegramUpdate(request, env) {
  try {
    const update = await request.json();
    
    // Si l'utilisateur envoie /start, on lui renvoie son ID (utile pour configurer CHAT_ID)
    if (update.message && update.message.text === "/start") {
      const chatId = update.message.chat.id;
      const welcomeText = `🤖 **ORB_STEROID_BOT** est en ligne !
      
Votre Chat ID est : \`${chatId}\`
Configurez-le dans Cloudflare avec :
\`npx wrangler secret put CHAT_ID\``;

      await sendToTelegram(env, welcomeText, chatId);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    return new Response("OK", { status: 200 }); // Toujours répondre OK à Telegram pour éviter les retries
  }
}

async function sendToTelegram(env, text, targetChatId = null) {
  const chatId = targetChatId || env.CHAT_ID;
  return fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "Markdown"
    })
  });
}
