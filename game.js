// Snake Game with Three.js

// Game constants
const GRID_SIZE = 20;
const CELL_SIZE = 1;
const MOVE_INTERVAL = 150; // milliseconds
const COLORS = {
    background: 0x111111,
    grid: 0x222222,
    snake: 0x00ff00,
    snakeHead: 0x00dd00, // Slightly darker green for head
    food: 0xff3333,
    gridLines: 0x333333,
    appleStalk: 0x663300,
    gridGlow: 0x00ff00
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
let gridLines;
let particleSystem;

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
        scene.fog = new THREE.FogExp2(COLORS.background, 0.035);
        console.log("Scene created");
        
        // Camera setup
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(GRID_SIZE / 2, GRID_SIZE / 2, GRID_SIZE * 1.5);
        camera.lookAt(GRID_SIZE / 2, GRID_SIZE / 2, 0);
        console.log("Camera setup complete");
        
        // Renderer setup
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(renderer.domElement);
        console.log("Renderer setup complete");
        
        // Add lights
        addLighting();
        
        // Create game grid
        createGrid();
        
        // Create initial snake (3 segments)
        createInitialSnake();
        
        // Create initial food (apple)
        spawnFood();
        
        // Add particle effects
        createParticleSystem();
        
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

// Add lighting to the scene
function addLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // Directional light (main light)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(GRID_SIZE, GRID_SIZE, GRID_SIZE);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);
    
    // Add a green point light at the snake head position
    const headLight = new THREE.PointLight(0x00ff00, 1, 10);
    headLight.position.set(GRID_SIZE / 4, 1, GRID_SIZE / 2);
    scene.add(headLight);
    
    console.log("Lights added");
}

// Create particle system for visual effects
function createParticleSystem() {
    const particleCount = 500;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = Math.random() * GRID_SIZE * 2 - GRID_SIZE;
        positions[i + 1] = Math.random() * GRID_SIZE / 2;
        positions[i + 2] = Math.random() * GRID_SIZE * 2 - GRID_SIZE;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x00ff00,
        size: 0.05,
        transparent: true,
        opacity: 0.5,
        map: createCircleTexture('#00ff00', 256),
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);
}

// Create a circular texture for particles
function createCircleTexture(color, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    
    // Draw outer glow
    const gradient = context.createRadialGradient(
        size / 2, size / 2, 0,
        size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
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
    // Create the main grid plane
    const gridGeometry = new THREE.PlaneGeometry(GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);
    const gridMaterial = new THREE.MeshStandardMaterial({ 
        color: COLORS.grid,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.2
    });
    const grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.rotation.x = Math.PI / 2;
    grid.position.set(GRID_SIZE / 2 - 0.5, 0, GRID_SIZE / 2 - 0.5);
    grid.receiveShadow = true;
    scene.add(grid);
    
    // Add grid lines with glow effect
    gridLines = new THREE.GridHelper(GRID_SIZE, GRID_SIZE, COLORS.gridGlow, COLORS.gridLines);
    gridLines.position.set(GRID_SIZE / 2 - 0.5, 0.01, GRID_SIZE / 2 - 0.5);
    scene.add(gridLines);
    
    // Add a subtle glow around the grid edges
    addGridGlow();
    
    console.log("Grid created");
}

// Add a glowing border to the grid
function addGridGlow() {
    const edgeGeometry = new THREE.EdgesGeometry(
        new THREE.BoxGeometry(GRID_SIZE, 0.1, GRID_SIZE)
    );
    const edgeMaterial = new THREE.LineBasicMaterial({ 
        color: COLORS.gridGlow,
        transparent: true,
        opacity: 0.6
    });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.position.set(GRID_SIZE / 2 - 0.5, 0, GRID_SIZE / 2 - 0.5);
    scene.add(edges);
}

// Add a snake segment at the specified position
function addSnakeSegment(x, y, z, isHead = false) {
    // Create segment geometry with rounded corners
    const geometry = new THREE.BoxGeometry(CELL_SIZE * 0.9, CELL_SIZE * 0.9, CELL_SIZE * 0.9);
    
    // Special material for head and body
    const material = new THREE.MeshStandardMaterial({ 
        color: isHead ? COLORS.snakeHead : COLORS.snake,
        emissive: isHead ? COLORS.snakeHead : COLORS.snake,
        emissiveIntensity: isHead ? 0.5 : 0.3,
        roughness: 0.3,
        metalness: 0.7
    });
    
    const segment = new THREE.Mesh(geometry, material);
    segment.position.set(x, y, z);
    segment.castShadow = true;
    
    // If it's the head, add eyes
    if (isHead) {
        // Left eye
        const leftEyeGeometry = new THREE.SphereGeometry(0.1, 12, 12);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const leftEye = new THREE.Mesh(leftEyeGeometry, eyeMaterial);
        leftEye.position.set(0.2, 0.2, -0.3);
        segment.add(leftEye);
        
        // Left pupil
        const leftPupilGeometry = new THREE.SphereGeometry(0.05, 12, 12);
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
    const appleMaterial = new THREE.MeshStandardMaterial({ 
        color: COLORS.food,
        roughness: 0.3,
        metalness: 0.2,
        emissive: COLORS.food,
        emissiveIntensity: 0.2
    });
    const apple = new THREE.Mesh(appleGeometry, appleMaterial);
    apple.castShadow = true;
    food.add(apple);
    
    // Apple stalk
    const stalkGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
    const stalkMaterial = new THREE.MeshStandardMaterial({ 
        color: COLORS.appleStalk,
        roughness: 0.7
    });
    const stalk = new THREE.Mesh(stalkGeometry, stalkMaterial);
    stalk.position.set(0, 0.4, 0);
    stalk.castShadow = true;
    food.add(stalk);
    
    // Add a leaf
    const leafGeometry = new THREE.BoxGeometry(0.2, 0.05, 0.2);
    const leafMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00AA00,
        roughness: 0.7 
    });
    const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
    leaf.position.set(0.15, 0.4, 0);
    leaf.rotation.z = Math.PI / 6;
    leaf.castShadow = true;
    food.add(leaf);
    
    // Add point light to the food to make it glow
    const foodLight = new THREE.PointLight(COLORS.food, 1, 3);
    foodLight.position.set(0, 0, 0);
    food.add(foodLight);
    
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
    
    // Add particle explosion effect
    createExplosionEffect(snake[0].position);
}

