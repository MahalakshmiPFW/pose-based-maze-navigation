// Teachable Machine Model and Webcam Variables
let model;
let webcam;
let maxPredictions;
let isModelLoaded = false;
let isWebcamReady = false;
let isRunning = false;
let animationFrameId = null;

// Prediction smoothing variables
const PREDICTION_THRESHOLD = 0.7; // Only commit to direction if confidence >= 0.7
const STABILITY_FRAMES = 3; // Number of consecutive frames needed for stable prediction
let predictionHistory = [];
let currentDirection = 'Neutral';
let lastStableDirection = 'Neutral';

// Movement control - move at controlled pace (400ms intervals)
const MOVEMENT_INTERVAL = 400; // Move every 400ms
let lastMoveTime = 0;

// Grid-based maze
const GRID_SIZE = 15; // 15x15 grid
const CELL_SIZE = 30; // pixels per cell

// Maze representation: 0 = empty space, 1 = wall, 2 = player start, 3 = goal
let maze = [];
let playerX = 1;
let playerY = 1;
let goalX = GRID_SIZE - 2;
let goalY = GRID_SIZE - 2;

// Canvas setup
const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');

// Initialize canvas size
canvas.width = GRID_SIZE * CELL_SIZE;
canvas.height = GRID_SIZE * CELL_SIZE;

// Initialize the maze grid
function initMaze() {
    // Create border walls
    maze = [];
    for (let y = 0; y < GRID_SIZE; y++) {
        maze[y] = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            if (x === 0 || x === GRID_SIZE - 1 || y === 0 || y === GRID_SIZE - 1) {
                maze[y][x] = 1; // Wall
            } else {
                maze[y][x] = 0; // Empty space
            }
        }
    }
    
    // Add some internal walls to create a simple maze
    // Horizontal walls
    for (let x = 2; x < GRID_SIZE - 2; x++) {
        if (x !== 5 && x !== 8) maze[3][x] = 1;
        if (x !== 3 && x !== 7) maze[6][x] = 1;
        if (x !== 4 && x !== 9) maze[9][x] = 1;
    }
    
    // Vertical walls
    for (let y = 2; y < GRID_SIZE - 2; y++) {
        if (y !== 4 && y !== 7) maze[y][4] = 1;
        if (y !== 2 && y !== 8) maze[y][7] = 1;
        if (y !== 5 && y !== 10) maze[y][10] = 1;
    }
    
    // Set start position (2 = player start)
    maze[playerY][playerX] = 2;
    // Set goal position (3 = goal)
    maze[goalY][goalX] = 3;
}

// Draw the maze
function drawMaze() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const cellX = x * CELL_SIZE;
            const cellY = y * CELL_SIZE;
            
            if (maze[y][x] === 1) {
                // Wall - draw filled rectangle
                ctx.fillStyle = '#333';
                ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
            } else if (maze[y][x] === 3) {
                // Goal - draw red circle
                ctx.fillStyle = '#F44336';
                ctx.beginPath();
                ctx.arc(cellX + CELL_SIZE / 2, cellY + CELL_SIZE / 2, CELL_SIZE / 3, 0, 2 * Math.PI);
                ctx.fill();
            } else {
                // Empty space - draw grid lines
                ctx.strokeStyle = '#ddd';
                ctx.lineWidth = 1;
                ctx.strokeRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
            }
        }
    }
    
    // Draw player (always draw on top)
    ctx.fillStyle = '#2196F3';
    ctx.beginPath();
    ctx.arc(
        playerX * CELL_SIZE + CELL_SIZE / 2,
        playerY * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 3,
        0,
        2 * Math.PI
    );
    ctx.fill();
}

