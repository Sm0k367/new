// ============================================
// 💯 EPIC TECH AI 🔥™️ - MAIN APPLICATION
// ============================================

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  socketUrl: window.location.origin,
  particleCount: 800,
  avatarSize: 2,
  cameraDistance: 15,
  bloomStrength: 1.5,
  bloomThreshold: 0.1,
  bloomRadius: 0.5
};

// ============================================
// GLOBAL STATE
// ============================================

let scene, camera, renderer, composer;
let avatar, particleSystem, particlePositions, particleVelocities;
let socket;
let isConnected = false;
let isTyping = false;
let messages = [];
let cameraShakeIntensity = 0;

// ============================================
// INITIALIZATION
// ============================================

window.addEventListener('DOMContentLoaded', () => {
  initThreeJS();
  initSocket();
  initEventListeners();
  animate();
  hideLoadingIndicator();
});

// ============================================
// THREE.JS SETUP
// ============================================

function initThreeJS() {
  const container = document.getElementById('canvas-container');

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e27);
  scene.fog = new THREE.Fog(0x0a0e27, 100, 200);

  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = CONFIG.cameraDistance;

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowShadowMap;
  container.appendChild(renderer.domElement);

  // Post-processing
  setupPostProcessing();

  // Lighting
  setupLighting();

  // Scene objects
  createCosmicBackground();
  createAvatar();
  createParticleSystem();

  // Handle resize
  window.addEventListener('resize', onWindowResize);
}

function setupPostProcessing() {
  composer = new THREE.EffectComposer(renderer);
  const renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Bloom effect
  const bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    CONFIG.bloomStrength,
    CONFIG.bloomRadius,
    CONFIG.bloomThreshold
  );
  composer.addPass(bloomPass);
}

function setupLighting() {
  // Ambient light
  const ambientLight = new THREE.AmbientLight(0x404040, 2);
  scene.add(ambientLight);

  // Point lights for cosmic effect
  const light1 = new THREE.PointLight(0xff00ff, 1.5, 100);
  light1.position.set(20, 20, 20);
  scene.add(light1);

  const light2 = new THREE.PointLight(0x00ffff, 1.5, 100);
  light2.position.set(-20, -20, 20);
  scene.add(light2);

  const light3 = new THREE.PointLight(0xff6600, 1, 80);
  light3.position.set(0, 30, 0);
  scene.add(light3);
}

function createCosmicBackground() {
  // Nebula-like background with gradient
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Create nebula gradient
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 512);
  gradient.addColorStop(0, 'rgba(255, 0, 255, 0.3)');
  gradient.addColorStop(0.5, 'rgba(100, 50, 150, 0.2)');
  gradient.addColorStop(1, 'rgba(10, 14, 39, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  // Add some noise
  const imageData = ctx.getImageData(0, 0, 512, 512);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.random() * 30;
    data[i] += noise;
    data[i + 1] += noise * 0.5;
    data[i + 2] += noise * 0.8;
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  const geometry = new THREE.SphereGeometry(500, 32, 32);
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
  const skybox = new THREE.Mesh(geometry, material);
  scene.add(skybox);
}

function createAvatar() {
  const group = new THREE.Group();

  // Main orb (glowing sphere)
  const geometry = new THREE.IcosahedronGeometry(CONFIG.avatarSize, 4);
  const material = new THREE.MeshPhongMaterial({
    color: 0xff00ff,
    emissive: 0xff00ff,
    emissiveIntensity: 0.5,
    wireframe: false,
    shininess: 100
  });
  const orb = new THREE.Mesh(geometry, material);
  orb.castShadow = true;
  orb.receiveShadow = true;
  group.add(orb);

  // Wireframe overlay
  const wireframeGeometry = new THREE.IcosahedronGeometry(CONFIG.avatarSize * 1.05, 4);
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
    transparent: true,
    opacity: 0.3
  });
  const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
  group.add(wireframe);

  // Rotating ring
  const ringGeometry = new THREE.TorusGeometry(CONFIG.avatarSize * 1.3, 0.2, 16, 100);
  const ringMaterial = new THREE.MeshPhongMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 0.3
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 4;
  group.add(ring);

  // Store references for animation
  group.orb = orb;
  group.wireframe = wireframe;
  group.ring = ring;
  group.baseRotation = { x: 0, y: 0, z: 0 };

  scene.add(group);
  avatar = group;
}

function createParticleSystem() {
  const geometry = new THREE.BufferGeometry();
  particlePositions = new Float32Array(CONFIG.particleCount * 3);
  particleVelocities = new Float32Array(CONFIG.particleCount * 3);

  for (let i = 0; i < CONFIG.particleCount; i++) {
    const i3 = i * 3;
    particlePositions[i3] = (Math.random() - 0.5) * 100;
    particlePositions[i3 + 1] = (Math.random() - 0.5) * 100;
    particlePositions[i3 + 2] = (Math.random() - 0.5) * 100;

    particleVelocities[i3] = (Math.random() - 0.5) * 0.5;
    particleVelocities[i3 + 1] = (Math.random() - 0.5) * 0.5;
    particleVelocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xff00ff,
    size: 0.3,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.6
  });

  particleSystem = new THREE.Points(geometry, material);
  scene.add(particleSystem);
}

