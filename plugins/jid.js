const { cmd } = require('../command')

cmd({
  pattern: "jid",
  desc: "get group jid & name",
  category: "info",
  react: "📌"
}, async (conn, mek, m, { from, isGroup, reply }) => {
    try {
        if (!isGroup) {
            return reply("🚫 මෙය group එකක් නොවේ.");
        }

        const metadata = await conn.groupMetadata(from);
        const groupJid = from;
        const groupName = metadata.subject;

        await conn.sendMessage(from, {
          text: `🟢 *Group JID:* ${groupJid}\n🟢 *Group Name:* ${groupName}`
        }, { quoted: mek });

    } catch (error) {
        console.error(error)
        reply("😢 Group info ගන්න Error එකක්.")
    }
})