// Move player based on direction
function movePlayer(direction) {
    const now = Date.now();
    if (now - lastMoveTime < MOVEMENT_INTERVAL) {
        return; // Too soon to move again
    }
    
    let newX = playerX;
    let newY = playerY;
    
    // Calculate new position based on direction - match Teachable Machine class names
    switch (direction) {
        case 'PointLeft':
        case 'Left':
        case 'left':
            newX = Math.max(0, playerX - 1);
            break;
        case 'PointRight':
        case 'Right':
        case 'right':
            newX = Math.min(GRID_SIZE - 1, playerX + 1);
            break;
        case 'PointUp':
        case 'Up':
        case 'up':
            newY = Math.max(0, playerY - 1);
            break;
        case 'PointDown':
        case 'Down':
        case 'down':
            newY = Math.min(GRID_SIZE - 1, playerY + 1);
            break;
        case 'Neutral':
        case 'neutral':
            // Don't move
            return;
    }
    
    // Check if new position is valid (not a wall)
    if (maze[newY][newX] !== 1) {
        // Clear old position if it was marked as start
        if (maze[playerY][playerX] === 2) {
            maze[playerY][playerX] = 0;
        }
        
        playerX = newX;
        playerY = newY;
        
        // Check if reached goal
        if (maze[playerY][playerX] === 3) {
            setTimeout(() => {
                alert('🎉 Congratulations! You reached the goal!');
                resetMaze();
            }, 100);
        }
        
        lastMoveTime = now;
        drawMaze();
    }
}

// Reset maze and player position
function resetMaze() {
    playerX = 1;
    playerY = 1;
    initMaze();
    drawMaze();
}

// Load the Teachable Machine model from local files
async function initTM() {
    // Use local model files from tmModel folder
    const modelURL = "tmModel/model.json";
    const metadataURL = "tmModel/metadata.json";

    try {
        updatePredictionDisplay('Loading model...', '', '');
        
        // Check if libraries are loaded
        if (typeof tmPose === 'undefined') {
            throw new Error('Teachable Machine library not loaded. Check script order.');
        }
        if (typeof tf === 'undefined') {
            throw new Error('TensorFlow.js not loaded. Check script order.');
        }
        
        console.log('Loading model from:', modelURL);
        
        // Load the pose model and metadata
        model = await tmPose.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        isModelLoaded = true;
        console.log('✓ Model loaded successfully. Classes:', maxPredictions);
        
        updatePredictionDisplay('Model loaded. Starting webcam...', '', '');
        
        // Setup the webcam
        const flip = true; // whether to flip the webcam
        webcam = new tmPose.Webcam(400, 400, flip); // width, height, flip
        await webcam.setup(); // request access to the webcam
        await webcam.play();
        
        // Get the webcam container
        const webcamContainer = document.querySelector('.webcam-container');
        
        // Clear the container and add the webcam canvas for display
        webcamContainer.innerHTML = ''; // Clear any existing content
        
        // The webcam canvas is what we'll display and use for predictions
        if (webcam.canvas) {
            webcam.canvas.style.width = '100%';
            webcam.canvas.style.height = 'auto';
            webcam.canvas.style.display = 'block';
            webcamContainer.appendChild(webcam.canvas);
            console.log('✓ Webcam canvas added to container');
        } else {
            throw new Error('Webcam canvas not found!');
        }
        
        // Wait a bit for webcam to be fully ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        isWebcamReady = true;
        isRunning = true; // Start the game loop
        console.log('✓ Webcam ready, starting prediction loop');
        
        // Initialize pose detection loop
        animationFrameId = window.requestAnimationFrame(poseLoop);
        
        // Update status
        updatePredictionDisplay('Ready to play!', 'Make gestures to move', 'System active');
    } catch (error) {
        console.error('Error loading model or webcam:', error);
        updatePredictionDisplay('Error: ' + error.message, 'Check console for details', '');
        
        // Reset button states
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        startBtn.disabled = false;
        startBtn.textContent = 'Start Game';
        stopBtn.disabled = true;
    }
}

// Pose detection loop - runs on animation frames
async function poseLoop() {
    if (!isRunning || !isModelLoaded || !isWebcamReady) {
        return; // Stop the loop if not running
    }
    
    webcam.update(); // update the webcam frame
    await predict();
    animationFrameId = window.requestAnimationFrame(poseLoop);
}

