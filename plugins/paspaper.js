// plugins/pp.js (Text-Based Interaction)
const { cmd } = require('../command'); // ඔබගේ command system එකට අනුව
const axios = require('axios'); // JSON data ලබා ගැනීමට

// ඔබගේ JSON URLs මෙහි සඳහන් කරන්න
const AL_PAPER_DATA_URL = "https://raw.githubusercontent.com/MRDofc/mrd-ai-al-paper/main/json/al-papers.json";
const OL_PAPER_DATA_URL = "https://raw.githubusercontent.com/MRDofc/MRD-AI-paspaper/main/json/ol-papers.json";

// User state කළමනාකරණය සඳහා Map එකක්
// key: senderId (JID), value: { state: 'exam_type_selected' | 'subject_select', examType: 'ol' | 'al', subjects: [...] }
const userInteractionStates = new Map();

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
async (conn, mek, m, { from, reply, command, body }) => {
    const senderId = m.sender; // User ගේ JID
    const text = body.toLowerCase().trim(); // user විසින් එවන ලද සම්පූර්ණ message එක

    try {
        const userState = userInteractionStates.get(senderId);

        // --- 1. Initial command: `!pp` ---
        if (text === command) { // 'pp' command එක මුලින්ම දුන්නම
            let menu = "*පසුගිය ප්‍රශ්න පත්‍ර (Past Papers) - විභාග වර්ගය තෝරන්න:*\n\n";
            menu += "1. සාමාන්‍ය පෙළ (O/L)\n";
            menu += "2. උසස් පෙළ (A/L)\n\n";
            menu += "ඔබට අවශ්‍ය අංකය ටයිප් කරන්න. (උදා: `1` හෝ `2`)";
            userInteractionStates.set(senderId, { state: 'awaiting_exam_type' }); // user ගේ state එක save කරන්න
            return reply(menu);
        }

        // --- 2. Awaiting Exam Type Selection ---
        if (userState && userState.state === 'awaiting_exam_type') {
            let selectedType = '';
            if (text === '1' || text.includes('සාමාන්‍ය පෙළ') || text.includes('ol')) {
                selectedType = 'ol';
                await reply("ඔබ සාමාන්‍ය පෙළ තෝරා ගත්තා.");
            } else if (text === '2' || text.includes('උසස් පෙළ') || text.includes('al')) {
                selectedType = 'al';
                await reply("ඔබ උසස් පෙළ තෝරා ගත්තා.");
            } else {
                return reply("කරුණාකර නිවැරදි අංකයක් (1 හෝ 2) ටයිප් කරන්න. නැතහොත් `!pp` යොදා නැවත අරඹන්න.");
            }

            const paperData = await fetchPaperData(selectedType); // තෝරාගත් වර්ගයේ JSON data ලබා ගන්න
            const subjects = paperData ? paperData[selectedType] : []; // subjects array එක

            if (!subjects || subjects.length === 0) {
                userInteractionStates.delete(senderId); // Reset state
                return reply(`කණගාටුයි, ${selectedType.toUpperCase()} සඳහා ප්‍රශ්න පත්‍ර සොයා ගැනීමට නොහැකි විය.`);
            }

            let subjectMenu = `*${selectedType.toUpperCase()} විෂයන් තෝරන්න:*\n\n`;
            subjects.forEach((subject, index) => {
                subjectMenu += `${index + 1}. ${subject.Subject} (${subject.Year || 'වසරක් නැත'})\n`;
            });
            subjectMenu += `\nඔබට අවශ්‍ය විෂයයේ අංකය ටයිප් කරන්න. (උදා: \`1\`)`;
            userInteractionStates.set(senderId, { state: 'awaiting_subject_selection', examType: selectedType, subjects: subjects }); // state update කරන්න
            return reply(subjectMenu);
        }

        // --- 3. Awaiting Subject Selection & PDF Download ---
        if (userState && userState.state === 'awaiting_subject_selection' && userState.examType && userState.subjects) {
            const subjectIndex = parseInt(text) - 1; // User ගේ අංකය 0-based index එකකට හරවන්න

            if (isNaN(subjectIndex) || subjectIndex < 0 || subjectIndex >= userState.subjects.length) {
                return reply("කරුණාකර නිවැරදි විෂය අංකයක් ටයිප් කරන්න. නැතහොත් `!pp` යොදා නැවත අරඹන්න.");
            }

            const selectedSubject = userState.subjects[subjectIndex];
            userInteractionStates.delete(senderId); // සම්පූර්ණ වූ පසු state reset කරන්න

            // PDF එක download කිරීමට
            if (selectedSubject.Link) { // JSON එකේ "Link" යන key එක ඇති නිසා
                await conn.sendMessage(from, { document: { url: selectedSubject.Link }, mimetype: 'application/pdf', fileName: `${selectedSubject.Subject}_${userState.examType.toUpperCase()}_PastPaper.pdf` });
                return reply(`ඔබ තෝරාගත් *${selectedSubject.Subject}* (${userState.examType.toUpperCase()}) ප්‍රශ්න පත්‍රය පහතින්.`);
            } else {
                return reply("කණගාටුයි, එම විෂය සඳහා PDF ලිපිනයක් සොයා ගැනීමට නොහැකි විය.");
            }
        }
        
        // If message is not part of an ongoing 'pp' interaction
        // And it's not the initial 'pp' command
        // Then do nothing or handle it as a regular message/command by your system
        
    } catch (e) {
        console.error("Past Paper Plugin Error:", e);
        userInteractionStates.delete(senderId); // Error එකක් ආවොත් state reset කරන්න
        reply(`පසුගිය ප්‍රශ්න පත්‍ර ලබාගැනීමේදී දෝෂයක් සිදුවිය: ${e.message}`);
    }
});

// ======================================================
// Helper Functions (මේවා පිටතට export නොකරයි, plugin එක තුළටම සීමා වේ)
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
        return { [examType]: response.data };
    } catch (error) {
        console.error(`Error fetching ${examType} paper data from ${url}:`, error.message);
        return null;
    }
}

// (sendSubjectList function එක මෙම text-based ක්‍රමයට අවශ්‍ය නැත, මක්නිසාද අපි List Message එකක් යවන්නේ නැති නිසා)
