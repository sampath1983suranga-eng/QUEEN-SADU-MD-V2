// plugins/pp.js

// අවශ්‍ය Node.js modules import කිරීම
const { cmd } = require('../command'); // ඔබගේ command system එකට අනුව
const axios = require('axios'); // Axios තවමත් තියාගමු, සමහරවිට වෙනත් තැනකට ඕන වෙයි
const config = require('../config'); // Bot ගේ prefix එක ලබා ගැනීමට
const path = require('path'); // File paths නිවැරදිව හසුරුවා ගැනීමට
const fs = require('fs').promises; // Local files කියවීමට (Node.js built-in module)

// JSON files වලට Local Paths මෙතන සඳහන් කරන්න
// __dirname කියන්නේ මේ plugin file එක (pp.js) තියෙන folder එකේ (plugins) path එකයි.
// '..' කියන්නේ plugins folder එකෙන් එකක් පිටිපස්සට (එනම් QUEEN-SADU-MD-V2 ප්‍රධාන folder එකට) යනවා.
// 'data' කියන්නේ ඔබ අලුතින් හදන folder එක.
// 'al-papers.json' සහ 'ol-papers.json' කියන්නේ ඔබ ඒ data folder එකේ දමන files වල නම්.
const AL_PAPER_DATA_PATH = path.join(__dirname, '..', 'data', 'al-papers.json');
const OL_PAPER_DATA_PATH = path.join(__dirname, '..', 'data', 'ol-papers.json');

// ======================================================
// 1. Main Command: `!pp` (හෝ .pp) - ප්‍රධාන මෙනුව පෙන්වයි
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
// 2. Command: `!ol` (හෝ .ol) - සාමාන්‍ය පෙළ විෂය ලැයිස්තුව පෙන්වයි
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
            return reply(`කණගාටුයි, සාමාන්‍ය පෙළ සඳහා ප්‍රශ්න පත්‍ර සොයා ගැනීමට නොහැකි විය. (දත්ත නොමැත)`);
        }

        let subjectMenu = `*සාමාන්‍ය පෙළ (O/L) විෂයන්:*\n\n`;
        subjectMenu += "*අවශ්‍ය විෂය ඉදිරියෙන් ඇති අංකය type කර, අංකයට ඉදිරියෙන් අවශ්‍ය වර්ෂය එක් කර එවන්න. (උදා: .olp 1 2022)*\n\n";
        
        subjects.forEach((subject, index) => {
            // JSON එකේ Year field එකක් නැතිනම් "වසරක් නැත" ලෙස පෙන්වයි
            subjectMenu += `${index + 1}. ${subject.Subject} (${subject.Year ? subject.Year + " දක්වා" : "වසරක් නැත"})\n`;
        });
        subjectMenu += `\nඋදාහරණ: \`${config.PREFIX}olp 1 2022\` (මෙයින් 1 වන විෂයයේ 2022 ප්‍රශ්න පත්‍රය ලැබේ)`;
        
        return reply(subjectMenu);

    } catch (e) {
        console.error("OL Command Error:", e);
        reply(`සාමාන්‍ය පෙළ ප්‍රශ්න පත්‍ර ලබාගැනීමේදී දෝෂයක් සිදුවිය: ${e.message}`);
    }
});

// ======================================================
// 3. Command: `!al` (හෝ .al) - උසස් පෙළ විෂය ලැයිස්තුව පෙන්වයි
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
            return reply(`කණගාටුයි, උසස් පෙළ සඳහා ප්‍රශ්න පත්‍ර සොයා ගැනීමට නොහැකි විය. (දත්ත නොමැත)`);
        }

        let subjectMenu = `*උසස් පෙළ (A/L) විෂයන්:*\n\n`;
        subjectMenu += "*අවශ්‍ය විෂය ඉදිරියෙන් ඇති අංකය type කර, අංකයට ඉදිරියෙන් අවශ්‍ය වර්ෂය එක් කර එවන්න. (උදා: .alp 1 2022)*\n\n";
        
        subjects.forEach((subject, index) => {
            subjectMenu += `${index + 1}. ${subject.Subject} (${subject.Year ? subject.Year + " දක්වා" : "වසරක් නැත"})\n`;
        });
        subjectMenu += `\nඋදාහරණ: \`${config.PREFIX}alp 1 2022\` (මෙයින් 1 වන විෂයයේ 2022 ප්‍රශ්න පත්‍රය ලැබේ)`;
        
        return reply(subjectMenu);

    } catch (e) {
        console.error("AL Command Error:", e);
        reply(`උසස් පෙළ ප්‍රශ්න පත්‍ර ලබාගැනීමේදී දෝෂයක් සිදුවිය: ${e.message}`);
    }
});

