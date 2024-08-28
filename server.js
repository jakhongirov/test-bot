require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const { getAIResponse, currency, weather } = require('./lib/functions')

// Initialize the bot
const bot = new TelegramBot(process.env.BOT_TOKEN);

// Set webhook
const webhookUrl = `https://webhook.qiblah.app/bot${process.env.BOT_TOKEN}`;
bot.setWebHook(webhookUrl);

// Create an Express server
const app = express();
app.use(bodyParser.json());

app.post(`/bot${process.env.BOT_TOKEN}`, async (req, res) => {
    const update = req.body;

    console.log(update);

    if (update && update.business_message && update?.business_message?.from?.id != 634041736) {
        const chatId = update.business_message.chat.id;
        const businessConnectionId = update.business_message.business_connection_id;
        const userMessage = update.business_message.text;

        try {
            if (userMessage?.startsWith('/start')) {
                await bot.sendMessage(chatId, "Hello, I am your business bot!", {
                    business_connection_id: businessConnectionId
                });
            } else {
                const text = "test"
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


app.get('/', (req, res) => {
    res.send('ok')
})

// Start the server
const PORT = 5060;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});