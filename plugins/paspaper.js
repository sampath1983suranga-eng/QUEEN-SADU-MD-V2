// plugins/pp.js (Local JSON Files Reading)

const { cmd } = require('../command'); 
const axios = require('axios'); // තවමත් Axios තියාගමු, සමහරවිට වෙනත් තැනකට ඕන වෙයි
const config = require('../config'); 
const path = require('path'); // File paths handle කරන්න අවශ්‍යයි

// JSON files වලට Local Paths මෙතන සඳහන් කරන්න
// __dirname කියන්නේ මේ plugin file එක තියෙන folder එකේ path එක
// '..' කියන්නේ ඒ folder එකෙන් එකක් පිටිපස්සට (plugins folder එකෙන් QUEEN-SADU-MD-V2 folder එකට)
// 'data' කියන්නේ අලුත් folder එක
// 'al-papers.json' කියන්නේ file එකේ නම
const AL_PAPER_DATA_PATH = path.join(__dirname, '..', 'data', 'al-papers.json');
const OL_PAPER_DATA_PATH = path.join(__dirname, '..', 'data', 'ol-papers.json');

// User state කළමනාකරණය සඳහා Map එකක් (මේක එලෙසම තියෙයි)
// ...

// ======================================================
// 1. Main Command: `!pp` (or .pp) - Initial Menu
// ======================================================
// ... (මේ කොටස එලෙසම තියෙයි)

// ======================================================
// 2. Command: `!ol` (or .ol) - O/L Subject List
// ======================================================
// ... (මේ කොටස එලෙසම තියෙයි)

// ======================================================
// 3. Command: `!al` (or .al) - A/L Subject List
// ======================================================
// ... (මේ කොටස එලෙසම තියෙයි)

// ======================================================
// 4. REVISED: Commands for Subject Download: `!olget <number> <year>` and `!alget <number> <year>`
// ... (මේ කොටස එලෙසම තියෙයි)

// ======================================================
// Helper Functions (ලොකුම වෙනස මෙතන)
// ======================================================

// අදාළ විභාග වර්ගයේ JSON data ලබා ගන්නා function එක
// දැන් Axios භාවිතා නොකර local file එක කියවනු ඇත
async function fetchPaperData(examType) {
    let filePath = '';
    if (examType === 'ol') {
        filePath = OL_PAPER_DATA_PATH;
    } else if (examType === 'al') {
        filePath = AL_PAPER_DATA_PATH;
    } else {
        return null;
    }

    try {
        console.log(`[PP Plugin] Debug - Fetching data from local file: ${filePath}`);
        // fs.promises.readFile භාවිතයෙන් file එක කියවන්න
        const fs = require('fs').promises; // Node.js built-in module
        const data = await fs.readFile(filePath, 'utf8'); // file content එක string එකක් ලෙස කියවන්න
        return { [examType]: JSON.parse(data) }; // JSON string එක object එකක් බවට parse කරන්න
    } catch (error) {
        console.error(`[PP Plugin] Error - Failed to read or parse local ${examType} paper data from ${filePath}:`, error.message);
        return null;
    }
}

// ... (අනෙකුත් codes එලෙසම)
