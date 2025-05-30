const { cmd } = require('../command');
const Esana = require('@sl-code-lords/esana-news'); // WORKING Sinhala news NPM
let activeGroups = {};
let lastNewsTitle = {};

async function fetchNews() {
    try {
        const esana = new Esana();
        const news = await esana.getLatestNews();
        return {
            title: news.title,
            description: news.description,
            time: news.publishedAt
        };
    } catch (e) {
        console.error('Error fetching Esana News:', e.message);
        return null;
    }
}

async function checkAndSend(conn, groupId) {
    const news = await fetchNews();
    if (!news) return;

    if (lastNewsTitle[groupId] !== news.title) {
        lastNewsTitle[groupId] = news.title;

        await conn.sendMessage(groupId, {
            text: `*📰 NEWS UPDATE!*\n\n*${news.title}*\n\n${news.description}\n\n🕒 ${news.time}\n\n> *© Powered by Esana News*\n> *QUEEN-SADU-MD BOT*`
        });
    }
}

cmd({
    pattern: 'startnews',
    desc: 'Activate Sinhala news auto-sender',
    isGroup: true,
    react: '📰',
    filename: __filename
}, async (conn, m, msg, { from, isGroup, participants }) => {
    if (!isGroup) return await conn.sendMessage(from, { text: '🛑 Group command only!' });

    const isAdmin = participants.some(p => p.id === m.sender && p.admin);
    if (!isAdmin) return await conn.sendMessage(from, { text: '🚫 Only group admins can use this!' });

    if (activeGroups[from]) {
        return await conn.sendMessage(from, { text: '✅ News updates already activated in this group.' });
    }

    activeGroups[from] = true;
    await conn.sendMessage(from, { text: '📰 Sinhala news updates activated!\n\n> Source: Esana News' });

    if (!activeGroups['interval']) {
        activeGroups['interval'] = setInterval(async () => {
            for (const groupId of Object.keys(activeGroups)) {
                if (groupId !== 'interval') await checkAndSend(conn, groupId);
            }
        }, 60000); // Every 1 minute
    }
});

cmd({
    pattern: 'stopnews',
    desc: 'Stop Sinhala news auto-sender',
    isGroup: true,
    react: '🛑',
    filename: __filename
}, async (conn, m, msg, { from, isGroup, participants }) => {
    if (!isGroup) return await conn.sendMessage(from, { text: '🛑 Group command only!' });

    const isAdmin = participants.some(p => p.id === m.sender && p.admin);
    if (!isAdmin) return await conn.sendMessage(from, { text: '🚫 Only group admins can use this!' });

    if (!activeGroups[from]) {
        return await conn.sendMessage(from, { text: 'ℹ️ News updates are not active in this group.' });
    }

    delete activeGroups[from];
    await conn.sendMessage(from, { text: '🛑 Sinhala news updates stopped for this group.' });

    if (Object.keys(activeGroups).length === 1 && activeGroups['interval']) {
        clearInterval(activeGroups['interval']);
        delete activeGroups['interval'];
    }
});
