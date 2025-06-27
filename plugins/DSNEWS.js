const { cmd } = require('../command');
const Hiru = require('hirunews-scrap');
const Esana = require('@sl-code-lords/esana-news');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const groupsFile = path.join(__dirname, 'activeGroups.json');

let activeGroups = {};
let lastNewsTitles = {};
let intervalId = null;

// Load active groups from file on startup
function loadActiveGroups() {
  try {
    if (fs.existsSync(groupsFile)) {
      const data = fs.readFileSync(groupsFile, 'utf-8');
      activeGroups = JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to load active groups:", e);
  }
}

// Save active groups to file
function saveActiveGroups() {
  try {
    fs.writeFileSync(groupsFile, JSON.stringify(activeGroups, null, 2));
  } catch (e) {
    console.error("Failed to save active groups:", e);
  }
}

const gifStyleVideos = [
  "https://files.catbox.moe/405y67.mp4",
  "https://files.catbox.moe/eslg4p.mp4"
];

function getRandomGifVideo() {
  return gifStyleVideos[Math.floor(Math.random() * gifStyleVideos.length)];
}

async function getLatestNews() {
  let newsData = [];

  try {
    const hiruApi = new Hiru();
    const hiruNews = await hiruApi.BreakingNews();
    newsData.push({
      title: hiruNews.results.title,
      content: hiruNews.results.news,
      date: hiruNews.results.date
    });
  } catch (err) {
    console.error(`Error fetching Hiru News: ${err.message}`);
  }

  try {
    const esanaApi = new Esana();
    const esanaNews = await esanaApi.getLatestNews();
    if (esanaNews?.title && esanaNews?.description && esanaNews?.publishedAt) {
      newsData.push({
        title: esanaNews.title,
        content: esanaNews.description,
        date: esanaNews.publishedAt
      });
    }
  } catch (err) {
    console.error(`Error fetching Esana News: ${err.message}`);
  }

  return newsData;
}

async function checkAndPostNews(conn, groupId) {
  const latestNews = await getLatestNews();

  for (const newsItem of latestNews) {
    if (!lastNewsTitles[groupId]) lastNewsTitles[groupId] = [];

    if (!lastNewsTitles[groupId].includes(newsItem.title)) {
      const gifVideo = getRandomGifVideo();
      const caption = `*🔵 𝐍𝐄𝐖𝐒 𝐀𝐋𝐄𝐑𝐓!*\n\n📰 *${newsItem.title}*\n\n${newsItem.content}\n\n${newsItem.date}\n\n> *©ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍʀ ᴅɪɴᴇꜱʜ ᴏꜰᴄ*`;

      try {
        await conn.sendMessage(groupId, {
          video: { url: gifVideo },
          caption,
          mimetype: "video/mp4",
          gifPlayback: true
        });

        lastNewsTitles[groupId].push(newsItem.title);
        if (lastNewsTitles[groupId].length > 100) lastNewsTitles[groupId].shift();

      } catch (e) {
        console.error(`Failed to send video message: ${e.message}`);
      }
    }
  }
}

// Start interval to send news to all active groups every 10 minutes
function startNewsInterval(conn) {
  if (intervalId) return; // already running

  intervalId = setInterval(async () => {
    for (const groupId in activeGroups) {
      if (activeGroups[groupId]) {
        await checkAndPostNews(conn, groupId);
      }
    }
  }, 10 * 60 * 1000); // 10 minutes
}

// Stop news interval
function stopNewsInterval() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

// Load active groups on startup
loadActiveGroups();

cmd({
  pattern: "startnews",
  desc: "Enable Sri Lankan news updates in this group",
  isGroup: true,
  react: "📰",
  filename: __filename
}, async (conn, mek, m, { from, isGroup, participants, reply }) => {
  try {
    if (!isGroup) return reply("This command can only be used in groups.");

    const isAdmin = participants.some(p => p.id === mek.sender && p.admin);
    const isBotOwner = mek.sender === conn.user.jid;

    if (!isAdmin && !isBotOwner) {
      return reply("🚫 Only group admins or bot owner can use this command.");
    }

    if (!activeGroups[from]) {
      activeGroups[from] = true;
      saveActiveGroups();

      await conn.sendMessage(from, { text: "🇱🇰 Auto 24/7 News Activated.\n\n> QUEEN-SADU-MD & D-XTRO-MD" });

      startNewsInterval(conn);
    } else {
      await conn.sendMessage(from, { text: "*✅ 24/7 News Already Activated.*\n\n> QUEEN-SADU-MD & D-XTRO-MD" });
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
}, async (conn, mek, m, { from, isGroup, participants, reply }) => {
  try {
    if (!isGroup) return reply("This command can only be used in groups.");

    const isAdmin = participants.some(p => p.id === mek.sender && p.admin);
    const isBotOwner = mek.sender === conn.user.jid;

    if (!isAdmin && !isBotOwner) {
      return reply("🚫 Only group admins or bot owner can use this command.");
    }

    if (activeGroups[from]) {
      delete activeGroups[from];
      saveActiveGroups();

      await conn.sendMessage(from, { text: "*🛑 News updates disabled in this group*" });

      // Stop interval if no active groups
      if (Object.keys(activeGroups).length === 0) {
        stopNewsInterval();
      }
    } else {
      await conn.sendMessage(from, { text: "⚠️ News updates not active in this group." });
    }
  } catch (e) {
    console.error(`Error in stopnews command: ${e.message}`);
    await conn.sendMessage(from, { text: "Failed to deactivate news service." });
  }
});
