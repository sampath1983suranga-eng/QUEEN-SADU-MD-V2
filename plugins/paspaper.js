const { cmd, commands } = require('../command'); // ඔබගේ command system එකට අනුව
const axios = require('axios'); // JSON data ලබා ගැනීමට

// ඔබගේ JSON URLs මෙහි සඳහන් කරන්න
const AL_PAPER_DATA_URL = "https://raw.githubusercontent.com/MRDofc/mrd-ai-al-paper/main/json/al-papers.json";
const OL_PAPER_DATA_URL = "https://raw.githubusercontent.com/MRDofc/MRD-AI-paspaper/main/json/ol-papers.json";

// User state කළමනාකරණය සඳහා Map එකක්
// (මෙය plugin එක තුළම පවතී)
const userStates = new Map(); // Stores { state: 'exam_type_selected' | 'subject_select', examType: 'ol' | 'al' }

// ======================================================
// Main Command Handler: `!pp`
// ======================================================
cmd({
    pattern: "pp",
    react: "📚",
    alias: ["pastpaper", "papp"],
    desc: "පසුගිය විභාග ප්‍රශ්න පත්‍ර (Past Papers) ලබා ගන්න.",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, reply, command }) => {
    const senderId = m.sender; // User ගේ JID
    userStates.delete(senderId); // සෑම විටම අලුත් සංවාදයක් ලෙස සලකයි

    try {
        const sections = [
            {
                title: "විභාග වර්ගය තෝරන්න",
                rows: [
                    {
                        title: "සාමාන්‍ය පෙළ (O/L)",
                        description: "සාමාන්‍ය පෙළ විභාග ප්‍රශ්න පත්‍ර ලබා ගන්න",
                        id: "pp_select_exam_ol" // Bot එකට හඳුනාගැනීමට unique ID
                    },
                    {
                        title: "උසස් පෙළ (A/L)",
                        description: "උසස් පෙළ විභාග ප්‍රශ්න පත්‍ර ලබා ගන්න",
                        id: "pp_select_exam_al"
                    }
                ]
            }
        ];

        const listMessage = {
            text: "*පසුගිය ප්‍රශ්න පත්‍ර (Past Papers)*",
            footer: "ඔබට අවශ්‍ය විභාග වර්ගය පහතින් තෝරන්න.",
            title: "විභාග ප්‍රශ්න පත්‍ර - තේරීම",
            buttonText: "මෙහි Click කරන්න", // මෙම බොත්තම ක්ලික් කළ විට ලැයිස්තුව දිස්වේ
            sections: sections
        };

        await conn.sendMessage(from, listMessage, { quoted: mek });
        // userStates.set(senderId, { state: 'exam_type_selected' }); // state එක මෙතන තියාගන්න අවශ්‍ය නැත, මක්නිසාද අපි List Message reply එකම listen කරන නිසා

    } catch (e) {
        console.error("Past Paper Plugin Error (pp command):", e);
        reply(`පසුගිය ප්‍රශ්න පත්‍ර ලබාගැනීමේදී දෝෂයක් සිදුවිය: ${e.message}`);
    }
});

// ======================================================
// Helper Functions (ප්ලගිනය තුළම)
// ======================================================

// අදාළ විභාග වර්ගයේ JSON data ලබා ගන්නා function එක
async function fetchPaperData(examType) {
    let url = '';
    if (examType === 'ol') {
        url = OL_PAPER_DATA_URL;
    } else if (examType === 'al') {
        url = AL_PAPER_DATA_URL;
    } else {
        return null;
    }

    try {
        const response = await axios.get(url);
        // JSON data ඔබගේ GitHub repository හි 'al' හෝ 'ol' key එකක් තුළට දමා නොමැති නිසා,
        // සෘජුවම array එකක් ලෙස ලැබේවි.
        return { [examType]: response.data }; // `{ ol: [...] }` හෝ `{ al: [...] }` ලෙස ආපසු යවමු.
    } catch (error) {
        console.error(`Error fetching ${examType} paper data from ${url}:`, error.message);
        return null;
    }
}

// විෂය ලැයිස්තුවක් List Message එකක් ලෙස යවන function එක
async function sendSubjectList(conn, from, examType) {
    const paperData = await fetchPaperData(examType);
    if (!paperData || !paperData[examType] || paperData[examType].length === 0) {
        return conn.sendMessage(from, { text: `කණගාටුයි, ${examType.toUpperCase()} සඳහා ප්‍රශ්න පත්‍ර සොයා ගැනීමට නොහැකි විය.` });
    }

    const subjects = paperData[examType];
    const subjectSections = [{
        title: `${examType.toUpperCase()} විෂයන් තෝරන්න`,
        rows: subjects.map((subject, index) => ({
            title: subject.Subject, // JSON එකේ "Subject" ලෙස ඇති නිසා
            description: subject.Year ? `වසර: ${subject.Year}` : `ප්‍රශ්න පත්‍රය`, // Year එක තිබේ නම් පෙන්වන්න
            id: `pp_download_${examType}_${index}` // PDF download කිරීමට unique ID
        }))
    }];

    const subjectListMessage = {
        text: `ඔබ *${examType.toUpperCase()}* තෝරා ගත්තා. දැන් ඔබට අවශ්‍ය විෂය පහතින් තෝරන්න.`,
        footer: `ඔබට අවශ්‍ය විෂයය තෝරන්න.`,
        title: `${examType.toUpperCase()} - විෂය තේරීම`,
        buttonText: "විෂයක් තෝරන්න",
        sections: subjectSections
    };

    await conn.sendMessage(from, subjectListMessage);
}