// ============================================
// SOCKET.IO SETUP
// ============================================

function initSocket() {
  socket = io(CONFIG.socketUrl, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('✅ Connected to server');
    isConnected = true;
    updateStatusIndicator(true);
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
    isConnected = false;
    updateStatusIndicator(false);
  });

  socket.on('bot_message', (data) => {
    console.log('📨 Bot message:', data.message);
    isTyping = false;
    addMessage('bot', data.message);
    triggerParticleEffect(data.particles || 'default');
    playSound('message');
  });

  socket.on('bot_typing', (data) => {
    isTyping = data.typing;
    if (data.typing) {
      showTypingIndicator();
    } else {
      hideTypingIndicator();
    }
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
}

// ============================================
// EVENT LISTENERS
// ============================================

function initEventListeners() {
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');

  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);

  // Touch controls for mobile
  document.addEventListener('touchmove', (e) => {
    if (e.target.id !== 'message-input') {
      e.preventDefault();
    }
  }, { passive: false });
}

// ============================================
// MESSAGE HANDLING
// ============================================

function sendMessage() {
  const input = document.getElementById('message-input');
  const message = input.value.trim();

  if (!message || !isConnected) return;

  // Add user message to UI
  addMessage('user', message);

  // Send to server
  socket.emit('user_message', { message });

  // Clear input
  input.value = '';
  input.focus();

  // Trigger avatar reaction
  triggerAvatarReaction();
  triggerCameraShake(0.5);
  playSound('send');
}

function addMessage(sender, text) {
  const container = document.getElementById('messages-container');

  // Remove welcome message if first message
  const welcome = container.querySelector('.welcome-message');
  if (welcome && messages.length === 0) {
    welcome.remove();
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}`;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = text;

  messageDiv.appendChild(contentDiv);
  container.appendChild(messageDiv);

  messages.push({ sender, text, timestamp: new Date() });

  // Auto-scroll to bottom
  setTimeout(() => {
    container.scrollTop = container.scrollHeight;
  }, 100);
}

function showTypingIndicator() {
  const container = document.getElementById('messages-container');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message bot';
  typingDiv.id = 'typing-indicator';

  const typingContent = document.createElement('div');
  typingContent.className = 'typing-indicator';
  typingContent.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

  typingDiv.appendChild(typingContent);
  container.appendChild(typingDiv);

  container.scrollTop = container.scrollHeight;
}

function hideTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// ============================================
// AVATAR ANIMATIONS
// ============================================

function triggerAvatarReaction() {
  if (!avatar) return;

  // Quick rotation
  gsap.to(avatar.rotation, {
    y: avatar.rotation.y + Math.PI * 2,
    duration: 0.6,
    ease: 'power2.out'
  });

  // Scale pulse
  gsap.to(avatar.scale, {
    x: 1.2,
    y: 1.2,
    z: 1.2,
    duration: 0.3,
    yoyo: true,
    repeat: 1,
    ease: 'power2.out'
  });

  // Color flash
  gsap.to(avatar.orb.material, {
    emissiveIntensity: 1,
    duration: 0.2,
    yoyo: true,
    repeat: 1
  });
}

function triggerParticleEffect(type) {
  switch (type) {
    case 'awakening':
      triggerAwakeningEffect();
      break;
    case 'gratitude':
      triggerGratitudeEffect();
      break;
    case 'smoke':
      triggerSmokeEffect();
      break;
    default:
      triggerDefaultEffect();
  }
}

function triggerAwakeningEffect() {
  // Screen flash
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.8);
    z-index: 150;
    pointer-events: none;
  `;
  document.body.appendChild(flash);

  gsap.to(flash, {
    opacity: 0,
    duration: 0.5,
    onComplete: () => flash.remove()
  });

  // Particle burst
  burstParticles(50, { color: 0xffff00, speed: 2 });

  // Camera shake
  triggerCameraShake(1);

  playSound('awakening');
}

function triggerGratitudeEffect() {
  // Gentle particle rise
  burstParticles(40, { color: 0x00ff00, speed: 1, direction: 'up' });

  // Soft glow
  gsap.to(avatar.orb.material, {
    emissiveIntensity: 1,
    duration: 0.5,
    yoyo: true,
    repeat: 2
  });

  playSound('gratitude');
}

function triggerSmokeEffect() {
  // Smoke ring particles
  burstParticles(60, { color: 0x888888, speed: 1.5, shape: 'ring' });

  // Avatar wobble
  gsap.to(avatar.rotation, {
    x: avatar.rotation.x + 0.1,
    duration: 0.2,
    yoyo: true,
    repeat: 2
  });

  playSound('smoke');
}

