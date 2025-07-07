const config = require('../config')
const { cmd } = require('../command')
const { fetchJson } = require('../lib/functions')

const apilink = 'https://nethu-api.vercel.app/news'
let wm = 'POWERED BY MRD AI'
let latestNews = {}
let newsInterval = null
let alertEnabled = false

const newsSites = [
    { name: "Hiru", url: `${apilink}/hiru` },
    { name: "Derana", url: `${apilink}/derana` },
    { name: "BBC", url: `${apilink}/bbc` },
    { name: "Lankadeepa", url: `${apilink}/lankadeepa` },
    { name: "ITN", url: `${apilink}/itn` },
    { name: "Siyatha", url: `${apilink}/siyatha` },
    { name: "Neth News", url: `${apilink}/nethnews` },
    { name: "LNW", url: `${apilink}/lnw` },
    { name: "Dasatha Lanka", url: `${apilink}/dasathalankanews` },
    { name: "Gossip Lanka", url: `${apilink}/gossiplankanews` }
]

async function checkAndSendNews(conn, from) {
    try {
        const isGroup = from.endsWith('@g.us')
        if (!isGroup) return;

        for (const site of newsSites) {
            const news = await fetchJson(site.url)
            if (!news || !news.result || !news.result.title) continue

            const newTitle = news.result.title
            if (latestNews[site.name] === newTitle) continue

            latestNews[site.name] = newTitle

            const msg = `*🚨 ${news.result.title} (${site.name})*\n\n*${news.result.date}*\n\n${news.result.desc}\n\n${news.result.link || news.result.url}\n\n${wm}`

            await conn.sendMessage(from, { image: { url: news.result.image || news.result.img || '' }, caption: msg })

            if (alertEnabled) {
                try {
                    const groupMetadata = await conn.groupMetadata(from)
                    const admins = groupMetadata.participants
                        .filter(p => (p.admin && p.admin !== null) || p.isAdmin)
                        .map(a => `@${a.id.split('@')[0]}`)
                    const alertMsg = `🚨 *BREAKING NEWS!* 🚨\n\n${msg}\n\n${admins.join(' ')}`
                    await conn.sendMessage(from, { text: alertMsg, mentions: admins })
                } catch (adminError) {
                    console.warn("[News Plugin] Alert failed (maybe bot not admin or groupMetadata issue):", adminError.message)
                }
            }
        }
    } catch (err) {
        console.error("[News Plugin] Error:", err)
    }
}

// Enable auto news
cmd({
    pattern: "newson",
    alias: ["autonews"],
    react: "🟢",
    desc: "Enable auto news sending",
    category: "news",
    use: '.newson',
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ *This command can only be used in Groups!*")

    if (newsInterval) return reply("✅ *Auto News already enabled!*")

    reply("✅ *Auto News enabled.*")
    newsInterval = setInterval(() => {
        checkAndSendNews(conn, from)
    }, 2 * 60 * 1000)
})

// Disable auto news
cmd({
    pattern: "newsoff",
    alias: ["stopnews"],
    react: "🔴",
    desc: "Disable auto news sending",
    category: "news",
    use: '.newsoff',
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ *This command can only be used in Groups!*")

    if (newsInterval) {
        clearInterval(newsInterval)
        newsInterval = null
    }
    reply("🛑 *Auto News disabled!*")
})

// Enable alerts
cmd({
    pattern: "alerton",
    alias: ["newsalerton"],
    react: "🚨",
    desc: "Enable Breaking News Alerts",
    category: "news",
    use: '.alerton',
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ *This command can only be used in Groups!*")
    alertEnabled = true
    reply("✅ *Breaking News Alerts enabled.*")
})

// Disable alerts
cmd({
    pattern: "alertoff",
    alias: ["newsalertoff"],
    react: "❌",
    desc: "Disable Breaking News Alerts",
    category: "news",
    use: '.alertoff',
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => {
    if (!isGroup) return reply("❌ *This command can only be used in Groups!*")
    alertEnabled = false
    reply("🛑 *Breaking News Alerts disabled.*")
})
