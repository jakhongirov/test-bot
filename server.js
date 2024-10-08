require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { google } = require('googleapis');

const {
    getAIResponse,
    currency, weather,
    transcribeAudio,
    transcribeWithWhisper,
    getSheetData
} = require('./lib/functions')

const CREDENTIALS_PATH = path.resolve(__dirname, "./sheet.json");
const TOKEN_PATH = path.resolve(__dirname, "./token.json");

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
            console.log(data)
            let response = 'Sorry, I couldn’t find what you are looking for.';
            data.forEach(row => {
                if (userMessage.toLowerCase().includes(row[0].toLowerCase())) { // Assuming first column has product names
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

app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    console.log("Authorization code received:", code);

    if (!code) {
        return res.status(400).send('Authorization code is missing.');
    }

    try {
        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
        const { client_secret, client_id, redirect_uris } = credentials.web;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        // Exchange authorization code for tokens
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        // Save the tokens to a file
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log("Tokens stored successfully in", TOKEN_PATH);

        res.send('Authentication successful! You can close this page.');
    } catch (error) {
        console.error("Error during token exchange:", error.message);
        console.error("Full error details:", error);
        res.status(500).send("Token exchange failed. Please check the console for error details.");
    }
});

app.get('/', (req, res) => {
    res.send('ok')
})

// Start the server
const PORT = 5060;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});