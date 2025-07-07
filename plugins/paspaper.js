const fs = require('fs');
const path = require('path');

// Function to load and parse paper data
function loadPaperData(filename) {
    try {
        const filePath = path.join(__dirname, '..', 'data', filename);
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error(`[PP Plugin] Error - Failed to read or parse local ${filename} data:`, e);
        return null;
    }
}

// Function to group subjects and get available years
function processPapers(papers) {
    if (!papers) return []; // Return an empty array if papers is null

    const subjectsMap = {};
    papers.forEach(paper => {
        const subjectName = paper.subject; // Use 'subject' as per your JSON
        if (!subjectsMap[subjectName]) {
            subjectsMap[subjectName] = {
                Subject: subjectName, // Use 'Subject' for the plugin's internal key
                Years: {},
                minYear: Infinity,
                maxYear: -Infinity
            };
        }
        const year = parseInt(paper.year);
        subjectsMap[subjectName].Years[year] = paper.file;
        if (year < subjectsMap[subjectName].minYear) {
            subjectsMap[subjectName].minYear = year;
        }
        if (year > subjectsMap[subjectName].maxYear) {
            subjectsMap[subjectName].maxYear = year;
        }
    });

    // Convert back to an array and add 'Year' range string
    return Object.values(subjectsMap).map(subject => {
        subject.Year = subject.minYear === subject.maxYear ? 
                       `${subject.minYear}` : 
                       `${subject.minYear}-${subject.maxYear}`;
        return subject;
    });
}

let olPapersRaw;
let alPapersRaw;
let olSubjects = []; // Initialize as array
let alSubjects = []; // Initialize as array

