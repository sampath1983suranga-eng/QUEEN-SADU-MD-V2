const { cmd } = require('../command');
const translate = require('@vitalets/google-translate-api'); // stable free version

// English ➜ Sinhala
cmd({
    pattern: "trsi",
    desc: "Translate English → Sinhala (reply to a message)",
    category: "tools",
    react: "🌐",
    filename: __filename
}, async (conn, mek, m, { reply, react }) => {
    const msg = m.quoted?.text;
    if (!msg) return reply("කරුණාකර reply message එකක් දෙන්න.");

    try {
        const res = await translate(msg, { to: 'si' });
        await react("✅");
        return reply(`🇱🇰 *සිංහලට පරිවර්තනය:* \n\n${res.text}`);
    } catch (e) {
        console.error("Translate Error:", e);
        await react("❌");
        return reply("පරිවර්තනය අසාර්ථකයි.");
    }
});

// Sinhala ➜ English
cmd({
    pattern: "tren",
    desc: "Translate Sinhala → English (reply to a message)",
    category: "tools",
    react: "🌐",
    filename: __filename
}, async (conn, mek, m, { reply, react }) => {
    const msg = m.quoted?.text;
    if (!msg) return reply("Please reply to a Sinhala message to translate.");

    try {
        const res = await translate(msg, { to: 'en' });
        await react("✅");
        return reply(`🇬🇧 *Translated to English:* \n\n${res.text}`);
    } catch (e) {
        console.error("Translate Error:", e);
        await react("❌");
        return reply("Translation failed.");
    }
});
