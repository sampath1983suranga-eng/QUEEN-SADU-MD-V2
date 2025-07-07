// plugins/pp.js (Text-Based Interaction - Debugging added)
const { cmd } = require('../command'); // ඔබගේ command system එකට අනුව
const axios = require('axios'); // JSON data ලබා ගැනීමට

// ඔබගේ JSON URLs මෙහි සඳහන් කරන්න
const AL_PAPER_DATA_URL = "https://raw.githubusercontent.com/MRDofc/mrd-ai-al-paper/main/json/al-papers.json";
const OL_PAPER_DATA_URL = "https://raw.githubusercontent.com/MRDofc/MRD-AI-paspaper/blob/main/json/ol-papers.json"; // GitHub URL එකේ raw නැත්නම් එකතු කරන්න

// User state කළමනාකරණය සඳහා Map එකක්
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
async (conn, mek, m, { from, reply, command, body, args }) => { // args parameter එකත් එකතු කළා.
    const senderId = m.sender; 
    const text = body ? body.toLowerCase().trim() : ''; // body එක undefined වෙන්න පුළුවන්, ඒක check කළා

    console.log(`[PP Plugin] Command received: ${command}, Body: "${body}", Text: "${text}"`);
    console.log(`[PP Plugin] Sender: ${senderId}, Current State: ${JSON.stringify(userInteractionStates.get(senderId))}`);

    try {
        const userState = userInteractionStates.get(senderId);

        // --- 1. Initial command: `!pp` ---
        // Check if the command itself is matched OR if it's the first message after a reset
        if (text === command || (text.startsWith(command) && args.length === 0 && !userState)) { // 'pp' command එක මුලින්ම දුන්නම or just !pp
            let menu = "*පසුගිය ප්‍රශ්න පත්‍ර (Past Papers) - විභාග වර්ගය තෝරන්න:*\n\n";
            menu += "1. සාමාන්‍ය පෙළ (O/L)\n";
            menu += "2. උසස් පෙළ (A/L)\n\n";
            menu += "ඔබට අවශ්‍ය අංකය ටයිප් කරන්න. (උදා: `1` හෝ `2`)";
            userInteractionStates.set(senderId, { state: 'awaiting_exam_type' }); 
            console.log(`[PP Plugin] Sending initial menu to ${senderId}.`);
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
                console.log(`[PP Plugin] Invalid exam type selection: "${text}" from ${senderId}.`);
                userInteractionStates.delete(senderId); // Reset state on invalid input
                return reply("කරුණාකර නිවැරදි අංකයක් (1 හෝ 2) ටයිප් කරන්න. නැතහොත් `!pp` යොදා නැවත අරඹන්න.");
            }

            const paperData = await fetchPaperData(selectedType); 
            const subjects = paperData ? paperData[selectedType] : []; 

            if (!subjects || subjects.length === 0) {
                userInteractionStates.delete(senderId); 
                console.log(`[PP Plugin] No subjects found for ${selectedType.toUpperCase()} for ${senderId}.`);
                return reply(`කණගාටුයි, ${selectedType.toUpperCase()} සඳහා ප්‍රශ්න පත්‍ර සොයා ගැනීමට නොහැකි විය.`);
            }

            let subjectMenu = `*${selectedType.toUpperCase()} විෂයන් තෝරන්න:*\n\n`;
            subjects.forEach((subject, index) => {
                subjectMenu += `${index + 1}. ${subject.Subject} (${subject.Year || 'වසරක් නැත'})\n`;
            });
            subjectMenu += `\nඔබට අවශ්‍ය විෂයයේ අංකය ටයිප් කරන්න. (උදා: \`1\`)`;
            userInteractionStates.set(senderId, { state: 'awaiting_subject_selection', examType: selectedType, subjects: subjects }); 
            console.log(`[PP Plugin] Sending subject menu for ${selectedType.toUpperCase()} to ${senderId}.`);
            return reply(subjectMenu);
        }

        // --- 3. Awaiting Subject Selection & PDF Download ---
        if (userState && userState.state === 'awaiting_subject_selection' && userState.examType && userState.subjects) {
            const subjectIndex = parseInt(text) - 1; 

            if (isNaN(subjectIndex) || subjectIndex < 0 || subjectIndex >= userState.subjects.length) {
                console.log(`[PP Plugin] Invalid subject selection: "${text}" from ${senderId}.`);
                userInteractionStates.delete(senderId); // Reset state on invalid input
                return reply("කරුණාකර නිවැරදි විෂය අංකයක් ටයිප් කරන්න. නැතහොත් `!pp` යොදා නැවත අරඹන්න.");
            }

            const selectedSubject = userState.subjects[subjectIndex];
            userInteractionStates.delete(senderId); 
            console.log(`[PP Plugin] User ${senderId} selected subject: ${selectedSubject.Subject}.`);

            if (selectedSubject.Link) { 
                await conn.sendMessage(from, { document: { url: selectedSubject.Link }, mimetype: 'application/pdf', fileName: `${selectedSubject.Subject}_${userState.examType.toUpperCase()}_PastPaper.pdf` });
                return reply(`ඔබ තෝරාගත් *${selectedSubject.Subject}* (${userState.examType.toUpperCase()}) ප්‍රශ්න පත්‍රය පහතින්.`);
            } else {
                console.log(`[PP Plugin] No PDF link found for ${selectedSubject.Subject} for ${senderId}.`);
                return reply("කණගාටුයි, එම විෂය සඳහා PDF ලිපිනයක් සොයා ගැනීමට නොහැකි විය.");
            }
        }
        
        // If the message is not part of an ongoing 'pp' interaction
        // and it's not the initial 'pp' command, then this command handler does nothing.
        // It will allow other commands to be processed if they match.
        console.log(`[PP Plugin] Message "${text}" from ${senderId} did not match any PP interaction state.`);
        
    } catch (e) {
        console.error("Past Paper Plugin Error:", e);
        userInteractionStates.delete(senderId); 
        reply(`පසුගිය ප්‍රශ්න පත්‍ර ලබාගැනීමේදී දෝෂයක් සිදුවිය: ${e.message}`);
    }
});

// ======================================================
// Helper Functions
// ======================================================

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