module.exports = {
    name: 'pastpapers',
    description: 'Get O/L and A/L past papers.',
    async before(m, { conn, user, bot, group, isOwner, isAdmin, isBotAdmin, send, reply, react }) {
        // Load data once when the plugin is loaded
        if (Object.keys(olSubjects).length === 0) { // Check if already loaded
            olPapersRaw = loadPaperData('ol-papers.json');
            olSubjects = processPapers(olPapersRaw);
        }
        if (Object.keys(alSubjects).length === 0) { // Check if already loaded
            alPapersRaw = loadPaperData('al-papers.json');
            alSubjects = processPapers(alPapersRaw);
        }

        if (!olSubjects || !alSubjects) {
            // This error will be logged, and the commands won't work.
            // The commands themselves will also have checks for empty data.
            return true; // Stop further command processing if data loading failed
        }
        return false; // Continue to the command handler
    },
    commands: [
        {
            name: 'ol',
            command: ['ol', 'සාපෙළ', 'සාමාන්‍යපෙළ'],
            category: 'Past Papers', // Ensure this category matches your menu plugin's categories
            description: 'Get list of available O/L subjects.',
            async execute(m, { conn, args, reply }) {
                if (!olSubjects || olSubjects.length === 0) {
                    return reply("සාමාන්‍ය පෙළ ප්‍රශ්න පත්‍ර සඳහා විෂයයන් නොමැත, නැතහොත් දත්ත ලබාගැනීමේ දෝෂයක් ඇත.");
                }

                let subjectMenu = '*සාමාන්‍ය පෙළ (O/L) විෂයන්:*\n\n';
                olSubjects.forEach((subject, index) => {
                    subjectMenu += `${index + 1}. ${subject.Subject} (${subject.Year ? subject.Year + " දක්වා" : "වසරක් නැත"})\n`;
                });
                subjectMenu += `\n*අවශ්‍ය විෂය ඉදිරියෙන් ඇති අංකය type කර, අංකයට ඉදිරියෙන් අවශ්‍ය වර්ෂය එක් කර එවන්න. (උදා: .olget 1 2022)*`;
                await reply(subjectMenu);
            }
        },
        {
            name: 'al',
            command: ['al', 'උපෙළ', 'උසස්පෙළ'],
            category: 'Past Papers', // Ensure this category matches your menu plugin's categories
            description: 'Get list of available A/L subjects.',
            async execute(m, { conn, args, reply }) {
                if (!alSubjects || alSubjects.length === 0) {
                    return reply("උසස් පෙළ ප්‍රශ්න පත්‍ර සඳහා විෂයයන් නොමැත, නැතහොත් දත්ත ලබාගැනීමේ දෝෂයක් ඇත.");
                }

                let subjectMenu = '*උසස් පෙළ (A/L) විෂයන්:*\n\n';
                alSubjects.forEach((subject, index) => {
                    subjectMenu += `${index + 1}. ${subject.Subject} (${subject.Year ? subject.Year + " දක්වා" : "වසරක් නැත"})\n`;
                });
                subjectMenu += `\n*අවශ්‍ය විෂය ඉදිරියෙන් ඇති අංකය type කර, අංකයට ඉදිරියෙන් අවශ්‍ය වර්ෂය එක් කර එවන්න. (උදා: .alget 1 2022)*`;
                await reply(subjectMenu);
            }
        },
        {
            name: 'olget',
            command: ['olget'],
            category: 'Past Papers', // Ensure this category matches your menu plugin's categories
            description: 'Get a specific O/L past paper. Usage: .olget <subject_number> <year>',
            async execute(m, { conn, args, reply, from }) {
                const subjectNumber = parseInt(args[0]);
                const year = args[1];

                if (isNaN(subjectNumber) || !year) {
                    return reply("භාවිතා කරන ආකාරය: .olget <විෂය අංකය> <වර්ෂය>\nඋදා: .olget 1 2022");
                }

                if (!olSubjects || olSubjects.length === 0) {
                    return reply("සාමාන්‍ය පෙළ ප්‍රශ්න පත්‍ර දත්ත ලබාගත නොහැක.");
                }
                
                const selectedSubject = olSubjects[subjectNumber - 1];

                if (!selectedSubject) {
                    return reply("වැරදි විෂය අංකයකි. කරුණාකර .ol command එකෙන් විෂය ලැයිස්තුව ලබා ගන්න.");
                }

                const downloadLink = selectedSubject.Years[year];

                if (!downloadLink) {
                    return reply(`*${selectedSubject.Subject}* විෂය සඳහා *${year}* වර්ෂයේ ප්‍රශ්න පත්‍රයක් නොමැත.`);
                }

                const finalSubjectName = selectedSubject.Subject;
                const caption = `*${finalSubjectName}* - ${year}\n_QUEEN SADU MD_`;

                try {
                    await reply("PDF එක යැවීමට සූදානම්..."); // Debugging message

                    await conn.sendMessage(from, { 
                        document: { url: downloadLink }, 
                        mimetype: 'application/pdf', 
                        fileName: `${finalSubjectName}_${year}_OL_PastPaper.pdf`, 
                        caption: caption 
                    });
                    await reply(`ඔබ තෝරාගත් *${finalSubjectName}* (${year}) සාමාන්‍ය පෙළ ප්‍රශ්න පත්‍රය පහතින්.`);
                } catch (error) {
                    console.error(`[PP Plugin] OLGET Command Error: Failed to send PDF for ${finalSubjectName} (${year})`, error);
                    await reply("ප්‍රශ්න පත්‍රය යැවීමේදී දෝෂයක් සිදුවිය. කරුණාකර පසුව නැවත උත්සාහ කරන්න.");
                }
            }
        },
        {
            name: 'alget',
            command: ['alget'],
            category: 'Past Papers', // Ensure this category matches your menu plugin's categories
            description: 'Get a specific A/L past paper. Usage: .alget <subject_number> <year>',
            async execute(m, { conn, args, reply, from }) {
                const subjectNumber = parseInt(args[0]);
                const year = args[1];

                if (isNaN(subjectNumber) || !year) {
                    return reply("භාවිතා කරන ආකාරය: .alget <විෂය අංකය> <වර්ෂය>\nඋදා: .alget 1 2022");
                }

                if (!alSubjects || alSubjects.length === 0) {
                    return reply("උසස් පෙළ ප්‍රශ්න පත්‍ර දත්ත ලබාගත නොහැක.");
                }

                const selectedSubject = alSubjects[subjectNumber - 1];

                if (!selectedSubject) {
                    return reply("වැරදි විෂය අංකයකි. කරුණාකර .al command එකෙන් විෂය ලැයිස්තුව ලබා ගන්න.");
                }

                const downloadLink = selectedSubject.Years[year];

                if (!downloadLink) {
                    return reply(`*${selectedSubject.Subject}* විෂය සඳහා *${year}* වර්ෂයේ ප්‍රශ්න පත්‍රයක් නොමැත.`);
                }

                const finalSubjectName = selectedSubject.Subject;
                const caption = `*${finalSubjectName}* - ${year}\n_QUEEN SADU MD_`;

                try {
                    await reply("PDF එක යැවීමට සූදානම්..."); // Debugging message

                    await conn.sendMessage(from, { 
                        document: { url: downloadLink }, 
                        mimetype: 'application/pdf', 
                        fileName: `${finalSubjectName}_${year}_AL_PastPaper.pdf`, 
                        caption: caption 
                    });
                    await reply(`ඔබ තෝරාගත් *${finalSubjectName}* (${year}) උසස් පෙළ ප්‍රශ්න පත්‍රය පහතින්.`);
                } catch (error) {
                    console.error(`[PP Plugin] ALGET Command Error: Failed to send PDF for ${finalSubjectName} (${year})`, error);
                    await reply("ප්‍රශ්න පත්‍රය යැවීමේදී දෝෂයක් සිදුවිය. කරුණාකර පසුව නැවත උත්සාහ කරන්න.");
                }
            }
        }
    ]
};
