const fs = require('fs').promises; // Asynchronous file operations
const path = require('path'); // For resolving file paths

// Define path to your quiz questions JSON file
const QUIZ_QUESTIONS_PATH = path.join(__dirname, '../data/quiz_questions.json');

// --- Global variables for quiz state ---
// To store all quiz questions from quiz_questions.json
let quizQuestions = []; 
// Map to store current quiz state for each group/chat
// We only need to know if a quiz is active to prevent starting another.
// Key: chat ID (e.g., groupId), Value: boolean (true if active)
const activeQuizzes = new Map(); 

// --- Function to load quiz data from JSON file ---
async function loadQuizData() {
    try {
        const questionsData = await fs.readFile(QUIZ_QUESTIONS_PATH, 'utf8');
        quizQuestions = JSON.parse(questionsData);
        console.log(`Loaded ${quizQuestions.length} quiz questions.`);
    } catch (error) {
        console.error('Error loading quiz data:', error);
        quizQuestions = []; // Reset to empty to prevent errors
        throw new Error('Failed to load quiz data. Check quiz_questions.json file and path.');
    }
}

// Load data when the module is first loaded
loadQuizData().catch(e => console.error("Initial quiz data load failed:", e));

// --- Quiz Command Function ---
module.exports = {
    name: 'quiz', // Command name (e.g., .quiz)
    description: 'Start and manage a quiz game.',
    command: ['.startmrdai', '.stopmrdai'], // Commands to trigger this plugin
    category: 'Fun', // Category for documentation
    async function({ client, message, body, isGroup, groupMetadata }) {
        const command = body.split(' ')[0].toLowerCase();
        const chatId = message.key.remoteJid;

        // Check if the command is called in a group
        if (!isGroup) {
            await client.sendMessage(chatId, { text: 'This command can only be used in a group.' });
            return;
        }

        // --- .startmrdai command logic ---
        if (command === '.startmrdai') {
            // Check if there's an active quiz in this chat
            if (activeQuizzes.has(chatId)) {
                await client.sendMessage(chatId, { text: `දැනටමත් Quiz එකක් ක්‍රියාත්මකයි. නව Quiz එකක් ආරම්භ කිරීමට පෙර '.stopmrdai' විධානය භාවිතා කරන්න.` });
                return;
            }

            // Ensure we have questions loaded
            if (quizQuestions.length === 0) {
                await client.sendMessage(chatId, { text: 'මට දැනට ප්‍රශ්න පටවා ගැනීමට නොහැක. කරුණාකර quiz_questions.json ගොනුව පරීක්ෂා කරන්න.' });
                return;
            }

            // Select a random question
            const randomIndex = Math.floor(Math.random() * quizQuestions.length);
            const question = quizQuestions[randomIndex];

            // Set quiz as active for this chat (no need for detailed state as we're not checking answers)
            activeQuizzes.set(chatId, true); 

            // Format question message
            let questionMessage = `*Mr.DAI Quiz Time! 🧠*\n\n`;
            questionMessage += `*ප්‍රශ්නය:* ${question.question}\n\n`;
            questionMessage += `*විකල්ප:*\n`;
            question.options.forEach((option, index) => {
                questionMessage += `${index + 1}. ${option}\n`;
            });
            // We no longer prompt for an answer as we're not checking it.
            questionMessage += `\nපිළිතුරු දන්නේ නම්, ඔබට ඊළඟ ප්‍රශ්නය සඳහා '.startmrdai' ලෙස ටයිප් කළ හැක, නැතහොත් Quiz එක නැවැත්වීමට '.stopmrdai' ලෙස ටයිප් කරන්න.`;


            await client.sendMessage(chatId, { text: questionMessage });

        }
        // --- .stopmrdai command logic ---
        else if (command === '.stopmrdai') {
            if (activeQuizzes.has(chatId)) {
                activeQuizzes.delete(chatId); // Remove active quiz for this chat
                await client.sendMessage(chatId, { text: 'Quiz එක සාර්ථකව අවසන් කරන ලදී.' });
            } else {
                await client.sendMessage(chatId, { text: 'මෙම Chat එකේ දැනට ක්‍රියාත්මක වන Quiz එකක් නොමැත.' });
            }
        }
    },
    // --- handleMessage function removed ---
    // Since we are not checking answers, this function is no longer needed.
    // Make sure your index.js also doesn't try to call handleMessage for this plugin.
};
