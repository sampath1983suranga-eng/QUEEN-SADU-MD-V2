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
let activeQuizMessageId = null; // Poll message එකේ ID එක ගබඩා කිරීමට
let quizScore = {}; // { participantJid: score }

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
loadQuizState();

// --- Quiz Commands ---

// ප්‍රශ්නයක් Poll එකක් ලෙස යැවීම සඳහා වන function එක
async function sendQuizQuestion(conn, jid) {
    if (quizQuestions.length === 0) {
        await conn.sendMessage(jid, { text: "මට පෙන්වීමට ප්‍රශ්න නැත. කරුණාකර quiz_questions.json ගොනුව නිවැරදිව සකසා ඇති බවට තහවුරු කරන්න." });
        return false; 
    }

    currentQuizQuestionIndex = Math.floor(Math.random() * quizQuestions.length);
    const questionData = quizQuestions[currentQuizQuestionIndex];

    const pollOptions = questionData.options.map(option => ({ optionName: option }));

    const pollMessage = {
        poll: {
            name: questionData.question,
            values: pollOptions,
            selectableOptionsCount: 1 // එක් පිළිතුරක් පමණක් තෝරා ගැනීමට ඉඩ දෙන්න
        }
    };

    const sentMsg = await conn.sendMessage(jid, pollMessage);
    activeQuizMessageId = sentMsg.key.id; // යවන ලද poll message එකේ ID එක ගබඩා කරන්න
    quizScore = {}; // අලුත් ප්‍රශ්නයක් එවන විට score reset කරන්න
    console.log(`Sent quiz question (Poll) to ${jid}. Question index: ${currentQuizQuestionIndex}, Message ID: ${activeQuizMessageId}`);
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
    activeQuizMessageId = null; // Stop කරන විට active quiz message එකත් remove කරන්න
    quizScore = {}; // Stop කරන විට score reset කරන්න
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

// --- Poll Vote Handling Function (මෙය index.js වෙතින් කැඳවනු ලැබේ) ---
async function handlePollVote(conn, update) {
    if (!quizEnabledGroupJid || !activeQuizMessageId || currentQuizQuestionIndex === -1) {
        // Quiz active නැතිනම් හෝ ප්‍රශ්නයක් යවා නොමැති නම් ignore කරන්න
        return;
    }

    // අදාළ group එකෙන් සහ message එකෙන්දැයි පරීක්ෂා කරන්න
    if (update.pollUpdates[0] && update.pollUpdates[0].pollId === activeQuizMessageId && update.id === quizEnabledGroupJid) {
        const pollUpdate = update.pollUpdates[0];
        const voterJid = pollUpdate.voter; // ಮತය දුන් පුද්ගලයාගේ JID එක
        const selectedOptions = pollUpdate.selectedOptions; // තෝරාගත් options

        if (selectedOptions.length === 0) {
            // තේරීමක් ඉවත් කළා නම් (unvote)
            return;
        }

        // තෝරාගත් පිළිතුරේ index එක ලබා ගැනීම (පළමු option එක පමණක් සලකනු ලැබේ)
        const selectedOptionBuffer = selectedOptions[0];
        const selectedOption = Buffer.from(selectedOptionBuffer).toString('utf8');

        const questionData = quizQuestions[currentQuizQuestionIndex];
        let userAnswerIndex = -1;
        // තෝරාගත් option එක, මුල් options සමග සසඳා index එක සොයා ගැනීම
        for (let i = 0; i < questionData.options.length; i++) {
            if (questionData.options[i] === selectedOption) {
                userAnswerIndex = i;
                break;
            }
        }

        if (userAnswerIndex === -1) {
            console.warn(`Could not find selected option '${selectedOption}' in quiz options.`);
            return;
        }
        
        const isCorrect = (userAnswerIndex === questionData.answer_index);
        const userName = quizScore[voterJid] ? quizScore[voterJid].name : (await conn.getName(voterJid)); // Name එක ලබාගන්න

        let replyMessage = "";
        if (isCorrect) {
            if (!quizScore[voterJid]) {
                quizScore[voterJid] = { name: userName, score: 0 };
            }
            quizScore[voterJid].score++;
            replyMessage = `🎉 *${userName}* නිවැරදි පිළිතුර තෝරාගත්තා!\n\n_ඔබගේ මුළු ලකුණු: ${quizScore[voterJid].score}_\n\n*පැහැදිලි කිරීම:* ${questionData.explanation}`;
        } else {
            const correctAnswerText = questionData.options[questionData.answer_index];
            replyMessage = `❌ *${userName}* වැරදි පිළිතුරක් තෝරාගත්තා.\nනිවැරදි පිළිතුර වන්නේ: *${String.fromCharCode(65 + questionData.answer_index)}. ${correctAnswerText}*\n\n*පැහැදිලි කිරීම:* ${questionData.explanation}`;
        }
        
        // පිළිතුර යවන්න
        await conn.sendMessage(quizEnabledGroupJid, { text: replyMessage }, { quoted: { key: { remoteJid: quizEnabledGroupJid, id: activeQuizMessageId }, message: { pollCreationMessage: { title: questionData.question } } } });

        // එක් ප්‍රශ්නයකට එක් වරක් පමණක් ලකුණු දීමට
        // දැනටමත් පිළිතුරු දී ඇත්නම්, නැවත ලකුණු නොදීමට
        if (!quizScore[voterJid] || quizScore[voterJid].hasAnswered === undefined) {
             // (ලකුණු එකතු කිරීමේ logic එක මෙහි ඉහළින් සිදු කර ඇත)
            quizScore[voterJid] = { ...quizScore[voterJid], hasAnswered: true }; // නැවත පිළිතුරු දීම වැළැක්වීමට
        }
        
        // ප්‍රශ්නයට පිළිතුරු ලැබුණු පසු active quiz එක reset කරන්න (අවශ්‍ය නම්, හෝ ඊළඟ ප්‍රශ්නයට යන්න කලින්)
        //activeQuizMessageId = null; 
        //currentQuizQuestionIndex = -1;
    }
}


// Quiz module එක export කරන්න, ප්‍රධාන Bot file එකට අවශ්‍ය variables සහ functions
module.exports = {
    quizEnabledGroupJid,
    quizIntervalId,
    currentQuizQuestionIndex,
    quizQuestions,
    quizScore,
    activeQuizMessageId, // මෙයත් export කරන්න
    loadQuizState, 
    startQuizInterval,
    handlePollVote // Poll vote handler function එක export කරන්න
};
