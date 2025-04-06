const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { cmd } = require("../command");

cmd({
    pattern: "gpt",
    alias: "ai",
    desc: "Interact with ChatGPT and get Sinhala voice response.",
    category: "ai",
    react: "🤖",
    use: "<your query>",
    filename: __filename,
}, async (conn, mek, m, { from, args, q, reply }) => {
    try {
        if (!q) return reply("⚠️ කරුණාකර ChatGPT සඳහා ප්‍රශ්නයක් ලබා දෙන්න.\n\nඋදාහරණයක්:\n.gpt AI කියන්නේ මොකද්ද?");

        const text = q;
        const encodedText = encodeURIComponent(text);
        const url = `https://api.dreaded.site/api/chatgpt?text=${encodedText}`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json',
            }
        });

        if (!response?.data?.result?.prompt) {
            return reply("❌ GPT API වෙතින් ප්‍රතිචාරයක් ලැබුණේ නැහැ.");
        }

        const gptResponse = response.data.result.prompt;
        const ALIVE_IMG = 'https://i.postimg.cc/4y4Bxdc8/Picsart-25-02-08-23-56-16-217.jpg';
        const formattedInfo = `🤖 *ChatGPT පිළිතුර:*\n\n${gptResponse}`;

        // Generate Sinhala voice using gtts
        const gttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=si&client=tw-ob&q=${encodeURIComponent(gptResponse)}`;
        const voicePath = path.join(__dirname, "gpt_voice.mp3");
        const voiceWriter = fs.createWriteStream(voicePath);

        const voiceRes = await axios({
            method: 'get',
            url: gttsUrl,
            responseType: 'stream'
        });

        await new Promise((resolve, reject) => {
            voiceRes.data.pipe(voiceWriter);
            voiceWriter.on('finish', resolve);
            voiceWriter.on('error', reject);
        });

        // Send both image + voice
        await conn.sendMessage(from, {
            image: { url: ALIVE_IMG },
            caption: formattedInfo,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true
            }
        }, { quoted: mek });

        await conn.sendMessage(from, {
            audio: fs.readFileSync(voicePath),
            mimetype: 'audio/mp4',
            ptt: true
        }, { quoted: mek });

        // Clean up
        fs.unlinkSync(voicePath);

    } catch (error) {
        console.error("GPT Command Error:", error);
        const errMsg = error?.message || "Unknown error occurred.";
        return reply(`❌ දෝෂයක් සිදුවී ඇත:\n\n${errMsg}`);
    }
});
