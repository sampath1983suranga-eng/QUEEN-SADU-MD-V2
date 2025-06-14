const { cmd } = require('../command');
const axios = require('axios');

// Translate Function using LibreTranslate
async function translate(text, from, to) {
    try {
        const res = await axios.post('https://libretranslate.de/translate', {
            q: text,
            source: from,
            target: to,
            format: "text"
        }, {
            headers: { 'Content-Type': 'application/json' }
        });
        return res.data.translatedText;
    } catch (err) {
        console.error("Translation error:", err);
        return null;
    }
}

// ─── .ai Command ──────────────────────────────
cmd({
    pattern: "ai",
    alias: ["bot"],
    desc: "Chat with an AI model (supports Sinhala)",
    category: "ai",
    react: "🤖",
    filename: __filename
}, async (conn, mek, m, { q, reply, react }) => {
    try {
        if (!q) return reply("කරුණාකර AI එකට කියන්න විදියක් සපයන්න.\nඋදාහරණයක්: `.ai සුභ දවසක්`");

        const translatedInput = await translate(q, "si", "en");
        if (!translatedInput) return reply("ප්‍රශ්නය පරිවර්තනය කළ නොහැක.");

        const apiUrl = `https://lance-frank-asta.onrender.com/api/gpt?q=${encodeURIComponent(translatedInput)}`;
        const { data } = await axios.get(apiUrl);
        if (!data || !data.message) return reply("AI පිළිතුර ලබාගත නොහැක.");

        const translatedOutput = await translate(data.message, "en", "si");
        if (!translatedOutput) return reply("පිළිතුර පරිවර්තනය කළ නොහැක.");

        await reply(`🤖 *AI පිළිතුර:*\n\n${translatedOutput}`);
        await react("✅");

    } catch (e) {
        console.error("Error in AI command:", e);
        await react("❌");
        reply("AI සම්බන්ධතාවය දෝෂයකට ලක්වියි.");
    }
});

// ─── .openai Command ──────────────────────────
cmd({
    pattern: "openai",
    alias: ["chatgpt", "gpt3"],
    desc: "Chat with OpenAI (supports Sinhala)",
    category: "ai",
    react: "🧠",
    filename: __filename
}, async (conn, mek, m, { q, reply, react }) => {
    try {
        if (!q) return reply("OpenAI එකට විධියක් සපයන්න.\nඋදා: `.openai මොකක්ද ChatGPT කියන්නේ?`");

        const translatedInput = await translate(q, "si", "en");
        if (!translatedInput) return reply("ප්‍රශ්නය පරිවර්තනය කළ නොහැක.");

        const apiUrl = `https://vapis.my.id/api/openai?q=${encodeURIComponent(translatedInput)}`;
        const { data } = await axios.get(apiUrl);
        if (!data || !data.result) return reply("OpenAI පිළිතුර ලබාගත නොහැක.");

        const translatedOutput = await translate(data.result, "en", "si");
        if (!translatedOutput) return reply("පිළිතුර පරිවර්තනය කළ නොහැක.");

        await reply(`🧠 *OpenAI පිළිතුර:*\n\n${translatedOutput}`);
        await react("✅");

    } catch (e) {
        console.error("Error in OpenAI command:", e);
        await react("❌");
        reply("OpenAI සම්බන්ධතාවයේ දෝෂයක් ඇත.");
    }
});

// ─── .deepseek Command ────────────────────────
cmd({
    pattern: "deepseek",
    alias: ["deep", "seekai"],
    desc: "Chat with DeepSeek AI (supports Sinhala)",
    category: "ai",
    react: "🧠",
    filename: __filename
}, async (conn, mek, m, { q, reply, react }) => {
    try {
        if (!q) return reply("DeepSeek AI එකට ප්‍රශ්නයක් ලබාදෙන්න.\nඋදා: `.deepseek කෝපි වල වාසියක් තියෙනවද?`");

        const translatedInput = await translate(q, "si", "en");
        if (!translatedInput) return reply("ප්‍රශ්නය පරිවර්තනය කළ නොහැක.");

        const apiUrl = `https://api.ryzendesu.vip/api/ai/deepseek?text=${encodeURIComponent(translatedInput)}`;
        const { data } = await axios.get(apiUrl);
        if (!data || !data.answer) return reply("DeepSeek AI පිළිතුරක් නොමැත.");

        const translatedOutput = await translate(data.answer, "en", "si");
        if (!translatedOutput) return reply("පිළිතුර පරිවර්තනය කළ නොහැක.");

        await reply(`🧠 *DeepSeek පිළිතුර:*\n\n${translatedOutput}`);
        await react("✅");

    } catch (e) {
        console.error("Error in DeepSeek AI command:", e);
        await react("❌");
        reply("DeepSeek AI සම්බන්ධතාවයේ දෝෂයක් ඇත.");
    }
});
