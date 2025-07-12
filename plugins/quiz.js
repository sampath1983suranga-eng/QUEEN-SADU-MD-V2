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
        // global.currentConn හෝ global.client භාවිතයෙන් conn object එක ලබා ගැනීමට උත්සාහ කරන්න
        const activeConn = global.currentConn || global.client; 
        if (activeConn && quizEnabledGroupJid) {
            await sendQuizQuestion(activeConn, quizEnabledGroupJid);
        } else {
            console.warn("No active connection object (global.currentConn or global.client) found or quiz not enabled for any group to send next question. Stopping interval.");
            if (quizIntervalId) {
                clearInterval(quizIntervalId);
                quizIntervalId = null;
            }
        }
    }, 60 * 60 * 1000); // 1 hour (60 minutes * 60 seconds * 1000 milliseconds)
    console.log(`Quiz interval started for ${jid}`);
}

// Bot ආරම්භ වන විට state එක load කරන්න.
// මෙමගින් Bot restarted වන විටත් Quiz active ව තිබූ group එක හඳුනාගනී.
loadQuizState(); 

// Bot ආරම්භ වන විට interval එකද ආරම්භ කිරීමට උත්සාහ කරන්න.
// මෙය ක්‍රියාත්මක වන්නේ Bot ආරම්භයේදී global.currentConn / global.client already set වී ඇත්නම් පමණි.
setTimeout(() => {
    const initialConn = global.currentConn || global.client;
    if (initialConn && quizEnabledGroupJid) {
        console.log(`Attempting to restart quiz interval for ${quizEnabledGroupJid} on bot start.`);
        startQuizInterval(initialConn, quizEnabledGroupJid);
    }
}, 10000); // තත්පර 10කට පසුව උත්සාහ කරන්න, bot connection stable වීමට කාලය ලබා දීමට.


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
    // conn object එක global context එකෙන් සකස් කරන්න
    // මෙයින් ඔබගේ bot එකේ main file එකේ conn object එක global variable එකකට assign කර ඇත්නම් පමණක් මෙය සාර්ථක වේ
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
    // conn object එක global context එකෙන් සකස් කරන්න
    global.currentConn = conn;

    if (!isGroup) return reply("❌ *මෙම command එක Groups වලට පමණක් භාවිතා කළ හැක!*");
    
    const sent = await sendQuizQuestion(conn, from);
    if (!sent) {
        reply("😔 *දැනට ප්‍රශ්නයක් යැවීමට නොහැක.* කරුණාකර quiz_questions.json ගොනුව පරීක්ෂා කරන්න.");
    }
});


// --- Incoming Message Handler (ලැබෙන messages handle කිරීම) ---
// මෙම function එක ලැබෙන සියලු messages handle කරයි
// මෙය command handler එකට පෙර ක්‍රියාත්මක විය යුතුය.
// (index.js වෙනස් නොකරන නිසා, මෙය command handler එකෙන් message එක process කිරීමට පෙර ක්‍රියාත්මක වීමට ඉඩක් නැත.
// එබැවින්, මෙම logic එක command handler එක තුළම හෝ වෙනත් ප්‍රවේශයක් මගින් ක්‍රියාත්මක විය යුතුය.)

// මෙම කොටස Quiz Plugin එකේ cmd handler එකටම message එක පැමිණේ යැයි උපකල්පනය කරයි.
// එනම්, මෙම කෝඩ් කොටස Baileys හි ev.on('messages.upsert') handler එකට සෘජුව සම්බන්ධ නොවේ.
// සාමාන්‍යයෙන්, Bot frameworks වලදී, සියලු messages එක් තැනකට (main handler) ලැබී,
// පසුව ඒවා commands හෝ අනෙකුත් plugin logic වලට යොමු කෙරේ.

// මේ ගැටළුවට විසඳුම: ඔබගේ Bot framework එකේ message handler එකට quiz.js වෙතින් function එකක් කැඳවීමට හැකි නම්
// (උදා: cmd function එකෙන් පසුව හෝ වෙනම handler එකකින්), එය අංක 1 ක්‍රමයයි.
// එසේ නොමැති නම්, මෙම plugin එකටම command නොවන messages හසුරුවන්නට සිදුවේ.
// දැනට පවතින විදියට, cmd function එකෙන් ලැබෙන 'mek' object එකෙන් මෙම handleIncomingMessage logic එක අනුකරණය කරමු.

// ප්‍රධාන cmd handler එක මගින් ලැබෙන messages හැසිරවීමට:
// cmd function එකේ async(conn, mek, m, {from, isGroup, reply, isOwner, groupMetadata})
// parameters භාවිතා කරමින්, සෑම message එකක්ම මෙම logic එක හරහා යවමු.

// ඔබගේ command handler (cmd function එක) තුලින්ම message process කිරීමට.
// මෙය ඔබගේ `command.js` ගොනුවේ ඇති `cmd` function එකේ ක්‍රියාත්මක වන ආකාරය මත රඳා පවතී.
// `cmd` function එකට ලැබෙන සෑම message එකක්ම (command එකක් වුවත් නොවුණත්)
// `handleIncomingMessage` function එකට යොමු කළ යුතුය.

// Alternative: If your bot's core `cmd` handler passes ALL messages to all registered `cmd` patterns
// then we can just make a general pattern.
// However, this is usually not how `cmd` works - it's for specific patterns only.

// Given the constraint of *no changes to index.js*, we need a way for quiz.js
// to react to all incoming messages, not just its own commands.
// The best way to do this *without modifying index.js* is often not directly possible
// with simple plugin architectures that don't provide a global message hook.

