require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testarGemini() {
  try {
    console.log('Enviando requisição de teste para o Gemini...');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Você é o Mestre de um RPG. Cumprimente os jogadores com uma mensagem de 2 frases ambientada em uma taverna misteriosa.',
    });

    console.log('\n--- Resposta do Mestre (Gemini) ---');
    console.log(response.text);
  } catch (error) {
    console.error('Erro ao conectar com o Gemini:', error);
  }
}

testarGemini();