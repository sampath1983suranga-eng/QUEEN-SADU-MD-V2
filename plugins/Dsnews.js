const config = require('../config')
const { cmd } = require('../command')
const axios = require('axios')
const { fetchJson } = require('../lib/functions')

const apilink = 'https://nethu-api.vercel.app/news'
let wm = 'POWERED BY MRD AI' // << මෙතන වෙනස් කර ඇත
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

async function checkAndSendNews(conn, from, isGroup) { // isOwner argument එක ඉවත් කර ඇත
    try {
        if (!isGroup) return;
        // isOwner / isAdmin check එක මෙතනින් සම්පූර්ණයෙන්ම ඉවත් කර ඇත

        for (const site of newsSites) {
            const news = await fetchJson(site.url)
            if (!news || !news.result || !news.result.title) continue

            const newTitle = news.result.title
            if (latestNews[site.name] === newTitle) continue 

            latestNews[site.name] = newTitle 

            const msg = `*🚨 ${news.result.title} (${site.name})*\n\n*${news.result.date}*\n\n${news.result.desc}\n\n${news.result.link || news.result.url}\n\n${wm}`

            await conn.sendMessage(from, { image: { url: news.result.image || news.result.img || '' }, caption: msg })

            if (alertEnabled) {
                // Admin alert functionality එකට තවමත් group admins අවශ්‍යයි.
                // Bot එක group admin නොවේ නම් මෙය වැඩ කරන්නේ නැත.
                // ඔබට මෙයත් ඉවත් කිරීමට අවශ්‍ය නම්, groupMetadata සහ admins ලබා ගන්නා කොටස ඉවත් කළ යුතුය.
                // දැනට, bot එක admin නොවේ නම් මෙය error එකක් නොදී pass වනු ඇත.
                try {
                    const groupMetadata = await conn.groupMetadata(from)
                    const admins = groupMetadata.participants.filter(p => p.admin !== null).map(a => `@${a.id.split('@')[0]}`)
                    const alertMsg = `🚨 *BREAKING NEWS!* 🚨\n\n${msg}\n\n${admins.join(' ')}`
                    await conn.sendMessage(from, { text: alertMsg, mentions: admins })
                } catch (adminError) {
                    console.warn("[PP Plugin] Alert could not be sent (Bot might not be admin or groupMetadata error):", adminError.message);
                }
            }
        }
    } catch (e) {
        console.log(e)
    }
}

// .newson Command (Enable Auto News)
cmd({
    pattern: "newson",
    alias: ["autonews"],
    react: "🟢",
    desc: "Enable auto news sending",
    category: "news",
    use: '.newson',
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => { // isOwner, isAdmin arguments ඉවත් කර ඇත
    if (!isGroup) return reply("❌ *This command can only be used in Groups!*")
    // isOwner / isAdmin check එක මෙතනින් සම්පූර්ණයෙන්ම ඉවත් කර ඇත

    if (newsInterval) return reply("✅ *Auto News already enabled!*")

    reply("✅ *Auto News enabled.*")
    newsInterval = setInterval(() => {
        checkAndSendNews(conn, from, isGroup) // isOwner argument එක ඉවත් කර ඇත
    }, 2 * 60 * 1000)
})

// .newsoff Command (Disable Auto News)
cmd({
    pattern: "newsoff",
    alias: ["stopnews"],
    react: "🔴",
    desc: "Disable auto news sending",
    category: "news",
    use: '.newsoff',
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => { // isOwner, isAdmin arguments ඉවත් කර ඇත
    if (!isGroup) return reply("❌ *This command can only be used in Groups!*")
    // isOwner / isAdmin check එක මෙතනින් සම්පූර්ණයෙන්ම ඉවත් කර ඇත

    if (newsInterval) {
        clearInterval(newsInterval)
        newsInterval = null
    }
    reply("🛑 *Auto News disabled!*")
})

// .alerton Command (Enable Breaking News Alerts)
cmd({
    pattern: "alerton",
    alias: ["newsalerton"],
    react: "🚨",
    desc: "Enable Breaking News Alerts",
    category: "news",
    use: '.alerton',
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => { // isOwner, isAdmin arguments ඉවත් කර ඇත
    if (!isGroup) return reply("❌ *This command can only be used in Groups!*")
    // isOwner / isAdmin check එක මෙතනින් සම්පූර්ණයෙන්ම ඉවත් කර ඇත

    alertEnabled = true
    reply("✅ *Breaking News Alerts enabled.*")
})

// .alertoff Command (Disable Breaking News Alerts)
cmd({
    pattern: "alertoff",
    alias: ["newsalertoff"],
    react: "❌",
    desc: "Disable Breaking News Alerts",
    category: "news",
    use: '.alertoff',
    filename: __filename
}, async (conn, mek, m, { from, isGroup, reply }) => { // isOwner, isAdmin arguments ඉවත් කර ඇත
    if (!isGroup) return reply("❌ *This command can only be used in Groups or Channels!*")
    // isOwner / isAdmin check එක මෙතනින් සම්පූර්ණයෙන්ම ඉවත් කර ඇත

    alertEnabled = false
    reply("🛑 *Breaking News Alerts disabled!*")
})
