// Snake Game with Three.js

// Game constants
const GRID_SIZE = 20;
const CELL_SIZE = 1;
const MOVE_INTERVAL = 150; // milliseconds
const COLORS = {
    background: 0x000000,
    grid: 0x222222,
    snake: 0x00ff00,
    snakeHead: 0x00dd00, // Slightly darker green for head
    food: 0xff0000,
    gridLines: 0x333333,
    appleStalk: 0x663300
};

// Game variables
let scene, camera, renderer;
let snake = [];
let food;
let direction = { x: 1, y: 0, z: 0 };
let newDirection = { x: 1, y: 0, z: 0 };
let score = 0;
let gameOver = false;
let lastMoveTime = 0;
let gamePaused = false;
let speedMultiplier = 1;
let isMoving = true; // Flag to track if the snake is moving

// Initialize the game
function init() {
    console.log("Initializing game...");
    
    try {
        // Reset game state
        snake = [];
        score = 0;
        gameOver = false;
        gamePaused = false;
        speedMultiplier = 1;
        direction = { x: 1, y: 0, z: 0 };
        newDirection = { x: 1, y: 0, z: 0 };
        document.getElementById('score').textContent = `Score: ${score}`;
        document.getElementById('game-over').style.display = 'none';
        
        // Create Three.js scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(COLORS.background);
        console.log("Scene created");
        
        // Camera setup
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(GRID_SIZE / 2, GRID_SIZE / 2, GRID_SIZE * 1.5);
        camera.lookAt(GRID_SIZE / 2, GRID_SIZE / 2, 0);
        console.log("Camera setup complete");
        
        // Renderer setup
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);
        console.log("Renderer setup complete");
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(GRID_SIZE, GRID_SIZE, GRID_SIZE);
        scene.add(directionalLight);
        console.log("Lights added");
        
        // Create game grid
        createGrid();
        
        // Create initial snake (3 segments)
        createInitialSnake();
        
        // Create initial food (apple)
        spawnFood();
        
        // Set up event listeners
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', onWindowResize);
        
        // Show instructions
        showInstructions();
        
        // Start game loop
        animate(0);
        console.log("Game loop started");
    } catch (error) {
        console.error("Error initializing game:", error);
    }
}

// Create the initial snake
function createInitialSnake() {
    // Clear any existing snake
    while (snake.length > 0) {
        const segment = snake.pop();
        if (segment.mesh) {
            scene.remove(segment.mesh);
        }
    }
    
    // Create initial snake (3 segments)
    const startX = Math.floor(GRID_SIZE / 4);
    const startY = 0.5; // Slightly above the grid
    const startZ = Math.floor(GRID_SIZE / 2);
    
    // Add head
    addSnakeSegment(startX, startY, startZ, true);
    
    // Add body segments
    for (let i = 1; i < 3; i++) {
        addSnakeSegment(startX - i, startY, startZ, false);
    }
    
    console.log("Snake created with", snake.length, "segments at position:", startX, startY, startZ);
}

// Create the grid
function createGrid() {
    const gridGeometry = new THREE.PlaneGeometry(GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);
    const gridMaterial = new THREE.MeshBasicMaterial({ 
        color: COLORS.grid,
        side: THREE.DoubleSide
    });
    const grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.rotation.x = Math.PI / 2;
    grid.position.set(GRID_SIZE / 2 - 0.5, 0, GRID_SIZE / 2 - 0.5);
    scene.add(grid);
    
    // Add grid lines
    const gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_SIZE, COLORS.gridLines, COLORS.gridLines);
    gridHelper.position.set(GRID_SIZE / 2 - 0.5, 0.01, GRID_SIZE / 2 - 0.5);
    scene.add(gridHelper);
    console.log("Grid created");
}

