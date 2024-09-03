require('dotenv').config();
const axios = require('axios');
const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient();
const fs = require('fs');
const path = require('path')
const { google } = require('googleapis');
const readline = require('readline');
const OpenAI = require('openai');
const openai = new OpenAI({
   apiKey: process.env.AI_TOKEN, // Make sure your environment variable is set correctly
});

const CREDENTIALS_PATH = path.resolve(__dirname, "../sheet.json");
const TOKEN_PATH = path.resolve(__dirname, "../token.json");

async function getAIResponse(question) {
   try {
      const response = await axios.post(
         'https://api.openai.com/v1/chat/completions',
         {
            model: 'gpt-4',
            messages: [
               {
                  role: "system",
                  content: "You are a friendly and professional manager of an education center. You handle customer inquiries with care and provide clear, supportive responses about courses, tuition, schedules, and student services. The education center offers the following courses: English - 400,000 UZS, Math - 500,000 UZS, and IT - 1,000,000 UZS. Be approachable and helpful, and guide potential students through the enrollment process if needed."
               },
               {
                  role: 'user',
                  content: question
               }
            ],
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

async function authorize() {
   // Load client secrets from a local file
   const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
   console.log(credentials)
   const { client_secret, client_id, redirect_uris } = credentials?.web;
   const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

   // Check if the token file exists
   if (fs.existsSync(TOKEN_PATH)) {
      const token = fs.readFileSync(TOKEN_PATH);
      oAuth2Client.setCredentials(JSON.parse(token));
   } else {
      // No token found, initiate the authorization process
      await getNewToken(oAuth2Client);
   }

   return oAuth2Client;
}

async function getNewToken(oAuth2Client) {
   const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
   });

   console.log('Authorize this app by visiting this URL:', authUrl);

   const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
   });

   // Wait for user input of the code from the Google auth page
   const code = await new Promise((resolve) => {
      rl.question('Enter the code from that page here: ', (code) => {
         rl.close();
         resolve(code);
      });
   });

   // Exchange the code for tokens
   const tokenResponse = await oAuth2Client.getToken(code);
   const token = tokenResponse.tokens;
   oAuth2Client.setCredentials(token);

   // Store the token to disk for future executions
   fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
   console.log('Token stored to', TOKEN_PATH);
}

async function getSheetData() {
   const auth = await authorize();
   console.log(auth)
   const sheets = google.sheets({ version: 'v4', auth });
   const sheetId = '1tzc2Dg3cPX7u-_liiqu7yrPjv2UJ-HsPRmBtppO2tdo'; // Add your sheet ID here
   const range = 'Sheet1!A1:B10'; // Specify the range of data to retrieve

   const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
   });

   return res.data.values;
}

module.exports = {
   getAIResponse,
   currency,
   weather,
   transcribeAudio,
   transcribeWithWhisper,
   getSheetData
}