const fs = require('fs').promises; // Asynchronous file operations
const path = require('path'); // For resolving file paths

// Define paths to your JSON files relative to this file
const QUIZ_QUESTIONS_PATH = path.join(__dirname, '../data/quiz_questions.json');
const QUIZ_ANSWERS_PATH = path.join(__dirname, '../data/quiz_answers.json');

// --- Global variables for quiz state ---
// To store all quiz questions from quiz_questions.json
let quizQuestions = []; 
// To store all quiz answers descriptions from quiz_answers.json
let quizAnswersDescriptions = {}; 
// Map to store current quiz state for each group/chat
// Key: chat ID (e.g., groupId), Value: { currentQuestion: {}, answeredUsers: new Set(), correctAnswer: '' }
const activeQuizzes = new Map(); 

// --- Function to load quiz data from JSON files ---
async function loadQuizData() {
    try {
        const questionsData = await fs.readFile(QUIZ_QUESTIONS_PATH, 'utf8');
        quizQuestions = JSON.parse(questionsData);
        console.log(`Loaded ${quizQuestions.length} quiz questions.`);

        const answersData = await fs.readFile(QUIZ_ANSWERS_PATH, 'utf8');
        quizAnswersDescriptions = JSON.parse(answersData);
        console.log(`Loaded ${Object.keys(quizAnswersDescriptions).length} quiz answer descriptions.`);
    } catch (error) {
        console.error('Error loading quiz data:', error);
        // If files are not found or malformed, the bot might not start quiz correctly
        quizQuestions = []; // Reset to empty to prevent errors
        quizAnswersDescriptions = {};
        throw new Error('Failed to load quiz data. Check JSON files and paths.');
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
                await client.sendMessage(chatId, { text: 'දැනටමත් Quiz එකක් ක්‍රියාත්මකයි. නව Quiz එකක් ආරම්භ කිරීමට පෙර '.stopmrdai' විධානය භාවිතා කරන්න.' });
                return;
            }

            // Ensure we have questions loaded
            if (quizQuestions.length === 0) {
                await client.sendMessage(chatId, { text: 'මට දැනට ප්‍රශ්න පටවා ගැනීමට නොහැක. කරුණාකර JSON ගොනු පරීක්ෂා කරන්න.' });
                return;
            }

            // Select a random question
            const randomIndex = Math.floor(Math.random() * quizQuestions.length);
            const question = quizQuestions[randomIndex];

            // Initialize quiz state for this chat
            activeQuizzes.set(chatId, {
                currentQuestion: question,
                answeredUsers: new Set(), // To track who answered to prevent multiple tries for same question
                correctAnswer: question.answer.toLowerCase()
            });

            // Format question message
            let questionMessage = `*Mr.DAI Quiz Time! 🧠*\n\n`;
            questionMessage += `*ප්‍රශ්නය:* ${question.question}\n\n`;
            questionMessage += `*විකල්ප:*\n`;
            question.options.forEach((option, index) => {
                questionMessage += `${index + 1}. ${option}\n`;
            });
            questionMessage += `\nපිළිතුර සෘජුවම (උදා: ${question.options[0]}) ටයිප් කරන්න.`;

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
    // --- Message Listener for Answers ---
    // This part handles incoming messages that are NOT commands, to check for answers
    // This is called for every incoming message in index.js, so we need to filter
    async handleMessage({ client, message, body, isGroup, sender }) {
        const chatId = message.key.remoteJid;

        // Only process if there's an active quiz in this group and it's not a command
        if (isGroup && activeQuizzes.has(chatId) && !body.startsWith('.')) {
            const quizState = activeQuizzes.get(chatId);
            const { currentQuestion, answeredUsers, correctAnswer } = quizState;

            // Prevent users from answering multiple times for the same question
            if (answeredUsers.has(sender)) {
                // await client.sendMessage(chatId, { text: 'ඔබ මෙම ප්‍රශ්නයට දැනටමත් පිළිතුරු දී ඇත.' }, { quoted: message }); // Optional: inform user
                return; 
            }

            const receivedAnswer = body.toLowerCase().trim();

            // Check if the received answer matches the correct answer (case-insensitive, trimmed)
            if (receivedAnswer === correctAnswer) {
                const answerDescription = quizAnswersDescriptions[currentQuestion.answer] || 'පිළිතුර සඳහා විස්තරයක් නොමැත.';
                
                let replyMessage = `*නිවැරදි පිළිතුරයි!* 🎉\n`;
                replyMessage += `*පිළිතුර:* ${currentQuestion.answer}\n\n`;
                replyMessage += `*විස්තරය:* ${answerDescription}\n\n`;
                replyMessage += `ඊළඟ ප්‍රශ්නය සඳහා '.startmrdai' ටයිප් කරන්න, නැතහොත් Quiz එක නැවැත්වීමට '.stopmrdai' ටයිප් කරන්න.`;
                
                await client.sendMessage(chatId, { text: replyMessage }, { quoted: message });
                
                // End the current quiz for this group so a new one can be started
                activeQuizzes.delete(chatId); 
            } else {
                // Mark user as having attempted this question to prevent spamming answers
                answeredUsers.add(sender); 
                await client.sendMessage(chatId, { text: 'වැරදි පිළිතුරයි! නැවත උත්සාහ කරන්න.' }, { quoted: message });
            }
        }
    }
};
