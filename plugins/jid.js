/**
 * JID Plugin for WhatsApp Baileys bot
 * Author: ChatGPT
 */

module.exports = function jidPlugin(sock) {
  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg.message) return;

    // get message text
    let text = "";
    if (msg.message.conversation) {
      text = msg.message.conversation;
    } else if (msg.message.extendedTextMessage) {
      text = msg.message.extendedTextMessage.text;
    }

    if (!text) return;

    text = text.trim().toLowerCase();

    // use pattern matching
    const pattern = /^jid$/i;

    if (pattern.test(text)) {
      if (!msg.key.remoteJid.endsWith("@g.us")) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: "🛑 මෙය group එකක් නොවේ."
        });
        return;
      }

      const groupJid = msg.key.remoteJid;

      try {
        const metadata = await sock.groupMetadata(groupJid);

        await sock.sendMessage(groupJid, {
          text: `🟢 *Group JID:* ${groupJid}\n🟢 *Group Name:* ${metadata.subject}`
        });

      } catch (e) {
        console.error("Error getting group metadata", e);
        await sock.sendMessage(groupJid, { text: "😢 Group info ගන්න Error එකක්." });
      }
    }
  });
};
