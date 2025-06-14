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

async function fetchFeed() {
  const feed = await parser.parseURL('https://www.lankadeepa.lk/rss');
  return feed.items;
}

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

cmd({
  pattern: "startnews",
  desc: "Start Sinhala news every 15 min.",
  category: "news",
  react: "🟢",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
  if (intervals[from]) return reply("🟢 Already running.");
  reply("✅ Sinhala news auto-updates every 15 minutes.");
  intervals[from] = setInterval(async () => {
    try {
      const items = await fetchFeed();
      for (let item of items.slice(0, 3)) {
        if (sent[from]?.includes(item.link)) continue;
        const { caption, image } = format(item);
        sent[from] = sent[from] || [];
        sent[from].push(item.link);
        if (image) await conn.sendMessage(from, { image:{url:image}, caption });
        else await conn.sendMessage(from, { text: caption });
      }
    } catch (e) {
      console.error(e);
      await conn.sendMessage(from, { text: "❌ Sinhala news fetch error." });
    }
  }, 15 * 60 * 1000);
});

cmd({
  pattern: "stopnews",
  desc: "Stop Sinhala news updates.",
  category: "news",
  react: "🔴",
  filename: __filename
}, (conn, mek, m, { from, reply }) => {
  if (!intervals[from]) return reply("🔴 Not running.");
  clearInterval(intervals[from]);
  delete intervals[from];
  delete sent[from];
  reply("🛑 Sinhala news updates stopped.");
});

cmd({
  pattern: "getnews",
  desc: "Get latest Sinhala news now.",
  category: "news",
  react: "📰",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
  try {
    const items = await fetchFeed();
    const item = items[0];
    const { caption, image } = format(item);
    if (image) await conn.sendMessage(from, { image:{url:image}, caption });
    else await conn.sendMessage(from, { text: caption });
  } catch (e) {
    console.error(e);
    reply("❌ Error fetching Sinhala news.");
  }
});
