const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Active groups stored in a file
const GROUPS_FILE = path.join(__dirname, '../active_wd_groups.json');
let activeGroups = {};

// Load active groups from file if exists
if (fs.existsSync(GROUPS_FILE)) {
    activeGroups = JSON.parse(fs.readFileSync(GROUPS_FILE));
}

// Facts with images
const knowledgeFacts = [
    {
        text: "උතුරු ඩැකොටා කඳුවැටිය (Mount Rushmore) යනු ඇමරිකාවේ ජනාධිපති විරුවන්ගේ මූර්ති සිතුවමකි.",
        image: "https://upload.wikimedia.org/wikipedia/commons/6/6d/Mount_Rushmore_National_Memorial.jpg"
    },
    {
        text: "නියාගරා දියඇලි ලෝකයේ ප්‍රකටම දියඇලි වලින් එකක් වේ.",
        image: "https://upload.wikimedia.org/wikipedia/commons/1/11/Niagara_Falls_from_Canada_at_sunset.jpg"
    },
    {
        text: "අමසෝනියාව යනු ලෝකයේ විශාලතම වනාන්තරයයි.",
        image: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Amazon_rainforest.jpg"
    },
    {
        text: "ග්‍රහ මාලාවේ විශාලතම කඳු යනු මාර්ස් ග්‍රහයේ Olympus Mons කඳු බවයි.",
        image: "https://upload.wikimedia.org/wikipedia/commons/4/46/Olympus_Mons.jpg"
    },
    {
        text: "අන්ටාර්ක්ටිකාව යනු ලෝකයේ සුදුම හා ශීතම භූමියයි.",
        image: "https://upload.wikimedia.org/wikipedia/commons/5/58/Antarctica_iceberg.jpg"
    },
];

function getRandomKnowledge() {
    return knowledgeFacts[Math.floor(Math.random() * knowledgeFacts.length)];
}

function saveActiveGroups() {
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(activeGroups, null, 2));
}

async function postKnowledge(conn, groupId) {
    const fact = getRandomKnowledge();
    try {
        await conn.sendMessage(groupId, {
            image: { url: fact.image },
            caption: `*🌍 විශ්ව දැනුම!*\n\n${fact.text}\n\n> Powered by QUEEN-SADU-MD & D-XTRO-MD`
        });
    } catch (e) {
        console.error(`Failed to send knowledge fact: ${e.message}`);
    }
}

cmd({
    pattern: "startwd",
    desc: "Activate World Knowledge facts updates",
    isGroup: true,
    react: "🌍",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, participants }) => {
    try {
        if (isGroup) {
            const isAdmin = participants.some(p => p.id === mek.sender && p.admin);
            const isBotOwner = mek.sender === conn.user.jid;

            if (isAdmin || isBotOwner) {
                if (!activeGroups[from]) {
                    activeGroups[from] = true;
                    saveActiveGroups();

                    await conn.sendMessage(from, { text: "🌍 Auto World Knowledge Activated!" });

                    if (!activeGroups['interval']) {
                        activeGroups['interval'] = setInterval(async () => {
                            for (const groupId in activeGroups) {
                                if (activeGroups[groupId] && groupId !== 'interval') {
                                    await postKnowledge(conn, groupId);
                                }
                            }
                        }, 2 * 60 * 60 * 1000); // every 2 hours
                    }
                } else {
                    await conn.sendMessage(from, { text: "✅ World Knowledge updates already activated." });
                }
            } else {
                await conn.sendMessage(from, { text: "🚫 Only group admins or bot owner can use this command." });
            }
        } else {
            await conn.sendMessage(from, { text: "This command can only be used in groups." });
        }
    } catch (e) {
        console.error(`Error in startwd command: ${e.message}`);
        await conn.sendMessage(from, { text: "Failed to activate World Knowledge service." });
    }
});

cmd({
    pattern: "stopwd",
    desc: "Disable World Knowledge updates",
    isGroup: true,
    react: "🛑",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, participants }) => {
    try {
        if (isGroup) {
            const isAdmin = participants.some(p => p.id === mek.sender && p.admin);
            const isBotOwner = mek.sender === conn.user.jid;

            if (isAdmin || isBotOwner) {
                if (activeGroups[from]) {
                    delete activeGroups[from];
                    saveActiveGroups();
                    await conn.sendMessage(from, { text: "🛑 World Knowledge updates disabled in this group." });

                    if (Object.keys(activeGroups).length === 1 && activeGroups['interval']) {
                        clearInterval(activeGroups['interval']);
                        delete activeGroups['interval'];
                    }
                } else {
                    await conn.sendMessage(from, { text: "⚠️ World Knowledge updates not active in this group." });
                }
            } else {
                await conn.sendMessage(from, { text: "🚫 Only group admins or bot owner can use this command." });
            }
        } else {
            await conn.sendMessage(from, { text: "This command can only be used in groups." });
        }
    } catch (e) {
        console.error(`Error in stopwd command: ${e.message}`);
        await conn.sendMessage(from, { text: "Failed to deactivate World Knowledge service." });
    }
});
