/*
This code implements a simple hand gesture-controlled piano game using the p5.js and ml5.js libraries. 
The player interacts with the piano keys by moving their hand in front of the camera, with hand pose detection tracking finger movements.
The goal is to follow a sequence of piano keys in the correct order. The game generates a random sequence of notes, and the player must press the corresponding keys by positioning their index finger over them. 
The game progresses by increasing the sequence length as the player correctly follows the notes, and resets if the player presses the wrong key.
*/


// Variables to capture video and canvas dimensions
var capture; // Video capture variable
var w = 640; // Width of the video and canvas
var h = 480; // Height of the video and canvas

let handPose; // Hand pose detection model
let video; // Video input
let hands = []; // Array to store detected hands
let notes = []; // Array to store audio files for piano notes
let numKeys = 8; // Number of piano keys
let isKeyPressed = []; // Track if each key is currently pressed
let keyWidth; // Width of each key (calculated in setup)

// Piano setup
let whiteKeyWidth; // Width of a white key
let whiteKeyHeight; // Height of a white key
let blackKeyWidth; // Width of a black key
let blackKeyHeight; // Height of a black key

// Variables for the game sequence
let gameSequence = []; // Array to store the game sequence of notes
let playerSequence = []; // Array to store the player's attempted sequence
let currentNoteIndex = 0; // Track the current note in the sequence to compare
let sequencePlaying = false; // Flag to check if the sequence is playing

// Arrays to track the color of keys
let keyColors = []; // Store the color for each key (default is white)

// Difficulty level
let sequenceLength = 1; // Start with a sequence of 1 note
let message = ""; // Message to show feedback to the player
let debounceTime = 500; // Debounce time (in ms) to prevent multiple key presses in quick succession
let lastKeyPressTime = 0; // Time of the last key press

// Colors
let a = 0;
let b = 0;
let c = 0;

function preload() {
  // Load the handPose model
  handPose = ml5.handPose(video);
  
  // Load note sounds
  for (let i = 0; i < numKeys; i++) {
    notes[i] = loadSound(`Notes/${i + 1}.mp3`); // Load each note sound file
    isKeyPressed[i] = false; // Initialize each key as not pressed
    keyColors[i] = color(255); // Default key color is white
  }
}

function setup() {
    // Create video capture from webcam and hide it
    capture = createCapture({
        audio: false,
        video: {
            width: w,
            height: h
        }
    });
    capture.elt.setAttribute('playsinline', ''); // Ensure video displays inline on mobile devices
    capture.size(w, h); // Set the video size
    capture.hide(); // Hide the video element

    createCanvas(w, h); // Create the canvas with the same size as the video

    // Initialize hand pose detection
    handPose.detectStart(capture, gotHands);

    // Calculate the size of the piano keys
    whiteKeyWidth = w / numKeys;
    whiteKeyHeight = h / 3;
    blackKeyWidth = whiteKeyWidth * 0.6;
    blackKeyHeight = whiteKeyHeight * 0.7;

    // Generate a random game sequence
    generateSequence();
}

