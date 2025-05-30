const { cmd } = require('../command');
const axios = require('axios');

const JATAKA_JSON_URL = 'https://raw.githubusercontent.com/MRDofc/QUEEN-SADU-MD-V2/main/data/jataka_complete.json';

let jatakaData = null;

async function loadJatakaData() {
    if (!jatakaData) {
        try {
            const res = await axios.get(JATAKA_JSON_URL);
            jatakaData = res.data;
        } catch (err) {
            console.error("📛 Error loading Jataka data:", err.message);
        }
    }
    return jatakaData;
}

cmd({
    pattern: "jataka ?(.*)",
    desc: "අංකය අනුව ජාතක කතාවක් ලබාගන්න",
    category: "Buddhism",
    filename: __filename
}, async (conn, m, msg, { input }) => {
    const jatakaNumber = input?.trim();

    if (!jatakaNumber || isNaN(jatakaNumber)) {
        return await conn.sendMessage(msg.from, {
            text: `📌 කරුණාකර ජාතක අංකයක් දෙන්න.\nඋදා: *jataka 25*`
        });
    }

    const data = await loadJatakaData();
    if (!data) {
        return await conn.sendMessage(msg.from, {
            text: "⚠️ ජාතක දත්ත ලබාගැනීමට නොහැක. අන්තර්ජාල සම්බන්ධතාවය පරීක්ෂා කරන්න."
        });
    }

    const jataka = data[jatakaNumber];
    if (!jataka) {
        return await conn.sendMessage(msg.from, {
            text: `😕 අංක ${jatakaNumber} සඳහා ජාතකයක් නොමැත.`
        });
    }

    const responseText = `📜 *ජාතක කථාව - අංක ${jatakaNumber}*\n\n*🪷 ${jataka.title}*\n\n${jataka.story.substring(0, 4000)}${jataka.story.length > 4000 ? '\n\n...(කතාව දිගයි)' : ''}`;

    await conn.sendMessage(msg.from, {
        text: responseText
    });
});
