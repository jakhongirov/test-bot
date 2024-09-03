require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const {
    getAIResponse,
    currency, weather,
    transcribeAudio,
    transcribeWithWhisper,
    getSheetData
} = require('./lib/functions')

// Initialize the bot
const bot = new TelegramBot(process.env.BOT_TOKEN);

// Set webhook
const webhookUrl = `https://webhook.qiblah.app/bot${process.env.BOT_TOKEN}`;
bot.setWebHook(webhookUrl);

// Create an Express server
const app = express();
app.use(bodyParser.json());

// app.post(`/bot${process.env.BOT_TOKEN}`, async (req, res) => {
//     const update = req.body;

//     console.log(update);

//     // Check for valid update and exclude messages from a specific user
//     if (update && update.business_message && update?.business_message?.from?.id != 634041736) {
//         const chatId = update.business_message.chat.id;
//         const businessConnectionId = update.business_message.business_connection_id;
//         const userMessage = update.business_message.text;
//         const userVoiceMessage = update.business_message.voice;

//         try {
//             if (userMessage?.startsWith('/start')) {
//                 await bot.sendMessage(chatId, "Hello, I am your business bot!", {
//                     business_connection_id: businessConnectionId
//                 });
//             } else if (userVoiceMessage) {
//                 const fileId = userVoiceMessage?.file_id;
//                 const fileUrl = await bot.getFileLink(fileId);
//                 const filePath = path.join(__dirname, `voice_${chatId}.ogg`);
//                 const response = await axios.get(fileUrl, { responseType: 'stream' });
//                 response.data.pipe(fs.createWriteStream(filePath));

//                 response.data.on('end', async () => {
//                     console.log('Voice file downloaded successfully');
//                     const text = await transcribeWithWhisper(filePath);
//                     bot.sendMessage(chatId, `Transcription: ${text}`, {
//                         business_connection_id: businessConnectionId
//                     });
//                     const answer = await getAIResponse(text);
//                     bot.sendMessage(chatId, answer, {
//                         business_connection_id: businessConnectionId
//                     });
//                 });
//             } else {
//                 bot.sendMessage(chatId, "Keys", {
//                     business_connection_id: businessConnectionId,
//                     reply_markup: {
//                         inline_keyboard: [
//                             [
//                                 {
//                                     text: "Hi",
//                                     callback_data: "hi"
//                                 },
//                                 {
//                                     text: "What's up",
//                                     callback_data: "whats_up"
//                                 },
//                             ]
//                         ]
//                     }
//                 });
//             }
//         } catch (error) {
//             console.error('Error:', error);
//             await bot.sendMessage(chatId, "Sorry, there was an error processing your request.", {
//                 business_connection_id: businessConnectionId
//             });
//         }
//     }

//     res.sendStatus(200);
// });

app.post(`/bot${process.env.BOT_TOKEN}`, async (req, res) => {
    const update = req.body;
    console.log(update)

    if (update && update.business_message && update?.business_message?.from?.id != 634041736) {
        const chatId = update.business_message.chat.id;
        const businessConnectionId = update.business_message.business_connection_id;
        const userMessage = update.business_message.text;

        try {
            const data = await getSheetData();
            let response = 'Sorry, I couldn’t find what you are looking for.';
            data.forEach(row => {
                if (userMessage.includes(row[0].toLowerCase())) { // Assuming first column has product names
                    response = `Name: ${row[0]}\nPhone: ${row[1]}`; // Assuming second column has prices
                }
            });

            // Send the response back to the user
            bot.sendMessage(chatId, response, {
                business_connection_id: businessConnectionId
            });

        } catch (error) {
            console.error('Error:', error);
            await bot.sendMessage(chatId, "Sorry, there was an error processing your request.", {
                business_connection_id: businessConnectionId
            });
        }
    }

    res.sendStatus(200);
})

app.get('/', (req, res) => {
    res.send('ok')
})

app.get('/oauth2callback', (req, res) => {
    const authorizationCode = req.query.code;
    // Exchange this code for tokens and continue with the authentication process
    res.send('OAuth callback received!');
});

// Start the server
const PORT = 5060;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});