// Add a snake segment at the specified position
function addSnakeSegment(x, y, z, isHead = false) {
    const geometry = new THREE.BoxGeometry(CELL_SIZE * 0.9, CELL_SIZE * 0.9, CELL_SIZE * 0.9);
    const material = new THREE.MeshLambertMaterial({ 
        color: isHead ? COLORS.snakeHead : COLORS.snake 
    });
    const segment = new THREE.Mesh(geometry, material);
    segment.position.set(x, y, z);
    
    // If it's the head, add eyes
    if (isHead) {
        // Left eye
        const leftEyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const leftEye = new THREE.Mesh(leftEyeGeometry, eyeMaterial);
        leftEye.position.set(0.2, 0.2, -0.3);
        segment.add(leftEye);
        
        // Left pupil
        const leftPupilGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const leftPupil = new THREE.Mesh(leftPupilGeometry, pupilMaterial);
        leftPupil.position.set(0, 0, -0.06);
        leftEye.add(leftPupil);
        
        // Right eye
        const rightEye = new THREE.Mesh(leftEyeGeometry, eyeMaterial);
        rightEye.position.set(0.2, 0.2, 0.3);
        segment.add(rightEye);
        
        // Right pupil
        const rightPupil = new THREE.Mesh(leftPupilGeometry, pupilMaterial);
        rightPupil.position.set(0, 0, -0.06);
        rightEye.add(rightPupil);
    }
    
    scene.add(segment);
    snake.unshift({ 
        mesh: segment, 
        position: { x, y, z },
        isHead: isHead
    });
    
    if (isHead) {
        console.log("Added snake head at", x, y, z);
    }
}

// Spawn food (apple) at a random position not occupied by the snake
function spawnFood() {
    if (food) {
        scene.remove(food);
    }
    
    // Generate random position
    let foodPosition;
    do {
        foodPosition = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: 0.5, // Slightly elevated from the grid
            z: Math.floor(Math.random() * GRID_SIZE)
        };
    } while (isPositionOccupied(foodPosition));
    
    // Create apple group
    food = new THREE.Group();
    
    // Apple body (red sphere)
    const appleGeometry = new THREE.SphereGeometry(CELL_SIZE / 2, 16, 16);
    const appleMaterial = new THREE.MeshLambertMaterial({ color: COLORS.food });
    const apple = new THREE.Mesh(appleGeometry, appleMaterial);
    food.add(apple);
    
    // Apple stalk
    const stalkGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
    const stalkMaterial = new THREE.MeshLambertMaterial({ color: COLORS.appleStalk });
    const stalk = new THREE.Mesh(stalkGeometry, stalkMaterial);
    stalk.position.set(0, 0.4, 0);
    food.add(stalk);
    
    // Add a leaf
    const leafGeometry = new THREE.BoxGeometry(0.2, 0.05, 0.2);
    const leafMaterial = new THREE.MeshLambertMaterial({ color: 0x00AA00 });
    const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
    leaf.position.set(0.15, 0.4, 0);
    leaf.rotation.z = Math.PI / 6;
    food.add(leaf);
    
    food.position.set(foodPosition.x, foodPosition.y, foodPosition.z);
    scene.add(food);
    console.log("Apple spawned at", foodPosition);
}

// Check if a position is occupied by the snake
function isPositionOccupied(position) {
    return snake.some(segment => 
        Math.round(segment.position.x) === Math.round(position.x) && 
        Math.round(segment.position.z) === Math.round(position.z)
    );
}

