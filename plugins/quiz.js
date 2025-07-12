// මෙම ප්ලගිනය WhatsApp Bot විධාන සඳහා භාවිතා වේ.
// This plugin is used for WhatsApp Bot commands.
const { cmd } = require('../command');
const fs = require('fs'); // ගොනු පද්ධතිය සමඟ වැඩ කිරීමට fs මොඩියුලය අවශ්‍ය වේ.
const path = require('path'); // ගොනු මාර්ග සමඟ වැඩ කිරීමට path මොඩියුලය අවශ්‍ය වේ.

// ප්‍රශ්න විචාරාත්මක ක්‍රීඩාව ක්‍රියාත්මක වන කණ්ඩායම් සඳහා තොරතුරු ගබඩා කිරීමට Map එකක්.
// A Map to store information for groups where the quiz game is active.
const activeQuizzes = new Map(); // Map<groupId, { intervalId: NodeJS.Timeout, currentQuestion: object }>

// ප්‍රශ්න දත්ත ගොනුවෙන් කියවන්න.
// Read question data from the file.
let questionsData = [];
try {
    // __dirname යනු වත්මන් ගොනුවේ නාමාවලියයි (plugins ෆෝල්ඩරය).
    // data ෆෝල්ඩරය plugins ෆෝල්ඩරයට එක මට්ටමක් ඉහළින් පිහිටා ඇත.
    // __dirname is the directory of the current file (plugins folder).
    // The data folder is located one level above the plugins folder.
    const questionsFilePath = path.join(__dirname, '../data', 'quiz_questions.json');
    const rawData = fs.readFileSync(questionsFilePath, 'utf8');
    questionsData = JSON.parse(rawData);
    console.log("ප්‍රශ්න දත්ත සාර්ථකව පූරණය කරන ලදී."); // Log successful loading.
} catch (error) {
    console.error("ප්‍රශ්න දත්ත පූරණය කිරීමේදී දෝෂයක්:", error); // Log error during loading.
    // දත්ත පූරණය නොවන්නේ නම්, පෙරනිමි දත්ත හෝ හිස් අරාවක් භාවිතා කරන්න.
    // If data fails to load, use default data or an empty array.
    questionsData = [];
}

/**
 * අහඹු ප්‍රශ්නයක් තෝරා ගනී.
 * Selects a random question from the questionsData array.
 * @returns {object|null} අහඹු ප්‍රශ්න වස්තුව හෝ දත්ත නොමැති නම් null.
 */
function getRandomQuestion() {
    if (questionsData.length === 0) {
        console.warn("ප්‍රශ්න දත්ත නොමැත. කරුණාකර questions.json ගොනුව පරීක්ෂා කරන්න.");
        return null;
    }
    return questionsData[Math.floor(Math.random() * questionsData.length)];
}

/**
 * ප්‍රශ්න වස්තුවක් පණිවිඩයක් ලෙස හැඩගන්වයි.
 * Formats a question object into a message string.
 * @param {object} questionObj - ප්‍රශ්න වස්තුව.
 * @returns {string} හැඩගැන්වූ ප්‍රශ්න පණිවිඩය.
 */
function formatQuestion(questionObj) {
    if (!questionObj) {
        return "ප්‍රශ්නයක් ලබා ගැනීමට නොහැකි විය. දත්ත පරීක්ෂා කරන්න.";
    }
    let message = `*ප්‍රශ්නය:* ${questionObj.question}\n\n*විකල්ප:*\n`;
    questionObj.options.forEach((option, index) => {
        message += `${String.fromCharCode(65 + index)}. ${option}\n`; // විකල්ප A, B, C, D ලෙස පෙන්වයි.
    });
    message += `\n_නිවැරදි පිළිතුර තෝරන්න!_නිවැරදි පිළිතුර type කර එවන්න.`;
               `\n*ᴩᴏᴡᴇʀᴇᴅ ʙʏ qᴜᴇᴇɴ-ꜱᴀᴅᴜ-ᴀꜱᴛʀᴏ*`;
               `\n*ᴍʀᴅ ᴀɪ*`;
    return message;
}

