const { cmd } = require('../command');
const Parser = require('rss-parser');
const config = require('../config');
const parser = new Parser({
  customFields: {
    item: ['enclosure', 'media:content']
  }
});

const intervals = {};
const sent = {};

// 📰 Sinhala Dinamina RSS fetch
async function fetchNews() {
  const feed = await parser.parseURL('https://www.dinamina.lk/feed');
  return feed.items;
}

// 🏷 Format Sinhala news with optional image
function format(item) {
  const image = item.enclosure?.url
    || item['media:content']?.url
    || null;

  return {
    caption: `
📰 *${item.title.trim()}*
🕒 _${item.pubDate}_
> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍʀ ᴅɪɴᴇꜱʜ ᴏꜰᴄ`,
    image
  };
}

// ▶️ startnews — auto every 15 min
cmd({
  pattern: "startnews",
  desc: "Start Sinhala Dinamina news every 15m",
  category: "news",
  react: "🟢",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
  if (intervals[from]) return reply("🟢 Sinhala news already running.");
  reply("✅ Sinhala Dinamina auto-updates started (15min).");

  intervals[from] = setInterval(async () => {
    try {
      const items = await fetchNews();
      for (let item of items.slice(0, 3)) {
        if (sent[from]?.includes(item.link)) continue;
        const { caption, image } = format(item);
        sent[from] = sent[from] || [];
        sent[from].push(item.link);

        if (image) await conn.sendMessage(from, { image: { url: image }, caption });
        else await conn.sendMessage(from, { text: caption });
      }
    } catch (e) {
      console.error("Auto fetch error:", e);
      await conn.sendMessage(from, { text: "❌ Sinhala news fetch error." });
    }
  }, 15 * 60 * 1000);
});

// ⏹ stopnews — cancel auto
cmd({
  pattern: "stopnews",
  desc: "Stop Sinhala news auto updates",
  category: "news",
  react: "🔴",
  filename: __filename
}, (conn, mek, m, { from, reply }) => {
  if (!intervals[from]) return reply("🔴 Sinhala news not running.");
  clearInterval(intervals[from]);
  delete intervals[from];
  delete sent[from];
  reply("🛑 Sinhala Dinamina auto-updates stopped.");
});

// 📥 getnews — fetch latest now
cmd({
  pattern: "getnews",
  desc: "Get latest Sinhala Dinamina news",
  category: "news",
  react: "📰",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
  try {
    const items = await fetchNews();
    const item = items[0];
    const { caption, image } = format(item);

    if (image) await conn.sendMessage(from, { image: { url: image }, caption });
    else await conn.sendMessage(from, { text: caption });
  } catch (e) {
    console.error("Fetch latest error:", e);
    reply("❌ Error fetching latest Sinhala news.");
  }
});