function draw() {
    background(0); // Set the background to black

    // Display the current message, if any
    if (message !== "") {
        displayMessage(message);
        return; // Stop drawing the hand and the piano if showing a message
    }

    // Mirror the video
    push();
    translate(w, 0); 
    scale(-1, 1);
    image(capture, 0, 0, w, h);
    pop();

    // Draw the piano
    drawPiano();

    // Draw the detected hands and check which keys are being pressed
    for (let i = 0; i < hands.length; i++) {
        let hand = hands[i];
        let keypoint = hand.keypoints[8]; // Use fingertip keypoint for pressing keys

        // Correct the x position for the mirrored version
        let correctedX = w - keypoint.x;

        // Check if the finger tip is over a white key
        for (let j = 0; j < numKeys; j++) {
            let whiteKeyX = j * whiteKeyWidth;
            let whiteKeyY = 0;

            // If the fingertip is over the white key
            if (correctedX > whiteKeyX && correctedX < whiteKeyX + whiteKeyWidth && keypoint.y > whiteKeyY && keypoint.y < whiteKeyHeight) {
                // If the key was not previously pressed and enough time has passed
                if (!isKeyPressed[j] && millis() - lastKeyPressTime > debounceTime) {
                    notes[j].play(); // Play the note sound
                    isKeyPressed[j] = true; // Mark the key as pressed
                    lastKeyPressTime = millis();
                    
                    // Change the key color to blue briefly
                    keyColors[j] = color(0, 0, 255);
                    setTimeout(() => {
                        keyColors[j] = color(255); // Revert key color after a delay
                    }, 500);

                    // Check if the player pressed the correct note in the sequence
                    if (gameSequence[currentNoteIndex] === j) {
                        playerSequence.push(j);
                        currentNoteIndex++;
                        if (playerSequence.length === gameSequence.length) {
                            checkVictory();
                        }
                    } else {
                        checkLoss();
                    }
                }
            } else {
                isKeyPressed[j] = false; // Reset key press status
            }
        }
    }

    // Display the current level and instructions
    textSize(24);
    textAlign(CENTER, BOTTOM);
    fill(255);
    text(`Level ${sequenceLength}`, w / 2, h - 50);
    textSize(15);
    text("Follow the sequence! Hover your index finger over the keys in the correct order.", w / 2, h - 20);
}

// Callback function to receive hand detection results
function gotHands(results) {
    hands = results;
}

// Function to draw the piano (white and black keys)
function drawPiano() {
    for (let i = 0; i < numKeys; i++) {
        let whiteKeyX = i * whiteKeyWidth;
        fill(keyColors[i]);
        stroke(0);
        rect(whiteKeyX, 0, whiteKeyWidth, whiteKeyHeight);
    }

    for (let i = 0; i < numKeys - 1; i++) {
        if (i !== 2 && i !== 6) { // Avoid placing black keys at these positions
            let blackKeyX = (i + 1) * whiteKeyWidth - blackKeyWidth / 2;
            fill(0);
            stroke(0);
            rect(blackKeyX, 0, blackKeyWidth, blackKeyHeight);
        }
    }
}

// Function to generate a new game sequence
function generateSequence() {
    gameSequence = [];
    playerSequence = [];
    currentNoteIndex = 0;
    sequencePlaying = true;

    // Generate a sequence of random notes
    for (let i = 0; i < sequenceLength; i++) {
        gameSequence.push(floor(random(0, numKeys)));
    }

    // Start playing the sequence after a delay
    setTimeout(playSequence, 2000);
}

// Function to play the game sequence to the player
function playSequence() {
    let delay = 500;
    
    for (let i = 0; i < gameSequence.length; i++) {
        let noteIndex = gameSequence[i];
        setTimeout(() => {
            notes[noteIndex].play(); // Play each note in sequence
            keyColors[noteIndex] = color(0, 0, 255); // Highlight key briefly
            setTimeout(() => {
                keyColors[noteIndex] = color(255); // Revert key color
            }, 500);
        }, i * delay);
    }
    setTimeout(() => {
        sequencePlaying = false; // Mark sequence as finished
    }, gameSequence.length * 500);
}

// Function to display a temporary message
function displayMessage(msg) {
    if (msg == "Correct! Level Up!"){
      b = 255;
    }
    else{
      a = 255;
    }
    textSize(30);
    fill(a, b, c);
    a = 0;
    b = 0;
    textAlign(CENTER, CENTER);
    text(msg, w / 2, h / 2);
}

// Function to check if the player succeeded
function checkVictory() {
    if (JSON.stringify(playerSequence) === JSON.stringify(gameSequence)) {
        sequenceLength++; // Increase difficulty level
        generateSequence(); // Generate a new sequence
        message = "Correct! Level Up!";
        setTimeout(() => { message = ""; }, 1000); // Clear message after delay
    }
}

// Function to check if the player failed
function checkLoss() {
    sequenceLength = 1; // Reset difficulty level
    generateSequence(); // Generate a new sequence
    message = "Wrong Key!";
    setTimeout(() => { message = ""; }, 1000); // Clear message after delay
}