// ======================================================
// 4. Command: `!olget <number> <year>` - සාමාන්‍ය පෙළ ප්‍රශ්න පත්‍රය බාගත කරයි
// ======================================================
cmd({
    pattern: "olp", 
    react: "⬇️",
    alias: ["olpaperget"],
    desc: "සාමාන්‍ය පෙළ ප්‍රශ්න පත්‍රයක් ලබා ගන්න. භාවිතය: .olget <විෂය අංකය> <වර්ෂය>",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, reply, args }) => {
    // args වල අවම වශයෙන් විෂය අංකය සහ වර්ෂය තිබිය යුතුයි
    if (args.length < 2) {
        return reply(`භාවිතය: \`${config.PREFIX}olp <විෂය අංකය> <වර්ෂය>\` (උදා: \`${config.PREFIX}olp 1 2022\`)`);
    }

    const subjectNumber = parseInt(args[0]); // පළමු argument එක විෂය අංකය
    const year = parseInt(args[1]); // දෙවන argument එක වර්ෂය

    // ලැබුණු අගයන් වලංගුදැයි පරීක්ෂා කිරීම
    if (isNaN(subjectNumber) || subjectNumber < 1 || isNaN(year) || year < 1900 || year > 2050) {
        return reply("කරුණාකර නිවැරදි විෂය අංකයක් සහ වර්ෂයක් ලබා දෙන්න. (උදා: `.olp 1 2022`)");
    }

    try {
        const paperData = await fetchPaperData('ol');
        const subjects = paperData ? paperData['ol'] : [];

        // ඉල්ලන ලද විෂය අංකය list එකේ තිබේදැයි පරීක්ෂා කිරීම
        if (!subjects || subjects.length <= (subjectNumber - 1)) {
            return reply(`කණගාටුයි, ${subjectNumber} වන විෂය සාමාන්‍ය පෙළ සඳහා සොයා ගැනීමට නොහැක. නිවැරදි අංකයක් තෝරන්න.`);
        }

        const selectedSubject = subjects[subjectNumber - 1]; // 0-based index එකට හරවන්න
        
        let downloadLink = null;
        let finalSubjectName = selectedSubject.Subject; // Caption එකට අවශ්‍යයි

        // JSON එකේ Year අනුව Links තිබේදැයි පරීක්ෂා කිරීම (උදා: "Years": {"2022": "link"})
        if (selectedSubject.Years && selectedSubject.Years[year]) {
            downloadLink = selectedSubject.Years[year];
        } else if (selectedSubject.Link) {
            // නිශ්චිත වසරේ link එකක් නැතිනම්, නමුත් පොදු Link එකක් තිබේ නම්, එය භාවිතා කරන්න
            downloadLink = selectedSubject.Link;
            await reply(`කණගාටුයි, ${year} වසරේ ${selectedSubject.Subject} ප්‍රශ්න පත්‍රය සඳහා සෘජු Link එකක් නොමැත. විෂය සඳහා ඇති පොදු Link එක ලබා දෙමි.`);
        }

        if (downloadLink) {
            // PDF caption එක සකස් කිරීම
            const caption = `*${finalSubjectName}* - ${year}\n_QUEEN SADU MD_`;
            
            // PDF එක document එකක් ලෙස යැවීම
            await conn.sendMessage(from, { 
                document: { url: downloadLink }, 
                mimetype: 'application/pdf', 
                fileName: `${finalSubjectName}_${year}_OL_PastPaper.pdf`, // File name එක
                caption: caption // Caption එක
            });
            return reply(`ඔබ තෝරාගත් *${finalSubjectName}* (${year}) සාමාන්‍ය පෙළ ප්‍රශ්න පත්‍රය පහතින්.`);
        } else {
            return reply(`කණගාටුයි, ${selectedSubject.Subject} (${year}) සාමාන්‍ය පෙළ ප්‍රශ්න පත්‍රය සඳහා PDF Link එකක් සොයා ගැනීමට නොහැකි විය.`);
        }

    } catch (e) {
        console.error("OLGET Command Error:", e);
        reply(`සාමාන්‍ය පෙළ ප්‍රශ්න පත්‍රය ලබාගැනීමේදී දෝෂයක් සිදුවිය: ${e.message}`);
    }
});

