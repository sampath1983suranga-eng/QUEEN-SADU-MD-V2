const { cmd } = require('../command');
const axios = require('axios'); // HTTP requests සඳහා

// --- වැදගත්: ඔබේ NewsAPI යතුර මෙහි ඇතුළත් කරන්න! ---
// NewsAPI යතුරක් ලබා ගන්නා ආකාරය පහතින් විස්තර කර ඇත.
// "YOUR_NEWS_API_KEY_HERE" යන තැනට ඔබගේ සත්‍ය NewsAPI යතුර ඇතුළත් කරන්න.
const NEWS_API_KEY = "YOUR_NEWS_API_KEY_HERE";
// ---------------------------------------------------

cmd({
    pattern: "news",
    react: "📰",
    alias: ["sinhala_news", "lanka_news"],
    desc: "නවතම සිංහල පුවත් ලබා ගන්න.",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        if (!NEWS_API_KEY || NEWS_API_KEY === "d825877ec43a45ca864a6c24491a7b1f") {
            return reply("කරුණාකර NewsAPI යතුරක් ලබාගෙන 'NEWS_API_KEY' නියතය තුළ එය ඇතුළත් කරන්න.");
        }

        const newsApiUrl = `https://newsapi.org/v2/everything?q=Hiru%20News%20ශ්‍රී%20ලංකා&language=si&sortBy=publishedAt&pageSize=3&apiKey=${NEWS_API_KEY}`;

        const response = await axios.get(newsApiUrl);
        const articles = response.data.articles;

        if (articles.length === 0) {
            return reply("කණගාටුයි, දැනට සිංහල පුවත් සොයා ගැනීමට නොහැකි විය. කරුණාකර ටික වේලාවකින් නැවත උත්සාහ කරන්න.");
        }

        let newsMessage = "*අලුත්ම සිංහල පුවත් (Hiru News මගින්) :*\n\n";

        for (let i = 0; i < Math.min(articles.length, 3); i++) {
            const article = articles[i];
            newsMessage += `*${i + 1}. ${article.title || 'මාතෘකාවක් නොමැත'}*\n`;
            newsMessage += `   _${article.description || 'විස්තරයක් නොමැත'}_\n`;
            newsMessage += `   කියවන්න: ${article.url}\n\n`;
        }

        await conn.sendMessage(from, { text: newsMessage }, { quoted: mek });

    } catch (e) {
        console.error("පුවත් ලබා ගැනීමේදී දෝෂයක්:", e);
        if (e.response && e.response.status === 401) {
            reply("NewsAPI යතුර වලංගු නැත හෝ අස්ථානගත වී ඇත. කරුණාකර ඔබේ API යතුර නිවැරදිව ඇතුළත් කර ඇතිදැයි පරීක්ෂා කරන්න.");
        } else if (e.response && e.response.status === 429) {
            reply("NewsAPI වෙත ඕනෑවට වඩා ඉල්ලීම් යවා ඇත. කරුණාකර ටික වේලාවකට පසු නැවත උත්සාහ කරන්න.");
        } else {
            reply(`පුවත් ලබාගැනීමේදී දෝෂයක් සිදුවිය: ${e.message}`);
        }
    }
});
