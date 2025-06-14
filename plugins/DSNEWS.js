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

async function fetchNews() {
  const feed = await parser.parseURL('https://www.adaderana.lk/rss.php');
  return feed.items;
}

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

// Start auto news every 15 minutes
cmd({
  pattern: "startnews",
  desc: "Start Ada Derana Sinhala news updates every 15m",
  category: "news",
  react: "🟢",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
  if (intervals[from]) return reply("🟢 Sinhala news already running.");
  reply("✅ Started sending Sinhala Ada Derana news every 15 minutes.");
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
      console.error(e);
      await conn.sendMessage(from, { text: "❌ Error auto-fetching Sinhala news." });
    }
  }, 15 * 60 * 1000);
});

// Stop auto news
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
  reply("🛑 Stopped Ada Derana Sinhala news.");
});

// Get latest news once
cmd({
  pattern: "getnews",
  desc: "Get latest Ada Derana Sinhala news",
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
    console.error(e);
    reply("❌ Error fetching latest Sinhala news.");
  }
});
