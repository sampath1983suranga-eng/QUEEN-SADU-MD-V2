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
        const activeConn = global.currentConn || global.client; 
        if (activeConn && quizEnabledGroupJid) {
            await sendQuizQuestion(activeConn, quizEnabledGroupJid);
        } else {
            console.warn("No active connection object found or quiz not enabled for any group. Stopping interval.");
            if (quizIntervalId) {
                clearInterval(quizIntervalId);
                quizIntervalId = null;
            }
        }
    }, 60 * 60 * 1000); // 1 hour (60 minutes * 60 seconds * 1000 milliseconds)
    console.log(`Quiz interval started for ${jid}`);
}

// Bot ආරම්භ වන විට state එක load කරන්න.
loadQuizState(); 

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


// .startmrdai Command (පැයෙන් පැයට Quiz එක ආරම්භ කිරීමට) - දැන් ඕනෑම කෙනෙකුට භාවිතා කළ හැක
cmd({
    pattern: "startmrdai",
    react: "✅",
    desc: "Start MR D AI quiz in this group (hourly).",
    category: "quiz",
    use: '.startmrdai',
    filename: __filename,
    // isOwner: false, // Owner check එක ඉවත් කර ඇත
    // isAdmim: false, // Admin check එක ඉවත් කර ඇත (මේවා සාමාන්‍යයෙන් cmd function එකේ arguments වලින් පාලනය වේ)
},
async(conn, mek, m,{from, isGroup, reply}) => { // isOwner remove කර ඇත
    // Global connection object එක set කරන්න
    global.currentConn = conn; 

    if (!isGroup) return reply("❌ *මෙම command එක Groups වලට පමණක් භාවිතා කළ හැක!*");
    // isOwner / isAdmin check ඉවත් කර ඇත - දැන් ඕනෑම කෙනෙකුට භාවිතා කළ හැක

    if (quizEnabledGroupJid === from) {
        return reply("✅ *Quiz එක දැනටමත් මෙම Group එකේ සක්‍රීයයි!*");
    }

    quizEnabledGroupJid = from;
    saveQuizState(); 

    // Group metadata ලබා ගැනීමට උත්සාහ කිරීම
    let groupName = "මෙම Group එකේ"; 
    try {
        const metadata = await conn.groupMetadata(from);
        if (metadata && metadata.subject) {
            groupName = `"${metadata.subject}" Group එකේ`;
        }
    } catch (e) {
        console.error("Error fetching group metadata in quiz.js (startmrdai):", e.message);
    }

    reply(`✅ *MR D AI Quiz එක ${groupName} ආරම්භ කරන ලදී. සෑම පැයකට වරක්ම ප්‍රශ්නයක් එවනු ලැබේ.*`);
    
    // වහාම පළමු ප්‍රශ්නය යවන්න, පසුව interval එක ආරම්භ කරන්න
    await sendQuizQuestion(conn, from);
    startQuizInterval(conn, from); 
});


