// Web Audio API setup
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioBuffer;
let analyzer;
let isBeatDetected = false;
let smoothedEnergy = 0; // For smoothing energy data
let isGameRunning = false;
let score = 0;

// Create a GainNode for volume control
const gainNode = audioContext.createGain();
gainNode.connect(audioContext.destination);
gainNode.gain.value = 0.3; // Default volume set to 30%

// Canvas setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const width = canvas.width;
const height = canvas.height;

// Notes array (holds all note objects)
let notes = [];

// Meyda setup for energy detection
async function setupMeyda() {
  if (!audioContext || !audioBuffer) return;

  // Initialize the source
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(gainNode);

  // Meyda analyzer
  analyzer = Meyda.createMeydaAnalyzer({
    audioContext: audioContext,
    source: source,
    bufferSize: 512,
    featureExtractors: ["energy"],
  });

  source.start();
}

// Load the music file
async function loadMusic(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Set up the Meyda analyzer after the audioBuffer is decoded
  await setupMeyda();
  console.log("Music loaded and analyzer set up");
}

// Play the loaded music
function playMusic() {
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer; // Set the audio buffer
  source.connect(gainNode); // Connect the source to the gain node
  source.start(); // Start playback
}

// Note class
class Note {
  constructor(x, y, key) {
    this.x = x;
    this.y = y;
    this.key = key; // Corresponding key for the note
    this.scale = 1; // Default scale
    this.isBouncing = false; // Flag for beat reaction
  }

  update() {
    this.y += 5; // Note falling speed
    this.scale = this.isBouncing ? 1.5 : 1; // Scale adjustment on beat
  }

  render() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 20 * this.scale, 0, Math.PI * 2);
    ctx.fillStyle = "blue";
    ctx.fill();
    ctx.stroke();
  }

  reactToBeat() {
    this.isBouncing = true;
    setTimeout(() => (this.isBouncing = false), 100);
  }
}
// Note generation settings
let noteGenerationInterval = 600; // Time in milliseconds between note generations
let lastNoteGenerationTime = 0;

// Generate notes based on energy and timer
function generateNotes() {
  const currentTime = audioContext.currentTime * 1000; // Convert to milliseconds

  // Generate notes based on a timer
  if (currentTime - lastNoteGenerationTime > noteGenerationInterval) {
    const laneWidth = width / 5;
    const noteKey = ["A", "S", "D", "F"][Math.floor(Math.random() * 4)];
    const xPosition = laneWidth * (["A", "S", "D", "F"].indexOf(noteKey) + 1);

    const note = new Note(xPosition, 0, noteKey);
    notes.push(note);
    lastNoteGenerationTime = currentTime; // Update the last generation time
  }

  // Optional: Keep the energy-based generation for additional notes
  const energy = analyzer.get("energy");
  if (energy && energy > 0.3 && !isBeatDetected) {
    const laneWidth = width / 5;
    const noteKey = ["A", "S", "D", "F"][Math.floor(Math.random() * 4)];
    const xPosition = laneWidth * (["A", "S", "D", "F"].indexOf(noteKey) + 1);

    const note = new Note(xPosition, 0, noteKey);
    notes.push(note);
    isBeatDetected = true;
    note.reactToBeat();
  }

  if (energy < 0.2) isBeatDetected = false;
}
// Check for note hits
function checkNoteHit() {
  notes.forEach((note) => {
    if (note.y >= 550 && note.y <= 600 && keyPresses[note.key]) {
      score += 10;
      notes.splice(notes.indexOf(note), 1);
    }
  });
}

// Render game elements
function render() {
  ctx.clearRect(0, 0, width, height);

  // Score and time display
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 10, 30);

  const currentTime = audioContext.currentTime;
  const minutes = Math.floor(currentTime / 60);
  const seconds = Math.floor(currentTime % 60);
  ctx.fillText(
    `Time: ${minutes}:${seconds < 10 ? "0" + seconds : seconds}`,
    width - 150,
    30
  );

  // Render notes
  notes.forEach((note) => note.render());

  // Draw lanes
  const laneWidth = width / 5;
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(laneWidth * i, 0);
    ctx.lineTo(laneWidth * i, height);
    ctx.stroke();
  }

  // Highlight pressed keys
  Object.keys(keyPresses).forEach((key) => {
    if (keyPresses[key]) {
      ctx.fillStyle = "blue";
      const xPos = laneWidth * (["A", "S", "D", "F"].indexOf(key) + 1);
      ctx.beginPath();
      ctx.arc(xPos, height - 50, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "white";
      ctx.font = "bold 30px Arial";
      ctx.fillText(key, xPos, height - 40);
    }
  });
}

// Key press handling
const keyPresses = { A: false, S: false, D: false, F: false };
document.addEventListener("keydown", (event) => {
  if (["a", "s", "d", "f"].includes(event.key)) {
    keyPresses[event.key.toUpperCase()] = true;
  }
});
document.addEventListener("keyup", (event) => {
  if (["a", "s", "d", "f"].includes(event.key)) {
    keyPresses[event.key.toUpperCase()] = false;
  }
});

// Update game state
function update() {
  generateNotes();
  notes.forEach((note) => note.update());
  checkNoteHit();
}

// Game loop
function gameLoop() {
  if (isGameRunning) {
    update();
    render();
    requestAnimationFrame(gameLoop);
  }
}

// Start the game
document.getElementById("startButton").addEventListener("click", () => {
  audioContext.resume().then(() => {
    if (!isGameRunning) {
      loadMusic("HAYWIRE!.mp3").then(() => {
        playMusic();
        isGameRunning = true;
        gameLoop();
      });
    }
  });
});

// Volume control
document.getElementById("volumeSlider").addEventListener("input", (event) => {
  gainNode.gain.value = event.target.value;
});
