// ===================== CONFIG =====================
const CONFIG = {
  socketUrl: process.env.NODE_ENV === 'production'
    ? 'https://your-backend-url-here.onrender.com'  // ← CHANGE THIS after deploying backend (e.g. Render, Railway)
    : 'http://localhost:3000',

  maxParticles: 150,
  typingDelay: 2000,
  botName: 'Epic Tech AI 🔥',
  welcomeMessage: "Yo what's good? Drop a tech question or just vibe 😈",
  particleTypes: ['default', 'fire', 'neon', 'glitch', 'code']
};

// ===================== SOCKET SETUP =====================
const socket = io(CONFIG.socketUrl, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
  transports: ['websocket', 'polling'] // fallback support
});

let username = localStorage.getItem('username') || 'Guest_' + Math.floor(Math.random() * 1000);
document.getElementById('username').textContent = username;

// Connection events
socket.on('connect', () => {
  console.log('Connected to backend 🔥');
  addMessage('system', `Connected! Welcome back, ${username}`);
  socket.emit('user_joined', { username });
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
  addMessage('system', '🔴 Lost connection to chat server... retrying');
});

socket.on('disconnect', () => {
  addMessage('system', '🔌 Disconnected from chat. Trying to reconnect...');
});

// Typing indicators (global)
socket.on('typing_update', (data) => {
  const indicator = document.getElementById('typingIndicator');
  if (data.typing) {
    indicator.textContent = `${data.user || 'Someone'} is typing...`;
    indicator.style.display = 'block';
  } else {
    indicator.style.display = 'none';
  }
});

// Bot typing (personal to current user)
socket.on('bot_typing', (data) => {
  const botTyping = document.getElementById('botTyping');
  if (data && data.typing) {
    botTyping.style.display = 'flex';
  } else {
    botTyping.style.display = 'none';
  }
});

// Receive bot response
socket.on('bot_message', (data) => {
  addMessage('bot', data.message, data.particles || 'default');
});

// Error from server
socket.on('error', (msg) => {
  addMessage('system', `Error: ${msg}`);
});

// ===================== MESSAGE HANDLING =====================
function addMessage(sender, text, particleType = 'default') {
  const chatBox = document.getElementById('chatBox');
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', sender);

  const content = document.createElement('div');
  content.classList.add('content');
  content.innerHTML = text.replace(/\n/g, '<br>'); // basic markdown-ish line breaks

  const timestamp = document.createElement('span');
  timestamp.classList.add('timestamp');
  timestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  messageDiv.appendChild(content);
  messageDiv.appendChild(timestamp);
  chatBox.appendChild(messageDiv);

  chatBox.scrollTop = chatBox.scrollHeight;

  // Trigger particle burst on message (your existing particle system)
  if (particleType !== 'default') {
    createParticleBurst(particleType, messageDiv);
  }
}

// Send message handler
function sendMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  if (!message) return;

  addMessage('user', message);
  socket.emit('user_message', { message, username });
  input.value = '';
  input.focus();
}

// Enter key to send
document.getElementById('messageInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage();
  }
});

// Typing indicator for user
let typingTimeout;
document.getElementById('messageInput').addEventListener('input', () => {
  socket.emit('typing', { username, typing: true });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing', { username, typing: false });
  }, 2000);
});

// ===================== THREE.JS / PARTICLES / ANIMATIONS =====================
// (Keep your original Three.js setup here — assuming it's below this point)
// Example placeholder — replace with your full scene code

let scene, camera, renderer, particles;

// Initialize Three.js scene (your existing code)
function initThreeJS() {
  // ... your scene setup, camera, renderer, lights, etc. ...
  // Example:
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bgCanvas'), alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Add your particles system, models, animations, GSAP tweens, etc.
  // ...
}

// Particle burst function (adapt to your system)
function createParticleBurst(type, element) {
  // Your particle creation logic here
  console.log(`Burst: ${type} at message from ${element.classList}`);
  // Example: spawn particles around the message div
}

// Resize handler
window.addEventListener('resize', () => {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  // Your frame updates: rotate models, move particles, etc.
  if (renderer) renderer.render(scene, camera);
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  initThreeJS();
  animate();

  // Initial welcome
  setTimeout(() => {
    addMessage('bot', CONFIG.welcomeMessage, 'neon');
  }, 1500);
});
