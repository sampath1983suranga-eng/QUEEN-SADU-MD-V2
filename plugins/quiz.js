const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');

// Quiz questions JSON file එක load කරගැනීම
const QUIZ_QUESTIONS_FILE = path.join(__dirname, '../data/quiz_questions.json'); 
let quizQuestions = [];
try {
    quizQuestions = JSON.parse(fs.readFileSync(QUIZ_QUESTIONS_FILE, 'utf8'));
    if (quizQuestions.length === 0) {
        console.warn("quiz_questions.json is empty or contains no valid questions.");
    }
} catch (error) {
    console.error(`Error loading quiz_questions.json from ${QUIZ_QUESTIONS_FILE}:`, error.message);
    quizQuestions = []; 
}

// Quiz ක්‍රියාත්මක වන group JID එක ගබඩා කිරීමට
const QUIZ_STATE_FILE = path.join(__dirname, '../data/quiz_state.json'); 
let quizEnabledGroupJid = null;
let quizIntervalId = null;
let currentQuizQuestionIndex = -1; 
let quizScore = {}; 

// Bot start වන විට, කලින් තිබූ state එක load කරගැනීම
function loadQuizState() {
    try {
        if (fs.existsSync(QUIZ_STATE_FILE)) {
            const state = JSON.parse(fs.readFileSync(QUIZ_STATE_FILE, 'utf8'));
            if (state && state.groupJid) {
                quizEnabledGroupJid = state.groupJid;
                console.log(`Loaded quiz state: Quiz enabled for JID ${quizEnabledGroupJid}`);
            }
        }
    } catch (error) {
        console.error("Error loading quiz_state.json:", error);
    }
}