// ======================================================
// List Message Reply Handler (plugin එක තුළම)
// ======================================================

// මේ handler එක, List Message එකක "reply" එකක් ලැබුණු විට ක්‍රියාත්මක වේ.
// ඔබගේ command system එකෙන් message event එක pass කරන ආකාරය අනුව මෙය වෙනස් විය හැක.
// සමහර command systems වලට `cmd` හැර වෙනත් generic message handler එකක් (e.g. `on('message')`) අවශ්‍ය විය හැකිය.
// මම මෙහිදී 'commands' object එකේ 'addHandler' method එකක් ඇතැයි උපකල්පනය කරමි.
// මෙය ක්‍රියාත්මක නොවන්නේ නම්, ඔබගේ bot framework හි `messages.upsert` event listener එක සොයාගෙන එහිදී මෙය ක්‍රියාත්මක කිරීමට සිදුවේ.

commands.addHandler(
    'listResponseMessage', // මෙය List Message response type එකට සවන් දෙයි
    async (conn, mek, m, { from, reply }) => { // m object එකට message details ලැබෙනවා නම්
        // මෙම කොටස ක්‍රියාත්මක වන්නේ List Message එකකින් "reply" එකක් ලැබුණු විට පමණයි.
        // සාමාන්‍ය text messages සඳහා නොවේ.
        if (!mek.message || !mek.message.listResponseMessage) {
            return; // List Message reply එකක් නොවේ නම් ඉවත් වන්න
        }

        const senderId = m.sender;
        const selectedRowId = mek.message.listResponseMessage.singleSelectReply.selectedRowId;
        
        try {
            // --- Step 1: විභාග වර්ගය තෝරා ගැනීමෙන් පසුව ---
            if (selectedRowId === "pp_select_exam_ol") {
                await reply("ඔබ සාමාන්‍ය පෙළ තෝරා ගත්තා.");
                // userStates.set(senderId, { state: 'subject_select', examType: 'ol' }); // state එක මෙතන තියාගන්න අවශ්‍ය නැත, ID එකෙන් කෙලින්ම යන නිසා
                await sendSubjectList(conn, from, 'ol');
            } else if (selectedRowId === "pp_select_exam_al") {
                await reply("ඔබ උසස් පෙළ තෝරා ගත්තා.");
                // userStates.set(senderId, { state: 'subject_select', examType: 'al' });
                await sendSubjectList(conn, from, 'al');
            }
            // --- Step 2: විෂයයක් තෝරා ගැනීමෙන් පසුව (PDF download) ---
            else if (selectedRowId.startsWith('pp_download_')) {
                const parts = selectedRowId.split('_'); // e.g., ["pp", "download", "ol", "subjectIndex"]
                const examType = parts[2];
                const subjectIndex = parseInt(parts[3]);

                const paperData = await fetchPaperData(examType); // අදාළ විභාග වර්ගයේ JSON data ලබා ගන්න
                if (!paperData || !paperData[examType] || paperData[examType].length <= subjectIndex) {
                    return reply("කණගාටුයි, තෝරාගත් ප්‍රශ්න පත්‍රය සොයාගත නොහැක.");
                }

                const selectedSubject = paperData[examType][subjectIndex];

                if (selectedSubject.Link) { // JSON එකේ Link යන key එක ඇති නිසා
                    await conn.sendMessage(from, { document: { url: selectedSubject.Link }, mimetype: 'application/pdf', fileName: `${selectedSubject.Subject}_${examType.toUpperCase()}_PastPaper.pdf` }); // quoted නැතිව යවන්න පුළුවන්
                    await reply(`ඔබ තෝරාගත් *${selectedSubject.Subject}* (${examType.toUpperCase()}) ප්‍රශ්න පත්‍රය පහතින්.`);
                } else {
                    return reply("කණගාටුයි, එම විෂය සඳහා PDF ලිපිනයක් සොයා ගැනීමට නොහැකි විය.");
                }
            } else {
                // නොදන්නා තේරීමක්
                reply("කරුණාකර නිවැරදි විකල්පයක් තෝරන්න.");
            }
        } catch (e) {
            console.error("Past Paper List Reply Handler Error:", e);
            reply(`ක්‍රියාවලිය අසාර්ථක විය: ${e.message}`);
        }
    }
);
