// server.js - Socket.io backend with Grok/xAI API example (adaptable to OpenAI, Groq, etc.)

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production: change to your Vercel frontend URL, e.g. "https://your-app.vercel.app"
    methods: ["GET", "POST"]
  }
});

// Optional: serve static files if you want to host frontend + backend together (not needed for Vercel static + separate backend)
app.use(express.static('public')); // <-- if you move frontend files to /public later

// You'll need an API key from https://console.x.ai/ (or swap for OpenAI/Groq/etc.)
const GROK_API_KEY = process.env.GROK_API_KEY || 'your-api-key-here-for-testing';

// Simple in-memory message history per socket (for context) - in production use Redis/DB
const userContexts = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Initialize context for this user
  userContexts.set(socket.id, [
    { role: "system", content: "You are Epic Tech AI, a fun, helpful, and slightly savage tech-savvy assistant. Use emojis 🔥, keep replies engaging and concise." }
  ]);

  socket.on('user_message', async (data) => {
    const { message, username } = data;

    // Show typing indicator
    socket.emit('bot_typing', { typing: true });
    io.emit('typing_update', { user: username || 'Someone', typing: true });

    try {
      // Get conversation history for this user
      let context = userContexts.get(socket.id) || [];

      // Add user message to context
      context.push({ role: "user", content: message });

      // Call xAI Grok API (you can swap this block for openai.createChatCompletion, groq, etc.)
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'grok-beta', // or 'grok-2', check current models at x.ai
          messages: context,
          temperature: 0.8,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      const botReply = result.choices[0].message.content.trim();

      // Add bot reply to context (keep last 10 messages to avoid token explosion)
      context.push({ role: "assistant", content: botReply });
      if (context.length > 11) { // system + 5 user/assistant pairs
        context = [context[0], ...context.slice(-10)];
      }
      userContexts.set(socket.id, context);

      // Send bot response with some fun particle effect type (matches your frontend)
      const particleType = Math.random() > 0.7 ? 'fire' : Math.random() > 0.4 ? 'neon' : 'default';
      socket.emit('bot_message', {
        message: botReply,
        particles: particleType
      });

    } catch (error) {
      console.error('AI Error:', error);
      socket.emit('bot_message', {
        message: "Whoops, my circuits are glitching 🔥 Try again in a sec?",
        particles: 'error'
      });
    } finally {
      socket.emit('bot_typing', { typing: false });
      io.emit('typing_update', { user: username || 'Someone', typing: false });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    userContexts.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Socket server running on port ${PORT}`);
});