// Handle keyboard input
function handleKeyDown(event) {
    // Pause game with 'p' key or spacebar
    if (event.key === 'p' || event.key === ' ') {
        gamePaused = !gamePaused;
        const pauseElement = document.getElementById('pause-indicator');
        if (pauseElement) {
            pauseElement.style.display = gamePaused ? 'block' : 'none';
        }
        return;
    }
    
    // Restart game with 'r' key if game over
    if (event.key === 'r' && gameOver) {
        restartGame();
        return;
    }
    
    // Only process direction keys if game is running
    if (gameOver || gamePaused) return;
    
    let directionChanged = false;
    
    switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (direction.z !== 1) { // Not moving backward
                newDirection = { x: 0, y: 0, z: -1 };
                directionChanged = true;
            }
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (direction.z !== -1) { // Not moving forward
                newDirection = { x: 0, y: 0, z: 1 };
                directionChanged = true;
            }
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (direction.x !== 1) { // Not moving right
                newDirection = { x: -1, y: 0, z: 0 };
                directionChanged = true;
            }
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (direction.x !== -1) { // Not moving left
                newDirection = { x: 1, y: 0, z: 0 };
                directionChanged = true;
            }
            break;
    }
    
    if (directionChanged) {
        console.log("Direction changed to:", newDirection);
        
        // Apply the head orientation immediately when direction changes
        direction = { ...newDirection };
        updateSnakeHeadOrientation();
    }
}

// Update snake position
function moveSnake() {
    if (gameOver || gamePaused) return;
    
    // Calculate new head position
    const head = snake[0];
    const newHeadPos = {
        x: head.position.x + direction.x,
        y: head.position.y,
        z: head.position.z + direction.z
    };
    
    console.log("Moving snake to:", newHeadPos);
    
    // Check for collision with wall
    if (
        newHeadPos.x < 0 || newHeadPos.x >= GRID_SIZE ||
        newHeadPos.z < 0 || newHeadPos.z >= GRID_SIZE
    ) {
        console.log("Wall collision detected!");
        endGame();
        return;
    }
    
    // Check for collision with self (skip the last segment as it will be removed)
    for (let i = 0; i < snake.length - 1; i++) {
        const segment = snake[i];
        if (
            Math.round(newHeadPos.x) === Math.round(segment.position.x) &&
            Math.round(newHeadPos.z) === Math.round(segment.position.z)
        ) {
            console.log("Self collision detected!");
            endGame();
            return;
        }
    }
    
    // Food collision detection
    let ateFood = false;
    if (food && 
        Math.round(newHeadPos.x) === Math.round(food.position.x) &&
        Math.round(newHeadPos.z) === Math.round(food.position.z)
    ) {
        ateFood = true;
        // Don't remove tail on food consumption
    }
    
    // Add new head
    addSnakeSegment(newHeadPos.x, newHeadPos.y, newHeadPos.z, true);
    
    // Update the second segment (previous head) to be a body segment
    if (snake.length > 1) {
        const formerHead = snake[1];
        if (formerHead.isHead) {
            // Remove the eyes from the former head
            while (formerHead.mesh.children.length > 0) {
                formerHead.mesh.remove(formerHead.mesh.children[0]);
            }
            formerHead.mesh.material.color.set(COLORS.snake);
            formerHead.isHead = false;
        }
    }
    
    if (ateFood) {
        // Eat food
        spawnFood();
        updateScore(10);
        
        // Increase game speed as score increases
        if (score % 50 === 0 && score > 0) {
            speedMultiplier += 0.1;
            console.log("Speed increased to", speedMultiplier);
        }
    } else {
        // Remove tail
        const tail = snake.pop();
        scene.remove(tail.mesh);
    }
}

// Update the orientation of the snake head based on direction
function updateSnakeHeadOrientation() {
    if (snake.length > 0) {
        const head = snake[0];
        if (head && head.mesh) {
            // Reset rotation
            head.mesh.rotation.set(0, 0, 0);
            
            // Rotate based on direction
            if (direction.x === 1) { // Moving right
                head.mesh.rotation.y = 0;
            } else if (direction.x === -1) { // Moving left
                head.mesh.rotation.y = Math.PI;
            } else if (direction.z === 1) { // Moving down
                head.mesh.rotation.y = Math.PI / 2;
            } else if (direction.z === -1) { // Moving up
                head.mesh.rotation.y = -Math.PI / 2;
            }
        }
    }
}

