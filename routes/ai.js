import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import axios from 'axios';

const router = express.Router();

// AI Chat endpoint
router.post('/chat', authenticate, async (req, res, next) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      throw new AppError('Message is required', 400);
    }

    // If OpenAI API key is set, use it
    if (process.env.OPENAI_API_KEY) {
      try {
        const data = JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant in a chat application. Provide concise, friendly responses.'
            },
            ...(context || []),
            { role: 'user', content: message }
          ],
          max_tokens: 150
        });

        const options = {
          hostname: 'api.openai.com',
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': data.length
          }
        };

        const response = await new Promise((resolve, reject) => {
          const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
              try {
                resolve(JSON.parse(body));
              } catch (e) {
                reject(e);
              }
            });
          });
          req.on('error', reject);
          req.write(data);
          req.end();
        });

        return res.json({
          success: true,
          reply: response.choices[0].message.content
        });
      } catch (error) {
        console.error('OpenAI API error:', error);
      }
    }

    // Fallback response if no API key
    res.json({
      success: true,
      reply: 'AI features require API configuration. Please set OPENAI_API_KEY in environment variables.'
    });
  } catch (error) {
    next(error);
  }
});

// Summarize chat
router.post('/summarize', authenticate, async (req, res, next) => {
  try {
    const { messages } = req.body;

    if (!messages || messages.length === 0) {
      throw new AppError('Messages are required', 400);
    }

    const messageText = messages
      .slice(-20) // Last 20 messages
      .map(m => `${m.senderName}: ${m.text}`)
      .join('\n');

    if (process.env.OPENAI_API_KEY) {
      try {
        const data = JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Summarize this conversation in 2-3 sentences.'
            },
            { role: 'user', content: messageText }
          ],
          max_tokens: 100
        });

        const options = {
          hostname: 'api.openai.com',
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': data.length
          }
        };

        const response = await new Promise((resolve, reject) => {
          const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
              try {
                resolve(JSON.parse(body));
              } catch (e) {
                reject(e);
              }
            });
          });
          req.on('error', reject);
          req.write(data);
          req.end();
        });

        return res.json({
          success: true,
          summary: response.choices[0].message.content
        });
      } catch (error) {
        console.error('OpenAI API error:', error);
      }
    }

    res.json({
      success: true,
      summary: 'Chat summary feature requires API configuration.'
    });
  } catch (error) {
    next(error);
  }
});

// Translate message
router.post('/translate', authenticate, async (req, res, next) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text || !targetLanguage) {
      throw new AppError('Text and target language are required', 400);
    }

    if (process.env.OPENAI_API_KEY) {
      try {
        const data = JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `Translate the following text to ${targetLanguage}. Only return the translation, nothing else.`
            },
            { role: 'user', content: text }
          ],
          max_tokens: 200
        });

        const options = {
          hostname: 'api.openai.com',
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': data.length
          }
        };

        const response = await new Promise((resolve, reject) => {
          const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
              try {
                resolve(JSON.parse(body));
              } catch (e) {
                reject(e);
              }
            });
          });
          req.on('error', reject);
          req.write(data);
          req.end();
        });

        return res.json({
          success: true,
          translatedText: response.choices[0].message.content
        });
      } catch (error) {
        console.error('OpenAI API error:', error);
      }
    }

    res.json({
      success: true,
      translatedText: 'Translation feature requires API configuration.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

