const { cmd, commands } = require('../command'); // ඔබගේ command system එකට අනුව
const axios = require('axios'); // JSON data ලබා ගැනීමට

// ඔබගේ JSON URLs මෙහි සඳහන් කරන්න
const AL_PAPER_DATA_URL = "https://raw.githubusercontent.com/MRDofc/mrd-ai-al-paper/main/json/al-papers.json";
const OL_PAPER_DATA_URL = "https://raw.githubusercontent.com/MRDofc/MRD-AI-paspaper/main/json/ol-papers.json";

// User state කළමනාකරණය සඳහා Map එකක්
// (මෙය සරල ක්‍රමයකි, සංකීර්ණ bot වලට Database එකක් භාවිතා කිරීම වඩා හොඳයි)
const userStates = new Map(); // Stores { state: 'exam_type' | 'subject_select', examType: 'ol' | 'al' }

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
        // පළමු මෙනුව - විභාග වර්ගය තෝරා ගැනීම
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
        // User ගේ state එක save කරන්න
        userStates.set(senderId, { state: 'exam_type_selected' }); 

    } catch (e) {
        console.error("Past Paper Plugin Error:", e);
        reply(`පසුගිය ප්‍රශ්න පත්‍ර ලබාගැනීමේදී දෝෂයක් සිදුවිය: ${e.message}`);
    }
});

// ======================================================
// List Message තේරීම් හසුරුවන Event Handler
// (මෙය ඔබගේ ප්‍රධාන bot file - e.g., `sadi.js` හෝ `index.js` - හි තිබිය යුතුයි)
// ======================================================

// මෙය `commands` object එකේ කොටසක් නොවේ.
// මෙය WhatsApp bot framework එකේ `messages.upsert` event එක listen කරන ආකාරයට සකස් කළ යුතුය.
// ඔබගේ bot library එක අනුව මෙය වෙනස් විය හැක.
// උදාහරණයක් ලෙස: `conn.ev.on('messages.upsert', async chatUpdate => { ... });`

/*
    පහත code කොටස copy කර ඔබගේ ප්‍රධාන bot file එකේ (ඔබ `conn` object එක define කර ඇති තැනට ආසන්නව) paste කරන්න.
    සටහන: ඔබගේ bot library එක `mek.message.listResponseMessage` වැනි දේට support කරනවාද යන්න පරීක්ෂා කරන්න.
*/

// const userStates = new Map(); // මෙම map එක ගෝලීයව define කර ඇත්දැයි තහවුරු කරන්න

commands.addHandler(
    'listResponseMessage', // List message තේරීමක් ලැබුණු විට trigger වීමට
    async (conn, mek, m, { from, reply }) => {
        const senderId = m.sender;
        const selectedRowId = mek.message.listResponseMessage.singleSelectReply.selectedRowId;
        const userState = userStates.get(senderId);

        try {
            // --- Step 1: විභාග වර්ගය තෝරා ගැනීමෙන් පසුව ---
            if (selectedRowId === "pp_select_exam_ol") {
                await reply("ඔබ සාමාන්‍ය පෙළ තෝරා ගත්තා.");
                userStates.set(senderId, { state: 'subject_select', examType: 'ol' });
                await sendSubjectList(conn, from, 'ol');
            } else if (selectedRowId === "pp_select_exam_al") {
                await reply("ඔබ උසස් පෙළ තෝරා ගත්තා.");
                userStates.set(senderId, { state: 'subject_select', examType: 'al' });
                await sendSubjectList(conn, from, 'al');
            }
            // --- Step 2: විෂයයක් තෝරා ගැනීමෙන් පසුව (PDF download) ---
            else if (selectedRowId.startsWith('pp_download_')) {
                const parts = selectedRowId.split('_'); // e.g., ["pp", "download", "ol", "subjectIndex"]
                const examType = parts[2];
                const subjectIndex = parseInt(parts[3]);

                const paperData = await fetchPaperData(examType); // අදාළ විභාග වර්ගයේ JSON data ලබා ගන්න
                if (!paperData || !paperData[examType] || paperData[examType].length <= subjectIndex) {
                    userStates.delete(senderId);
                    return reply("කණගාටුයි, තෝරාගත් ප්‍රශ්න පත්‍රය සොයාගත නොහැක.");
                }

                const selectedSubject = paperData[examType][subjectIndex];

                if (selectedSubject.pdfUrl) {
                    await conn.sendMessage(from, { document: { url: selectedSubject.pdfUrl }, mimetype: 'application/pdf', fileName: `${selectedSubject.name}_${examType.toUpperCase()}_PastPaper.pdf` }, { quoted: mek });
                    await reply(`ඔබ තෝරාගත් *${selectedSubject.name}* (${examType.toUpperCase()}) ප්‍රශ්න පත්‍රය පහතින්.`);
                    userStates.delete(senderId); // සංවාදය අවසන්, state reset කරන්න
                } else {
                    userStates.delete(senderId);
                    return reply("කණගාටුයි, එම විෂය සඳහා PDF ලිපිනයක් සොයා ගැනීමට නොහැකි විය.");
                }
            } else {
                // නොදන්නා තේරීමක්
                reply("කරුණාකර නිවැරදි විකල්පයක් තෝරන්න.");
                userStates.delete(senderId); // reset state
            }
        } catch (e) {
            console.error("List Message Handler Error:", e);
            userStates.delete(senderId); // reset state on error
            reply(`ක්‍රියාවලිය අසාර්ථක විය: ${e.message}`);
        }
    }
);


// ======================================================
// Helper Functions
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
        // එබැවින්, response.data යනු කෙලින්ම array එකක් බවට උපකල්පනය කරමු.
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
