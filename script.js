class ZipGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.difficulty = 'medium';
        this.maxCanvasSize = Math.min(600, Math.min(window.innerWidth, window.innerHeight) * 0.9);
        
        // Initialize default values
        this.gridSize = 6;
        this.cellSize = 60;
        
        this.grid = [];
        this.numberedCells = [];
        this.path = [];
        this.currentNumber = 1;
        this.isDrawing = false;
        this.visitedCells = new Set();
        this.gameWon = false;
        this.moves = 0;
        this.startTime = null;
        this.timerInterval = null;
        
        // Player name (default to "Player")
        this.playerName = 'Player';
        
        // Start the game immediately
        this.startGame();
    }
    
    startGame() {
        // Set up all event listeners
        this.setupEventListeners();
        this.setupSettingsEventListeners();
        this.setupResizeListener();
        
        // Initialize the game
        this.initializeGame();
    }
    
    initializeGrid() {
        this.grid = [];
        for (let row = 0; row < this.gridSize; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.gridSize; col++) {
                this.grid[row][col] = {
                    row,
                    col,
                    number: null,
                    visited: false
                };
            }
        }
    }
    
    generatePuzzle() {
        // Clear previous puzzle data
        this.numberedCells = [];
        
        // Reset grid numbers to ensure fresh start
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                this.grid[row][col].number = null;
            }
        }
        
        // Generate a valid Hamiltonian path that visits all cells
        const solutionPath = this.generateHamiltonianPath();
        
        // The path should always be complete now due to fallbacks
        this.placeNumberedWaypoints(solutionPath);
    }
    
    generateHamiltonianPath() {
        // For very large boards, use complex patterns
        if (this.gridSize >= 10) {
            return this.generateComplexPattern();
        }
        
        // For 8x8 and 9x9, try Hamiltonian with shorter timeout, then use complex patterns
        if (this.gridSize >= 8) {
            const visited = new Set();
            const path = [];
            
            // Try a few random starting positions quickly
            this.searchStartTime = Date.now();
            this.maxSearchTime = 300; // Short timeout for larger boards
            
            const attempts = 3;
            for (let attempt = 0; attempt < attempts; attempt++) {
                const startRow = Math.floor(Math.random() * this.gridSize);
                const startCol = Math.floor(Math.random() * this.gridSize);
                
                visited.clear();
                path.length = 0;
                this.searchStartTime = Date.now();
                
                if (this.findHamiltonianPath(startRow, startCol, visited, path)) {
                    return path;
                }
            }
            
            // If Hamiltonian fails, use complex pattern instead of simple snake
            return this.generateComplexPattern();
        }
        
        // For smaller boards, use full Hamiltonian search
        const corners = [
            {row: 0, col: 0},
            {row: 0, col: this.gridSize - 1},
            {row: this.gridSize - 1, col: 0},
            {row: this.gridSize - 1, col: this.gridSize - 1}
        ];
        const startCell = corners[Math.floor(Math.random() * corners.length)];
        
        const visited = new Set();
        const path = [];
        
        this.searchStartTime = Date.now();
        this.maxSearchTime = 1000; // 1 second timeout
        
        if (this.findHamiltonianPath(startCell.row, startCell.col, visited, path)) {
            return path;
        }
        
        // Fallback to complex pattern
        return this.generateComplexPattern();
    }
    
    generateComplexPattern() {
        // Choose from multiple complex pattern types
        const patternTypes = ['spiral', 'zigzag', 'mixed', 'random_walk'];
        const selectedPattern = patternTypes[Math.floor(Math.random() * patternTypes.length)];
        
        switch (selectedPattern) {
            case 'spiral':
                return this.generateSpiralPattern();
            case 'zigzag':
                return this.generateZigzagPattern();
            case 'mixed':
                return this.generateMixedPattern();
            case 'random_walk':
                return this.generateRandomWalkPattern();
            default:
                return this.generateSnakePath();
        }
    }
    
    generateSpiralPattern() {
        const path = [];
        const visited = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(false));
        
        let row = 0, col = 0;
        let direction = 0; // 0: right, 1: down, 2: left, 3: up
        const directions = [{dr: 0, dc: 1}, {dr: 1, dc: 0}, {dr: 0, dc: -1}, {dr: -1, dc: 0}];
        
        for (let i = 0; i < this.gridSize * this.gridSize; i++) {
            path.push({row, col});
            visited[row][col] = true;
            
            // Try to continue in current direction
            const nextRow = row + directions[direction].dr;
            const nextCol = col + directions[direction].dc;
            
            // If we can't continue, turn clockwise
            if (nextRow < 0 || nextRow >= this.gridSize || 
                nextCol < 0 || nextCol >= this.gridSize || 
                visited[nextRow][nextCol]) {
                direction = (direction + 1) % 4;
            }
            
            row += directions[direction].dr;
            col += directions[direction].dc;
        }
        
        return path;
    }
    
    generateZigzagPattern() {
        const path = [];
        const isVertical = Math.random() < 0.5;
        const reverse = Math.random() < 0.5;
        
        if (isVertical) {
            // Vertical zigzag with some randomness
            for (let col = 0; col < this.gridSize; col++) {
                if ((col % 2 === 0) !== reverse) {
                    for (let row = 0; row < this.gridSize; row++) {
                        path.push({row, col});
                    }
                } else {
                    for (let row = this.gridSize - 1; row >= 0; row--) {
                        path.push({row, col});
                    }
                }
            }
        } else {
            // Horizontal zigzag with some randomness
            for (let row = 0; row < this.gridSize; row++) {
                if ((row % 2 === 0) !== reverse) {
                    for (let col = 0; col < this.gridSize; col++) {
                        path.push({row, col});
                    }
                } else {
                    for (let col = this.gridSize - 1; col >= 0; col--) {
                        path.push({row, col});
                    }
                }
            }
        }
        
        return path;
    }
    
    generateMixedPattern() {
        // Start with snake, then add some random detours
        const basePath = this.generateSnakePath();
        const path = [];
        const visited = new Set();
        
        // Follow base path but occasionally take detours
        for (let i = 0; i < basePath.length; i++) {
            const cell = basePath[i];
            const key = `${cell.row},${cell.col}`;
            
            if (!visited.has(key)) {
                path.push(cell);
                visited.add(key);
                
                // 20% chance to create a small detour
                if (Math.random() < 0.2 && i < basePath.length - 5) {
                    // Look for nearby unvisited cells
                    const detourLength = Math.floor(Math.random() * 3) + 1;
                    let currentRow = cell.row;
                    let currentCol = cell.col;
                    
                    for (let d = 0; d < detourLength; d++) {
                        const directions = [{dr: -1, dc: 0}, {dr: 1, dc: 0}, {dr: 0, dc: -1}, {dr: 0, dc: 1}];
                        const validMoves = directions.filter(({dr, dc}) => {
                            const newRow = currentRow + dr;
                            const newCol = currentCol + dc;
                            const newKey = `${newRow},${newCol}`;
                            return newRow >= 0 && newRow < this.gridSize && 
                                   newCol >= 0 && newCol < this.gridSize && 
                                   !visited.has(newKey);
                        });
                        
                        if (validMoves.length > 0) {
                            const move = validMoves[Math.floor(Math.random() * validMoves.length)];
                            currentRow += move.dr;
                            currentCol += move.dc;
                            const newKey = `${currentRow},${currentCol}`;
                            path.push({row: currentRow, col: currentCol});
                            visited.add(newKey);
                        } else {
                            break;
                        }
                    }
                }
            }
        }
        
        // Fill any remaining cells
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const key = `${row},${col}`;
                if (!visited.has(key)) {
                    path.push({row, col});
                    visited.add(key);
                }
            }
        }
        
        return path;
    }
    
    generateRandomWalkPattern() {
        const path = [];
        const visited = new Set();
        
        // Start from a random position
        let currentRow = Math.floor(Math.random() * this.gridSize);
        let currentCol = Math.floor(Math.random() * this.gridSize);
        
        path.push({row: currentRow, col: currentCol});
        visited.add(`${currentRow},${currentCol}`);
        
        while (path.length < this.gridSize * this.gridSize) {
            // Get all unvisited neighbors
            const neighbors = [];
            const directions = [{dr: -1, dc: 0}, {dr: 1, dc: 0}, {dr: 0, dc: -1}, {dr: 0, dc: 1}];
            
            for (const {dr, dc} of directions) {
                const newRow = currentRow + dr;
                const newCol = currentCol + dc;
                const key = `${newRow},${newCol}`;
                
                if (newRow >= 0 && newRow < this.gridSize && 
                    newCol >= 0 && newCol < this.gridSize && 
                    !visited.has(key)) {
                    neighbors.push({row: newRow, col: newCol});
                }
            }
            
            if (neighbors.length > 0) {
                // Choose random neighbor
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                path.push(next);
                visited.add(`${next.row},${next.col}`);
                currentRow = next.row;
                currentCol = next.col;
            } else {
                // No neighbors, find any unvisited cell
                let found = false;
                for (let row = 0; row < this.gridSize && !found; row++) {
                    for (let col = 0; col < this.gridSize && !found; col++) {
                        const key = `${row},${col}`;
                        if (!visited.has(key)) {
                            path.push({row, col});
                            visited.add(key);
                            currentRow = row;
                            currentCol = col;
                            found = true;
                        }
                    }
                }
                if (!found) break;
            }
        }
        
        return path;
    }
    
    generateSnakePath() {
        const path = [];
        
        // Randomize the starting direction and pattern
        const startFromTop = Math.random() < 0.5;
        const startFromLeft = Math.random() < 0.5;
        const verticalFirst = Math.random() < 0.5;
        
        if (verticalFirst) {
            // Vertical snake pattern
            for (let col = 0; col < this.gridSize; col++) {
                if ((col % 2 === 0) === startFromTop) {
                    // Top to bottom
                    for (let row = 0; row < this.gridSize; row++) {
                        path.push({row, col});
                    }
                } else {
                    // Bottom to top
                    for (let row = this.gridSize - 1; row >= 0; row--) {
                        path.push({row, col});
                    }
                }
            }
        } else {
            // Horizontal snake pattern (original)
            for (let row = 0; row < this.gridSize; row++) {
                if ((row % 2 === 0) === startFromLeft) {
                    // Left to right
                    for (let col = 0; col < this.gridSize; col++) {
                        path.push({row, col});
                    }
                } else {
                    // Right to left
                    for (let col = this.gridSize - 1; col >= 0; col--) {
                        path.push({row, col});
                    }
                }
            }
        }
        
        // Optionally reverse the entire path for more variety
        if (Math.random() < 0.5) {
            path.reverse();
        }
        
        return path;
    }
    
    findHamiltonianPath(row, col, visited, path) {
        // Timeout check to prevent infinite loops
        if (Date.now() - this.searchStartTime > this.maxSearchTime) {
            return false;
        }
        
        // Check if current position is valid
        if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
            return false;
        }
        
        const cellKey = `${row},${col}`;
        if (visited.has(cellKey)) {
            return false;
        }
        
        // Add current cell to path
        visited.add(cellKey);
        path.push({row, col});
        
        // If we've visited all cells, we found a solution
        if (path.length === this.gridSize * this.gridSize) {
            return true;
        }
        
        // Try all four directions (randomize for variety)
        const directions = [
            {dr: -1, dc: 0}, // up
            {dr: 1, dc: 0},  // down
            {dr: 0, dc: -1}, // left
            {dr: 0, dc: 1}   // right
        ];
        
        // Shuffle directions for puzzle variety
        for (let i = directions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [directions[i], directions[j]] = [directions[j], directions[i]];
        }
        
        for (const {dr, dc} of directions) {
            if (this.findHamiltonianPath(row + dr, col + dc, visited, path)) {
                return true;
            }
        }
        
        // Backtrack
        visited.delete(cellKey);
        path.pop();
        return false;
    }
    
    placeNumberedWaypoints(solutionPath) {
        const diffSettings = this.getDifficultySettings();
        const totalCells = this.gridSize * this.gridSize;

        // Scale number of waypoints with board size - more numbers for larger boards
        let numNumbers = Math.floor(totalCells / 6); // More generous ratio

        // Ensure minimum numbers based on board size
        const minForBoardSize = Math.max(4, Math.floor(this.gridSize * 0.8));
        const maxForBoardSize = Math.floor(this.gridSize * 1.5);

        numNumbers = Math.max(minForBoardSize, Math.min(maxForBoardSize, numNumbers));
        numNumbers = Math.max(diffSettings.minWaypoints, Math.min(diffSettings.maxWaypoints, numNumbers));

        // Generate waypoint positions with retry mechanism to avoid sequential patterns
        let attempts = 0;
        const maxAttempts = 10;
        let waypointPositions;

        do {
            waypointPositions = this.generateWaypointPositions(solutionPath, numNumbers, diffSettings);
            attempts++;
        } while (this.isSequentialPattern(waypointPositions) && attempts < maxAttempts);

        // Place numbers at the waypoint positions
        this.numberedCells = [];
        for (let i = 0; i < waypointPositions.length; i++) {
            const pathIndex = waypointPositions[i];
            const cell = solutionPath[pathIndex];

            this.grid[cell.row][cell.col].number = i + 1;
            this.numberedCells.push({
                row: cell.row,
                col: cell.col,
                number: i + 1
            });
        }

        // Store the solution path for debugging (optional)
        this.solutionPath = solutionPath;
    }

    generateWaypointPositions(solutionPath, numNumbers, diffSettings) {
        const complexity = diffSettings.pathComplexity;
        const positions = [];

        if (complexity > 0.6) {
            // Higher difficulty: Use more random distribution with shuffling
            const segments = Math.floor(solutionPath.length / numNumbers);
            const segmentVariance = Math.floor(segments * 0.6);

            // Generate initial positions with variance
            for (let i = 0; i < numNumbers - 1; i++) {
                const basePos = i * segments;
                const variance = Math.floor(Math.random() * segmentVariance * 2) - segmentVariance;
                const position = Math.max(0, Math.min(solutionPath.length - 20, basePos + variance));
                positions.push(position);
            }

            // Shuffle the positions to break sequential patterns
            for (let i = positions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [positions[i], positions[j]] = [positions[j], positions[i]];
            }

            // Always place final number at the end
            positions.push(solutionPath.length - 1);
        } else {
            // Lower difficulty: Use regular spacing with some randomness
            const baseStep = Math.floor(solutionPath.length / numNumbers);

            for (let i = 0; i < numNumbers - 1; i++) {
                const variance = Math.floor(baseStep * 0.3);
                const randomOffset = Math.floor(Math.random() * variance * 2) - variance;
                const position = Math.max(0, Math.min(solutionPath.length - 10, i * baseStep + randomOffset));
                positions.push(position);
            }

            // Always place final number at the end
            positions.push(solutionPath.length - 1);
        }

        // Sort positions to maintain proper number sequence along the path
        positions.sort((a, b) => a - b);

        return positions;
    }

    isSequentialPattern(positions) {
        if (positions.length < 3) return false;

        // Check if positions are too evenly spaced (indicating sequential pattern)
        const steps = [];
        for (let i = 1; i < positions.length; i++) {
            steps.push(positions[i] - positions[i-1]);
        }

        // Calculate variance in step sizes
        const avgStep = steps.reduce((a, b) => a + b, 0) / steps.length;
        const variance = steps.reduce((sum, step) => sum + Math.pow(step - avgStep, 2), 0) / steps.length;
        const stdDev = Math.sqrt(variance);

        // If standard deviation is too low, positions are too regular (sequential)
        const threshold = avgStep * 0.2; // 20% of average step
        return stdDev < threshold;
    }
    
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Button events
        document.getElementById('reset-btn').addEventListener('click', this.resetPath.bind(this));
        document.getElementById('hint-btn').addEventListener('click', this.showEnhancedHint.bind(this));
        document.getElementById('new-game-btn').addEventListener('click', this.newGame.bind(this));
    }
    
    
    getCanvasPosition(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        // Use the display size (style dimensions) not the internal canvas dimensions
        const scaleX = (this.gridSize * this.cellSize) / rect.width;
        const scaleY = (this.gridSize * this.cellSize) / rect.height;
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }
    
    getCellFromPosition(x, y) {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        
        if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
            return { row, col };
        }
        return null;
    }
    
    handleMouseDown(e) {
        if (this.gameWon) return;

        const pos = this.getCanvasPosition(e.clientX, e.clientY);
        const cell = this.getCellFromPosition(pos.x, pos.y);

        if (cell) {
            // Check if clicking on existing path for backtracking
            const pathIndex = this.getPathIndex(cell);
            if (pathIndex !== -1) {
                // Only allow backtracking from near the end of the path
                if (this.canBacktrackToIndex(pathIndex)) {
                    this.backtrackToCell(pathIndex);
                    this.isDrawing = true;
                }
            } else if (this.canStartOrContinuePath(cell)) {
                this.startOrContinuePath(cell);
                this.isDrawing = true;
            }
        }
    }
    
    handleMouseMove(e) {
        if (!this.isDrawing || this.gameWon) return;
        
        const pos = this.getCanvasPosition(e.clientX, e.clientY);
        const cell = this.getCellFromPosition(pos.x, pos.y);
        
        if (cell) {
            // Check if we're moving over an existing path cell for backtracking
            const pathIndex = this.getPathIndex(cell);
            if (pathIndex !== -1 && pathIndex < this.path.length - 1) {
                // Only allow backtracking from near the end of the path
                if (this.canBacktrackToIndex(pathIndex)) {
                    this.backtrackToCell(pathIndex);
                }
            } else if (this.canExtendPath(cell)) {
                // Extend the path normally
                this.extendPath(cell);
            }
        }
    }
    
    handleMouseUp() {
        this.isDrawing = false;
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleMouseDown(touch);
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handleMouseMove(touch);
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        this.handleMouseUp();
    }
    
    canStartOrContinuePath(cell) {
        const gridCell = this.grid[cell.row][cell.col];
        
        // If path is empty, can start from number 1 or any empty cell
        if (this.path.length === 0) {
            return gridCell.number === 1 || gridCell.number === null;
        }
        
        // If path exists, can continue from the last cell or extend path
        const lastCell = this.path[this.path.length - 1];
        const isLastCell = cell.row === lastCell.row && cell.col === lastCell.col;
        
        if (isLastCell) {
            return true; // Can continue from last cell
        }
        
        // Check if can extend path to this cell
        return this.canExtendPath(cell);
    }
    
    canExtendPath(cell) {
        const gridCell = this.grid[cell.row][cell.col];
        
        // Don't extend to the exact same cell we're already on
        if (this.path.length > 0) {
            const lastCell = this.path[this.path.length - 1];
            if (cell.row === lastCell.row && cell.col === lastCell.col) {
                return false;
            }
        }
        
        // Can't extend to already visited cells (except for backtracking)
        if (this.visitedCells.has(`${cell.row},${cell.col}`)) {
            return false;
        }
        
        // Must be adjacent to last cell in path
        if (this.path.length > 0) {
            const lastCell = this.path[this.path.length - 1];
            const dx = Math.abs(cell.col - lastCell.col);
            const dy = Math.abs(cell.row - lastCell.row);
            
            if (!((dx === 1 && dy === 0) || (dx === 0 && dy === 1))) {
                return false;
            }
        }
        
        // If it's a numbered cell, must be the next number in sequence
        if (gridCell.number !== null) {
            return gridCell.number === this.currentNumber;
        }
        
        return true;
    }
    
    getPathIndex(cell) {
        return this.path.findIndex(pathCell =>
            pathCell.row === cell.row && pathCell.col === cell.col
        );
    }

    canBacktrackToIndex(pathIndex) {
        if (this.path.length === 0) return false;

        // Calculate how far back from the end this index is
        const stepsFromEnd = this.path.length - 1 - pathIndex;

        // Allow backtracking only from the last few steps (configurable)
        // This creates a "backtrack window" - you can only undo recent steps
        const maxBacktrackSteps = Math.max(3, Math.floor(this.path.length * 0.2)); // At least 3 steps or 20% of path

        return stepsFromEnd <= maxBacktrackSteps;
    }

    backtrackToCell(pathIndex) {
        // Remove cells from path after the clicked index
        const removedCells = this.path.splice(pathIndex + 1);

        // Remove those cells from visited set
        removedCells.forEach(cell => {
            this.visitedCells.delete(`${cell.row},${cell.col}`);
        });

        // Update current number based on new path end
        this.updateCurrentNumber();

        this.draw();
    }
    
    updateCurrentNumber() {
        // Reset current number to 1 and work through the path
        this.currentNumber = 1;
        
        for (const cell of this.path) {
            const gridCell = this.grid[cell.row][cell.col];
            if (gridCell.number !== null && gridCell.number === this.currentNumber) {
                this.currentNumber++;
            }
        }
    }
    
    startOrContinuePath(cell) {
        // If starting fresh
        if (this.path.length === 0) {
            this.path = [cell];
            this.visitedCells.clear();
            this.visitedCells.add(`${cell.row},${cell.col}`);
            this.isDrawing = true;
            
            const gridCell = this.grid[cell.row][cell.col];
            if (gridCell.number === 1) {
                this.currentNumber = 2;
            }
            
            this.moves++;
            this.updateMoveCounter();
        } else {
            // Continue from existing path
            const lastCell = this.path[this.path.length - 1];
            const isLastCell = cell.row === lastCell.row && cell.col === lastCell.col;
            
            if (isLastCell) {
                this.isDrawing = true;
            } else if (this.canExtendPath(cell)) {
                this.extendPath(cell);
            }
        }
        
        this.draw();
    }
    
    extendPath(cell) {
        this.path.push(cell);
        this.visitedCells.add(`${cell.row},${cell.col}`);
        
        const gridCell = this.grid[cell.row][cell.col];
        if (gridCell.number !== null && gridCell.number === this.currentNumber) {
            this.currentNumber++;
        }
        
        this.draw();
        this.checkWinCondition();
    }
    
    checkWinCondition() {
        // Check if all numbered cells are visited in order
        const maxNumber = Math.max(...this.numberedCells.map(c => c.number));
        if (this.currentNumber > maxNumber) {
            // Check if all cells are visited
            if (this.visitedCells.size === this.gridSize * this.gridSize) {
                this.gameWon = true;
                this.showVictory();
            }
        }
    }
    
    resetPath() {
        this.path = [];
        this.visitedCells.clear();
        this.currentNumber = 1;
        this.isDrawing = false;
        this.draw();
    }
    
    showEnhancedHint() {
        // Enhanced hint system with directional guidance
        if (this.path.length === 0) {
            // Show where to start
            const startCell = this.numberedCells.find(cell => cell.number === 1);
            if (startCell) {
                this.showDirectionalHint(startCell, 'Start here at number 1!', '#4CAF50');
            }
            return;
        }

        // Find next steps from current position
        const lastCell = this.path[this.path.length - 1];
        const nextNumberedCell = this.numberedCells.find(cell => cell.number === this.currentNumber);
        
        if (nextNumberedCell) {
            // Show path to next numbered cell
            const pathToNext = this.findPathToTarget(lastCell, nextNumberedCell);
            if (pathToNext && pathToNext.length > 1) {
                this.showPathHint(pathToNext);
            } else {
                this.showDirectionalHint(nextNumberedCell, `Go to number ${this.currentNumber}`, '#ff6b6b');
            }
        } else {
            // Show available adjacent moves
            const validMoves = this.getValidAdjacentMoves(lastCell);
            if (validMoves.length > 0) {
                this.showMultipleHints(validMoves, 'Valid moves', '#2196F3');
            }
        }
    }

    findPathToTarget(start, target) {
        // Simple pathfinding to show direction to next numbered cell
        const queue = [{cell: start, path: [start]}];
        const visited = new Set([`${start.row},${start.col}`]);
        
        while (queue.length > 0) {
            const {cell, path} = queue.shift();
            
            if (cell.row === target.row && cell.col === target.col) {
                return path;
            }
            
            const directions = [
                {dr: -1, dc: 0}, {dr: 1, dc: 0},
                {dr: 0, dc: -1}, {dr: 0, dc: 1}
            ];
            
            for (const {dr, dc} of directions) {
                const newRow = cell.row + dr;
                const newCol = cell.col + dc;
                const newCellKey = `${newRow},${newCol}`;
                
                if (newRow >= 0 && newRow < this.gridSize && 
                    newCol >= 0 && newCol < this.gridSize &&
                    !visited.has(newCellKey) &&
                    !this.visitedCells.has(newCellKey)) {
                    
                    visited.add(newCellKey);
                    queue.push({
                        cell: {row: newRow, col: newCol},
                        path: [...path, {row: newRow, col: newCol}]
                    });
                }
            }
        }
        return null;
    }

    getValidAdjacentMoves(cell) {
        const moves = [];
        const directions = [
            {dr: -1, dc: 0}, {dr: 1, dc: 0},
            {dr: 0, dc: -1}, {dr: 0, dc: 1}
        ];
        
        for (const {dr, dc} of directions) {
            const newCell = {row: cell.row + dr, col: cell.col + dc};
            if (this.canExtendPath(newCell)) {
                moves.push(newCell);
            }
        }
        return moves;
    }

    showPathHint(path) {
        let delay = 0;
        path.slice(1, Math.min(4, path.length)).forEach((cell, index) => {
            setTimeout(() => {
                this.highlightCell(cell, '#FF9800', 800);
            }, delay);
            delay += 200;
        });
    }

    showMultipleHints(cells, message, color) {
        cells.forEach((cell, index) => {
            setTimeout(() => {
                this.highlightCell(cell, color, 1000);
            }, index * 100);
        });
    }

    showDirectionalHint(cell, message, color) {
        this.highlightCell(cell, color, 1500);
        // Could add text overlay here in future
    }
    
    highlightCell(cell, color, duration) {
        const originalDraw = this.draw.bind(this);
        this.draw = () => {
            originalDraw();
            this.ctx.fillStyle = color;
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillRect(
                cell.col * this.cellSize,
                cell.row * this.cellSize,
                this.cellSize,
                this.cellSize
            );
            this.ctx.globalAlpha = 1;
        };
        
        this.draw();
        
        setTimeout(() => {
            this.draw = originalDraw;
            this.draw();
        }, duration);
    }
    
    newGame() {
        try {
            this.gameWon = false;
            this.moves = 0;
            this.currentNumber = 1;
            this.path = [];
            this.visitedCells.clear();
            this.isDrawing = false;
            
            this.updateCanvasSize();
            this.initializeGrid();
            this.generatePuzzle();
            this.updateMoveCounter();
            this.resetTimer();
            this.draw();
        } catch (error) {
            console.error('Error in newGame:', error);
        }
    }
    
    restartGame() {
        // Stop any running timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Reset game state
        this.newGame();
    }
    
    initializeGame() {
        // Set initial board size based on difficulty
        this.setDefaultBoardSizeForDifficulty();
        
        // Initialize the game
        this.updateCanvasSize();
        this.initializeGrid();
        this.generatePuzzle();
        this.updateMoveCounter();
        this.updateDifficultyDisplay();
        this.startTimer();
        this.draw();
    }

    updateCanvasSize() {
        const boardSizeSelect = document.getElementById('board-size-select');
        if (boardSizeSelect && boardSizeSelect.value) {
            const boardSize = parseInt(boardSizeSelect.value);
            this.gridSize = boardSize;
        } else {
            // Use default from difficulty settings
            const diffSettings = this.getDifficultySettings();
            this.gridSize = diffSettings ? diffSettings.defaultBoardSize : 6;
        }
        
        this.cellSize = Math.floor(this.maxCanvasSize / this.gridSize);
        
        // Get device pixel ratio for high-DPI support
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // Set canvas display size
        this.canvas.style.width = (this.gridSize * this.cellSize) + 'px';
        this.canvas.style.height = (this.gridSize * this.cellSize) + 'px';
        
        // Set canvas internal resolution for crisp rendering
        this.canvas.width = this.gridSize * this.cellSize * devicePixelRatio;
        this.canvas.height = this.gridSize * this.cellSize * devicePixelRatio;
        
        // Scale the context to match device pixel ratio
        this.ctx.scale(devicePixelRatio, devicePixelRatio);
        
        // Enable crisp text rendering
        this.ctx.textBaseline = 'middle';
        this.ctx.textAlign = 'center';
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }
    
    setDefaultBoardSizeForDifficulty() {
        try {
            const diffSettings = this.getDifficultySettings();
            const boardSizeSelect = document.getElementById('board-size-select');
            if (boardSizeSelect && diffSettings) {
                console.log('Setting board size to:', diffSettings.defaultBoardSize);
                boardSizeSelect.value = diffSettings.defaultBoardSize.toString();
                this.updateCanvasSize();
            }
        } catch (error) {
            console.error('Error setting default board size:', error);
        }
    }

    setupSettingsEventListeners() {
        // Use a timeout to ensure DOM elements are available
        setTimeout(() => {
            const difficultySelect = document.getElementById('difficulty-select');
            const boardSizeSelect = document.getElementById('board-size-select');
            
            if (difficultySelect) {
                console.log('Setting up difficulty selector');
                difficultySelect.addEventListener('change', (e) => {
                    console.log('Difficulty changed to:', e.target.value);
                    try {
                        this.difficulty = e.target.value;
                        this.setDefaultBoardSizeForDifficulty();
                        this.updateDifficultyDisplay();
                        this.restartGame();
                    } catch (error) {
                        console.error('Error changing difficulty:', error);
                    }
                });
            } else {
                console.error('Difficulty select element not found');
            }
            
            if (boardSizeSelect) {
                console.log('Setting up board size selector');
                boardSizeSelect.addEventListener('change', (e) => {
                    console.log('Board size changed to:', e.target.value);
                    try {
                        this.updateCanvasSize();
                        this.restartGame();
                    } catch (error) {
                        console.error('Error changing board size:', error);
                    }
                });
            } else {
                console.error('Board size select element not found');
            }
        }, 100);
    }

    setupResizeListener() {
        window.addEventListener('resize', () => {
            // Update canvas size based on new window dimensions
            const oldMaxSize = this.maxCanvasSize;
            this.maxCanvasSize = Math.min(600, Math.min(window.innerWidth, window.innerHeight) * 0.9);
            
            // Only update if size changed significantly
            if (Math.abs(oldMaxSize - this.maxCanvasSize) > 20) {
                this.updateCanvasSize();
                this.draw();
            }
        });
    }

    updateDifficultyDisplay() {
        const difficultyNames = {
            'easy': 'Easy',
            'medium': 'Medium', 
            'hard': 'Hard',
            'extra-hard': 'Extra Hard',
            'almost-impossible': 'Almost Impossible!'
        };
        document.getElementById('current-difficulty').textContent = difficultyNames[this.difficulty];
    }

    getDifficultySettings() {
        const settings = {
            'easy': { 
                defaultBoardSize: 6, 
                minWaypoints: 4, 
                maxWaypoints: 6,
                pathComplexity: 0.3
            },
            'medium': { 
                defaultBoardSize: 6, 
                minWaypoints: 6, 
                maxWaypoints: 8,
                pathComplexity: 0.5
            },
            'hard': { 
                defaultBoardSize: 7, 
                minWaypoints: 8, 
                maxWaypoints: 10,
                pathComplexity: 0.7
            },
            'extra-hard': { 
                defaultBoardSize: 8, 
                minWaypoints: 10, 
                maxWaypoints: 12,
                pathComplexity: 0.8
            },
            'almost-impossible': { 
                defaultBoardSize: 9, 
                minWaypoints: 12, 
                maxWaypoints: 15,
                pathComplexity: 0.95
            }
        };
        return settings[this.difficulty] || settings['medium'];
    }
    
    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            if (!this.gameWon) {
                this.updateTimer();
            }
        }, 1000);
    }
    
    updateTimer() {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        document.getElementById('timer').textContent = `${minutes}:${seconds}`;
    }
    
    resetTimer() {
        clearInterval(this.timerInterval);
        this.startTimer();
    }
    
    updateMoveCounter() {
        document.getElementById('move-counter').textContent = this.moves;
    }
    
    showVictory() {
        // Just show celebration animation, no modal
        this.showCelebrationAnimation();
    }
    
    
    showCelebrationAnimation() {
        // Show confetti
        this.createConfetti();
        
        // Show celebration text
        this.showCelebrationText();
        
        // Play victory sound effect (if we had one)
        // this.playVictorySound();
    }
    
    createConfetti() {
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        document.body.appendChild(confettiContainer);
        
        // Create 100 confetti pieces
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            
            // Random horizontal position
            confetti.style.left = Math.random() * 100 + 'vw';
            
            // Random delay for staggered effect
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            
            // Random rotation speed
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            
            confettiContainer.appendChild(confetti);
        }
        
        // Clean up confetti after animation
        setTimeout(() => {
            if (document.body.contains(confettiContainer)) {
                document.body.removeChild(confettiContainer);
            }
        }, 4000);
    }
    
    showCelebrationText() {
        const celebrations = [
            "SOLVED",
            "COMPLETE",
            "PERFECT",
            "EXCELLENT",
            "BRILLIANT",
            "OUTSTANDING",
            "FLAWLESS",
            "MASTERFUL"
        ];
        
        const randomCelebration = celebrations[Math.floor(Math.random() * celebrations.length)];
        
        const celebrationElement = document.createElement('div');
        celebrationElement.className = 'celebration-text';
        celebrationElement.textContent = randomCelebration;
        document.body.appendChild(celebrationElement);
        
        // Remove celebration text after animation
        setTimeout(() => {
            if (document.body.contains(celebrationElement)) {
                document.body.removeChild(celebrationElement);
            }
        }, 2000);
    }
    
    
    draw() {
        // Clear using logical dimensions
        this.ctx.clearRect(0, 0, this.gridSize * this.cellSize, this.gridSize * this.cellSize);
        
        // Draw grid
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i <= this.gridSize; i++) {
            // Vertical lines
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.cellSize, 0);
            this.ctx.lineTo(i * this.cellSize, this.gridSize * this.cellSize);
            this.ctx.stroke();
            
            // Horizontal lines
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.cellSize);
            this.ctx.lineTo(this.gridSize * this.cellSize, i * this.cellSize);
            this.ctx.stroke();
        }
        
        // Draw visited cells
        this.ctx.fillStyle = '#e8f4fd';
        this.visitedCells.forEach(cellKey => {
            const [row, col] = cellKey.split(',').map(Number);
            this.ctx.fillRect(
                col * this.cellSize + 1,
                row * this.cellSize + 1,
                this.cellSize - 2,
                this.cellSize - 2
            );
        });
        
        // Draw path
        if (this.path.length > 1) {
            this.ctx.strokeStyle = '#0a66c2';
            this.ctx.lineWidth = 4;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            this.ctx.beginPath();
            const firstCell = this.path[0];
            this.ctx.moveTo(
                firstCell.col * this.cellSize + this.cellSize / 2,
                firstCell.row * this.cellSize + this.cellSize / 2
            );
            
            for (let i = 1; i < this.path.length; i++) {
                const cell = this.path[i];
                this.ctx.lineTo(
                    cell.col * this.cellSize + this.cellSize / 2,
                    cell.row * this.cellSize + this.cellSize / 2
                );
            }
            this.ctx.stroke();
        }
        
        // Draw numbered cells
        this.numberedCells.forEach(cell => {
            const x = cell.col * this.cellSize;
            const y = cell.row * this.cellSize;
            
            // Cell background with rounded corners
            this.ctx.fillStyle = cell.number < this.currentNumber ? '#4CAF50' : '#0a66c2';
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            this.ctx.shadowBlur = 4;
            this.ctx.shadowOffsetX = 2;
            this.ctx.shadowOffsetY = 2;
            
            // Draw rounded rectangle (with fallback for older browsers)
            if (this.ctx.roundRect) {
                this.ctx.beginPath();
                this.ctx.roundRect(x + 8, y + 8, this.cellSize - 16, this.cellSize - 16, 6);
                this.ctx.fill();
            } else {
                // Fallback for browsers without roundRect
                this.ctx.fillRect(x + 8, y + 8, this.cellSize - 16, this.cellSize - 16);
            }
            
            // Reset shadow
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
            
            // Number text with larger, crisper font
            this.ctx.fillStyle = 'white';
            const fontSize = Math.max(18, Math.floor(this.cellSize * 0.4));
            this.ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Add text shadow for better readability
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            this.ctx.shadowBlur = 2;
            this.ctx.shadowOffsetX = 1;
            this.ctx.shadowOffsetY = 1;
            
            this.ctx.fillText(
                cell.number,
                x + this.cellSize / 2,
                y + this.cellSize / 2
            );
            
            // Reset shadow
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
        });
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Start the game immediately
    new ZipGame();
});