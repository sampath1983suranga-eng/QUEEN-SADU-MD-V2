// plugins/pp.js

const { cmd } = require('../command'); // ඔබගේ command system එකට අනුව
const axios = require('axios'); // JSON data ලබා ගැනීමට
const config = require('../config'); // prefix එක ලබා ගැනීමට

// ඔබගේ JSON URLs මෙහි සඳහන් කරන්න (RAW GitHub URLs)
const AL_PAPER_DATA_URL = "https://raw.githubusercontent.com/MRDofc/mrd-ai-al-paper/main/json/al-papers.json";
const OL_PAPER_DATA_URL = "https://raw.githubusercontent.com/MRDofc/MRD-AI-paspaper/main/json/ol-papers.json"; // "blob/" කොටස ඉවත් කර ඇත.

// User state කළමනාකරණය සඳහා Map එකක්
// key: senderId (JID), value: { state: 'awaiting_exam_type' | 'awaiting_subject_selection', examType: 'ol' | 'al', subjects: [...] }
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
async (conn, mek, m, { from, reply, command, body, args }) => {
    const senderId = m.sender; 
    
    // config.PREFIX එක භාවිතයෙන් body එකෙන් prefix එක ඉවත් කරන්න
    // body undefined විය හැකි අවස්ථා සඳහාද check කරන්න
    const textWithoutPrefix = body ? body.slice(config.PREFIX.length).toLowerCase().trim() : ''; 
    const fullTextFromUser = body ? body.toLowerCase().trim() : ''; // සම්පූර්ණ text එක (prefix සමග)

    // Debugging logs - මේවා ඔබට දෝෂ හඳුනාගැනීමට උපකාරී වේ
    console.log(`[PP Plugin] Debug - Command received: "${command}", Raw Body: "${body}", Text without prefix: "${textWithoutPrefix}", Full Text: "${fullTextFromUser}"`);
    console.log(`[PP Plugin] Debug - Sender: ${senderId}, Current State: ${JSON.stringify(userInteractionStates.get(senderId))}`);

    try {
        const userState = userInteractionStates.get(senderId);

        // --- 1. Initial command: `!pp` (or .pp) ---
        // This condition checks if it's the start of a new interaction.
        // It needs to match the command name AFTER the prefix.
        if (textWithoutPrefix === command && args.length === 0 && (!userState || userState.state === 'finished')) {
            let menu = "*පසුගිය ප්‍රශ්න පත්‍ර (Past Papers) - විභාග වර්ගය තෝරන්න:*\n\n";
            menu += "1. සාමාන්‍ය පෙළ (O/L)\n";
            menu += "2. උසස් පෙළ (A/L)\n\n";
            menu += "ඔබට අවශ්‍ය අංකය ටයිප් කරන්න. (උදා: `1` හෝ `2`)";
            userInteractionStates.set(senderId, { state: 'awaiting_exam_type' }); 
            console.log(`[PP Plugin] Info - Sending initial menu to ${senderId}.`);
            return reply(menu);
        }

        // --- 2. Awaiting Exam Type Selection ---
        // This part handles subsequent messages from the user based on their stored state.
        if (userState && userState.state === 'awaiting_exam_type') {
            let selectedType = '';
            if (fullTextFromUser === '1' || fullTextFromUser.includes('සාමාන්‍ය පෙළ') || fullTextFromUser.includes('ol')) {
                selectedType = 'ol';
                await reply("ඔබ සාමාන්‍ය පෙළ තෝරා ගත්තා.");
            } else if (fullTextFromUser === '2' || fullTextFromUser.includes('උසස් පෙළ') || fullTextFromUser.includes('al')) {
                selectedType = 'al';
                await reply("ඔබ උසස් පෙළ තෝරා ගත්තා.");
            } else {
                console.log(`[PP Plugin] Warning - Invalid exam type selection: "${fullTextFromUser}" from ${senderId}.`);
                userInteractionStates.delete(senderId); // Reset state on invalid input
                return reply(`කරුණාකර නිවැරදි අංකයක් (1 හෝ 2) ටයිප් කරන්න. නැතහොත් \`${config.PREFIX}pp\` යොදා නැවත අරඹන්න.`);
            }

            const paperData = await fetchPaperData(selectedType); 
            const subjects = paperData ? paperData[selectedType] : []; 

            if (!subjects || subjects.length === 0) {
                userInteractionStates.delete(senderId); 
                console.log(`[PP Plugin] Info - No subjects found for ${selectedType.toUpperCase()} for ${senderId}.`);
                return reply(`කණගාටුයි, ${selectedType.toUpperCase()} සඳහා ප්‍රශ්න පත්‍ර සොයා ගැනීමට නොහැකි විය.`);
            }

            let subjectMenu = `*${selectedType.toUpperCase()} විෂයන් තෝරන්න:*\n\n`;
            subjects.forEach((subject, index) => {
                subjectMenu += `${index + 1}. ${subject.Subject} (${subject.Year || 'වසරක් නැත'})\n`;
            });
            subjectMenu += `\nඔබට අවශ්‍ය විෂයයේ අංකය ටයිප් කරන්න. (උදා: \`1\`)`;
            userInteractionStates.set(senderId, { state: 'awaiting_subject_selection', examType: selectedType, subjects: subjects }); 
            console.log(`[PP Plugin] Info - Sending subject menu for ${selectedType.toUpperCase()} to ${senderId}.`);
            return reply(subjectMenu);
        }

        // --- 3. Awaiting Subject Selection & PDF Download ---
        // Handles subsequent user input when awaiting subject selection.
        if (userState && userState.state === 'awaiting_subject_selection' && userState.examType && userState.subjects) {
            const subjectIndex = parseInt(fullTextFromUser) - 1; // User ගේ අංකය 0-based index එකකට හරවන්න

            if (isNaN(subjectIndex) || subjectIndex < 0 || subjectIndex >= userState.subjects.length) {
                console.log(`[PP Plugin] Warning - Invalid subject selection: "${fullTextFromUser}" from ${senderId}.`);
                userInteractionStates.delete(senderId); 
                return reply(`කරුණාකර නිවැරදි විෂය අංකයක් ටයිප් කරන්න. නැතහොත් \`${config.PREFIX}pp\` යොදා නැවත අරඹන්න.`);
            }

            const selectedSubject = userState.subjects[subjectIndex];
            userInteractionStates.delete(senderId); // සම්පූර්ණ වූ පසු state reset කරන්න
            console.log(`[PP Plugin] Info - User ${senderId} selected subject: ${selectedSubject.Subject}.`);

            if (selectedSubject.Link) { 
                await conn.sendMessage(from, { document: { url: selectedSubject.Link }, mimetype: 'application/pdf', fileName: `${selectedSubject.Subject}_${userState.examType.toUpperCase()}_PastPaper.pdf` });
                return reply(`ඔබ තෝරාගත් *${selectedSubject.Subject}* (${userState.examType.toUpperCase()}) ප්‍රශ්න පත්‍රය පහතින්.`);
            } else {
                console.log(`[PP Plugin] Error - No PDF link found for ${selectedSubject.Subject} for ${senderId}.`);
                return reply("කණගාටුයි, එම විෂය සඳහා PDF ලිපිනයක් සොයා ගැනීමට නොහැකි විය.");
            }
        }
        
        // If the message is not part of an ongoing 'pp' interaction and not the initial 'pp' command,
        // this command handler will simply do nothing and allow other commands to be processed.
        console.log(`[PP Plugin] Debug - Message "${fullTextFromUser}" from ${senderId} did not match any PP interaction state. Passing to next handler.`);
        
    } catch (e) {
        console.error("Past Paper Plugin Error:", e);
        userInteractionStates.delete(senderId); // Error එකක් ආවොත් state reset කරන්න
        reply(`පසුගිය ප්‍රශ්න පත්‍ර ලබාගැනීමේදී දෝෂයක් සිදුවිය: ${e.message}`);
    }
});

// ======================================================
// Helper Functions (these are local to this plugin file)
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
        console.log(`[PP Plugin] Debug - Fetching data from: ${url}`);
        const response = await axios.get(url);
        if (response.status !== 200) {
            console.error(`[PP Plugin] Error - Failed to fetch data. Status: ${response.status}`);
            return null;
        }
        return { [examType]: response.data };
    } catch (error) {
        console.error(`[PP Plugin] Error - Failed to fetch ${examType} paper data:`, error.message);
        return null;
    }
        }
