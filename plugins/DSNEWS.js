const { cmd } = require('../command');
const Hiru = require('hirunews-scrap');
const Esana = require('@sl-code-lords/esana-news');
const config = require('../config');
const axios = require('axios'); // <-- Add axios for making HTTP requests to your proxy

// Heroku Proxy URL for Lankadeepa News (Replace with your actual URL if it's different)
const LANKADEEPA_NEWS_PROXY_URL = 'https://newsapimd-bd11ea123e8f.herokuapp.com/api/lankadeepa-news'; 

let activeGroups = {};
let lastNewsTitles = {};

// MP4 short looping videos with gif effect
const gifStyleVideos = [
    "https://files.catbox.moe/405y67.mp4",
    "https://files.catbox.moe/eslg4p.mp4"
];

function getRandomGifVideo() {
    return gifStyleVideos[Math.floor(Math.random() * gifStyleVideos.length)];
}

async function getLatestNews() {
    let newsData = [];

    // --- Hiru News (Existing) ---
    try {
        const hiruApi = new Hiru();
        const hiruNews = await hiruApi.BreakingNews();
        if (hiruNews?.results?.title && hiruNews?.results?.news && hiruNews?.results?.date) {
            newsData.push({
                source: "Hiru News",
                title: hiruNews.results.title,
                content: hiruNews.results.news,
                date: hiruNews.results.date
            });
        }
    } catch (err) {
        console.error(`Error fetching Hiru News: ${err.message}`);
    }

    // --- Esana News (Existing) ---
    try {
        const esanaApi = new Esana();
        const esanaNews = await esanaApi.getLatestNews();
        if (esanaNews?.title && esanaNews?.description && esanaNews?.publishedAt) {
            newsData.push({
                source: "Esana News",
                title: esanaNews.title,
                content: esanaNews.description,
                date: esanaNews.publishedAt
            });
        }
    } catch (err) {
        console.error(`Error fetching Esana News: ${err.message}`);
    }

    // --- Lankadeepa News (NEW - Using your Heroku Proxy) ---
    try {
        const lankadeepaResponse = await axios.get(LANKADEEPA_NEWS_PROXY_URL);
        if (lankadeepaResponse.data && lankadeepaResponse.data.articles && lankadeepaResponse.data.articles.length > 0) {
            // Get the first article or iterate through multiple
            const latestLankadeepa = lankadeepaResponse.data.articles[0]; 
            newsData.push({
                source: "Lankadeepa News",
                title: latestLankadeepa.title,
                content: latestLankadeepa.description || latestLankadeepa.title, // Use description if available, otherwise title
                date: "N/A" // Lankadeepa scraper might not provide date easily, update if needed
            });
        } else {
            console.log("No Lankadeepa news found or scraping failed via proxy.");
        }
    } catch (err) {
        console.error(`Error fetching Lankadeepa News from proxy: ${err.message}`);
        if (err.response) {
            console.error(`Lankadeepa Proxy Response Error: ${JSON.stringify(err.response.data)}`);
        }
    }

    return newsData;
}

async function checkAndPostNews(conn, groupId) {
    const latestNews = await getLatestNews();

    for (const newsItem of latestNews) { // Use for...of loop for async operations inside
        if (!lastNewsTitles[groupId]) lastNewsTitles[groupId] = [];

        // Create a unique identifier for the news item (title + source)
        const newsIdentifier = `${newsItem.source}: ${newsItem.title}`;

        if (!lastNewsTitles[groupId].includes(newsIdentifier)) {
            const gifVideo = getRandomGifVideo();
            // Customize caption to include source
            const caption = `*🔵 𝐍𝐄𝐖𝐒 𝐀𝐋𝐄𝐑𝐓!*\n  ▂ ▄ ▅ ▆ ▇ █ [  ] █ ▇ ▆ ▅ ▄ ▂  \n\n📰 *${newsItem.title}*\n\n${newsItem.content}\n\n${newsItem.date}\n\n> *©ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍʀ ᴅɪɴᴇꜱʜ ᴏꜰᴄ*\n> *QUEEN-SADU-MD & D-XTRO-MD*`;

            try {
                await conn.sendMessage(groupId, {
                    video: { url: gifVideo },
                    caption,
                    mimetype: "video/mp4",
                    gifPlayback: true
                });

                lastNewsTitles[groupId].push(newsIdentifier); // Store unique identifier
                // Keep the array size manageable
                if (lastNewsTitles[groupId].length > 100) {
                    lastNewsTitles[groupId].shift();
                }

            } catch (e) {
                console.error(`Failed to send video message for ${newsItem.source} - ${newsItem.title}: ${e.message}`);
            }
        }
    }
}

cmd({
    pattern: "startnews",
    desc: "Enable Sri Lankan news updates in this group",
    isGroup: true,
    react: "📰",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, participants }) => {
    try {
        if (isGroup) {
            const isAdmin = participants.some(p => p.id === mek.sender && p.admin);
            const isBotOwner = mek.sender === conn.user.jid;

            if (isAdmin || isBotOwner) {
                if (!activeGroups[from]) {
                    activeGroups[from] = true;

                    await conn.sendMessage(from, { text: "🇱🇰 Auto 24/7 News Activated.\n\n> QUEEN-SADU-MD & D-XTRO-MD" });

                    // Ensure interval runs only once globally
                    if (!activeGroups['intervalId']) { // Changed 'interval' to 'intervalId' to avoid key collision
                        activeGroups['intervalId'] = setInterval(async () => {
                            for (const groupId in activeGroups) {
                                if (activeGroups[groupId] && groupId !== 'intervalId') { // Check for 'intervalId'
                                    await checkAndPostNews(conn, groupId);
                                }
                            }
                        }, 60000); // Check every 1 minute
                    }
                } else {
                    await conn.sendMessage(from, { text: "*✅ 24/7 News Already Activated.*\n\n> QUEEN-SADU-MD & D-XTRO-MD" });
                }
            } else {
                await conn.sendMessage(from, { text: "🚫 Only group admins or bot owner can use this command." });
            }
        } else {
            await conn.sendMessage(from, { text: "This command can only be used in groups." });
        }
    } catch (e) {
        console.error(`Error in startnews command: ${e.message}`);
        await conn.sendMessage(from, { text: "Failed to activate news service." });
    }
});

cmd({
    pattern: "stopnews",
    desc: "Disable Sri Lankan news updates in this group",
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
                    await conn.sendMessage(from, { text: "*🛑 News updates disabled in this group*" });

                    // Clear the interval only if no other groups are active
                    // Check if 'intervalId' exists and no other groups are active (excluding 'intervalId' itself)
                    if (activeGroups['intervalId'] && Object.keys(activeGroups).filter(key => key !== 'intervalId').length === 0) {
                        clearInterval(activeGroups['intervalId']);
                        delete activeGroups['intervalId'];
                    }
                } else {
                    await conn.sendMessage(from, { text: "⚠️ News updates not active in this group." });
                }
            } else {
                await conn.sendMessage(from, { text: "🚫 Only group admins or bot owner can use this command." });
            }
        } else {
            await conn.sendMessage(from, { text: "This command can only be used in groups." });
        }
    } catch (e) {
        console.error(`Error in stopnews command: ${e.message}`);
        await conn.sendMessage(from, { text: "Failed to deactivate news service." });
    }
});
