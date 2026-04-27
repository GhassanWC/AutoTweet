/**
 * Gemini Service
 * Handles content and image generation using Google's Generative AI.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

let genAI = null;

const getClient = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // In development, we might not have the key yet
      return null;
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

/**
 * Generate an image using Gemini (Imagen 3 via Vertex AI or similar)
 * Note: Current public Generative AI SDK might require specific models or Vertex AI.
 * We will use the model name 'imagen-3' or similar if available, 
 * otherwise we will provide a clear error message.
 */
async function generateImage(prompt) {
  const client = getClient();
  if (!client) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  try {
    logger.info('Generating image with Gemini (Imagen)...');
    
    // Note: As of now, Imagen 3 is often accessed via Vertex AI SDK 
    // but for this implementation we'll structure it for the Generative AI SDK
    // assuming the user has access to the image generation models.
    const model = client.getGenerativeModel({ model: "imagen-3" });

    // This is a placeholder for the actual call which might differ based on SDK version
    // In many cases, it returns a base64 string or a URL.
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Assuming the response contains image data in parts
    const imagePart = response.candidates[0].content.parts.find(p => p.inlineData);
    
    if (imagePart) {
      return {
        url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
        provider: 'gemini',
        prompt: prompt
      };
    }

    throw new Error('Gemini failed to return an image. Check if your API key has access to Imagen 3.');
  } catch (error) {
    logger.error('Gemini image generation error:', error.message);
    throw error;
  }
}

/**
 * Generate a prompt for image generation based on tweet content and brand voice
 */
async function generateImagePrompt({ tweetContent, brandVoice, niche }) {
  const client = getClient();
  if (!client) return `A professional, high-quality visual representing: ${tweetContent.substring(0, 50)}...`;

  try {
    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const systemPrompt = `You are an expert visual designer and prompt engineer for AI image generators (like Midjourney or DALL-E).
Your goal is to create a highly descriptive, artistic, and effective image prompt based on an X (Twitter) post.

RULES:
- Do NOT use generic stock-style imagery.
- Match the tone of the brand and the topic.
- Be specific about style, lighting, composition, and mood.
- Avoid text in the image.
- Focus on metaphors, high-quality photography, or modern digital art styles.
- Return ONLY the prompt text. No explanation.`;

    const userPrompt = `Tweet Content: ${tweetContent}
Account Niche: ${niche || 'General'}
Brand Voice: ${brandVoice?.tone || 'Professional'}

Generate a visual prompt for this tweet.`;

    const result = await model.generateContent([systemPrompt, userPrompt]);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    logger.error('Gemini prompt generation error:', error.message);
    return `A high-quality visual representing: ${tweetContent.substring(0, 100)}`;
  }
}

module.exports = {
  generateImage,
  generateImagePrompt,
  isConfigured: () => !!process.env.GEMINI_API_KEY,
};