// .stopmrdai Command (Quiz එක නැවැත්වීමට) - දැන් ඕනෑම කෙනෙකුට භාවිතා කළ හැක
cmd({
    pattern: "stopmrdai",
    react: "❌",
    desc: "Stop MR D AI quiz in this group.",
    category: "quiz",
    use: '.stopmrdai',
    filename: __filename,
    // isOwner: false, // Owner check එක ඉවත් කර ඇත
    // isAdmim: false, // Admin check එක ඉවත් කර ඇත
},
async(conn, mek, m,{from, isGroup, reply}) => { // isOwner remove කර ඇත
    if (!isGroup) return reply("❌ *මෙම command එක Groups වලට පමණක් භාවිතා කළ හැක!*");
    // isOwner / isAdmin check ඉවත් කර ඇත - දැන් ඕනෑම කෙනෙකුට භාවිතා කළ හැක

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

// .getmrdai Command (එසැණින් ප්‍රශ්නයක් ලබා ගැනීමට) - දැන් ඕනෑම කෙනෙකුට භාවිතා කළ හැක
cmd({
    pattern: "getmrdai",
    react: "💡",
    desc: "Get a new MR D AI quiz question instantly.",
    category: "quiz",
    use: '.getmrdai',
    filename: __filename
},
async(conn, mek, m,{from, isGroup, reply}) => { 
    // Global connection object එක set කරන්න
    global.currentConn = conn;

    if (!isGroup) return reply("❌ *මෙම command එක Groups වලට පමණක් භාවිතා කළ හැක!*");
    
    const sent = await sendQuizQuestion(conn, from);
    if (!sent) {
        reply("😔 *දැනට ප්‍රශ්නයක් යැවීමට නොහැක.* කරුණාකර quiz_questions.json ගොනුව පරීක්ෂා කරන්න.");
    }
});

// --- Baileys messages.upsert event listener එක Quiz module එක තුළින්ම register කිරීම ---
// මෙය `index.js` වෙනස් නොකර, සියලු incoming messages වලට react කිරීමට උත්සාහ කරන "hack" එකයි.
// 'conn' object එක global.currentConn හෝ global.client ලෙස තිබිය යුතුයි.

// Bot එක start වන විට මෙම listener එක register කිරීමට උත්සාහ කරන්න.
setTimeout(() => {
    const connInstance = global.currentConn || global.client;
    if (connInstance && !connInstance._quizMessageUpsertHandlerRegistered) {
        console.log("Registering quiz message upsert handler...");
        
        // Ensure that there is an existing 'ev' event emitter from Baileys
        if (connInstance.ev) {
            connInstance.ev.on('messages.upsert', async ({ messages }) => {
                for (let i = 0; i < messages.length; i++) {
                    const mek = messages[i];
                    // Ignore messages from the bot itself or status messages
                    if (mek.key.fromMe || mek.key.remoteJid === 'status@broadcast') continue;

                    const from = mek.key.remoteJid;
                    const isGroup = from && from.endsWith('@g.us');

                    // Only process if it's a group message and quiz is active in this group
                    if (isGroup && quizEnabledGroupJid === from && currentQuizQuestionIndex !== -1) {
                        const sender = mek.key.participant || from; 
                        
                        // Check if the participant has already answered this question
                        if (answeredParticipants.has(sender)) {
                            // console.log(`Participant ${sender} has already answered for this quiz question. Ignoring.`);
                            continue; // Already answered, ignore duplicate
                        }

                        const questionData = quizQuestions[currentQuizQuestionIndex];
                        if (!questionData || typeof questionData.answer_index === 'undefined') {
                            console.error("Invalid question data for current quiz question index:", currentQuizQuestionIndex);
                            continue;
                        }

                        const correctAnswerIndex = questionData.answer_index;
                        const correctAnswerLetter = String.fromCharCode(65 + correctAnswerIndex); // "A", "B", "C", "D", "E" වැනි

                        const messageType = getContentType(mek.message);
                        let userAnswerText = '';
                        
                        if (messageType === 'extendedTextMessage') {
                            userAnswerText = mek.message.extendedTextMessage.text;
                        } else if (messageType === 'text') {
                            userAnswerText = mek.message.text;
                        } else {
                            continue; // Ignore non-text messages for quiz answers
                        }
                        
                        // User's answer, trimmed and converted to uppercase for case-insensitive comparison
                        const userAnswer = userAnswerText.trim().toUpperCase();

                        // Get the bot prefix (if available) to avoid responding to commands as answers
                        const botPrefix = global.config?.PREFIX || '!'; 
                        if (userAnswer.startsWith(botPrefix)) {
                            // It's likely a command, ignore for quiz answer
                            continue;
                        }

                        if (userAnswer === correctAnswerLetter) {
                            // Correct Answer
                            const userName = await connInstance.getName(sender);
                            const explanationText = quizExplanations[correctAnswerLetter] || "ඔබගේ පිළිතුර නිවැරදියි!";
                            
                            const replyMessage = `🎉 *${userName}*, ඔබගේ පිළිතුර නිවැරදියි! ${explanationText}`;

                            // Make sure activeQuizQuestionMessageId and activeQuizQuestionJid are valid before quoting
                            if (activeQuizQuestionMessageId && activeQuizQuestionJid === from) {
                                await connInstance.sendMessage(from, { text: replyMessage }, { 
                                    quoted: { 
                                        key: { remoteJid: from, id: activeQuizQuestionMessageId, fromMe: false }, 
                                        message: { conversation: questionData.question } 
                                    } 
                                });
                            } else {
                                await connInstance.sendMessage(from, { text: replyMessage });
                            }

                            answeredParticipants.add(sender);
                            console.log(`Correct answer from ${userName} (${sender}). Answered: ${userAnswer}, Correct: ${correctAnswerLetter}. Explanation: ${explanationText}`);
                        } else {
                            // Incorrect Answer - Do nothing (as per previous requirement to only reply to correct answers).
                            // If you want to reply to incorrect answers, uncomment and modify below:
                            // const userName = await connInstance.getName(sender);
                            // await connInstance.sendMessage(from, { text: `Sorry ${userName}, that's incorrect.` });
                            // console.log(`Incorrect answer from ${sender}. Answered: ${userAnswer}, Correct: ${correctAnswerLetter}`);
                        }
                    }
                }
            });
            connInstance._quizMessageUpsertHandlerRegistered = true; // Mark as registered to avoid multiple registrations
            
            // Also try to restart interval on bot start if quiz was enabled
            if (quizEnabledGroupJid) {
                console.log(`Attempting to restart quiz interval for ${quizEnabledGroupJid} on bot start.`);
                startQuizInterval(connInstance, quizEnabledGroupJid);
            }
        } else {
            console.error("Connection instance does not have an 'ev' event emitter. Cannot register messages.upsert handler.");
        }

    } else if (connInstance && connInstance._quizMessageUpsertHandlerRegistered) {
        console.log("Quiz message upsert handler already registered.");
    } else {
        console.log("No connection instance (global.currentConn or global.client) found to register quiz upsert handler or it's not ready yet.");
    }
}, 15000); // තත්පර 15කට පසුව උත්සාහ කරන්න, bot connection stable වීමට සහ global.currentConn / global.client set වීමට.

// Quiz module එක export කරන්න
module.exports = {
    quizEnabledGroupJid,
    quizIntervalId,
    currentQuizQuestionIndex,
    quizQuestions,
    activeQuizQuestionJid,
    activeQuizQuestionMessageId,
    loadQuizState, 
    startQuizInterval,
};
