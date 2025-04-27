const { cmd } = require('../command');
const axios = require('axios');  // API requests සඳහා
const config = require('../config');

let activeGroups = {};
let lastNewsTitles = {};

// Nature Images
const natureImages = [
    "https://images.unsplash.com/photo-1506748686213-8f06de1977bc",
    "https://images.unsplash.com/photo-1501600679172-419ab5d125b3",
    "https://images.unsplash.com/photo-1505639246480-bc63e42b23a4",
    "https://images.unsplash.com/photo-1532386934691-81229263d933"
];

// API Call for English facts
async function getRandomFact() {
    try {
        const response = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
        return response.data.text;
    } catch (err) {
        console.error(`Error fetching fact: ${err.message}`);
        return null;
    }
}

// Translate English fact to Sinhala using LibreTranslate API
async function translateToSinhala(text) {
    try {
        const response = await axios.post('https://translate.argosopentech.com/translate', {
            q: text,
            source: 'en',
            target: 'si',
            format: 'text'
        });
        return response.data.translatedText;
    } catch (err) {
        console.error(`Error translating fact: ${err.message}`);
        return text;  // Return original text in case of error
    }
}

async function sendFact(conn, groupId) {
    const fact = await getRandomFact();
    if (!fact) return;

    const translatedFact = await translateToSinhala(fact);
    const randomImage = natureImages[Math.floor(Math.random() * natureImages.length)];

    const caption = `🔵 *දැනුමක්* 🌍\n\n${translatedFact}\n\n> *Powered by Mr. Dinesh*`;

    try {
        await conn.sendMessage(groupId, {
            image: { url: randomImage },
            caption: caption,
            mimetype: "image/jpeg"
        });
    } catch (err) {
        console.error(`Failed to send fact with image: ${err.message}`);
    }
}

cmd({
    pattern: "startwd",
    desc: "Enable world/nature knowledge updates in this group",
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

                    await conn.sendMessage(from, { text: "🌍 Auto World/Nature Knowledge Updates Activated.\n\n> Powered by Mr. Dinesh" });

                    if (!activeGroups['interval']) {
                        activeGroups['interval'] = setInterval(async () => {
                            for (const groupId in activeGroups) {
                                if (activeGroups[groupId] && groupId !== 'interval') {
                                    await sendFact(conn, groupId);
                                }
                            }
                        }, 3600000); // Send every 1 hour
                    }
                } else {
                    await conn.sendMessage(from, { text: "*✅ World/Nature Knowledge Updates Already Activated.*\n\n> Powered by Mr. Dinesh" });
                }
            } else {
                await conn.sendMessage(from, { text: "🚫 Only group admins or bot owner can use this command." });
            }
        } else {
            await conn.sendMessage(from, { text: "This command can only be used in groups." });
        }
    } catch (e) {
        console.error(`Error in startwd command: ${e.message}`);
        await conn.sendMessage(from, { text: "Failed to activate knowledge service." });
    }
});

cmd({
    pattern: "stopwd",
    desc: "Disable world/nature knowledge updates in this group",
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
                    await conn.sendMessage(from, { text: "*🛑 Knowledge updates disabled in this group*" });

                    if (Object.keys(activeGroups).length === 1 && activeGroups['interval']) {
                        clearInterval(activeGroups['interval']);
                        delete activeGroups['interval'];
                    }
                } else {
                    await conn.sendMessage(from, { text: "⚠️ Knowledge updates not active in this group." });
                }
            } else {
                await conn.sendMessage(from, { text: "🚫 Only group admins or bot owner can use this command." });
            }
        } else {
            await conn.sendMessage(from, { text: "This command can only be used in groups." });
        }
    } catch (e) {
        console.error(`Error in stopwd command: ${e.message}`);
        await conn.sendMessage(from, { text: "Failed to deactivate knowledge service." });
    }
});