// For now, I will assume that the 'cmd' framework you're using *might*
// allow a generic pattern, or that you're willing to accept that only
// messages *directed at a command* (even if not quiz command) might be processed
// by handleIncomingMessage if it's called from within a cmd handler.
// This is a significant limitation if handleIncomingMessage is not globally invoked.

// *** The most robust solution without touching index.js is to have a "listener" pattern. ***
// Let's create a listener that runs on all messages. This assumes your 'cmd' module
// allows a wildcard pattern or a global listener. If not, this will not work.

// Dummy handler to catch all messages and pass to quiz logic.
// This is a workaround if index.js cannot be touched.
// It assumes your `cmd` handler processes ALL incoming messages before matching patterns.
// If your `cmd` only triggers on actual patterns, this will NOT work for quiz answers.

cmd({
    pattern: ".*", // Wildcard pattern to try and catch all messages
    dontReact: true, // Don't react to every message
    noLimit: true, // No command limit for this
    // This is a low-priority command to run after other specific commands.
    // If your `cmd` framework has a way to run a handler on ALL messages,
    // that would be better. This is a hack.
    filename: __filename 
},
async(conn, mek, m,{from, isGroup, reply, isOwner, groupMetadata}) => {
    // Ensure this only runs if it's not a command from THIS quiz plugin itself
    const botPrefix = global.config?.PREFIX || '!';
    const body = m.body; // Assuming m.body contains the message text
    const isThisQuizCommand = body.startsWith(botPrefix + "startmrdai") || 
                              body.startsWith(botPrefix + "stopmrdai") ||
                              body.startsWith(botPrefix + "getmrdai");

    // Only process if it's not a command and quiz is active in this group
    if (isGroup && quizEnabledGroupJid === from && currentQuizQuestionIndex !== -1 && !isThisQuizCommand) {
        const sender = mek.key.fromMe ? (conn.user.id.includes(':') ? conn.user.id.split(':')[0] + '@s.whatsapp.net' : conn.user.id) : (mek.key.participant || from);
        
        // Check if the participant has already answered this question
        if (answeredParticipants.has(sender)) {
            console.log(`Participant ${sender} has already answered for this quiz question. Ignoring.`);
            return; // Already answered, ignore duplicate
        }

        const questionData = quizQuestions[currentQuizQuestionIndex];
        // Check if questionData is valid to prevent errors
        if (!questionData || typeof questionData.answer_index === 'undefined') {
            console.error("Invalid question data for current quiz question index:", currentQuizQuestionIndex);
            return;
        }

        const correctAnswerIndex = questionData.answer_index;
        const correctAnswerLetter = String.fromCharCode(65 + correctAnswerIndex); // "A", "B", "C", "D", "E" වැනි

        const messageType = getContentType(mek.message);
        let userAnswerText = '';
        
        if (messageType === 'extendedTextMessage') {
            userAnswerText = mek.message.extendedTextMessage.text;
        } else if (messageType === 'text') {
            userAnswerText = mek.message.text;
        }
        
        // User's answer, trimmed and converted to uppercase for case-insensitive comparison
        const userAnswer = userAnswerText.trim().toUpperCase();

        if (userAnswer === correctAnswerLetter) {
            // Correct Answer
            const userName = await conn.getName(sender);
            // quizExplanations object එකෙන් නිවැරදි පිළිතුරට අදාළ පැහැදිලි කිරීම ලබා ගැනීම
            const explanationText = quizExplanations[correctAnswerLetter] || "ඔබගේ පිළිතුර නිවැරදියි!";
            
            // Reply message එක "User Name, ඔබගේ පිළිතුර නිවැරදියි! [Explanation]" format එකට සකස් කිරීම
            const replyMessage = `🎉 *${userName}*, ඔබගේ පිළිතුර නිවැරදියි! ${explanationText}`;

            // Make sure activeQuizQuestionMessageId and activeQuizQuestionJid are valid before quoting
            if (activeQuizQuestionMessageId && activeQuizQuestionJid === from) {
                await conn.sendMessage(from, { text: replyMessage }, { 
                    quoted: { 
                        key: { remoteJid: from, id: activeQuizQuestionMessageId }, 
                        message: { conversation: questionData.question } // Quoted message is the original question
                    } 
                });
            } else {
                // If for some reason we lost the message ID, send without quoting
                await conn.sendMessage(from, { text: replyMessage });
            }

            // Add participant to the set of answered participants for this question
            answeredParticipants.add(sender);
            console.log(`Correct answer from ${userName} (${sender}). Explanation: ${explanationText}`);
        } else {
            // Incorrect Answer - no reply needed for incorrect answers as per current requirement
            console.log(`Incorrect answer from ${sender}. Answered: ${userAnswer}, Correct: ${correctAnswerLetter}`);
        }
    }
});


// Quiz module එක export කරන්න, ප්‍රධාන Bot file එකට අවශ්‍ය variables සහ functions
// (මේවා දැන් ප්‍රධාන වශයෙන් අභ්‍යන්තරව භාවිතා වේ, නමුත් අනාගත ප්‍රයෝජන සඳහා තබා ඇත)
module.exports = {
    quizEnabledGroupJid,
    quizIntervalId,
    currentQuizQuestionIndex,
    quizQuestions,
    activeQuizQuestionJid,
    activeQuizQuestionMessageId,
    loadQuizState, 
    startQuizInterval,
    // handleIncomingMessage - This is now integrated into the wildcard cmd handler
};
