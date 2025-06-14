const { cmd } = require('../command');
const Parser = require('rss-parser');
const config = require('../config');
const parser = new Parser({
    customFields: {
        item: ['enclosure']
    }
});

const newsIntervalMap = {}; // Store intervals per chat
const sentArticlesMap = {};

const getSinhalaNews = async () => {
    const feed = await parser.parseURL('https://www.adaderana.lk/rss.php');
    return feed.items;
};

const formatAdaDeranaArticle = (article) => {
    return {
        caption: `
📰 *${article.title.trim()}*
🕒 _${article.pubDate}_
🔗 _${article.link}_

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ delta ᴛᴇᴄʜ`,
        image: article.enclosure?.url || null
    };
};

cmd({
    pattern: "startnews",
    desc: "Start Sinhala news auto updates every 15 min.",
    category: "news",
    react: "🟢",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    if (newsIntervalMap[from]) return reply("🟢 Auto-news already running.");

    reply("✅ Sinhala news auto updates started. You'll receive updates every 15 minutes.");

    newsIntervalMap[from] = setInterval(async () => {
        try {
            const articles = await getSinhalaNews();
            for (const article of articles.slice(0, 3)) {
                if (sentArticlesMap[from]?.includes(article.link)) continue;

                const { caption, image } = formatAdaDeranaArticle(article);

                if (!sentArticlesMap[from]) sentArticlesMap[from] = [];
                sentArticlesMap[from].push(article.link);

                if (image) {
                    await conn.sendMessage(from, { image: { url: image }, caption });
                } else {
                    await conn.sendMessage(from, { text: caption });
                }
            }
        } catch (err) {
            console.error("Auto news error:", err);
            await conn.sendMessage(from, { text: "❌ පුවත් auto-fetch කිරීමේ දෝෂයක්." });
        }
    }, 15 * 60 * 1000); // 15 minutes
});

cmd({
    pattern: "stopnews",
    desc: "Stop Sinhala news auto updates.",
    category: "news",
    react: "🔴",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    if (!newsIntervalMap[from]) return reply("🔴 Auto-news updates not active.");

    clearInterval(newsIntervalMap[from]);
    delete newsIntervalMap[from];
    delete sentArticlesMap[from];
    reply("🛑 Sinhala news auto updates stopped.");
});

cmd({
    pattern: "getnews",
    desc: "Get the latest Sinhala news.",
    category: "news",
    react: "📰",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const articles = await getSinhalaNews();
        const article = articles[0]; // Latest one
        const { caption, image } = formatAdaDeranaArticle(article);

        if (image) {
            await conn.sendMessage(from, { image: { url: image }, caption });
        } else {
            await conn.sendMessage(from, { text: caption });
        }
    } catch (err) {
        console.error("Error in getnews:", err);
        reply("❌ පුවත් ලබා ගැනීමේදී දෝෂයක්.");
    }
});
