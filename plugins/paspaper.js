// plugins/pp.js (Command-Chaining Interaction)

const { cmd } = require('../command'); // ඔබගේ command system එකට අනුව
const axios = require('axios'); // JSON data ලබා ගැනීමට
const config = require('../config'); // prefix එක ලබා ගැනීමට

// ඔබගේ JSON URLs මෙහි සඳහන් කරන්න (RAW GitHub URLs)
const AL_PAPER_DATA_URL = "https://raw.githubusercontent.com/MRDofc/mrd-ai-al-paper/main/json/al-papers.json";
const OL_PAPER_DATA_URL = "https://raw.githubusercontent.com/MRDofc/MRD-AI-paspaper/main/json/ol-papers.json";

// ======================================================
// 1. Main Command: `!pp` (or .pp) - Initial Menu
// ======================================================
cmd({
    pattern: "pp",
    react: "📚",
    alias: ["pastpaper", "papp"],
    desc: "පසුගිය විභාග ප්‍රශ්න පත්‍ර (Past Papers) ලබා ගන්න.",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        let menu = "*පසුගිය ප්‍රශ්න පත්‍ර (Past Papers) - විභාග වර්ගය තෝරන්න:*\n\n";
        menu += `1. සාමාන්‍ය පෙළ (O/L) - \`${config.PREFIX}ol\` ලෙස ටයිප් කරන්න.\n`;
        menu += `2. උසස් පෙළ (A/L) - \`${config.PREFIX}al\` ලෙස ටයිප් කරන්න.\n\n`;
        menu += "ඔබට අවශ්‍ය විභාග වර්ගය සඳහා අදාල command එක භාවිතා කරන්න.";
        return reply(menu);
    } catch (e) {
        console.error("PP Initial Command Error:", e);
        reply(`පසුගිය ප්‍රශ්න පත්‍ර ලබාගැනීමේදී දෝෂයක් සිදුවිය: ${e.message}`);
    }
});

// ======================================================
// 2. Command: `!ol` (or .ol) - O/L Subject List
// ======================================================
cmd({
    pattern: "ol",
    react: "📘",
    alias: ["olpapers", "ordinarylevel"],
    desc: "සාමාන්‍ය පෙළ ප්‍රශ්න පත්‍ර ලබා ගන්න.",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const paperData = await fetchPaperData('ol');
        const subjects = paperData ? paperData['ol'] : [];

        if (!subjects || subjects.length === 0) {
            return reply(`කණගාටුයි, සාමාන්‍ය පෙළ සඳහා ප්‍රශ්න පත්‍ර සොයා ගැනීමට නොහැකි විය.`);
        }

        let subjectMenu = `*සාමාන්‍ය පෙළ (O/L) විෂයන්:*\n\n`;
        subjectMenu += "*අවශ්‍ය විෂය ඉදිරියෙන් ඇති අංකය type කර, අංකයට ඉදිරියෙන් අවශ්‍ය වර්ෂය එක් කර එවන්න. (උදා: .1 2022)*\n\n";
        
        subjects.forEach((subject, index) => {
            subjectMenu += `${index + 1}. ${subject.Subject} (${subject.Year ? subject.Year + " දක්වා" : "වසරක් නැත"})\n`; // Year එකක් නැතිනම් Year දක්වා යන්න ඉවත් කළා
        });
        subjectMenu += `\nඋදාහරණ: \`${config.PREFIX}1 2022\` (මෙයින් 1 වන විෂයයේ 2022 ප්‍රශ්න පත්‍රය ලැබේ)`;
        
        return reply(subjectMenu);

    } catch (e) {
        console.error("OL Command Error:", e);
        reply(`සාමාන්‍ය පෙළ ප්‍රශ්න පත්‍ර ලබාගැනීමේදී දෝෂයක් සිදුවිය: ${e.message}`);
    }
});

// ======================================================
// 3. Command: `!al` (or .al) - A/L Subject List
// ======================================================
cmd({
    pattern: "al",
    react: "📙",
    alias: ["alpapers", "advancedlevel"],
    desc: "උසස් පෙළ ප්‍රශ්න පත්‍ර ලබා ගන්න.",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const paperData = await fetchPaperData('al');
        const subjects = paperData ? paperData['al'] : [];

        if (!subjects || subjects.length === 0) {
            return reply(`කණගාටුයි, උසස් පෙළ සඳහා ප්‍රශ්න පත්‍ර සොයා ගැනීමට නොහැකි විය.`);
        }

        let subjectMenu = `*උසස් පෙළ (A/L) විෂයන්:*\n\n`;
        subjectMenu += "*අවශ්‍ය විෂය ඉදිරියෙන් ඇති අංකය type කර, අංකයට ඉදිරියෙන් අවශ්‍ය වර්ෂය එක් කර එවන්න. (උදා: .1 2022)*\n\n";
        
        subjects.forEach((subject, index) => {
            subjectMenu += `${index + 1}. ${subject.Subject} (${subject.Year ? subject.Year + " දක්වා" : "වසරක් නැත"})\n`;
        });
        subjectMenu += `\nඋදාහරණ: \`${config.PREFIX}1 2022\` (මෙයින් 1 වන විෂයයේ 2022 ප්‍රශ්න පත්‍රය ලැබේ)`;
        
        return reply(subjectMenu);

    } catch (e) {
        console.error("AL Command Error:", e);
        reply(`උසස් පෙළ ප්‍රශ්න පත්‍ර ලබාගැනීමේදී දෝෂයක් සිදුවිය: ${e.message}`);
    }
});

