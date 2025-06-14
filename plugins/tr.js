const { cmd } = require('../command');
const axios = require('axios');

// Translate Function
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
        console.error("Translation Error:", err?.response?.data || err.message);
        return null;
    }
}

// .trsi → English to Sinhala
cmd({
    pattern: "trsi",
    desc: "Translate English → Sinhala (reply to a message)",
    category: "tools",
    react: "🌐",
    filename: __filename
}, async (conn, mek, m, { reply, react }) => {
    const msg = m.quoted?.text;
    if (!msg) return reply("කරුණාකර පරිවර්තනය කිරීමට message එකකට reply කරන්න.");

    const translated = await translate(msg, "en", "si");
    if (!translated) return reply("පරිවර්තනය කළ නොහැක.");
    await react("✅");
    return reply(`🇱🇰 *සිංහලට පරිවර්තනය:* \n\n${translated}`);
});

// .tren → Sinhala to English
cmd({
    pattern: "tren",
    desc: "Translate Sinhala → English (reply to a message)",
    category: "tools",
    react: "🌐",
    filename: __filename
}, async (conn, mek, m, { reply, react }) => {
    const msg = m.quoted?.text;
    if (!msg) return reply("Please reply to a Sinhala message to translate.");

    const translated = await translate(msg, "si", "en");
    if (!translated) return reply("Translation failed.");
    await react("✅");
    return reply(`🇬🇧 *Translated to English:* \n\n${translated}`);
});
