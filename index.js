export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const contentType = request.headers.get("content-type") || "";
      let data = {};

      if (contentType.includes("application/json")) {
        data = await request.json();
      } else {
        const raw = await request.text();
        data = JSON.parse(raw);
      }

      if (data.secret !== env.WEBHOOK_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }

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

      const text =
`📡 ORB PRO ALERT
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

      const tgResp = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: env.CHAT_ID,
          text: text
        })
      });

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
};