// Handle game over
function endGame() {
    gameOver = true;
    document.getElementById('final-score').textContent = `Final Score: ${score}`;
    document.getElementById('game-over').style.display = 'block';
    console.log("Game over! Final score:", score);
}

// Update score
function updateScore(points) {
    score += points;
    document.getElementById('score').textContent = `Score: ${score}`;
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Restart game
function restartGame() {
    // Remove existing elements
    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }
    document.body.removeChild(renderer.domElement);
    
    // Reinitialize the game
    init();
}

// Show game instructions
function showInstructions() {
    // Check if instructions already exist
    if (document.getElementById('instructions')) {
        return;
    }
    
    const instructionsDiv = document.createElement('div');
    instructionsDiv.id = 'instructions';
    instructionsDiv.style.position = 'absolute';
    instructionsDiv.style.top = '20px';
    instructionsDiv.style.right = '20px';
    instructionsDiv.style.color = 'white';
    instructionsDiv.style.textAlign = 'right';
    instructionsDiv.style.fontSize = '16px';
    instructionsDiv.style.fontFamily = 'Arial, sans-serif';
    instructionsDiv.style.padding = '10px';
    instructionsDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    instructionsDiv.style.borderRadius = '5px';
    
    instructionsDiv.innerHTML = `
        <h2>How to Play</h2>
        <p>Use Arrow Keys or WASD to move the snake</p>
        <p>Eat red apples to grow longer and score points</p>
        <p>Avoid hitting walls or yourself</p>
        <p>Press Space or P to pause/resume</p>
        <p>Press R to restart when game over</p>
        <p class="fade">This message will fade away shortly...</p>
    `;
    
    document.body.appendChild(instructionsDiv);
    
    // Create pause indicator
    const pauseDiv = document.createElement('div');
    pauseDiv.id = 'pause-indicator';
    pauseDiv.style.position = 'absolute';
    pauseDiv.style.top = '50%';
    pauseDiv.style.left = '50%';
    pauseDiv.style.transform = 'translate(-50%, -50%)';
    pauseDiv.style.color = 'white';
    pauseDiv.style.textAlign = 'center';
    pauseDiv.style.fontSize = '32px';
    pauseDiv.style.fontFamily = 'Arial, sans-serif';
    pauseDiv.style.padding = '20px';
    pauseDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    pauseDiv.style.borderRadius = '10px';
    pauseDiv.style.display = 'none';
    pauseDiv.innerHTML = '<h2>GAME PAUSED</h2><p>Press Space or P to continue</p>';
    
    document.body.appendChild(pauseDiv);
    
    // Fade out instructions after 10 seconds
    setTimeout(() => {
        instructionsDiv.style.transition = 'opacity 2s';
        instructionsDiv.style.opacity = '0.2';
    }, 10000);
    
    // Make instructions visible on hover
    instructionsDiv.addEventListener('mouseenter', () => {
        instructionsDiv.style.opacity = '1';
    });
    
    instructionsDiv.addEventListener('mouseleave', () => {
        instructionsDiv.style.opacity = '0.2';
    });
}

// Animation loop
function animate(time) {
    requestAnimationFrame(animate);
    
    // Move snake at interval (affected by speed multiplier)
    const adjustedInterval = MOVE_INTERVAL / speedMultiplier;
    
    // Always move in the current direction unless paused or game over
    if ((time - lastMoveTime > adjustedInterval) && !gameOver && !gamePaused) {
        moveSnake();
        lastMoveTime = time;
    }
    
    // Animate food (apple)
    if (food) {
        food.rotation.y += 0.02;
        food.position.y = 0.5 + Math.sin(time * 0.003) * 0.2; // Floating effect
    }
    
    renderer.render(scene, camera);
}

// Add event listener for DOMContentLoaded to ensure the page is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded, initializing game");
    // Initialize the game
    init();
    
    // Restart button event handler
    document.getElementById('restart-button').addEventListener('click', restartGame);
});
