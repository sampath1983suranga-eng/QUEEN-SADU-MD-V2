// plugins/pp.js
// ... (ඉහළින් ඇති requires සහ JSON URLs)

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
    
    // මෙන්න මේ පේලිය වෙනස් කරන්න:
    // ඔබගේ config.PREFIX එක බැලූ විට, එය . විය හැකි නිසා body එකෙන් prefix එක ඉවත් කළ යුතුයි.
    const textWithoutPrefix = body ? body.slice(config.PREFIX.length).toLowerCase().trim() : ''; 
    
    console.log(`[PP Plugin] Command received: ${command}, Body: "${body}", Text (without prefix): "${textWithoutPrefix}"`);
    console.log(`[PP Plugin] Sender: ${senderId}, Current State: ${JSON.stringify(userInteractionStates.get(senderId))}`);

    try {
        const userState = userInteractionStates.get(senderId);

        // --- 1. Initial command: `!pp` (now uses textWithoutPrefix) ---
        // Check if the command itself is matched OR if it's the first message after a reset
        if (textWithoutPrefix === command || (textWithoutPrefix.startsWith(command) && args.length === 0 && !userState)) { // 'pp' command එක මුලින්ම දුන්නම or just !pp
            let menu = "*පසුගිය ප්‍රශ්න පත්‍ර (Past Papers) - විභාග වර්ගය තෝරන්න:*\n\n";
            menu += "1. සාමාන්‍ය පෙළ (O/L)\n";
            menu += "2. උසස් පෙළ (A/L)\n\n";
            menu += "ඔබට අවශ්‍ය අංකය ටයිප් කරන්න. (උදා: `1` හෝ `2`)";
            userInteractionStates.set(senderId, { state: 'awaiting_exam_type' }); 
            console.log(`[PP Plugin] Sending initial menu to ${senderId}.`);
            return reply(menu);
        }

        // --- 2. Awaiting Exam Type Selection (now uses textWithoutPrefix for subsequent user inputs) ---
        if (userState && userState.state === 'awaiting_exam_type') {
            let selectedType = '';
            // මෙන්න මේ පේලිය වෙනස් කරන්න:
            if (textWithoutPrefix === '1' || textWithoutPrefix.includes('සාමාන්‍ය පෙළ') || textWithoutPrefix.includes('ol')) {
                selectedType = 'ol';
                await reply("ඔබ සාමාන්‍ය පෙළ තෝරා ගත්තා.");
            // මෙන්න මේ පේලිය වෙනස් කරන්න:
            } else if (textWithoutPrefix === '2' || textWithoutPrefix.includes('උසස් පෙළ') || textWithoutPrefix.includes('al')) {
                selectedType = 'al';
                await reply("ඔබ උසස් පෙළ තෝරා ගත්තා.");
            } else {
                console.log(`[PP Plugin] Invalid exam type selection: "${textWithoutPrefix}" from ${senderId}.`);
                userInteractionStates.delete(senderId); 
                return reply("කරුණාකර නිවැරදි අංකයක් (1 හෝ 2) ටයිප් කරන්න. නැතහොත් `.pp` යොදා නැවත අරඹන්න."); // prefix එකත් මෙතන දාලා දුන්නා
            }

            // ... (rest of the code for awaiting_exam_type state)
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

        // --- 3. Awaiting Subject Selection & PDF Download (now uses textWithoutPrefix) ---
        if (userState && userState.state === 'awaiting_subject_selection' && userState.examType && userState.subjects) {
            // මෙන්න මේ පේලිය වෙනස් කරන්න:
            const subjectIndex = parseInt(textWithoutPrefix) - 1; 

            if (isNaN(subjectIndex) || subjectIndex < 0 || subjectIndex >= userState.subjects.length) {
                console.log(`[PP Plugin] Invalid subject selection: "${textWithoutPrefix}" from ${senderId}.`);
                userInteractionStates.delete(senderId); 
                return reply("කරුණාකර නිවැරදි විෂය අංකයක් ටයිප් කරන්න. නැතහොත් `.pp` යොදා නැවත අරඹන්න."); // prefix එකත් මෙතන දාලා දුන්නා
            }

            // ... (rest of the code for awaiting_subject_selection state)
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
        
        console.log(`[PP Plugin] Message "${textWithoutPrefix}" from ${senderId} did not match any PP interaction state.`);
        
    } catch (e) {
        console.error("Past Paper Plugin Error:", e);
        userInteractionStates.delete(senderId); 
        reply(`පසුගිය ප්‍රශ්න පත්‍ර ලබාගැනීමේදී දෝෂයක් සිදුවිය: ${e.message}`);
    }
});

// ... (fetchPaperData function එක මෙතනින් පහළට)
async function fetchPaperData(examType) {
    let url = '';
    if (examType === 'ol') {
        // Corrected URL:
        url = "https://raw.githubusercontent.com/MRDofc/MRD-AI-paspaper/main/json/ol-papers.json"; 
    } else if (examType === 'al') {
        url = "https://raw.githubusercontent.com/MRDofc/mrd-ai-al-paper/main/json/al-papers.json";
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
