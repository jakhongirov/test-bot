require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Initialize the bot
const bot = new TelegramBot('7521815863:AAHTBSNrHqpLxG6yqYRLTk2QSDGbHdZTpAw');

// Set webhook
const webhookUrl = `https://test-bot-dzdf.onrender.com/bot${'7521815863:AAHTBSNrHqpLxG6yqYRLTk2QSDGbHdZTpAw'}`;
bot.setWebHook(webhookUrl);

// Create an Express server
const app = express();
app.use(bodyParser.json());

// Handle webhook updates
app.post(`/bot${'7521815863:AAHTBSNrHqpLxG6yqYRLTk2QSDGbHdZTpAw'}`, async (req, res) => {
    const update = req.body;
    
    if (update.message) {
        const chatId = update.message.chat.id;
        const userMessage = update.message.text;

        try {
            if (userMessage.startsWith('/start')) {
                await bot.sendMessage(chatId, "Hello, I am your bot!");
            } else {
                const aiResponse = await getAIResponse(userMessage);
                await bot.sendMessage(chatId, aiResponse);
            }
        } catch (error) {
            console.error('Error:', error);
            await bot.sendMessage(chatId, "Sorry, there was an error processing your request.");
        }
    }

    res.sendStatus(200);
});

// Function to get AI response
async function getAIResponse(question) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4',
                messages: [{ role: 'user', content: question }],
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.AI_TOKEN}`,
                },
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('AI API Error:', error);
        throw new Error('Failed to get response from AI.');
    }
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});