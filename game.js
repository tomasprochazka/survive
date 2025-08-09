class Game {
    constructor() {
        // ========== GAME CONFIGURATION ==========
        const defaultConfig = {
            alien: {
                size: 180,  // Alien diameter (was radius * 2 = 30 * 2 = 60)
                rotationSpeed: 0.01
            },
            hero: {
                size: 88,  // Hero diameter
                speed: 0.03  // Hero rotation speed (radians per frame)
            },
            fireball: {
                size: 16,  // Fireball diameter
                speed: 3   // Fireball movement speed (pixels per frame)
            }
        };
        
        // Load saved config and merge with defaults
        const savedConfig = this.loadConfig();
        this.config = {
            alien: { ...defaultConfig.alien, ...(savedConfig?.alien || {}) },
            hero: { ...defaultConfig.hero, ...(savedConfig?.hero || {}) },
            fireball: { ...defaultConfig.fireball, ...(savedConfig?.fireball || {}) }
        };
        // =======================================
        
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas to fullscreen
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        
        // Load background image
        this.backgroundImage = new Image();
        this.backgroundImage.src = 'bg.png';
        this.backgroundImageLoaded = false;
        this.backgroundImage.onload = () => {
            this.backgroundImageLoaded = true;
        };
        
        // Load alien image
        this.alienImage = new Image();
        this.alienImage.src = 'alien.png';
        this.alienImageLoaded = false;
        this.alienImage.onload = () => {
            this.alienImageLoaded = true;
        };
        
        // Load hero image
        this.heroImage = new Image();
        this.heroImage.src = 'hero.png';
        this.heroImageLoaded = false;
        this.heroImage.onload = () => {
            this.heroImageLoaded = true;
        };
        
        // Load fireball image
        this.fireballImage = new Image();
        this.fireballImage.src = 'fireball.png';
        this.fireballImageLoaded = false;
        this.fireballImage.onload = () => {
            this.fireballImageLoaded = true;
        };
        
        // Game state
        this.highScore = this.loadHighScore();
        this.gameRunning = true;
        this.gamePaused = false;
        this.cheatMode = false;
        this.showHitIndicator = false;
        this.hitIndicatorTime = 0;
        this.lastFireballTime = Date.now() + Math.random() * 500 + 500; // Random delay between 500-2000ms
        this.fireballCooldown = 2000; // 2 seconds between fireball waves
        this.waveSurvived = false;
        
        // Alien properties
        this.alien = {
            x: this.centerX,
            y: this.centerY,
            radius: this.config.alien.size / 2,
            rotation: 0,
            rotationSpeed: this.config.alien.rotationSpeed,
            baseRotationSpeed: this.config.alien.rotationSpeed,
            state: 'rotating', // 'rotating', 'stopping', 'aiming', 'firing'
            rotationTime: 0,
            rotationDuration: 0,
            aimingTime: 0,
            targetAngles: [],
            showTargetIndicators: false
        };
        
        // Initialize first rotation duration
        this.alien.rotationDuration = this.getRandomRotationDuration();
        
        // Circle path properties - 85% of smaller screen dimension
        this.circleRadius = Math.min(this.width, this.height) * 0.85 / 2;
        
        // Player properties
        this.players = [
            {
                id: 1,
                angle: 0,
                radius: 8,
                speed: this.config.hero.speed,
                direction: 1,
                color: 'rgba(0, 150, 255, 0.6)', // Blue circle for player 1
                score: 0,
                alive: true
            },
            {
                id: 2,
                angle: Math.PI, // Start on opposite side
                radius: 8,
                speed: this.config.hero.speed,
                direction: 1,
                color: 'rgba(255, 100, 0, 0.6)', // Orange circle for player 2
                score: 0,
                alive: true
            }
        ];
        
        // Fireballs array
        this.fireballs = [];
        
        // Input handling
        this.setupInput();
        
        // Start game loop
        this.gameLoop();
    }
    
    setupInput() {
        // Track active touches to avoid duplicate inputs
        this.activeTouches = new Set();
        
        // Mouse input for desktop
        this.canvas.addEventListener('click', (e) => {
            if (this.gameRunning) {
                this.handlePlayerInput(e.clientY);
            }
        });
        
        // Touch support for mobile - handle multiple simultaneous touches
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.gameRunning) {
                // Process each new touch
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if (!this.activeTouches.has(touch.identifier)) {
                        this.activeTouches.add(touch.identifier);
                        this.handlePlayerInput(touch.clientY);
                    }
                }
            }
        });
        
        // Handle touch end to clean up active touches
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                this.activeTouches.delete(touch.identifier);
            }
        });
        
        // Handle touch cancel to clean up active touches
        this.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                this.activeTouches.delete(touch.identifier);
            }
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyP') {
                e.preventDefault();
                this.togglePause();
            } else if (e.code === 'KeyC') {
                e.preventDefault();
                this.toggleCheatMode();
            }
        });
    }
    
    handlePlayerInput(clickY) {
        const screenHeight = window.innerHeight;
        const midPoint = screenHeight / 2;
        
        if (clickY <= midPoint) {
            // Upper half - Player 2 control
            if (this.players[1].alive) {
                this.players[1].direction *= -1;
            }
        } else {
            // Lower half - Player 1 control
            if (this.players[0].alive) {
                this.players[0].direction *= -1;
            }
        }
    }
    
    getRandomRotationDuration() {
        // Return random duration between 1000ms (1s) and 3000ms (3s)
        return Math.random() * 2000 + 1000;
    }
    
    createFireballs() {
        // Fireball creation is now handled in updateAlien when alien is in 'firing' state
        // This method is kept for compatibility but logic moved to updateAlien
    }
    
    updateFireballs() {
        for (let i = this.fireballs.length - 1; i >= 0; i--) {
            const fireball = this.fireballs[i];
            
            // Move fireball
            fireball.x += Math.cos(fireball.angle) * fireball.speed;
            fireball.y += Math.sin(fireball.angle) * fireball.speed;
            fireball.life++;
            
            // Calculate fireball bounds (considering its size)
            const fireballRadius = fireball.radius;
            const margin = fireballRadius + 10; // Small extra margin to ensure complete disappearance
            
            // Remove fireball only when it's completely off screen
            if (fireball.x < -margin || fireball.x > this.width + margin || 
                fireball.y < -margin || fireball.y > this.height + margin) {
                this.fireballs.splice(i, 1);
            }
        }
    }
    
    updatePlayers() {
        this.players.forEach(player => {
            if (player.alive) {
                // Move player along the circle
                player.angle += player.speed * player.direction;
                
                // Keep angle within 0-2π range
                if (player.angle > Math.PI * 2) {
                    player.angle -= Math.PI * 2;
                } else if (player.angle < 0) {
                    player.angle += Math.PI * 2;
                }
            }
        });
    }
    
    updateAlien() {
        const currentTime = Date.now();
        const deltaTime = 16; // Approximate frame time in ms (60fps)
        
        switch (this.alien.state) {
            case 'rotating':
                // Rotate alien
                this.alien.rotation += this.alien.rotationSpeed;
                if (this.alien.rotation > Math.PI * 2) {
                    this.alien.rotation -= Math.PI * 2;
                }
                
                this.alien.rotationTime += deltaTime;
                
                // Check if rotation duration is complete
                if (this.alien.rotationTime >= this.alien.rotationDuration) {
                    this.alien.state = 'stopping';
                    this.alien.rotationTime = 0;
                }
                break;
                
            case 'stopping':
                // Gradually reduce rotation speed to 0
                this.alien.rotationSpeed *= 0.95; // Smooth deceleration
                
                if (Math.abs(this.alien.rotationSpeed) < 0.001) {
                    this.alien.rotationSpeed = 0;
                    this.alien.state = 'aiming';
                    this.alien.aimingTime = 0;
                    
                    // Calculate target angles for fireballs
                    this.alien.targetAngles = [];
                    for (let i = 0; i < 3; i++) {
                        this.alien.targetAngles.push((Math.PI * 2 / 3) * i + this.alien.rotation);
                    }
                    this.alien.showTargetIndicators = true;
                } else {
                    // Continue rotating while slowing down
                    this.alien.rotation += this.alien.rotationSpeed;
                    if (this.alien.rotation > Math.PI * 2) {
                        this.alien.rotation -= Math.PI * 2;
                    }
                }
                break;
                
            case 'aiming':
                this.alien.aimingTime += deltaTime;
                
                // Show target indicators for 1 second
                if (this.alien.aimingTime >= 1000) {
                    this.alien.state = 'firing';
                    this.alien.showTargetIndicators = false;
                    
                    // Award score for surviving the previous wave - but not in cheat mode
                    if (!this.cheatMode && this.fireballs.length === 0) {
                        this.players.forEach(player => {
                            if (player.alive) {
                                player.score += 1;
                            }
                        });
                        
                        // Update high score if any player's score exceeds it
                        const maxScore = Math.max(...this.players.map(p => p.score));
                        if (maxScore > this.highScore) {
                            this.highScore = maxScore;
                            this.saveHighScore();
                        }
                    }
                    
                    // Fire fireballs
                    this.alien.targetAngles.forEach(angle => {
                        this.fireballs.push({
                            x: this.alien.x,
                            y: this.alien.y,
                            angle: angle,
                            speed: this.config.fireball.speed,
                            radius: this.config.fireball.size / 2,
                            life: 0
                        });
                    });
                }
                break;
                
            case 'firing':
                // Wait for all fireballs to be off screen, then start rotating again
                if (this.fireballs.length === 0) {
                    this.alien.state = 'rotating';
                    this.alien.rotationTime = 0;
                    this.alien.rotationDuration = this.getRandomRotationDuration();
                    this.alien.rotationSpeed = this.alien.baseRotationSpeed;
                    this.alien.targetAngles = [];
                }
                break;
        }
    }
    
    checkCollisions() {
        this.players.forEach(player => {
            if (!player.alive) return;
            
            const playerX = this.centerX + Math.cos(player.angle) * this.circleRadius;
            const playerY = this.centerY + Math.sin(player.angle) * this.circleRadius;
            
            for (let i = this.fireballs.length - 1; i >= 0; i--) {
                const fireball = this.fireballs[i];
                const dx = playerX - fireball.x;
                const dy = playerY - fireball.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < player.radius + fireball.radius) {
                    if (this.cheatMode) {
                        // In cheat mode, show hit indicator instead of game over
                        this.showHitIndicator = true;
                        this.hitIndicatorTime = Date.now();
                    } else {
                        // Normal mode - game over immediately when any player dies
                        this.gameOver();
                    }
                    return;
                }
            }
        });
    }
    
    update() {
        if (!this.gameRunning || this.gamePaused) return;
        
        this.updateAlien();
        this.updatePlayers();
        this.createFireballs();
        this.updateFireballs();
        this.checkCollisions();
        
        // Update hit indicator timer
        if (this.showHitIndicator) {
            const currentTime = Date.now();
            if (currentTime - this.hitIndicatorTime > 500) { // Show for 500ms
                this.showHitIndicator = false;
            }
        }
        
        // Increase difficulty over time
        if (this.score > 0 && this.score % 5 === 0) {
            this.fireballCooldown = Math.max(1000, this.fireballCooldown - 100);
        }
    }
    
    drawAlien() {
        this.ctx.save();
        this.ctx.translate(this.alien.x, this.alien.y);
        this.ctx.rotate(this.alien.rotation);
        
        if (this.alienImageLoaded) {
            // Draw alien image while preserving aspect ratio
            const diameter = this.config.alien.size;
            const imageAspect = this.alienImage.width / this.alienImage.height;
            
            let drawWidth, drawHeight;
            if (imageAspect >= 1) {
                // Image is wider or square - scale by diameter as width
                drawWidth = diameter;
                drawHeight = diameter / imageAspect;
            } else {
                // Image is taller - scale by diameter as height
                drawHeight = diameter;
                drawWidth = diameter * imageAspect;
            }
            
            this.ctx.drawImage(this.alienImage, -drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
        } else {
            // Fallback: Draw alien body if image not loaded
            this.ctx.fillStyle = '#4B5563';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.alien.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw alien eyes
            this.ctx.fillStyle = '#F59E0B';
            this.ctx.beginPath();
            this.ctx.arc(-10, -8, 6, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(10, -8, 6, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(0, 8, 6, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw alien pupils
            this.ctx.fillStyle = '#000';
            this.ctx.beginPath();
            this.ctx.arc(-10, -8, 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(10, -8, 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(0, 8, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    drawPlayers() {
        this.players.forEach(player => {
            if (!player.alive) return;
            
            const playerX = this.centerX + Math.cos(player.angle) * this.circleRadius;
            const playerY = this.centerY + Math.sin(player.angle) * this.circleRadius;
            
            this.ctx.save();
            this.ctx.translate(playerX, playerY);
            
            // Draw transparent colored circle below player
            this.ctx.fillStyle = player.color;
            this.ctx.beginPath();
            this.ctx.arc(0, 8, 20, 0, Math.PI * 2); // Circle below the player
            this.ctx.fill();
            
            // Rotate to face the center (add PI to point inward)
            this.ctx.rotate(player.angle + Math.PI);
            
            if (this.heroImageLoaded) {
                // Draw hero image while preserving aspect ratio
                const diameter = this.config.hero.size;
                const imageAspect = this.heroImage.width / this.heroImage.height;
                
                let drawWidth, drawHeight;
                if (imageAspect >= 1) {
                    // Image is wider or square - scale by diameter as width
                    drawWidth = diameter;
                    drawHeight = diameter / imageAspect;
                } else {
                    // Image is taller - scale by diameter as height
                    drawHeight = diameter;
                    drawWidth = diameter * imageAspect;
                }
                
                this.ctx.drawImage(this.heroImage, -drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
            } else {
                // Fallback: Draw player circle if image not loaded
                this.ctx.fillStyle = '#10B981';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw player highlight
                this.ctx.fillStyle = '#34D399';
                this.ctx.beginPath();
                this.ctx.arc(-2, -2, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        });
    }
    
    drawTargetIndicators() {
        if (!this.alien.showTargetIndicators || this.alien.targetAngles.length === 0) return;
        
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        
        this.alien.targetAngles.forEach(angle => {
            // Calculate where the fireball will hit the circle
            const hitX = this.centerX + Math.cos(angle) * this.circleRadius;
            const hitY = this.centerY + Math.sin(angle) * this.circleRadius;
            
            // Draw small pulsing circle
            const pulseScale = 0.8 + 0.2 * Math.sin(Date.now() * 0.01);
            this.ctx.beginPath();
            this.ctx.arc(hitX, hitY, 8 * pulseScale, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        this.ctx.restore();
    }
    
    drawCirclePath() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.circleRadius, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
    drawFireballs() {
        this.fireballs.forEach(fireball => {
            this.ctx.save();
            this.ctx.translate(fireball.x, fireball.y);
            
            // Rotate based on movement direction (image is oriented upward, so add π/2 to align with angle)
            this.ctx.rotate(fireball.angle + Math.PI / 2);
            
            if (this.fireballImageLoaded) {
                // Draw fireball image while preserving aspect ratio
                const diameter = this.config.fireball.size;
                const imageAspect = this.fireballImage.width / this.fireballImage.height;
                
                let drawWidth, drawHeight;
                if (imageAspect >= 1) {
                    // Image is wider or square - scale by diameter as width
                    drawWidth = diameter;
                    drawHeight = diameter / imageAspect;
                } else {
                    // Image is taller - scale by diameter as height
                    drawHeight = diameter;
                    drawWidth = diameter * imageAspect;
                }
                
                this.ctx.drawImage(this.fireballImage, -drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
            } else {
                // Fallback: Draw fireball with gradient if image not loaded
                const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, fireball.radius);
                gradient.addColorStop(0, '#FEF3C7');
                gradient.addColorStop(0.5, '#F59E0B');
                gradient.addColorStop(1, '#DC2626');
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, fireball.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Add glow effect
                this.ctx.shadowColor = '#F59E0B';
                this.ctx.shadowBlur = 15;
                this.ctx.fill();
            }
            
            this.ctx.restore();
        });
    }
    
    drawBackground() {
        // Draw background image if loaded
        if (this.backgroundImageLoaded) {
            // Calculate scaling to cover the entire screen while maintaining aspect ratio
            const imageAspect = this.backgroundImage.width / this.backgroundImage.height;
            const screenAspect = this.width / this.height;
            
            let drawWidth, drawHeight, drawX, drawY;
            
            if (imageAspect > screenAspect) {
                // Image is wider than screen - scale by height
                drawHeight = this.height;
                drawWidth = drawHeight * imageAspect;
                drawX = (this.width - drawWidth) / 2;
                drawY = 0;
            } else {
                // Image is taller than screen - scale by width
                drawWidth = this.width;
                drawHeight = drawWidth / imageAspect;
                drawX = 0;
                drawY = (this.height - drawHeight) / 2;
            }
            
            // Set opacity to 50%
            this.ctx.globalAlpha = 0.5;
            this.ctx.drawImage(this.backgroundImage, drawX, drawY, drawWidth, drawHeight);
            // Reset opacity for other elements
            this.ctx.globalAlpha = 1.0;
        }
        
        // Decorative background elements removed for cleaner gameplay
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw background elements
        this.drawBackground();
        
        // Draw game elements
        this.drawCirclePath();
        this.drawTargetIndicators();
        this.drawAlien();
        this.drawFireballs();
        this.drawPlayers();
        
        // Draw cheat mode indicator
        this.drawCheatModeIndicator();
        
        // Draw hit indicator
        this.drawHitIndicator();
    }
    
    updateUI() {
        // Show both players' scores
        const player1Score = this.players[0].score;
        const player2Score = this.players[1].score;
        document.getElementById('score').textContent = `P1: ${player1Score} | P2: ${player2Score}`;
        document.getElementById('highScore').textContent = this.highScore;
    }
    
    togglePause() {
        if (!this.gameRunning) return;
        this.gamePaused = !this.gamePaused;
    }
    
    toggleCheatMode() {
        this.cheatMode = !this.cheatMode;
    }
    
    drawCheatModeIndicator() {
        if (!this.cheatMode) return;
        
        this.ctx.save();
        this.ctx.fillStyle = '#FF0000';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 3;
        
        const text = 'CHEAT MODE';
        const x = this.centerX;
        const y = 80;
        
        // Draw text outline
        this.ctx.strokeText(text, x, y);
        // Draw text fill
        this.ctx.fillText(text, x, y);
        
        this.ctx.restore();
    }
    
    drawHitIndicator() {
        if (!this.showHitIndicator) return;
        
        this.ctx.save();
        this.ctx.fillStyle = '#FF0000';
        this.ctx.font = 'bold 96px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 6;
        
        const text = 'HIT';
        const x = this.centerX;
        const y = this.centerY;
        
        // Draw text outline
        this.ctx.strokeText(text, x, y);
        // Draw text fill
        this.ctx.fillText(text, x, y);
        
        this.ctx.restore();
    }
    
    loadConfig() {
        try {
            const savedConfig = localStorage.getItem('gameConfig');
            return savedConfig ? JSON.parse(savedConfig) : null;
        } catch (e) {
            return null;
        }
    }
    
    saveConfig() {
        try {
            localStorage.setItem('gameConfig', JSON.stringify(this.config));
        } catch (e) {
            console.warn('Could not save config to localStorage');
        }
    }
    
    loadHighScore() {
        try {
            const savedHighScore = localStorage.getItem('gameHighScore');
            return savedHighScore ? parseInt(savedHighScore) : 0;
        } catch (e) {
            return 0;
        }
    }
    
    saveHighScore() {
        try {
            localStorage.setItem('gameHighScore', this.highScore.toString());
        } catch (e) {
            console.warn('Could not save high score to localStorage');
        }
    }
    
    gameOver() {
        this.gameRunning = false;
        const highestScore = Math.max(...this.players.map(p => p.score));
        document.getElementById('finalScore').textContent = highestScore;
        document.getElementById('gameOver').style.display = 'block';
    }
    
    gameLoop() {
        this.update();
        this.draw();
        this.updateUI();
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Global functions
function restartGame() {
    document.getElementById('gameOver').style.display = 'none';
    game = new Game();
}

function toggleDebugPanel() {
    const debugContent = document.getElementById('debugContent');
    debugContent.classList.toggle('open');
}

function setupDebugControls() {
    // Set initial values from loaded config
    document.getElementById('alienSize').value = game.config.alien.size;
    document.getElementById('alienSizeValue').textContent = game.config.alien.size;
    document.getElementById('alienRotation').value = game.config.alien.rotationSpeed;
    document.getElementById('alienRotationValue').textContent = game.config.alien.rotationSpeed.toFixed(3);
    document.getElementById('heroSize').value = game.config.hero.size;
    document.getElementById('heroSizeValue').textContent = game.config.hero.size;
    document.getElementById('heroSpeed').value = game.config.hero.speed;
    document.getElementById('heroSpeedValue').textContent = game.config.hero.speed.toFixed(2);
    document.getElementById('fireballSize').value = game.config.fireball.size;
    document.getElementById('fireballSizeValue').textContent = game.config.fireball.size;
    document.getElementById('fireballSpeed').value = game.config.fireball.speed;
    document.getElementById('fireballSpeedValue').textContent = game.config.fireball.speed;

    // Alien Size
    const alienSize = document.getElementById('alienSize');
    const alienSizeValue = document.getElementById('alienSizeValue');
    alienSize.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        game.config.alien.size = value;
        game.alien.radius = value / 2;
        alienSizeValue.textContent = value;
        game.saveConfig();
    });

    // Alien Rotation Speed
    const alienRotation = document.getElementById('alienRotation');
    const alienRotationValue = document.getElementById('alienRotationValue');
    alienRotation.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        game.config.alien.rotationSpeed = value;
        game.alien.rotationSpeed = value;
        alienRotationValue.textContent = value.toFixed(3);
        game.saveConfig();
    });

    // Hero Size
    const heroSize = document.getElementById('heroSize');
    const heroSizeValue = document.getElementById('heroSizeValue');
    heroSize.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        game.config.hero.size = value;
        heroSizeValue.textContent = value;
        game.saveConfig();
    });

    // Hero Speed
    const heroSpeed = document.getElementById('heroSpeed');
    const heroSpeedValue = document.getElementById('heroSpeedValue');
    heroSpeed.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        game.config.hero.speed = value;
        game.hero.speed = value;
        heroSpeedValue.textContent = value.toFixed(2);
        game.saveConfig();
    });

    // Fireball Size
    const fireballSize = document.getElementById('fireballSize');
    const fireballSizeValue = document.getElementById('fireballSizeValue');
    fireballSize.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        game.config.fireball.size = value;
        fireballSizeValue.textContent = value;
        game.saveConfig();
    });

    // Fireball Speed
    const fireballSpeed = document.getElementById('fireballSpeed');
    const fireballSpeedValue = document.getElementById('fireballSpeedValue');
    fireballSpeed.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        game.config.fireball.speed = value;
        fireballSpeedValue.textContent = value;
        game.saveConfig();
    });

    // Cheat Mode Toggle
    const cheatModeToggle = document.getElementById('cheatModeToggle');
    const updateCheatModeButton = () => {
        if (game.cheatMode) {
            cheatModeToggle.textContent = 'Cheat Mode: ON';
            cheatModeToggle.style.background = '#10B981';
        } else {
            cheatModeToggle.textContent = 'Cheat Mode: OFF';
            cheatModeToggle.style.background = '#DC2626';
        }
    };
    
    updateCheatModeButton();
    
    cheatModeToggle.addEventListener('click', () => {
        game.toggleCheatMode();
        updateCheatModeButton();
    });
}

// Initialize game when page loads
let game;
window.addEventListener('load', () => {
    game = new Game();
    setupDebugControls();
}); 