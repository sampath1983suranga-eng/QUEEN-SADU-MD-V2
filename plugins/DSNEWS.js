const { cmd } = require('../command');
const Parser = require('rss-parser');
const config = require('../config');
const parser = new Parser({
  customFields: {
    item: ['media:content', 'enclosure']
  }
});

const newsIntervals = {};
const sentLinks = {};

async function fetchNews() {
  const feed = await parser.parseURL('http://lankadeepa.lk/index.php/maincontroller/breakingnews_rss');
  return feed.items;
}

function format(article) {
  const image = article.enclosure?.url
    || (article['media:content']?.url)
    || null;
  return {
    caption: `
📰 *${article.title.trim()}*
🕒 _${article.pubDate}_
> ᴘᴏᴡᴇʀᴇᴅ ʙʏ delta ᴛᴇᴄʜ`,
    image
  };
}

cmd({
  pattern: "startnews",
  desc: "Start Sinhala Lankadeepa updates every 15m",
  category: "news",
  react: "🟢",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
  if (newsIntervals[from]) return reply("🟢 Already running.");
  reply("✅ Started Sinhala Lankadeepa news every 15 minutes.");
  newsIntervals[from] = setInterval(async () => {
    try {
      const items = await fetchNews();
      for (let art of items.slice(0, 3)) {
        if (sentLinks[from]?.includes(art.link)) continue;
        const {caption, image} = format(art);
        sentLinks[from] = sentLinks[from] || [];
        sentLinks[from].push(art.link);
        if (image) await conn.sendMessage(from, { image:{url:image}, caption });
        else await conn.sendMessage(from, { text: caption });
      }
    } catch (e) {
      console.error(e);
      await conn.sendMessage(from, { text: "❌ Auto Sinhala news error." });
    }
  }, 15*60*1000);
});

cmd({
  pattern: "stopnews",
  desc: "Stop Lankadeepa Sinhala updates",
  category: "news",
  react: "🔴",
  filename: __filename
}, (conn, mek, m, { from, reply }) => {
  if (!newsIntervals[from]) return reply("🔴 Not running.");
  clearInterval(newsIntervals[from]);
  delete newsIntervals[from];
  delete sentLinks[from];
  reply("🛑 Stopped Sinhala news updates.");
});

cmd({
  pattern: "getnews",
  desc: "Get latest Sinhala Lankadeepa news now",
  category: "news",
  react: "📰",
  filename: __filename
}, async (conn, mek, m, { from, reply }) => {
  try {
    const items = await fetchNews();
    const art = items[0];
    const {caption, image} = format(art);
    if (image) await conn.sendMessage(from, { image:{url:image}, caption });
    else await conn.sendMessage(from, { text: caption });
  } catch (e) {
    console.error(e);
    reply("❌ Error fetching Sinhala news.");
  }
});
