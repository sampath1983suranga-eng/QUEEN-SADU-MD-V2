const { cmd } = require('../command');
const axios = require('axios');

const JATAKA_JSON_URL = 'https://raw.githubusercontent.com/MRDofc/jataka/main/jataka_complete.json';

let jatakaData = null;

// Function to fetch and cache JSON
async function loadJatakaData() {
    if (!jatakaData) {
        const res = await axios.get(JATAKA_JSON_URL);
        jatakaData = res.data;
    }
    return jatakaData;
}

// Command handler
cmd({
    pattern: "jataka ?(.*)",
    desc: "ඔබට අවශ්‍ය ජාතක කතාව (අංකය අනුව)",
    category: "Buddhism",
    filename: __filename
}, async (conn, m, msg, { input }) => {
    const jatakaNumber = input?.trim();

    if (!jatakaNumber || isNaN(jatakaNumber)) {
        return await conn.sendMessage(msg.from, {
            text: `❗ කරුණාකර ජාතක අංකයක් ඇතුළත් කරන්න.\n\nඋදාහරණයක්:\n*jataka 1*`
        });
    }

    const data = await loadJatakaData();
    const jataka = data[jatakaNumber];

    if (!jataka) {
        return await conn.sendMessage(msg.from, {
            text: `❌ අංක ${jatakaNumber} සඳහා ජාතකයක් හමු නොවීය.`
        });
    }

    const responseText = `📜 *ජාතක කථාව - අංක ${jatakaNumber}*\n\n*🪷 ${jataka.title}*\n\n${jataka.story.substring(0, 4000)}${jataka.story.length > 4000 ? '\n\n...(ඉතුරු කොටස කපලා දැම්මා)' : ''}`;

    await conn.sendMessage(msg.from, {
        text: responseText
    });
});