// startmrdai විධානය: ප්‍රශ්න විචාරාත්මක ක්‍රීඩාව ආරම්භ කරයි.
// startmrdai command: Starts the quiz game.
cmd({
    pattern: "startmrdai",
    react: "🚀", // විධානය ක්‍රියාත්මක වන විට පෙන්වන emoji.
    alias: ["quizstart"],
    desc: "ප්‍රශ්න විචාරාත්මක ක්‍රීඩාව ආරම්භ කරන්න. සෑම පැයකට වරක් නව ප්‍රශ්නයක් යවනු ලැබේ.", // විධානයේ විස්තරය.
    category: "game",
    filename: __filename
},
async (conn, mek, m, { from }) => {
    try {
        if (questionsData.length === 0) {
            return await conn.sendMessage(from, { text: 'ප්‍රශ්න දත්ත පූරණය වී නොමැත. කරුණාකර questions.json ගොනුව පරීක්ෂා කරන්න.' }, { quoted: mek });
        }

        // ප්‍රශ්න විචාරාත්මක ක්‍රීඩාව දැනටමත් ක්‍රියාත්මකදැයි පරීක්ෂා කරන්න.
        // Check if the quiz is already active for this group.
        if (activeQuizzes.has(from)) {
            return await conn.sendMessage(from, { text: 'ප්‍රශ්න විචාරාත්මක ක්‍රීඩාව දැනටමත් ක්‍රියාත්මකයි.' }, { quoted: mek });
        }

        // ප්‍රශ්නයක් තෝරාගෙන කණ්ඩායමට යැවීමට ශ්‍රිතය.
        // Function to select and send a question to the group.
        const sendQuestion = async () => {
            const question = getRandomQuestion();
            const questionMessage = formatQuestion(question);
            await conn.sendMessage(from, { text: questionMessage });

            // වත්මන් ප්‍රශ්නය ගබඩා කරන්න (පිළිතුරු පරීක්ෂා කිරීම සඳහා අනාගතයේදී භාවිතා කළ හැක).
            // Store the current question (can be used for answer checking in the future).
            if (activeQuizzes.has(from)) { // Ensure the quiz is still active before updating
                activeQuizzes.get(from).currentQuestion = question;
            }
        };

        // පළමු ප්‍රශ්නය වහාම යවන්න.
        // Send the first question immediately.
        await sendQuestion();

        // සෑම පැයකට වරක් ප්‍රශ්න යැවීමට interval එකක් සකසන්න. (1 hour = 60 minutes * 60 seconds * 1000 milliseconds)
        // Set an interval to send questions every hour.
        const intervalId = setInterval(sendQuestion, 60 * 60 * 1000); // 1 hour

        // ක්‍රියාත්මක වන ප්‍රශ්න විචාරාත්මක ක්‍රීඩා Map එකට එක් කරන්න.
        // Add the active quiz to the map.
        activeQuizzes.set(from, { intervalId: intervalId, currentQuestion: null });

        await conn.sendMessage(from, { text: 'ප්‍රශ්න විචාරාත්මක ක්‍රීඩාව ආරම්භ විය! සෑම පැයකට වරක් නව ප්‍රශ්නයක් යවනු ලැබේ.' }, { quoted: mek });

    } catch (error) {
        console.error("startmrdai හි දෝෂයක්:", error); // Log the error.
        await conn.sendMessage(from, { text: 'කණගාටුයි, ප්‍රශ්න විචාරාත්මක ක්‍රීඩාව ආරම්භ කිරීමේදී දෝෂයක් ඇති විය.' }, { quoted: mek });
    }
});

// stopmrdai විධානය: ප්‍රශ්න විචාරාත්මක ක්‍රීඩාව නවත්වයි.
// stopmrdai command: Stops the quiz game.
cmd({
    pattern: "stopmrdai",
    react: "🛑", // විධානය ක්‍රියාත්මක වන විට පෙන්වන emoji.
    alias: ["quizstop"],
    desc: "ප්‍රශ්න විචාරාත්මක ක්‍රීඩාව නවත්වන්න.", // විධානයේ විස්තරය.
    category: "game",
    filename: __filename
},
async (conn, mek, m, { from }) => {
    try {
        // ප්‍රශ්න විචාරාත්මක ක්‍රීඩාව ක්‍රියාත්මක නොවේදැයි පරීක්ෂා කරන්න.
        // Check if the quiz is not active for this group.
        if (!activeQuizzes.has(from)) {
            return await conn.sendMessage(from, { text: 'ප්‍රශ්න විචාරාත්මක ක්‍රීඩාව දැනටමත් ක්‍රියාත්මක නොවේ.' }, { quoted: mek });
        }

        // interval එක නවත්වන්න.
        // Clear the interval.
        clearInterval(activeQuizzes.get(from).intervalId);
        // Map එකෙන් අදාළ කණ්ඩායම ඉවත් කරන්න.
        // Remove the group from the active quizzes map.
        activeQuizzes.delete(from);

        await conn.sendMessage(from, { text: 'ප්‍රශ්න විචාරාත්මක ක්‍රීඩාව නතර කරන ලදී.' }, { quoted: mek });

    } catch (error) {
        console.error("stopmrdai හි දෝෂයක්:", error); // Log the error.
        await conn.sendMessage(from, { text: 'කණගාටුයි, ප්‍රශ්න විචාරාත්මක ක්‍රීඩාව නැවැත්වීමේදී දෝෂයක් ඇති විය.' }, { quoted: mek });
    }
});

// getmrdai විධානය: අහඹු ප්‍රශ්නයක් ලබා දෙයි.
// getmrdai command: Gets a random question.
cmd({
    pattern: "getmrdai",
    react: "❓", // විධානය ක්‍රියාත්මක වන විට පෙන්වන emoji.
    alias: ["getquiz"],
    desc: "අහඹු ප්‍රශ්නයක් ලබා ගන්න.", // විධානයේ විස්තරය.
    category: "game",
    filename: __filename
},
async (conn, mek, m, { from }) => {
    try {
        if (questionsData.length === 0) {
            return await conn.sendMessage(from, { text: 'ප්‍රශ්න දත්ත පූරණය වී නොමැත. කරුණාකර questions.json ගොනුව පරීක්ෂා කරන්න.' }, { quoted: mek });
        }
        // අහඹු ප්‍රශ්නයක් තෝරාගෙන එය හැඩගන්වන්න.
        // Select a random question and format it.
        const question = getRandomQuestion();
        const questionMessage = formatQuestion(question);
        await conn.sendMessage(from, { text: questionMessage }, { quoted: mek });

    } catch (error) {
        console.error("getmrdai හි දෝෂයක්:", error); // Log the error.
        await conn.sendMessage(from, { text: 'කණගාටුයි, ප්‍රශ්නයක් ලබා ගැනීමේදී දෝෂයක් ඇති විය.' }, { quoted: mek });
    }
});