// Create explosion effect when game over
function createExplosionEffect(position) {
    const particleCount = 100;
    const explosionGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = [];
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        particlePositions[i] = position.x;
        particlePositions[i + 1] = position.y;
        particlePositions[i + 2] = position.z;
        
        particleVelocities.push({
            x: (Math.random() - 0.5) * 0.3,
            y: Math.random() * 0.2,
            z: (Math.random() - 0.5) * 0.3
        });
    }
    
    explosionGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const explosionMaterial = new THREE.PointsMaterial({
        color: 0xff0000,
        size: 0.2,
        transparent: true,
        opacity: 1,
        map: createCircleTexture('#ff0000', 256),
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const explosionParticles = new THREE.Points(explosionGeometry, explosionMaterial);
    scene.add(explosionParticles);
    
    // Animate explosion
    const animateExplosion = function(time) {
        if (gameOver) {
            const positions = explosionGeometry.attributes.position.array;
            
            for (let i = 0, j = 0; i < particleCount * 3; i += 3, j++) {
                positions[i] += particleVelocities[j].x;
                positions[i + 1] += particleVelocities[j].y;
                positions[i + 2] += particleVelocities[j].z;
                
                // Apply gravity
                particleVelocities[j].y -= 0.01;
            }
            
            explosionGeometry.attributes.position.needsUpdate = true;
            explosionMaterial.opacity -= 0.005;
            
            if (explosionMaterial.opacity <= 0) {
                scene.remove(explosionParticles);
            } else {
                requestAnimationFrame(animateExplosion);
            }
        }
    };
    
    animateExplosion();
}

// Update score
function updateScore(points) {
    score += points;
    document.getElementById('score').textContent = `Score: ${score}`;
    
    // Create score pop-up effect
    createScorePopup(points);
}

// Create a floating score popup
function createScorePopup(points) {
    // Create a score popup in the DOM
    const popup = document.createElement('div');
    popup.innerHTML = `+${points}`;
    popup.style.position = 'absolute';
    popup.style.color = '#00ff00';
    popup.style.fontFamily = "'Press Start 2P', cursive";
    popup.style.fontSize = '20px';
    popup.style.fontWeight = 'bold';
    popup.style.textShadow = '0 0 5px #00ff00';
    popup.style.zIndex = '1000';
    
    // Position near the food
    const foodScreenPosition = toScreenPosition(food);
    popup.style.left = `${foodScreenPosition.x}px`;
    popup.style.top = `${foodScreenPosition.y}px`;
    
    // Add to DOM
    document.body.appendChild(popup);
    
    // Animate and remove
    let opacity = 1;
    let posY = foodScreenPosition.y;
    
    const animatePopup = function() {
        opacity -= 0.02;
        posY -= 1;
        
        popup.style.opacity = opacity;
        popup.style.top = `${posY}px`;
        
        if (opacity > 0) {
            requestAnimationFrame(animatePopup);
        } else {
            document.body.removeChild(popup);
        }
    };
    
    animatePopup();
}

// Convert 3D position to screen coordinates
function toScreenPosition(obj) {
    const vector = new THREE.Vector3();
    
    // Get world position
    vector.setFromMatrixPosition(obj.matrixWorld);
    
    // Project to screen
    vector.project(camera);
    
    // Convert to screen coordinates
    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;
    
    return {
        x: (vector.x * widthHalf) + widthHalf,
        y: -(vector.y * heightHalf) + heightHalf
    };
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
    
    // Animate grid lines
    if (gridLines) {
        gridLines.material.color.r = Math.sin(time * 0.001) * 0.2 + 0.3;
        gridLines.material.color.g = Math.sin(time * 0.001) * 0.2 + 0.7;
    }
    
    // Animate particles
    if (particleSystem) {
        const positions = particleSystem.geometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] = Math.sin((time + i) * 0.001) * 0.2 + 0.5;
        }
        
        particleSystem.geometry.attributes.position.needsUpdate = true;
        particleSystem.rotation.y += 0.0005;
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
