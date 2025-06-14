const Parser = require('rss-parser');
const parser = new Parser();
const newsIntervalMap = {}; // to store intervals per chat
const sentArticlesMap = {}; // to avoid duplicates

const getLatestNews = async () => {
    const feed = await parser.parseURL('https://www.adaderana.lk/rss.php');
    return feed.items;
};

const formatArticle = (article) => {
    return {
        caption: `
📰 *${article.title}*
🕒 ${article.pubDate}
🔗 _${article.link}_

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍʀ ᴅɪɴᴇꜱʜ ᴏꜰᴄ`,
        image: article.enclosure?.url || null // Some feeds contain images
    };
};

cmd({
    pattern: "startnews",
    desc: "Start auto Sinhala news updates.",
    category: "news",
    react: "🟢",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    if (newsIntervalMap[from]) {
        return reply("🟢 Auto-news updates already running.");
    }

    reply("📰 Sinhala news updates started every 30 minutes.");

    newsIntervalMap[from] = setInterval(async () => {
        try {
            const articles = await getLatestNews();
            for (const article of articles.slice(0, 3)) {
                if (sentArticlesMap[from]?.includes(article.link)) continue;

                const { caption, image } = formatArticle(article);
                if (!sentArticlesMap[from]) sentArticlesMap[from] = [];
                sentArticlesMap[from].push(article.link);

                if (image) {
                    await conn.sendMessage(from, { image: { url: image }, caption });
                } else {
                    await conn.sendMessage(from, { text: caption });
                }
            }
        } catch (err) {
            console.error("News fetch error:", err);
            await conn.sendMessage(from, { text: "❌ පුවත් ලබා ගැනීමේදී දෝෂයක්." });
        }
    }, 30 * 60 * 1000); // Every 30 minutes
});

cmd({
    pattern: "stopnews",
    desc: "Stop auto Sinhala news updates.",
    category: "news",
    react: "🔴",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    if (!newsIntervalMap[from]) return reply("🔴 Auto-news updates are not active.");
    clearInterval(newsIntervalMap[from]);
    delete newsIntervalMap[from];
    delete sentArticlesMap[from];
    reply("🛑 Sinhala news updates stopped.");
});

cmd({
    pattern: "getnews",
    desc: "Get the latest Sinhala news now.",
    category: "news",
    react: "📰",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const articles = await getLatestNews();
        const article = articles[0]; // Latest one
        const { caption, image } = formatArticle(article);

        if (image) {
            await conn.sendMessage(from, { image: { url: image }, caption });
        } else {
            await conn.sendMessage(from, { text: caption });
        }
    } catch (err) {
        console.error("Error fetching latest news:", err);
        reply("❌ පුවත් ලබා ගැනීමේදී දෝෂයක්.");
    }
});
