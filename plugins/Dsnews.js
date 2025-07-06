const { cmd , commands} = require('../command'); // ඔබගේ command system එකට අනුව
const axios = require('axios'); // HTTP requests සඳහා

// ඔබගේම News API හි URL එක මෙහි සඳහන් කරන්න.
// මෙය ඔබ Render.com හි deploy කළ API එකයි.
const ESANA_NEWS_API_URL = "https://news-api-bv26.onrender.com/api/news"; 

cmd({
    pattern: "news",
    react: "📰",
    alias: ["sinhala_news", "lanka_news"],
    desc: "නවතම සිංහල පුවත් (Esana.lk වෙතින්) ලබා ගන්න.",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
    try {
        // API වෙතින් පුවත් ලබා ගැනීම
        const response = await axios.get(ESANA_NEWS_API_URL);
        const articles = response.data; // API එකෙන් කෙලින්ම articles array එක එනවා

        if (!articles || articles.length === 0) {
            return reply("කණගාටුයි, දැනට සිංහල පුවත් සොයා ගැනීමට නොහැකි විය. කරුණාකර ටික වේලාවකින් නැවත උත්සාහ කරන්න.");
        }

        let newsMessage = "*අලුත්ම සිංහල පුවත් (Esana.lk වෙතින්) :*\n\n";

        // පුවත් 3ක් පමණක් පෙන්වීමට
        for (let i = 0; i < Math.min(articles.length, 3); i++) {
            const article = articles[i];
            newsMessage += `*${i + 1}. ${article.title || 'මාතෘකාවක් නොමැත'}*\n`;
            newsMessage += `   _${article.description || 'විස්තරයක් නොමැත'}_\n`;
            newsMessage += `   කියවන්න: ${article.url}\n\n`;
        }

        await conn.sendMessage(from, { text: newsMessage }, { quoted: mek });

    } catch (e) {
        console.error("පුවත් ලබා ගැනීමේදී දෝෂයක්:", e);
        // API request එකේ error එකක් ආවොත්, ඒකෙන් කියවෙන දේ user ට පෙන්වයි
        if (e.response) {
            reply(`පුවත් ලබාගැනීමේදී දෝෂයක් සිදුවිය: API දෝෂය - ${e.response.status} ${e.response.statusText}`);
        } else if (e.request) {
            reply(`පුවත් ලබාගැනීමේදී දෝෂයක් සිදුවිය: API වෙත සම්බන්ධ වීමේ ගැටලුවක්.`);
        } else {
            reply(`පුවත් ලබාගැනීමේදී දෝෂයක් සිදුවිය: ${e.message}`);
        }
    }
});