function triggerDefaultEffect() {
  burstParticles(30, { color: 0xff00ff, speed: 1 });
}

function burstParticles(count, options = {}) {
  const {
    color = 0xff00ff,
    speed = 1,
    direction = 'random',
    shape = 'sphere'
  } = options;

  for (let i = 0; i < count; i++) {
    let angle, radius;

    if (shape === 'ring') {
      angle = (i / count) * Math.PI * 2;
      radius = 5;
    } else {
      angle = Math.random() * Math.PI * 2;
      radius = Math.random() * 5;
    }

    const x = Math.cos(angle) * radius;
    const y = direction === 'up' ? Math.random() * 2 : Math.sin(angle) * radius;
    const z = Math.sin(angle) * radius;

    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshBasicMaterial({ color })
    );

    particle.position.set(x, y, z);
    scene.add(particle);

    const vx = (Math.random() - 0.5) * speed * 2;
    const vy = (direction === 'up' ? Math.random() * speed : (Math.random() - 0.5) * speed * 2);
    const vz = (Math.random() - 0.5) * speed * 2;

    gsap.to(particle.position, {
      x: x + vx * 5,
      y: y + vy * 5,
      z: z + vz * 5,
      duration: 1.5,
      ease: 'power2.out'
    });

    gsap.to(particle.material, {
      opacity: 0,
      duration: 1.5,
      ease: 'power2.out',
      onComplete: () => scene.remove(particle)
    });
  }
}

function triggerCameraShake(intensity) {
  cameraShakeIntensity = intensity;
}

// ============================================
// ANIMATION LOOP
// ============================================

function animate() {
  requestAnimationFrame(animate);

  // Avatar idle animation
  if (avatar) {
    avatar.rotation.y += 0.002;
    avatar.ring.rotation.x += 0.01;
    avatar.ring.rotation.z += 0.005;

    // Gentle bob
    avatar.position.y = Math.sin(Date.now() * 0.001) * 0.5;

    // Pulsing glow
    const pulse = Math.sin(Date.now() * 0.003) * 0.3 + 0.7;
    avatar.orb.material.emissiveIntensity = pulse;
  }

  // Update particles
  if (particleSystem) {
    const positions = particleSystem.geometry.attributes.position.array;
    for (let i = 0; i < CONFIG.particleCount; i++) {
      const i3 = i * 3;
      positions[i3] += particleVelocities[i3];
      positions[i3 + 1] += particleVelocities[i3 + 1];
      positions[i3 + 2] += particleVelocities[i3 + 2];

      // Wrap around
      if (Math.abs(positions[i3]) > 50) particleVelocities[i3] *= -1;
      if (Math.abs(positions[i3 + 1]) > 50) particleVelocities[i3 + 1] *= -1;
      if (Math.abs(positions[i3 + 2]) > 50) particleVelocities[i3 + 2] *= -1;
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;
  }

  // Camera shake
  if (cameraShakeIntensity > 0) {
    camera.position.x += (Math.random() - 0.5) * cameraShakeIntensity * 0.1;
    camera.position.y += (Math.random() - 0.5) * cameraShakeIntensity * 0.1;
    cameraShakeIntensity *= 0.95;
  }

  // Render
  composer.render();
}

// ============================================
// AUDIO
// ============================================

function playSound(type) {
  // Create simple beep sounds using Web Audio API
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const now = audioContext.currentTime;

  switch (type) {
    case 'send':
      playBeep(audioContext, 800, 0.1, 0.1);
      break;
    case 'message':
      playBeep(audioContext, 600, 0.15, 0.15);
      break;
    case 'awakening':
      playBeep(audioContext, 1200, 0.2, 0.3);
      break;
    case 'gratitude':
      playBeep(audioContext, 500, 0.15, 0.2);
      break;
    case 'smoke':
      playBeep(audioContext, 400, 0.1, 0.15);
      break;
  }
}

function playBeep(audioContext, frequency, duration, volume) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

// ============================================
// UI UTILITIES
// ============================================

function updateStatusIndicator(connected) {
  const statusDot = document.querySelector('.status-dot');
  const statusText = document.querySelector('.status-text');

  if (connected) {
    statusDot.style.background = '#00ff00';
    statusDot.style.boxShadow = '0 0 10px #00ff00';
    statusText.textContent = 'LIVE';
    statusText.style.color = '#00ff00';
  } else {
    statusDot.style.background = '#ff0000';
    statusDot.style.boxShadow = '0 0 10px #ff0000';
    statusText.textContent = 'OFFLINE';
    statusText.style.color = '#ff0000';
  }
}

function hideLoadingIndicator() {
  const indicator = document.getElementById('loading-indicator');
  gsap.to(indicator, {
    opacity: 0,
    duration: 0.5,
    onComplete: () => {
      indicator.style.display = 'none';
    }
  });
}

// ============================================
// RESPONSIVE HANDLING
// ============================================

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('message-input').blur();
  }
});