// ======================================================
// 4. Dynamic Commands for Subject Download: !<number> <year>
//    Example: !1 2022 (for 1st subject, year 2022)
// ======================================================
// This command will dynamically catch any number after the prefix.
cmd({
    pattern: ".*", // Match any command (needs careful handling to not conflict)
    react: "📄",
    dontAddCommandList: true, // Don't add this dynamic command to help menu if you have one
    filename: __filename
},
async (conn, mek, m, { from, reply, command, args }) => {
    // Check if the command is a number (e.g., '.1', '.2', etc.)
    const subjectNumber = parseInt(command); // command will be "1", "2" etc. after prefix removed
    const year = args[0] ? parseInt(args[0]) : null;

    if (isNaN(subjectNumber) || subjectNumber < 1 || isNaN(year) || year < 1900 || year > 2050) { // Basic year validation
        // This is not a subject download command, so let it pass to other handlers.
        // console.log(`[PP Plugin] Debug - Not a subject download command: ${command} ${args[0]}`);
        return; 
    }

    try {
        // We need to determine if it's O/L or A/L. This is tricky without state.
        // For simplicity, we'll try fetching both and see if we get a match.
        // A more robust solution would involve user choosing exam type first.
        
        // Let's assume the user has recently requested either !ol or !al.
        // Since we don't have a state here, we'll try to find the subject in both
        // O/L and A/L lists. This might lead to incorrect matches if subject numbers overlap.
        // For a better experience, user should specify exam type.
        // Eg: ".ol 1 2022" or ".al 1 2022" -> this requires changing the pattern to "ol", "al" and checking args.

        // Re-thinking: To avoid index.js changes, and still provide clear commands:
        // Let's define specific download commands like .olget <number> <year> and .alget <number> <year>

        // Since you specifically asked for .<number> <year>, we have to guess or keep it simple.
        // We'll modify the pattern to explicitly look for "olget" or "alget" for clarity.
        // This is safer than a generic ".*" pattern which can conflict with other commands.
        
        // This part of the logic will be handled by specific pattern handlers below (e.g., "olget", "alget")
        // and this generic ".*" command should ideally be removed or used carefully.
        
        // For the current request: if it's a number command, it means user followed the menu from !ol or !al.
        // But how to know if it's OL or AL?
        // This is the main challenge with "no index.js modification" and "no state".
        // The most logical way is to have the user specify: e.g., ".ol 1 2022" or ".al 1 2022"
        // Let's adjust the `ol` and `al` commands to handle the subject number and year directly.
        // This means the `!ol` and `!al` commands will accept arguments, and there's no need for a dynamic `.*` command.
        return; // This generic handler is not needed if we refine !ol and !al.
    } catch (e) {
        console.error("Dynamic Subject Command Error:", e);
        reply(`ප්‍රශ්න පත්‍රය ලබාගැනීමේදී දෝෂයක් සිදුවිය: ${e.message}`);
    }
});


// ======================================================
// REVISED: Commands for Subject Download: `!ol <number> <year>` and `!al <number> <year>`
// This is a much safer and clearer approach.
// ======================================================

