// Web Audio API setup
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioBuffer;
let analyzer;
let isBeatDetected = false;  // Track beat detection status
let isGameRunning = false;
let score = 0;

// Create a GainNode for volume control
const gainNode = audioContext.createGain();
gainNode.connect(audioContext.destination);
gainNode.gain.value = 0.3;  // Default volume set to 30%

// Canvas setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const width = canvas.width;
const height = canvas.height;

// Notes array (holds all note objects)
let notes = [];

// Meyda setup for energy detection (alternative to beats if not available)
async function setupMeyda() {
    if (!audioContext || !audioBuffer) return;  // Ensure that audioContext and audioBuffer are available

    console.log("Available features:", Meyda.featureExtractors);  // Log available features

    // Initialize the source (BufferSourceNode) after audio buffer is ready
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;  // Set the buffer after creating the source
    source.connect(gainNode);  // Connect the source to the gain node

    // Initialize the Meyda analyzer with the correctly set up source
    analyzer = Meyda.createMeydaAnalyzer({
        audioContext: audioContext,
        source: source,
        bufferSize: 512,  // Buffer size for feature extraction
        featureExtractors: ["energy"],  // Use "energy" for beat detection
    });

    // Start the audio playback after the analyzer is initialized
    source.start();
}

// Load the music file
async function loadMusic(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Now that the buffer is loaded, set up the Meyda analyzer
    await setupMeyda();  // Set up the Meyda analyzer after the audioBuffer is decoded
    console.log('Music loaded and analyzer set up');
}

// Play the loaded music
function playMusic() {
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;  // Set the audio buffer
    source.connect(gainNode);  // Connect the source to the gain node
    source.start();  // Start playback
}

// Note class to define the visual notes
class Note {
    constructor(x, y, key) {
        this.x = x;
        this.y = y;
        this.key = key; // Which key corresponds to this note
        this.scale = 1; // Default scale for the note
        this.isBouncing = false; // Flag to determine if the note is reacting to the beat
    }

    // Update the note's position and handle beat reaction
    update() {
        this.y += 3; // Move the note downwards (adjust speed as needed)

        if (this.isBouncing) {
            this.scale = 1.2;  // Scale up the note when reacting to a beat
        } else {
            this.scale = 1; // Reset scale when not reacting
        }
    }

    // Render the note on the canvas
    render() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20 * this.scale, 0, 2 * Math.PI);
        ctx.fillStyle = 'blue';
        ctx.fill();
        ctx.stroke();
    }

    // React to the beat by scaling up and bouncing
    reactToBeat() {
        this.isBouncing = true;
        setTimeout(() => {
            this.isBouncing = false;  // Stop the bounce after a short delay
        }, 100); // Bounce duration (in ms)
    }
}

// Generate notes based on the energy feature (alternative to beats)
function generateNotes() {
    // Use Meyda to check for energy levels
    const energy = analyzer.get("energy");
    if (energy && energy > 0.2 && !isBeatDetected) {  // Adjust threshold based on energy level
        // Beat detected (based on energy threshold), generate notes based on timing
        const currentTime = audioContext.currentTime;
        const laneWidth = width / 5;
        const noteKey = ['A', 'S', 'D', 'F'][Math.floor(Math.random() * 4)]; // Randomly pick a key
        let xPosition = 0;

        // Position the note based on the key
        if (noteKey === 'A') {
            xPosition = laneWidth * 1;
        } else if (noteKey === 'S') {
            xPosition = laneWidth * 2;
        } else if (noteKey === 'D') {
            xPosition = laneWidth * 3;
        } else if (noteKey === 'F') {
            xPosition = laneWidth * 4;
        }

        // Create the note at the generated position
        const note = new Note(xPosition, 0, noteKey);  // Create note
        notes.push(note);  // Push the note into the array
        isBeatDetected = true;  // Set the flag to avoid multiple detections in quick succession

        // React to the beat immediately after the note is created
        note.reactToBeat();
    }
    if (energy < 0.2) {
        isBeatDetected = false; // Reset if energy drops below threshold
    }
}

