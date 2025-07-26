// මෙම ප්ලගිනය WhatsApp Bot විධාන සඳහා භාවිතා වේ.
// This plugin is used for WhatsApp Bot commands.
const { cmd } = require('../command');
const axios = require('axios'); // API calls සඳහා axios මොඩියුලය අවශ්‍ය වේ. // axios module is required for API calls.

// Supun-MD API හරහා OpenAI සමඟ කතාබස් කිරීම සඳහා නව විධානය.
// New command for chatting with OpenAI via Supun-MD API.
cmd({
    pattern: "ai", // විධානයේ නම. // Command name.
    alias: ["mrd", "mrdai"], // විධානය සඳහා විකල්ප නම්. // Alternative names for the command.
    desc: "Chat with OpenAI model using MRD-MD API", // විධානයේ විස්තරය. // Description of the command.
    category: "ai", // විධානය අයත් වන කාණ්ඩය. // Category the command belongs to.
    react: "🧠", // විධානය ක්‍රියාත්මක වන විට පෙන්වන emoji. // Emoji to show when the command is executed.
    filename: __filename // වත්මන් ගොනුවේ නම. // Current file name.
},
async (conn, mek, m, { from, args, q, reply }) => {
    try {
        // පරිශීලකයා පණිවිඩයක් ලබා දී ඇත්දැයි පරීක්ෂා කරන්න.
        // Check if the user has provided a message.
        if (!q) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("කරුණාකර AI සඳහා පණිවිඩයක් සපයන්න.\nඋදාහරණ: `.mrdai Hello`");
        }

        // OpenAI API URL එක සකසන්න.
        // Corrected: Removed 'hi' from the query string.
        // Set the OpenAI API URL.
        const apiUrl = `https://supun-md-api-xmjh.vercel.app/api/ai?q=${encodeURIComponent(q)}`;

        // API වෙත GET ඉල්ලීමක් යවන්න.
        // Send a GET request to the API.
        const { data } = await axios.get(apiUrl);

        // API ප්‍රතිචාරය වලංගු දැයි පරීක්ෂා කරන්න.
        // Check if the API response is valid and extract the AI response.
        // The Vercel API response structure is data.success and data.geminiResponse.data
        if (!data || !data.success || !data.geminiResponse || !data.geminiResponse.data) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("MRD AI ප්‍රතිචාර දැක්වීමට අපොහොසත් විය. කරුණාකර පසුව නැවත උත්සාහ කරන්න.");
        }

        // AI ප්‍රතිචාරය පරිශීලකයාට යවන්න.
        // Send the AI response to the user.
        const aiResponse = data.geminiResponse.data;
        await reply(`🧠 *MRD AI ප්‍රතිචාරය:*\n\n${aiResponse}`);
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        // දෝෂයක් ඇති වුවහොත් එය කොන්සෝලයේ සටහන් කර පරිශීලකයාට දෝෂ පණිවිඩයක් යවන්න.
        // If an error occurs, log it to the console and send an error message to the user.
        console.error("MRD AI විධානයේ දෝෂයක්:", e);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply("MRD AI සමඟ සන්නිවේදනය කිරීමේදී දෝෂයක් ඇති විය. කරුණාකර API සබැඳිය සහ CORS සැකසුම් පරීක්ෂා කරන්න.");
    }
});