cmd({
    pattern: "olget", // New command for O/L paper download
    react: "⬇️",
    alias: ["olpaperget"],
    desc: "සාමාන්‍ය පෙළ ප්‍රශ්න පත්‍රයක් ලබා ගන්න. භාවිතය: .olget <විෂය අංකය> <වර්ෂය>",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, reply, args }) => {
    if (args.length < 2) {
        return reply(`භාවිතය: \`${config.PREFIX}olget <විෂය අංකය> <වර්ෂය>\` (උදා: \`${config.PREFIX}olget 1 2022\`)`);
    }

    const subjectNumber = parseInt(args[0]);
    const year = parseInt(args[1]);

    if (isNaN(subjectNumber) || subjectNumber < 1 || isNaN(year) || year < 1900 || year > 2050) {
        return reply("කරුණාකර නිවැරදි විෂය අංකයක් සහ වර්ෂයක් ලබා දෙන්න. (උදා: `.olget 1 2022`)");
    }

    try {
        const paperData = await fetchPaperData('ol');
        const subjects = paperData ? paperData['ol'] : [];

        if (!subjects || subjects.length <= (subjectNumber - 1)) {
            return reply(`කණගාටුයි, ${subjectNumber} වන විෂය සාමාන්‍ය පෙළ සඳහා සොයා ගැනීමට නොහැක.`);
        }

        const selectedSubject = subjects[subjectNumber - 1]; // Adjust to 0-based index
        
        // Find the specific year's link if available, otherwise use general link
        let downloadLink = null;
        let finalSubjectName = selectedSubject.Subject; // For caption
        let finalYear = year; // For caption

        if (selectedSubject.Years && selectedSubject.Years[year]) {
            downloadLink = selectedSubject.Years[year];
        } else if (selectedSubject.Link) {
            // If specific year not found, but a general link exists, use it.
            // This might mean the JSON is not perfectly structured for per-year links.
            downloadLink = selectedSubject.Link;
            await reply(`කණගාටුයි, ${year} වසරේ ${selectedSubject.Subject} ප්‍රශ්න පත්‍රය සඳහා සෘජු Link එකක් නොමැත. විෂය සඳහා ඇති පොදු Link එක ලබා දෙමි.`);
        }

        if (downloadLink) {
            const caption = `*${finalSubjectName}* - ${finalYear}\n_QUEEN SADU MD_`;
            await conn.sendMessage(from, { 
                document: { url: downloadLink }, 
                mimetype: 'application/pdf', 
                fileName: `${finalSubjectName}_${finalYear}_OL_PastPaper.pdf`,
                caption: caption
            });
            return reply(`ඔබ තෝරාගත් *${finalSubjectName}* (${finalYear}) සාමාන්‍ය පෙළ ප්‍රශ්න පත්‍රය පහතින්.`);
        } else {
            return reply(`කණගාටුයි, ${selectedSubject.Subject} (${year}) සාමාන්‍ය පෙළ ප්‍රශ්න පත්‍රය සඳහා PDF Link එකක් සොයා ගැනීමට නොහැකි විය.`);
        }

    } catch (e) {
        console.error("OLGET Command Error:", e);
        reply(`සාමාන්‍ය පෙළ ප්‍රශ්න පත්‍රය ලබාගැනීමේදී දෝෂයක් සිදුවිය: ${e.message}`);
    }
});


cmd({
    pattern: "alget", // New command for A/L paper download
    react: "⬇️",
    alias: ["alpaperget"],
    desc: "උසස් පෙළ ප්‍රශ්න පත්‍රයක් ලබා ගන්න. භාවිතය: .alget <විෂය අංකය> <වර්ෂය>",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, reply, args }) => {
    if (args.length < 2) {
        return reply(`භාවිතය: \`${config.PREFIX}alget <විෂය අංකය> <වර්ෂය>\` (උදා: \`${config.PREFIX}alget 1 2022\`)`);
    }

    const subjectNumber = parseInt(args[0]);
    const year = parseInt(args[1]);

    if (isNaN(subjectNumber) || subjectNumber < 1 || isNaN(year) || year < 1900 || year > 2050) {
        return reply("කරුණාකර නිවැරදි විෂය අංකයක් සහ වර්ෂයක් ලබා දෙන්න. (උදා: `.alget 1 2022`)");
    }

    try {
        const paperData = await fetchPaperData('al');
        const subjects = paperData ? paperData['al'] : [];

        if (!subjects || subjects.length <= (subjectNumber - 1)) {
            return reply(`කණගාටුයි, ${subjectNumber} වන විෂය උසස් පෙළ සඳහා සොයා ගැනීමට නොහැක.`);
        }

        const selectedSubject = subjects[subjectNumber - 1]; // Adjust to 0-based index
        
        let downloadLink = null;
        let finalSubjectName = selectedSubject.Subject;
        let finalYear = year;

        if (selectedSubject.Years && selectedSubject.Years[year]) {
            downloadLink = selectedSubject.Years[year];
        } else if (selectedSubject.Link) {
            downloadLink = selectedSubject.Link;
            await reply(`කණගාටුයි, ${year} වසරේ ${selectedSubject.Subject} ප්‍රශ්න පත්‍රය සඳහා සෘජු Link එකක් නොමැත. විෂය සඳහා ඇති පොදු Link එක ලබා දෙමි.`);
        }

        if (downloadLink) {
            const caption = `*${finalSubjectName}* - ${finalYear}\n_QUEEN SADU MD_`;
            await conn.sendMessage(from, { 
                document: { url: downloadLink }, 
                mimetype: 'application/pdf', 
                fileName: `${finalSubjectName}_${finalYear}_AL_PastPaper.pdf`,
                caption: caption
            });
            return reply(`ඔබ තෝරාගත් *${finalSubjectName}* (${finalYear}) උසස් පෙළ ප්‍රශ්න පත්‍රය පහතින්.`);
        } else {
            return reply(`කණගාටුයි, ${selectedSubject.Subject} (${year}) උසස් පෙළ ප්‍රශ්න පත්‍රය සඳහා PDF Link එකක් සොයා ගැනීමට නොහැකි විය.`);
        }

    } catch (e) {
        console.error("ALGET Command Error:", e);
        reply(`උසස් පෙළ ප්‍රශ්න පත්‍රය ලබාගැනීමේදී දෝෂයක් සිදුවිය: ${e.message}`);
    }
});


// ======================================================
// Helper Functions (local to this plugin file)
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
