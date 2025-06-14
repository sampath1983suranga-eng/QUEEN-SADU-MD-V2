const { cmd } = require('../command');
const Parser = require('rss-parser');
const config = require('../config');
const parser = new Parser({
  customFields: {
    item: ['enclosure']
  }
});

const intervals = {};
const sentLinks = {};

// ✅ Sinhala Ada Derana feed
async function fetchNews() {
  const feed = await parser.parseURL('https://sinhala.adaderana.lk/rss.php');
  return feed.items;
}

// 🧾 Format Sinhala news with optional image
function format(item) {
  const image = item.enclosure?.url || null;
  return {
    caption: `
📰 *${item.title.trim()}*
🕒 _${item.pubDate}_
> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍʀ ᴅɪɴᴇꜱʜ ᴏꜰᴄ`,
    image
  };
}

// ▶️ Start auto updates
cmd({
  pattern: "startnews",
  desc: "Start Sinhala news updates every 15 min",
  category: "news",
  react: "🟢",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
  if (intervals[from]) return reply("🟢 Sinhala news already running.");
  reply("✅ Started Sinhala Ada Derana news (every 15 minutes).");
  intervals[from] = setInterval(async () => {
    try {
      const items = await fetchNews();
      for (let item of items.slice(0, 3)) {
        if (sentLinks[from]?.includes(item.link)) continue;
        const { caption, image } = format(item);
        sentLinks[from] = sentLinks[from] || [];
        sentLinks[from].push(item.link);
        if (image) {
          await conn.sendMessage(from, { image: { url: image }, caption });
        } else {
          await conn.sendMessage(from, { text: caption });
        }
      }
    } catch (e) {
      console.error("Auto fetch error:", e);
      await conn.sendMessage(from, { text: "❌ Error fetching Sinhala news." });
    }
  }, 15 * 60 * 1000); // 15 minutes
});

// ⏹ Stop auto news
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
  delete sentLinks[from];
  reply("🛑 Stopped Sinhala news updates.");
});

// 📥 Get latest Sinhala news now
cmd({
  pattern: "getnews",
  desc: "Get latest Sinhala Ada Derana news",
  category: "news",
  react: "📰",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
  try {
    const items = await fetchNews();
    const item = items[0];
    const { caption, image } = format(item);
    if (image) {
      await conn.sendMessage(from, { image: { url: image }, caption });
    } else {
      await conn.sendMessage(from, { text: caption });
    }
  } catch (e) {
    console.error("Fetch latest error:", e);
    reply("❌ Error fetching Sinhala news.");
  }
});
