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

app.post(`/bot${process.env.BOT_TOKEN}`, async (req, res) => {
    const update = req.body;

    console.log(update);

    if (update && update.business_message) {
        const chatId = update.business_message.chat.id;
        const businessConnectionId = update.business_message.business_connection_id;
        const userMessage = update.business_message.text;

        try {
            if (userMessage?.startsWith('/start')) {
                await bot.sendMessage(chatId, "Hello, I am your business bot!", {
                    business_connection_id: businessConnectionId
                });
            } else {
                const text = currency(userMessage)
                await bot.sendMessage(chatId, text, {
                    business_connection_id: businessConnectionId
                });
            }
        } catch (error) {
            console.error('Error:', error);
            await bot.sendMessage(chatId, "Sorry, there was an error processing your request.", {
                business_connection_id: businessConnectionId
            });
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

async function currency(text) {
    try {
        const response = await axios.get("https://cbu.uz/uz/arkhiv-kursov-valyut/json/");
        const data = response.data;

        // Normalize the text input for better accuracy and case-insensitivity
        const normalizedText = text.toLowerCase().trim();

        // Map input to corresponding currency codes
        const currencyMap = {
            'dollar': 'USD',
            'usd': 'USD',
            'euro': 'EUR',
            'rubil': 'RUB'
        };

        // Find the corresponding currency code
        const currencyCode = currencyMap[normalizedText];

        if (!currencyCode) {
            throw new Error("Invalid currency type. Please use 'dollar' or 'euro'.");
        }

        // Find and return the currency rate
        const rate = data.filter(e => e.Ccy === currencyCode)[0]?.Rate;

        if (!rate) {
            throw new Error(`Rate for currency '${currencyCode}' not found.`);
        }

        return rate;

    } catch (error) {
        console.error(`Error fetching currency rate: ${error.message}`);
        return "An error occurred while fetching the currency rate. Please try again later.";
    }
}

app.get('/', (req, res) => {
    res.send('ok')
})

// Start the server
const PORT = 5060;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});