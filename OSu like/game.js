// Set up the canvas and context
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const width = canvas.width;
const height = canvas.height;

// Game variables
let isGameRunning = false;
let score = 0;
let keyPresses = { 'A': false, 'S': false, 'D': false, 'F': false };

// Web Audio API setup
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioBuffer;

// Create a GainNode for volume control
const gainNode = audioContext.createGain();
gainNode.connect(audioContext.destination);
gainNode.gain.value = 0.5;  // Default volume set to 50%

// Note class to define the visual notes
class Note {
    constructor(x, y, key, time) {
        this.x = x;
        this.y = y;
        this.key = key; // Which key (A, S, D, F) corresponds to this note
        this.time = time; // Time when the note should appear
    }

    // Update the note's position
    update() {
        this.y += 3; // Move the note downwards (adjust speed as needed)
    }

    // Render the note on the canvas
    render() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, 2 * Math.PI);
        ctx.fillStyle = 'blue';
        ctx.fill();
        ctx.stroke();
    }
}

let notes = [];

// Load the music file
async function loadMusic(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
}

// Play the loaded music
function playMusic() {
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(gainNode);  // Connect the source to the gain node
    source.start();
}

// Generate notes based on the music's current time
function generateNotes() {
    const currentTime = audioContext.currentTime;

    // For simplicity, generate notes for each key every second
    // Adjust to synchronize with your actual music timing
    if (Math.floor(currentTime) % 2 === 0) { // Example condition for demo
        // Generate notes for each key (A, S, D, F) at different X positions (lanes)
        const laneWidth = width / 5; // Divide canvas into 5 parts for lane positioning
        const newNoteA = new Note(laneWidth * 1, 0, 'A', currentTime); // A -> Left lane
        const newNoteS = new Note(laneWidth * 2, 0, 'S', currentTime); // S -> 2nd lane
        const newNoteD = new Note(laneWidth * 3, 0, 'D', currentTime); // D -> 3rd lane
        const newNoteF = new Note(laneWidth * 4, 0, 'F', currentTime); // F -> Right lane

        notes.push(newNoteA, newNoteS, newNoteD, newNoteF);
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

// Update the game state
function update() {
    generateNotes();
    notes.forEach(note => {
        note.update();
    });
    checkNoteHit();
}

// Render the game elements
function render() {
    ctx.clearRect(0, 0, width, height); // Clear the canvas

    // Display the score
    ctx.fillStyle = 'black';
    ctx.font = '30px Arial';
    ctx.fillText('Score: ' + score, 10, 30);  // Display score

    // Display the current music time
    const currentTime = audioContext.currentTime;
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    const formattedTime = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    
    ctx.fillText('Time: ' + formattedTime, 10, 70); // Display time

    // Render the notes
    notes.forEach(note => {
        note.render();
    });

    // Render track lanes (centered based on canvas width)
    const laneWidth = width / 5;
    ctx.strokeStyle = 'gray';
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
}

// Handle key press events
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
