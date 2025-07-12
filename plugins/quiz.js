const config = require('../config')
const {cmd , commands} = require('../command')
const fs = require('fs').promises; // Asynchronous file operations
const path = require('path'); // For resolving file paths

// Define path to your quiz questions JSON file
const QUIZ_QUESTIONS_PATH = path.join(__dirname, '../data/quiz_questions.json');

// --- Global variables for quiz state ---
let quizQuestions = []; 
// Map to store active quiz state for each group/chat, to prevent multiple simultaneous manual quizzes
const activeManualQuizzes = new Map(); 
// Map to store auto quiz intervals for each group/chat
const autoQuizIntervals = new Map();

// --- Configuration for Auto Quiz ---
const AUTO_QUIZ_INTERVAL_HOURS = 2; // Auto send a quiz every 2 hours
const AUTO_QUIZ_DELAY_MS = AUTO_QUIZ_INTERVAL_HOURS * 60 * 60 * 1000; // Convert hours to milliseconds

// --- Function to load quiz data from JSON file ---
async function loadQuizData() {
    try {
        const questionsData = await fs.readFile(QUIZ_QUESTIONS_PATH, 'utf8');
        quizQuestions = JSON.parse(questionsData);
        console.log(`Loaded ${quizQuestions.length} quiz questions for quiz plugin.`);
    } catch (error) {
        console.error('Error loading quiz data for quiz plugin:', error);
        quizQuestions = []; // Reset to empty to prevent errors
        throw new Error('Failed to load quiz data. Check quiz_questions.json file and path.');
    }
}

// Function to send a random quiz question to a specific chat
async function sendRandomQuizQuestion(client, chatId) {
    if (quizQuestions.length === 0) {
        await client.sendMessage(chatId, { text: 'මට දැනට ප්‍රශ්න පටවා ගැනීමට නොහැක. කරුණාකර quiz_questions.json ගොනුව පරීක්ෂා කරන්න.' });
        return;
    }

    const randomIndex = Math.floor(Math.random() * quizQuestions.length);
    const question = quizQuestions[randomIndex];

    let questionMessage = `*Mr.DAI Quiz Time! 🧠*\n\n`;
    questionMessage += `*ප්‍රශ්නය:* ${question.question}\n\n`;
    questionMessage += `*විකල්ප:*\n`;
    question.options.forEach((option, index) => {
        questionMessage += `${index + 1}. ${option}\n`;
    });
    questionMessage += `\nඔබට ඊළඟ ප්‍රශ්නයක් අවශ්‍ය නම් '.startmrdai' ලෙස ටයිප් කළ හැක.`;

    await client.sendMessage(chatId, { text: questionMessage });
}


// --- Quiz Command Function ---
module.exports = {
    name: 'quiz', // Command name for internal reference
    description: 'Starts a quiz game by sending a random question.',
    command: ['.startmrdai', '.stopautodai', '.startautodai'], // Add .startautodai and .stopautodai for auto quiz
    category: 'Fun', 
    
    // This function runs when the bot starts and is ready.
    // It is designed to start auto-quizzes for groups.
    // NOTE: This will be called only once on bot startup.
    onStart: async ({ client }) => {
        // Here you might load previous group IDs from a database
        // and start auto-quiz intervals for them.
        // For simplicity, let's assume it starts for any group that
        // uses .startautodai during runtime, or you hardcode group IDs.
        // A more robust solution would involve a database to store which groups have auto-quiz enabled.

        // Example: If you want to enable auto-quiz for a specific group on startup:
        // const specificGroupId = "1234567890@g.us"; // Replace with actual group ID
        // if (!autoQuizIntervals.has(specificGroupId)) {
        //     console.log(`[QUIZ] Starting auto quiz for ${specificGroupId} on bot startup.`);
        //     const intervalId = setInterval(() => sendRandomQuizQuestion(client, specificGroupId), AUTO_QUIZ_DELAY_MS);
        //     autoQuizIntervals.set(specificGroupId, intervalId);
        // }
    },

    async function({ client, message, body, isGroup, groupMetadata }) {
        const command = body.split(' ')[0].toLowerCase();
        const chatId = message.key.remoteJid;

        if (!isGroup) {
            await client.sendMessage(chatId, { text: 'This command can only be used in a group.' });
            return;
        }

        // --- .startmrdai command logic (Manual Quiz) ---
        if (command === '.startmrdai') {
            if (activeManualQuizzes.has(chatId)) {
                await client.sendMessage(chatId, { text: `දැනටමත් manual Quiz එකක් ක්‍රියාත්මකයි. ඊළඟ ප්‍රශ්නය ලබා ගැනීමට පෙර ඉවසන්න.` });
                return;
            }

            activeManualQuizzes.set(chatId, true); // Mark manual quiz as active
            await sendRandomQuizQuestion(client, chatId);

            // Remove the active manual quiz after a short delay (e.g., 1 minute)
            // This allows the user to request another question after some time.
            setTimeout(() => {
                activeManualQuizzes.delete(chatId);
            }, 60 * 1000); // Allow another manual quiz in 1 minute

        }
        // --- .startautodai command logic (Start Auto Quiz) ---
        else if (command === '.startautodai') {
            if (autoQuizIntervals.has(chatId)) {
                await client.sendMessage(chatId, { text: 'මෙම Chat එකේ දැනටමත් Auto Quiz ක්‍රියාත්මකයි.' });
                return;
            }

            // Start the interval for this chat
            const intervalId = setInterval(() => sendRandomQuizQuestion(client, chatId), AUTO_QUIZ_DELAY_MS);
            autoQuizIntervals.set(chatId, intervalId);
            await client.sendMessage(chatId, { text: `Auto Quiz සාර්ථකව ආරම්භ කරන ලදී. සෑම පැය ${AUTO_QUIZ_INTERVAL_HOURS} කට වරක් නව ප්‍රශ්නයක් ලැබෙනු ඇත.` });
            console.log(`[QUIZ] Auto quiz started for chat ID: ${chatId}`);

        }
        // --- .stopautodai command logic (Stop Auto Quiz) ---
        else if (command === '.stopautodai') {
            if (autoQuizIntervals.has(chatId)) {
                clearInterval(autoQuizIntervals.get(chatId)); // Stop the interval
                autoQuizIntervals.delete(chatId); // Remove from map
                await client.sendMessage(chatId, { text: 'Auto Quiz සාර්ථකව නවත්වන ලදී.' });
                console.log(`[QUIZ] Auto quiz stopped for chat ID: ${chatId}`);
            } else {
                await client.sendMessage(chatId, { text: 'මෙම Chat එකේ දැනට ක්‍රියාත්මක වන Auto Quiz එකක් නොමැත.' });
            }
        }
    }
};

// Load data when the module is first loaded (important!)
loadQuizData().catch(e => console.error("Initial quiz data load failed:", e));
