require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Initialize the bot
const bot = new TelegramBot('7521815863:AAHTBSNrHqpLxG6yqYRLTk2QSDGbHdZTpAw');

// Set webhook
const webhookUrl = `https://webhook.qiblah.app/bot${'7521815863:AAHTBSNrHqpLxG6yqYRLTk2QSDGbHdZTpAw'}`;
bot.setWebHook(webhookUrl);

// Create an Express server
const app = express();
app.use(bodyParser.json());

// Handle webhook updates
app.post(`/bot${'7521815863:AAHTBSNrHqpLxG6yqYRLTk2QSDGbHdZTpAw'}`, async (req, res) => {
    const update = req.body;

    console.log(update)

    if (update) {
        const chatId = update?.message?.chat?.id;
        const userMessage = update?.message?.text;

        try {
            if (userMessage.startsWith('/start')) {
                await bot.sendMessage(chatId, "Hello, I am your bot!");
            } else {
                const aiResponse = await getAIResponse(userMessage);
                console.log(aiResponse)
                await bot.sendMessage(chatId, aiResponse);
            }
        } catch (error) {
            console.error('Error:', error);
            await bot.sendMessage(chatId, "Sorry, there was an error processing your request.");
        }
    }

    res.sendStatus(200);
});

const Bottleneck = require('bottleneck');

// Create a limiter with the desired rate limits
const limiter = new Bottleneck({
    minTime: 1100, // 1.1 seconds between requests (adjust based on your API rate limit)
});

// Wrap the getAIResponse function with the limiter
const limitedGetAIResponse = limiter.wrap(getAIResponse);

// Use this limited function in your bot
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userQuestion = msg.text;

    if (!userQuestion?.startsWith('/start')) {
        const aiResponse = await limitedGetAIResponse(userQuestion);
        bot.sendMessage(chatId, aiResponse);
    } else {
        bot.sendMessage(chatId, "Hi i am bot");
    }
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
const PORT = process.env.PORT || 5060;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});