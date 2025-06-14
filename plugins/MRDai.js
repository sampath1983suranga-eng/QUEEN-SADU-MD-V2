const { cmd } = require('../command');
const axios = require('axios');

// Translate Sinhala to English and vice versa
async function translate(text, from, to) {
    try {
        const res = await axios.post('https://libretranslate.de/translate', {
            q: text,
            source: from,
            target: to,
            format: "text"
        }, { headers: { 'Content-Type': 'application/json' } });

        return res.data.translatedText;
    } catch (error) {
        console.error('Translate Error:', error?.response?.data || error.message);
        return null;
    }
}

// .ai command
cmd({
    pattern: "ai",
    alias: ["bot"],
    desc: "Chat with AI using Sinhala input",
    category: "ai",
    react: "🤖",
    filename: __filename
},
async (conn, mek, m, { q, reply, react }) => {
    try {
        if (!q) return reply("ඔබගේ ප්‍රශ්නයක් ලබා දෙන්න.\nඋදා: `.ai ඔබට කෙසේද`");

        // 1. Translate Sinhala → English
        const englishInput = await translate(q, "si", "en");
        if (!englishInput) return reply("පරිවර්තනය සදහා දෝෂයක්.");

        console.log("Translated to English:", englishInput);

        // 2. Call AI API
        const aiURL = `https://lance-frank-asta.onrender.com/api/gpt?q=${encodeURIComponent(englishInput)}`;
        const { data } = await axios.get(aiURL);

        if (!data || !data.message) {
            console.log("AI response issue:", data);
            return reply("AI පිළිතුරක් ලැබුණේ නැහැ.");
        }

        console.log("AI Response:", data.message);

        // 3. Translate English → Sinhala
        const sinhalaOutput = await translate(data.message, "en", "si");
        if (!sinhalaOutput) return reply("පිළිතුර පරිවර්තනය කළ නොහැක.");

        await reply(`🤖 *AI පිළිතුර:*\n\n${sinhalaOutput}`);
        await react("✅");

    } catch (err) {
        console.error("❌ AI Error:", err?.response?.data || err.message);
        await react("❌");
        await reply("AI පිළිතුර ලබාගැනීමේදී දෝෂයක් ඇතිවිය.");
    }
});