// Quiz state එක save කිරීම
function saveQuizState() {
    try {
        const dataDir = path.dirname(QUIZ_STATE_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        const state = { groupJid: quizEnabledGroupJid };
        fs.writeFileSync(QUIZ_STATE_FILE, JSON.stringify(state, null, 2), 'utf8'); 
        console.log(`Quiz state saved for JID: ${quizEnabledGroupJid}`);
    } catch (error) {
        console.error("Error saving quiz_state.json:", error);
    }
}

// Quiz Interval එක ආරම්භ කිරීමේ function එක
function startQuizInterval(conn, jid) {
    if (quizIntervalId) {
        clearInterval(quizIntervalId); 
        console.log(`Cleared existing quiz interval for ${jid}`);
    }
    quizIntervalId = setInterval(async () => {
        if (global.currentConn && quizEnabledGroupJid) {
            await sendQuizQuestion(global.currentConn, quizEnabledGroupJid);
        } else {
            console.warn("Global connection object (global.currentConn) not found or quiz not enabled for any group to send next question.");
            if (quizIntervalId && !quizEnabledGroupJid) {
                clearInterval(quizIntervalId);
                quizIntervalId = null;
                console.log("Quiz interval stopped due to no active quiz group.");
            }
        }
    }, 60 * 60 * 1000); 
    console.log(`Quiz interval started for ${jid}`);
}

// Bot start වන විට state එක load කරන්න
loadQuizState();

// --- Quiz Commands ---

// ප්‍රශ්නයක් යැවීම සඳහා වන function එක
async function sendQuizQuestion(conn, jid) {
    if (quizQuestions.length === 0) {
        await conn.sendMessage(jid, { text: "මට පෙන්වීමට ප්‍රශ්න නැත. කරුණාකර quiz_questions.json ගොනුව නිවැරදිව සකසා ඇති බවට තහවුරු කරන්න." });
        return false; // ප්‍රශ්නයක් යැවීමට නොහැකි වූ බව දක්වයි
    }

    currentQuizQuestionIndex = Math.floor(Math.random() * quizQuestions.length);
    const questionData = quizQuestions[currentQuizQuestionIndex];

    let questionText = `*MRD AI Quiz - ප්‍රශ්නය:*\n\n${questionData.question}\n\n`;
    const buttons = questionData.options.map((option, index) => ({
        buttonId: `quiz_answer_${index}`, 
        buttonText: { displayText: `${String.fromCharCode(65 + index)}. ${option}` }, 
        type: 1 
    }));

    const buttonMessage = {
        text: questionText,
        footer: "නිවැරදි පිළිතුර තෝරන්න:",
        buttons: buttons,
        headerType: 1
    };

    await conn.sendMessage(jid, buttonMessage);
    quizScore = {}; 
    console.log(`Sent quiz question to ${jid}. Question index: ${currentQuizQuestionIndex}`);
    return true; // ප්‍රශ්නය සාර්ථකව යැවූ බව දක්වයි
}


// .startmrdai Command (පැයෙන් පැයට Quiz එක ආරම්භ කිරීමට)
cmd({
    pattern: "startmrdai",
    react: "✅",
    desc: "Start MR D AI quiz in this group (hourly).",
    category: "quiz",
    use: '.startmrdai',
    filename: __filename
},
async(conn, mek, m,{from, isGroup, reply, isOwner, groupMetadata}) => {
    global.currentConn = conn;

    if (!isGroup) return reply("❌ *මෙම command එක Groups වලට පමණක් භාවිතා කළ හැක!*");
    if (!isOwner) return reply("❌ *මෙම command එක භාවිතා කළ හැක්කේ Bot Owner ට පමණි!*");

    if (quizEnabledGroupJid === from) {
        return reply("✅ *Quiz එක දැනටමත් මෙම Group එකේ සක්‍රීයයි!*");
    }

    quizEnabledGroupJid = from;
    saveQuizState(); 

    reply(`✅ *MR D AI Quiz එක "${groupMetadata.subject}" Group එකේ ආරම්භ කරන ලදී. සෑම පැයකට වරක්ම ප්‍රශ්නයක් එවනු ලැබේ.*`);
    
    // වහාම පළමු ප්‍රශ්නය යවන්න, පසුව interval එක ආරම්භ කරන්න
    await sendQuizQuestion(conn, from);
    startQuizInterval(conn, from); 
});


// .stopmrdai Command (Quiz එක නැවැත්වීමට)
cmd({
    pattern: "stopmrdai",
    react: "❌",
    desc: "Stop MR D AI quiz in this group.",
    category: "quiz",
    use: '.stopmrdai',
    filename: __filename
},
async(conn, mek, m,{from, isGroup, reply, isOwner}) => {
    if (!isGroup) return reply("❌ *මෙම command එක Groups වලට පමණක් භාවිතා කළ හැක!*");
    if (!isOwner) return reply("❌ *මෙම command එක භාවිතා කළ හැක්කේ Bot Owner ට පමණි!*");

    if (quizEnabledGroupJid !== from) {
        return reply("❌ *Quiz එක දැනටමත් මෙම Group එකේ සක්‍රීය නැත!*");
    }

    if (quizIntervalId) {
        clearInterval(quizIntervalId);
        quizIntervalId = null;
    }
    quizEnabledGroupJid = null;
    saveQuizState(); 

    reply("🛑 *MR D AI Quiz එක නවත්වන ලදී.*");
});

// --- .getmrdai Command (එසැණින් ප්‍රශ්නයක් ලබා ගැනීමට) ---
cmd({
    pattern: "getmrdai",
    react: "💡",
    desc: "Get a new MR D AI quiz question instantly.",
    category: "quiz",
    use: '.getmrdai',
    filename: __filename
},
async(conn, mek, m,{from, isGroup, reply}) => {
    global.currentConn = conn; // connection object එක update කරන්න

    if (!isGroup) return reply("❌ *මෙම command එක Groups වලට පමණක් භාවිතා කළ හැක!*");
    
    // ඕනෑම කණ්ඩායම් සාමාජිකයෙකුට මෙය භාවිතා කළ හැක. Owner check එකක් නැත.

    // ප්‍රශ්නයක් යැවීමට උත්සාහ කරන්න
    const sent = await sendQuizQuestion(conn, from);
    if (!sent) {
        reply("😔 *දැනට ප්‍රශ්නයක් යැවීමට නොහැක.* කරුණාකර quiz_questions.json ගොනුව පරීක්ෂා කරන්න.");
    }
});


// Quiz module එක export කරන්න, ප්‍රධාන Bot file එකට අවශ්‍ය variables සහ functions
module.exports = {
    quizEnabledGroupJid,
    quizIntervalId,
    currentQuizQuestionIndex,
    quizQuestions,
    quizScore,
    loadQuizState, 
    startQuizInterval 
};
