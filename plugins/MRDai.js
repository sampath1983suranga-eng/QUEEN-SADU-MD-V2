// මෙම ප්ලගිනය WhatsApp Bot විධාන සඳහා භාවිතා වේ.
// This plugin is used for WhatsApp Bot commands.
const { cmd } = require('../command');
const axios = require('axios'); // API calls සඳහා axios මොඩියුලය අවශ්‍ය වේ.

// Gemini AI සමඟ කතාබස් කිරීම සඳහා නව විධානය.
// New command for chatting with Gemini AI.
cmd({
    pattern: "gemini", // විධානයේ නම.
    alias: ["ai", "mrdai"], // විධානය සඳහා විකල්ප නම්.
    desc: "Chat with Gemini AI model using Supun-MD API", // විධානයේ විස්තරය.
    category: "ai", // විධානය අයත් වන කාණ්ඩය.
    react: "✨", // විධානය ක්‍රියාත්මක වන විට පෙන්වන emoji.
    filename: __filename // වත්මන් ගොනුවේ නම.
},
async (conn, mek, m, { from, args, q, reply }) => { // react argument එක ඉවත් කරන ලදී.
    try {
        // පරිශීලකයා පණිවිඩයක් ලබා දී ඇත්දැයි පරීක්ෂා කරන්න.
        // Check if the user has provided a message.
        if (!q) {
            // Reaction යැවීමට conn.sendMessage භාවිතා කරන්න.
            // Use conn.sendMessage to send reaction.
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("කරුණාකර AI සඳහා පණිවිඩයක් සපයන්න.\nඋදාහරණ: `.gemini Hello`");
        }

        // Gemini AI API URL එක සකසන්න.
        // Set the Gemini AI API URL.
        const apiUrl = `https://supun-md-api-xmjh.vercel.app/api/gemini?q=${encodeURIComponent(q)}`;

        // API වෙත GET ඉල්ලීමක් යවන්න.
        // Send a GET request to the API.
        const { data } = await axios.get(apiUrl);

        // API ප්‍රතිචාරය වලංගු දැයි පරීක්ෂා කරන්න.
        // Check if the API response is valid.
        if (!data || !data.result) {
            // Reaction යැවීමට conn.sendMessage භාවිතා කරන්න.
            // Use conn.sendMessage to send reaction.
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("Gemini AI ප්‍රතිචාර දැක්වීමට අපොහොසත් විය. කරුණාකර පසුව නැවත උත්සාහ කරන්න.");
        }

        // AI ප්‍රතිචාරය පරිශීලකයාට යවන්න.
        // Send the AI response to the user.
        await reply(`✨ *Gemini AI ප්‍රතිචාරය:*\n\n${data.result}`);
        // Reaction යැවීමට conn.sendMessage භාවිතා කරන්න.
        // Use conn.sendMessage to send reaction.
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        // දෝෂයක් ඇති වුවහොත් එය කොන්සෝලයේ සටහන් කර පරිශීලකයාට දෝෂ පණිවිඩයක් යවන්න.
        // If an error occurs, log it to the console and send an error message to the user.
        console.error("Gemini AI විධානයේ දෝෂයක්:", e);
        // Reaction යැවීමට conn.sendMessage භාවිතා කරන්න.
        // Use conn.sendMessage to send reaction.
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply("Gemini AI සමඟ සන්නිවේදනය කිරීමේදී දෝෂයක් ඇති විය.");
    }
});