// Check if the player hits a note
function checkNoteHit() {
    notes.forEach(note => {
        if (note.y >= 550 && note.y <= 600) { // Hit zone (adjust this as needed)
            if (keyPresses[note.key]) {
                score += 10; // Increase score for a successful hit
                notes.splice(notes.indexOf(note), 1); // Remove the note
            }
        }
    });
}

// Render the game elements
function render() {
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);  // Clear the entire canvas before drawing each frame

    // Display the score at a fixed position (top left corner)
    ctx.fillStyle = 'gray';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';  // Align text to the left
    ctx.fillText('Score: ' + score, 10, 30);  // Display score at (10, 30)

    // Display the current music time (top right corner)
    const currentTime = audioContext.currentTime;
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    const formattedTime = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    
    ctx.fillText('Time: ' + formattedTime, width - 150, 30);  // Display time at top right corner

    // Render the notes
    notes.forEach(note => {
        note.render();
    });

    // Render track lanes (centered based on canvas width)
    const laneWidth = width / 5;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(laneWidth * 1, 0);
    ctx.lineTo(laneWidth * 1, height);
    ctx.moveTo(laneWidth * 2, 0);
    ctx.lineTo(laneWidth * 2, height);
    ctx.moveTo(laneWidth * 3, 0);
    ctx.lineTo(laneWidth * 3, height);
    ctx.moveTo(laneWidth * 4, 0);
    ctx.lineTo(laneWidth * 4, height);
    ctx.stroke();

    // Highlight the pressed keys with smooth animations and display letters
    Object.keys(keyPresses).forEach(key => {
        if (keyPresses[key]) {
            ctx.fillStyle = 'blue';  // Color when key is pressed
            ctx.beginPath();
            let xPos = 0;
            if (key === 'A') xPos = laneWidth * 1;
            if (key === 'S') xPos = laneWidth * 2;
            if (key === 'D') xPos = laneWidth * 3;
            if (key === 'F') xPos = laneWidth * 4;
            ctx.arc(xPos, height - 50, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Display the letter in the pressed key's lane
            ctx.fillStyle = 'white';
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(key, xPos, height - 40);  // Display the key letter
        }
    });
}

// Handle key press events
const keyPresses = { 'A': false, 'S': false, 'D': false, 'F': false };

document.addEventListener('keydown', function(event) {
    if (event.key === 'a') keyPresses['A'] = true;
    if (event.key === 's') keyPresses['S'] = true;
    if (event.key === 'd') keyPresses['D'] = true;
    if (event.key === 'f') keyPresses['F'] = true;
});

document.addEventListener('keyup', function(event) {
    if (event.key === 'a') keyPresses['A'] = false;
    if (event.key === 's') keyPresses['S'] = false;
    if (event.key === 'd') keyPresses['D'] = false;
    if (event.key === 'f') keyPresses['F'] = false;
});

// Update the game state
function update() {
    generateNotes();
    notes.forEach(note => {
        note.update();
    });
    checkNoteHit();
}

// Start the game loop (60 FPS)
function gameLoop() {
    if (isGameRunning) {
        // Update the game state
        update();

        // Render the game
        render();

        // Call the game loop recursively
        requestAnimationFrame(gameLoop);
    }
}

// Start the game when the user clicks the start button
document.getElementById('startButton').addEventListener('click', function() {
    audioContext.resume().then(() => {
        // Only start the game after user interaction
        if (!isGameRunning) {
            loadMusic('EGO!.mp3').then(() => {
                playMusic();
                isGameRunning = true;
                gameLoop();
            });
        }
    });
});

// Volume control slider event listener
document.getElementById('volumeSlider').addEventListener('input', function(event) {
    const volume = event.target.value;
    gainNode.gain.value = volume;  // Adjust the volume based on the slider value
});
