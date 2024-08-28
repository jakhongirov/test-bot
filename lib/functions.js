require('dotenv').config();
const axios = require('axios');
const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient();
const fs = require('fs');
const OpenAI = require('openai');
const openai = new OpenAI({
   apiKey: process.env.AI_TOKEN, // Make sure your environment variable is set correctly
});

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

async function weather(city) {
   const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=36880fe33e6b197773b6f2c90946a066&units=metric`);
   const data = response.data;

   if (data) {
      return `Temp: ${data?.main.temp}`
   } else {
      return 'Wrong, write english name'
   }

}

async function transcribeAudio(filePath) {
   const audio = {
      content: fs.readFileSync(filePath).toString('base64'),
   };
   const config = {
      encoding: 'OGG_OPUS',
      sampleRateHertz: 16000,
      languageCode: 'en-US',
   };
   const request = {
      audio: audio,
      config: config,
   };

   const [response] = await client.recognize(request);
   const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

   return transcription;
}

async function transcribeWithWhisper(filePath) {
   const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
   });

   return response.text;
}

module.exports = {
   getAIResponse,
   currency,
   weather,
   transcribeAudio,
   transcribeWithWhisper
}