// ======================================================
// 5. Command: `!alget <number> <year>` - උසස් පෙළ ප්‍රශ්න පත්‍රය බාගත කරයි
// ======================================================
cmd({
    pattern: "alp", 
    react: "⬇️",
    alias: ["alpaperget"],
    desc: "උසස් පෙළ ප්‍රශ්න පත්‍රයක් ලබා ගන්න. භාවිතය: .alget <විෂය අංකය> <වර්ෂය>",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, reply, args }) => {
    if (args.length < 2) {
        return reply(`භාවිතය: \`${config.PREFIX}alget <විෂය අංකය> <වර්ෂය>\` (උදා: \`${config.PREFIX}alp 1 2022\`)`);
    }

    const subjectNumber = parseInt(args[0]);
    const year = parseInt(args[1]);

    if (isNaN(subjectNumber) || subjectNumber < 1 || isNaN(year) || year < 1900 || year > 2050) {
        return reply("කරුණාකර නිවැරදි විෂය අංකයක් සහ වර්ෂයක් ලබා දෙන්න. (උදා: `.alp 1 2022`)");
    }

    try {
        const paperData = await fetchPaperData('al');
        const subjects = paperData ? paperData['al'] : [];

        if (!subjects || subjects.length <= (subjectNumber - 1)) {
            return reply(`කණගාටුයි, ${subjectNumber} වන විෂය උසස් පෙළ සඳහා සොයා ගැනීමට නොහැක. නිවැරදි අංකයක් තෝරන්න.`);
        }

        const selectedSubject = subjects[subjectNumber - 1]; 
        
        let downloadLink = null;
        let finalSubjectName = selectedSubject.Subject;
        
        if (selectedSubject.Years && selectedSubject.Years[year]) {
            downloadLink = selectedSubject.Years[year];
        } else if (selectedSubject.Link) {
            downloadLink = selectedSubject.Link;
            await reply(`කණගාටුයි, ${year} වසරේ ${selectedSubject.Subject} ප්‍රශ්න පත්‍රය සඳහා සෘජු Link එකක් නොමැත. විෂය සඳහා ඇති පොදු Link එක ලබා දෙමි.`);
        }

        if (downloadLink) {
            const caption = `*${finalSubjectName}* - ${year}\n_QUEEN SADU MD_`;
            await conn.sendMessage(from, { 
                document: { url: downloadLink }, 
                mimetype: 'application/pdf', 
                fileName: `${finalSubjectName}_${year}_AL_PastPaper.pdf`,
                caption: caption
            });
            return reply(`ඔබ තෝරාගත් *${finalSubjectName}* (${year}) උසස් පෙළ ප්‍රශ්න පත්‍රය පහතින්.`);
        } else {
            return reply(`කණගාටුයි, ${selectedSubject.Subject} (${year}) උසස් පෙළ ප්‍රශ්න පත්‍රය සඳහා PDF Link එකක් සොයා ගැනීමට නොහැකි විය.`);
        }

    } catch (e) {
        console.error("ALGET Command Error:", e);
        reply(`උසස් පෙළ ප්‍රශ්න පත්‍රය ලබාගැනීමේදී දෝෂයක් සිදුවිය: ${e.message}`);
    }
});


// ======================================================
// Helper Function: JSON data local file එකෙන් කියවයි
// ======================================================
async function fetchPaperData(examType) {
    let filePath = '';
    if (examType === 'ol') {
        filePath = OL_PAPER_DATA_PATH;
    } else if (examType === 'al') {
        filePath = AL_PAPER_DATA_PATH;
    } else {
        return null;
    }

    try {
        console.log(`[PP Plugin] Debug - Fetching data from local file: ${filePath}`);
        // fs.promises.readFile භාවිතයෙන් file එක කියවන්න
        const data = await fs.readFile(filePath, 'utf8'); // file content එක string එකක් ලෙස කියවන්න
        return { [examType]: JSON.parse(data) }; // JSON string එක object එකක් බවට parse කරන්න
    } catch (error) {
        console.error(`[PP Plugin] Error - Failed to read or parse local ${examType} paper data from ${filePath}:`, error.message);
        return null;
    }
    }