// Run pose estimation and prediction
async function predict() {
    if (!model || !webcam || !webcam.canvas) {
        return;
    }
    
    // Ensure canvas has valid dimensions
    if (webcam.canvas.width === 0 || webcam.canvas.height === 0) {
        return;
    }
    
    let predictedClass = 'Neutral';
    let maxConfidence = 0;
    
    try {
        // Estimate pose from webcam canvas
        const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
        
        if (!pose || !posenetOutput) {
            updatePredictionDisplay('No pose detected', 'Move into view', 'Waiting...');
            return; // No pose detected
        }
        
        // Predict the class based on pose - pass posenetOutput, not pose
        const prediction = await model.predict(posenetOutput);
        
        // Find the highest confidence prediction
        for (let i = 0; i < maxPredictions; i++) {
            const classPrediction = prediction[i];
            if (classPrediction && classPrediction.probability > maxConfidence) {
                maxConfidence = classPrediction.probability;
                predictedClass = classPrediction.className;
            }
        }
    } catch (error) {
        console.error('Prediction error:', error);
        return; // Skip this prediction frame if there's an error
    }
    
    // Add to prediction history for smoothing
    predictionHistory.push({
        direction: predictedClass,
        confidence: maxConfidence
    });
    
    // Keep only last N predictions
    if (predictionHistory.length > STABILITY_FRAMES) {
        predictionHistory.shift();
    }
    
    // Check if prediction meets threshold and is stable
    const isStable = predictionHistory.length >= STABILITY_FRAMES &&
                     predictionHistory.every(p => p.direction === predictedClass);
    
    if (maxConfidence >= PREDICTION_THRESHOLD && isStable) {
        currentDirection = predictedClass;
        lastStableDirection = predictedClass;
        
        // Move player
        movePlayer(predictedClass);
    } else {
        currentDirection = 'Neutral';
    }
    
    // Update display with current detected direction and confidence
    const confidencePercent = (maxConfidence * 100).toFixed(1);
    const statusSymbol = maxConfidence >= PREDICTION_THRESHOLD ? '✓' : '○';
    const stabilityText = isStable ? '[STABLE]' : '[stabilizing...]';
    
    updatePredictionDisplay(
        `Direction: ${predictedClass} ${statusSymbol}`,
        `Confidence: ${confidencePercent}%`,
        `${stabilityText} History: ${predictionHistory.length}/${STABILITY_FRAMES}`
    );
}

// Update prediction display - continuously show current detected direction and confidence
function updatePredictionDisplay(status, confidence, debug) {
    const statusEl = document.querySelector('#prediction .status');
    const confidenceEl = document.querySelector('#prediction .confidence');
    const debugEl = document.querySelector('#prediction .debug-info');
    
    if (statusEl) statusEl.textContent = status;
    if (confidenceEl) confidenceEl.textContent = confidence;
    if (debugEl) debugEl.textContent = debug;
}

// Stop the game and webcam
function stopGame() {
    isRunning = false; // Stop the loop
    
    // Cancel animation frame if it exists
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    // Stop the webcam
    if (webcam) {
        try {
            webcam.stop();
            console.log('Webcam stopped');
        } catch (error) {
            console.error('Error stopping webcam:', error);
        }
    }
    
    // Reset flags
    isWebcamReady = false;
    
    // Update UI
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    startBtn.disabled = false;
    startBtn.textContent = 'Start Game';
    stopBtn.disabled = true;
    
    // Clear webcam container
    const webcamContainer = document.querySelector('.webcam-container');
    if (webcamContainer) {
        webcamContainer.innerHTML = '<div class="webcam-placeholder">Webcam stopped. Click "Start Game" to play again.</div>';
    }
    
    // Update status
    updatePredictionDisplay('Game stopped. Click "Start Game" to begin.', '', '');
    
    console.log('Game stopped');
}

// Event listeners
document.getElementById('startBtn').addEventListener('click', async () => {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    startBtn.disabled = true;
    startBtn.textContent = 'Loading...';
    stopBtn.disabled = false;
    
    await initTM();
    
    if (isRunning) {
        startBtn.textContent = 'Game Running';
    }
});

document.getElementById('stopBtn').addEventListener('click', () => {
    stopGame();
});

document.getElementById('resetBtn').addEventListener('click', () => {
    resetMaze();
});

// Initialize maze on page load
window.addEventListener('load', () => {
    console.log('Page loaded, initializing maze');
    initMaze();
    drawMaze();
});
