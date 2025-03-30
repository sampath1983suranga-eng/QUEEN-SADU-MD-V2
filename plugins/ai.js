const axios = require("axios");
const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function splitText(text, wordLimit = 200) {
    const words = text.split(" ");
    const parts = [];
    for (let i = 0; i < words.length; i += wordLimit) {
        parts.push(words.slice(i, i + wordLimit).join(" "));
    }
    return parts;
}

cmd({
    pattern: "gpt",
    alias: "ai",
    desc: "ChatGPT with full Sinhala voice response",
    category: "ai",
    react: "🤖",
    use: "<your query>",
    filename: __filename,
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ කරුණාකර ප‍්‍රශ්නයක් ඇතුළත් කරන්න.\n\nඋදා: .gpt ශ්‍රී ලංකාවේ ඉතිහාසය කියන්න.");

        const url = `https://sadiya-tech-apis.vercel.app/ai/blackboxv4?q=${encodeURIComponent(q)}`;
        const response = await axios.get(url);
        const gptText = response.data?.response;

        if (!gptText) return reply("❌ API එකෙන් පිළිතුරක් නැහැ.");

        // Image response
        await conn.sendMessage(from, {
            image: { url: 'https://i.postimg.cc/4y4Bxdc8/Picsart-25-02-08-23-56-16-217.jpg' },
            caption: `🤖 *ChatGPT පිළිතුර:*\n\n${gptText}`,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363357105376275@g.us@newsletter',
                    newsletterName: 'MR DINESH AI',
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

        // Split and generate voice parts
        const parts = splitText(gptText, 200);
        const voiceFiles = [];

        for (let i = 0; i < parts.length; i++) {
            const partPath = path.join(__dirname, `part${i}.mp3`);
            execSync(`gtts-cli --lang si "${parts[i]}" --output "${partPath}"`);
            voiceFiles.push(partPath);
        }

        // Create a file list for ffmpeg concat
        const fileListPath = path.join(__dirname, "filelist.txt");
        const fileList = voiceFiles.map(file => `file '${file}'`).join("\n");
        fs.writeFileSync(fileListPath, fileList);

        const finalAudioPath = path.join(__dirname, "final_voice.mp3");
        execSync(`ffmpeg -f concat -safe 0 -i "${fileListPath}" -c copy "${finalAudioPath}"`);

        // Send final audio as PTT
        await conn.sendMessage(from, {
            audio: fs.readFileSync(finalAudioPath),
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        }, { quoted: mek });

        // Cleanup
        voiceFiles.forEach(file => fs.unlinkSync(file));
        fs.unlinkSync(fileListPath);
        fs.unlinkSync(finalAudioPath);

    } catch (err) {
        console.error("Sinhala GPT Voice Error:", err);
        return reply(`❌ දෝෂයක් ඇතිවී ඇත:\n${err.message}`);
    }
});
