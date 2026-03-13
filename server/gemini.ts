import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateQuizFromAI(materialContent: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    Based on the following lecture material, generate a quiz with 5 questions.
    The quiz should include:
    - True/False questions
    - Terminology (Multiple Choice) questions
    
    Lecture Material:
    ${materialContent}

    Return the result ONLY as a JSON object in this format:
    {
      "questions": [
        {
          "id": number,
          "text": "question text",
          "options": ["option1", "option2", ...],
          "answer": number (index of correct option)
        }
      ]
    }
    Ensure the JSON is valid and only contains the object.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up potential markdown formatting from AI response
    const jsonStr = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    throw new Error(`Gemini API Error: ${error.message || 'Unknown AI error'}`);
  }
}
