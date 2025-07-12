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

// Quiz answers (explanations) JSON file එක load කරගැනීම
const QUIZ_ANSWERS_FILE = path.join(__dirname, '../data/quiz_answers.json'); 
let quizExplanations = {}; // { correct_answer_letter: "Explanation text" }
try {
    quizExplanations = JSON.parse(fs.readFileSync(QUIZ_ANSWERS_FILE, 'utf8'));
} catch (error) {
    console.error(`Error loading quiz_answers.json from ${QUIZ_ANSWERS_FILE}:`, error.message);
    quizExplanations = {};
}

// Quiz ක්‍රියාත්මක වන group JID එක ගබඩා කිරීමට
const QUIZ_STATE_FILE = path.join(__dirname, '../data/quiz_state.json'); 
let quizEnabledGroupJid = null;
let quizIntervalId = null;
let currentQuizQuestionIndex = -1; // දැනට ක්‍රියාත්මක ප්‍රශ්නයේ index එක
let activeQuizQuestionJid = null; // ප්‍රශ්නය යැවූ JID
let activeQuizQuestionMessageId = null; // ප්‍රශ්න message එකේ ID එක (quoted reply සඳහා)
let answeredParticipants = new Set(); // දැනට ක්‍රියාත්මක ප්‍රශ්නයට පිළිතුරු දුන් අයගේ JIDs

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
    }, 60 * 60 * 1000); // 1 hour (60 minutes * 60 seconds * 1000 milliseconds)
    console.log(`Quiz interval started for ${jid}`);
}

// Bot start වන විට state එක load කරන්න
// Note: This is now called explicitly in index.js on connection open.
// loadQuizState(); // This line can be removed as it's called from index.js

// --- Helper Functions ---

function getContentType(message) {
    if (message.imageMessage) return 'imageMessage';
    if (message.videoMessage) return 'videoMessage';
    if (message.extendedTextMessage) return 'extendedTextMessage';
    if (message.buttonsResponseMessage) return 'buttonsResponseMessage';
    if (message.listResponseMessage) return 'listResponseMessage';
    if (message.templateButtonReplyMessage) return 'templateButtonReplyMessage';
    if (message.text) return 'text';
    return null;
}

// --- Quiz Commands ---

// ප්‍රශ්නයක් text එකක් ලෙස යැවීම සඳහා වන function එක
async function sendQuizQuestion(conn, jid) {
    if (quizQuestions.length === 0) {
        await conn.sendMessage(jid, { text: "මට පෙන්වීමට ප්‍රශ්න නැත. කරුණාකර quiz_questions.json ගොනුව නිවැරදිව සකසා ඇති බවට තහවුරු කරන්න." });
        return false; 
    }

    currentQuizQuestionIndex = Math.floor(Math.random() * quizQuestions.length);
    const questionData = quizQuestions[currentQuizQuestionIndex];

    let quizMessage = `*ප්‍රශ්නය:* ${questionData.question}\n\n`;
    questionData.options.forEach((option, index) => {
        quizMessage += `${String.fromCharCode(65 + index)}. ${option}\n`; // A. Option1, B. Option2, ... E. Option5
    });
    quizMessage += "\n*නිවැරදි පිළිතුරේ අකුර (A, B, C, D, E) type කරන්න.*";

    const sentMsg = await conn.sendMessage(jid, { text: quizMessage });
    
    activeQuizQuestionJid = jid;
    activeQuizQuestionMessageId = sentMsg.key.id; // ප්‍රශ්න message එකේ ID එක ගබඩා කරන්න
    answeredParticipants.clear(); // අලුත් ප්‍රශ්නයක් එවන විට පිළිතුරු දුන් අයගේ ලැයිස්තුව clear කරන්න
    console.log(`Sent quiz question (Text) to ${jid}. Question index: ${currentQuizQuestionIndex}, Message ID: ${activeQuizQuestionMessageId}`);
    return true; 
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
    activeQuizQuestionJid = null;
    activeQuizQuestionMessageId = null;
    answeredParticipants.clear(); 
    saveQuizState(); 

    reply("🛑 *MR D AI Quiz එක නවත්වන ලදී.*");
});

// .getmrdai Command (එසැණින් ප්‍රශ්නයක් ලබා ගැනීමට)
cmd({
    pattern: "getmrdai",
    react: "💡",
    desc: "Get a new MR D AI quiz question instantly.",
    category: "quiz",
    use: '.getmrdai',
    filename: __filename
},
async(conn, mek, m,{from, isGroup, reply}) => {
    global.currentConn = conn;

    if (!isGroup) return reply("❌ *මෙම command එක Groups වලට පමණක් භාවිතා කළ හැක!*");
    
    const sent = await sendQuizQuestion(conn, from);
    if (!sent) {
        reply("😔 *දැනට ප්‍රශ්නයක් යැවීමට නොහැක.* කරුණාකර quiz_questions.json ගොනුව පරීක්ෂා කරන්න.");
    }
});


