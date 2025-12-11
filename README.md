# Teachable Machine Maze Game

A gesture-controlled maze game using Google's Teachable Machine for pose detection. Navigate through a maze by pointing your hand in different directions!

## Project Structure

```
.
├── index.html         # Main HTML file
├── maze.js            # Game logic and Teachable Machine integration
├── style.css          # Styling
├── tmModel/           # Teachable Machine model files
│   ├── model.json
│   ├── metadata.json
│   └── weights.bin
├── server.py          # Local web server (Python)
└── README.md          # This file
```

## Setup Instructions

### Important: Running a Local Server

**You MUST run a local web server** to use this project. Opening `index.html` directly in a browser will fail due to CORS (Cross-Origin Resource Sharing) security restrictions that prevent loading local model files.

### Option 1: Python HTTP Server (Recommended)

1. Open Terminal/Command Prompt
2. Navigate to the project folder:
   ```bash
   cd pose-based-maze-navigation
   ```
3. Run the Python server:
   ```bash
   python3 server.py
   ```
   Or if you have Python 2:
   ```bash
   python server.py
   ```
4. Open your browser and go to:
   ```
   http://localhost:8000/index.html
   ```

### Option 2: Python Simple Server (Alternative)

If `server.py` doesn't work, use Python's built-in server:

```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Then open: `http://localhost:8000/index.html`

### Option 3: Node.js HTTP Server

If you have Node.js installed:

```bash
npx http-server -p 8000
```

Then open: `http://localhost:8000/index.html`

### Option 4: VS Code Live Server

If you use VS Code:
1. Install the "Live Server" extension
2. Right-click on `index.html`
3. Select "Open with Live Server"

## How to Play

1. **Start the Game**: Click the "Start Game" button
2. **Allow Webcam Access**: Grant permission when your browser asks
3. **Make Gestures**: 
   - Point **Left** to move left
   - Point **Right** to move right
   - Point **Up** to move up
   - Point **Down** to move down
   - Stay **Neutral** to stop
4. **Goal**: Navigate the blue circle (player) to the red goal!

## Game Features

- **Smoothing & Thresholds**: Only moves when confidence ≥ 70% and prediction is stable for 3 frames
- **Controlled Movement**: Player moves every 400ms to prevent jittery movement
- **Real-time Feedback**: Continuously displays detected direction and confidence level
- **Visual Feedback**: Shows prediction stability status

## Teachable Machine Model

The model was trained with 5 classes:
- `Neutral` - No pointing gesture
- `PointLeft` - Pointing left
- `PointRight` - Pointing right
- `PointUp` - Pointing up
- `PointDown` - Pointing down

### Model Training Process

1. Went to [Teachable Machine](https://teachablemachine.withgoogle.com/)
2. Created a new Pose Project
3. Trained 5 classes with multiple samples each:
   - Captured various angles and lighting conditions
   - Aimed for at least 100-200 samples per class
      - Neutral class was trained for 145 pose samples
      - PointLeft class was trained for 209 pose samples
      - PointRight class was trained for 178 pose samples
      - PointUp class was trained for 128 pose samples
      - PointDown class was trained for 113 pose samples
4. Exported the model:
   - Chose "TensorFlow.js" format
   - Downloaded and extracted to `tmModel/` folder
   - Ensured files are named: `model.json`, `metadata.json`, `weights.bin`

## Technical Details

### Script Loading Order

Scripts are loaded in this specific order (required):
1. TensorFlow.js (CDN)
2. Teachable Machine Pose library (CDN)
3. maze.js (local)

### Maze Grid System

- **0** = Empty space (walkable)
- **1** = Wall (blocked)
- **2** = Player start position
- **3** = Goal position

### Prediction System

- **Threshold**: 0.7 (70% confidence required)
- **Stability Frames**: 3 consecutive frames needed
- **Movement Interval**: 400ms between moves

## Troubleshooting

### CORS Error
- **Problem**: "Access to fetch... blocked by CORS policy"
- **Solution**: Use a local web server (see Setup Instructions above)

### Model Not Loading
- **Problem**: "Failed to fetch" or "Model not found"
- **Solution**: 
  - Ensure `tmModel/` folder contains all three files
  - Check that you're using a web server (not opening file directly)
  - Verify file paths in browser console

### Webcam Not Working
- **Problem**: Webcam doesn't start
- **Solution**:
  - Check browser permissions for camera access
  - Ensure no other application is using the webcam
  - Try a different browser (Chrome recommended)

### Predictions Not Working
- **Problem**: Game doesn't respond to gestures
- **Solution**:
  - Ensure good lighting
  - Make clear, distinct pointing gestures
  - Check that confidence levels are above 70%
  - Verify pose is fully visible in webcam frame

## Limitations

1. **Requires Webcam**: Game only works with a webcam
2. **Lighting Dependent**: Performance varies with lighting conditions
3. **Gesture Recognition**: May not work well with complex backgrounds
4. **Browser Compatibility**: Best tested in Chrome/Edge (Chromium-based browsers)
5. **Local Server Required**: Cannot run directly from file system

## Future Enhancements (Bonus Ideas)

- Visual polish: Better maze graphics, animations, HUD
- Additional gestures: "Reset" gesture, "Pause" gesture
- Keyboard fallback: Allow arrow keys when webcam unavailable
- Multiple maze levels
- Score tracking and timer
- Sound effects

## Credits

- Built with [Teachable Machine](https://teachablemachine.withgoogle.com/)
- Uses [TensorFlow.js](https://www.tensorflow.org/js)
- Pose detection powered by [PoseNet](https://github.com/tensorflow/tfjs-models/tree/master/pose-detection)
