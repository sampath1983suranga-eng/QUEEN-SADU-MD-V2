const { cmd } = require('../command');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

cmd({
    pattern: "tts",
    desc: "Convert Sinhala text to speech",
    react: "🗣️",
    filename: __filename
}, async (conn, m, msg, { text, from }) => {
    if (!text) {
        return await conn.sendMessage(from, { text: "උදාහරණයක්: `.tts ඔයාට කොහොමද කියලා`" });
    }

    try {
        const ttsRes = await axios({
            method: "GET",
            url: `https://translate.google.com/translate_tts`,
            params: {
                ie: "UTF-8",
                q: text,
                tl: "si",
                client: "tw-ob"
            },
            responseType: "arraybuffer"
        });

        const filePath = path.join(__dirname, '../temp', `${Date.now()}.mp3`);
        fs.writeFileSync(filePath, ttsRes.data);

        await conn.sendMessage(from, {
            audio: fs.readFileSync(filePath),
            mimetype: 'audio/mp4',
            ptt: true
        });

        fs.unlinkSync(filePath);
    } catch (err) {
        console.error("TTS Error:", err);
        await conn.sendMessage(from, { text: "වදිනවා! TTS voice එක generate කරන්න බැරි වුණා." });
    }
});