// --- Incoming Message Handler (index.js වෙතින් කැඳවනු ලැබේ) ---
// මෙම function එක ලැබෙන සියලු messages handle කරයි
async function handleIncomingMessage(conn, mek) {
    if (!mek.message) return;
    if (mek.key.remoteJid === 'status@broadcast') return;
    if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return; // Baileys internal messages

    const from = mek.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = mek.key.fromMe ? (conn.user.id.includes(':') ? conn.user.id.split(':')[0] + '@s.whatsapp.net' : conn.user.id) : (mek.key.participant || from);
    const botNumber = conn.user.id.includes(':') ? conn.user.id.split(':')[0] : conn.user.id.split('@')[0];
    const fromMe = mek.key.fromMe;

    const messageType = getContentType(mek.message);
    let body = '';
    
    // Extract message text content
    if (messageType === 'extendedTextMessage') {
        body = mek.message.extendedTextMessage.text;
    } else if (messageType === 'buttonsResponseMessage') {
        body = mek.message.buttonsResponseMessage.selectedButtonId;
    } else if (messageType === 'listResponseMessage') {
        body = mek.message.listResponseMessage.singleSelectReply.selectedRowId;
    } else if (messageType === 'templateButtonReplyMessage') {
        body = mek.message.templateButtonReplyMessage.selectedId;
    } else if (messageType === 'imageMessage' && mek.message.imageMessage.caption) {
        body = mek.message.imageMessage.caption;
    } else if (messageType === 'videoMessage' && mek.message.videoMessage.caption) {
        body = mek.message.videoMessage.caption;
    } else if (messageType === 'documentMessage' && mek.message.documentMessage.caption) {
        body = mek.message.documentMessage.caption;
    } else if (messageType === 'text') {
        body = mek.message.text;
    }

    // Only process if a quiz is active and it's from the correct group
    // Also ensure it's not a command message (assuming commands start with a prefix)
    // global.config?.PREFIX යනු prefix එක global.config object එකෙන් ලබා ගැනීමට උත්සාහ කරයි
    const isCommand = body.startsWith(global.config?.PREFIX || '!'); 
    
    // Quiz ක්‍රියාත්මක වන group එකෙන්, Bot ගෙන් නොවන, command එකක් නොවන message එකක් නම්
    if (isGroup && quizEnabledGroupJid === from && currentQuizQuestionIndex !== -1 && !fromMe && !isCommand) {
        // Check if the participant has already answered this question
        if (answeredParticipants.has(sender)) {
            console.log(`Participant ${sender} has already answered for this quiz question. Ignoring.`);
            return; // Already answered, ignore duplicate
        }

        const questionData = quizQuestions[currentQuizQuestionIndex];
        const correctAnswerIndex = questionData.answer_index;
        const correctAnswerLetter = String.fromCharCode(65 + correctAnswerIndex); // "A", "B", "C", "D", "E" වැනි

        // User's answer, trimmed and converted to uppercase for case-insensitive comparison
        const userAnswer = body.trim().toUpperCase();

        if (userAnswer === correctAnswerLetter) {
            // Correct Answer
            const userName = await conn.getName(sender);
            // quizExplanations object එකෙන් නිවැරදි පිළිතුරට අදාළ පැහැදිලි කිරීම ලබා ගැනීම
            const explanationText = quizExplanations[correctAnswerLetter] || "ඔබගේ පිළිතුර නිවැරදියි!";
            
            // Reply message එක "User Name, ඔබගේ පිළිතුර නිවැරදියි! [Explanation]" format එකට සකස් කිරීම
            const replyMessage = `🎉 *${userName}*, ඔබගේ පිළිතුර නිවැරදියි! ${explanationText}`;

            await conn.sendMessage(from, { text: replyMessage }, { 
                quoted: { 
                    key: { remoteJid: from, id: activeQuizQuestionMessageId }, 
                    message: { conversation: questionData.question } // Quoted message is the original question
                } 
            });

            // Add participant to the set of answered participants for this question
            answeredParticipants.add(sender);
            console.log(`Correct answer from ${userName} (${sender}). Explanation: ${explanationText}`);
        } else {
            // Incorrect Answer - no reply needed for incorrect answers as per current requirement
            console.log(`Incorrect answer from ${sender}. Answered: ${userAnswer}, Correct: ${correctAnswerLetter}`);
        }
    }
}


// Quiz module එක export කරන්න, ප්‍රධාන Bot file එකට අවශ්‍ය variables සහ functions
module.exports = {
    quizEnabledGroupJid,
    quizIntervalId,
    currentQuizQuestionIndex,
    quizQuestions,
    activeQuizQuestionJid,
    activeQuizQuestionMessageId,
    loadQuizState, 
    startQuizInterval,
    handleIncomingMessage // සියලු incoming messages handle කිරීමට මෙම function එක export කරන්න
};
