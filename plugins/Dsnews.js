const { cmd } = require('../command');
const axios = require('axios');

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
        // ඔබේ Render API endpoint එක මෙතනට දමන්න
        // සටහන: /api/news කියන endpoint එක අනිවාර්යයෙන්ම URL එකට එකතු කරන්න.
        const yourApiUrl = "https://news-api-bv26.onrender.com/api/news"; // <-- මේක තමයි ඔබේ අලුත් API URL එක

        const response = await axios.get(yourApiUrl);
        const articles = response.data; // ඔබේ API එකෙන් කෙලින්ම articles array එක එනවා

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
        reply(`පුවත් ලබාගැනීමේදී දෝෂයක් සිදුවිය: ${e.message}`);
    }
});
