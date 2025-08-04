class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas to fullscreen
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        
        // Game state
        this.score = 0;
        this.gameRunning = true;
        this.lastFireballTime = Date.now() + Math.random() * 500 + 500; // Random delay between 500-2000ms
        this.fireballCooldown = 2000; // 2 seconds between fireball waves
        this.waveSurvived = false;
        
        // Alien properties
        this.alien = {
            x: this.centerX,
            y: this.centerY,
            radius: 30,
            rotation: 0,
            rotationSpeed: 0.02
        };
        
        // Circle path properties - 85% of smaller screen dimension
        this.circleRadius = Math.min(this.width, this.height) * 0.85 / 2;
        
        // Hero properties
        this.hero = {
            angle: 0,
            radius: 8,
            speed: 0.03, // radians per frame
            direction: 1 // 1 for clockwise, -1 for counterclockwise
        };
        
        // Fireballs array
        this.fireballs = [];
        
        // Input handling
        this.setupInput();
        
        // Start game loop
        this.gameLoop();
    }
    
    setupInput() {
        this.canvas.addEventListener('click', () => {
            if (this.gameRunning) {
                this.hero.direction *= -1; // Change direction
            }
        });
        
        // Touch support for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.gameRunning) {
                this.hero.direction *= -1;
            }
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault(); // Prevent default spacebar behavior
                
                if (this.gameRunning) {
                    this.hero.direction *= -1; // Change direction
                }
            }
        });
    }
    
    createFireballs() {
        const currentTime = Date.now();
        if (currentTime - this.lastFireballTime > this.fireballCooldown) {
            // Create 3 fireballs in different directions
            for (let i = 0; i < 3; i++) {
                const angle = (Math.PI * 2 / 3) * i + this.alien.rotation;
                this.fireballs.push({
                    x: this.alien.x,
                    y: this.alien.y,
                    angle: angle,
                    speed: 3,
                    radius: 8,
                    life: 0
                });
            }
            this.lastFireballTime = currentTime;
            this.waveSurvived = false; // Reset wave survival flag
        }
    }
    
    updateFireballs() {
        for (let i = this.fireballs.length - 1; i >= 0; i--) {
            const fireball = this.fireballs[i];
            
            // Move fireball
            fireball.x += Math.cos(fireball.angle) * fireball.speed;
            fireball.y += Math.sin(fireball.angle) * fireball.speed;
            fireball.life++;
            
            // Remove fireball if it goes off screen or lives too long
            if (fireball.x < -50 || fireball.x > this.width + 50 || 
                fireball.y < -50 || fireball.y > this.height + 50 || 
                fireball.life > 300) {
                this.fireballs.splice(i, 1);
            }
        }
    }
    
    updateHero() {
        // Move hero along the circle
        this.hero.angle += this.hero.speed * this.hero.direction;
        
        // Keep angle within 0-2π range
        if (this.hero.angle > Math.PI * 2) {
            this.hero.angle -= Math.PI * 2;
        } else if (this.hero.angle < 0) {
            this.hero.angle += Math.PI * 2;
        }
    }
    
    updateAlien() {
        // Rotate alien
        this.alien.rotation += this.alien.rotationSpeed;
        if (this.alien.rotation > Math.PI * 2) {
            this.alien.rotation -= Math.PI * 2;
        }
    }
    
    checkCollisions() {
        const heroX = this.centerX + Math.cos(this.hero.angle) * this.circleRadius;
        const heroY = this.centerY + Math.sin(this.hero.angle) * this.circleRadius;
        
        for (let i = this.fireballs.length - 1; i >= 0; i--) {
            const fireball = this.fireballs[i];
            const dx = heroX - fireball.x;
            const dy = heroY - fireball.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.hero.radius + fireball.radius) {
                // Collision detected - game over immediately
                this.gameOver();
                return;
            }
        }
        
        // Check if all fireballs are gone and we haven't scored this wave yet
        if (this.fireballs.length === 0 && !this.waveSurvived) {
            this.score += 1;
            this.waveSurvived = true;
        }
    }
    
    update() {
        if (!this.gameRunning) return;
        
        this.updateAlien();
        this.updateHero();
        this.createFireballs();
        this.updateFireballs();
        this.checkCollisions();
        
        // Increase difficulty over time
        if (this.score > 0 && this.score % 5 === 0) {
            this.fireballCooldown = Math.max(1000, this.fireballCooldown - 100);
        }
    }
    
    drawAlien() {
        this.ctx.save();
        this.ctx.translate(this.alien.x, this.alien.y);
        this.ctx.rotate(this.alien.rotation);
        
        // Draw alien body
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
        
        this.ctx.restore();
    }
    
    drawHero() {
        const heroX = this.centerX + Math.cos(this.hero.angle) * this.circleRadius;
        const heroY = this.centerY + Math.sin(this.hero.angle) * this.circleRadius;
        
        this.ctx.fillStyle = '#10B981';
        this.ctx.beginPath();
        this.ctx.arc(heroX, heroY, this.hero.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw hero highlight
        this.ctx.fillStyle = '#34D399';
        this.ctx.beginPath();
        this.ctx.arc(heroX - 2, heroY - 2, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawCirclePath() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.circleRadius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    drawFireballs() {
        this.fireballs.forEach(fireball => {
            this.ctx.save();
            this.ctx.translate(fireball.x, fireball.y);
            
            // Draw fireball with gradient
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
            
            this.ctx.restore();
        });
    }
    
    drawBackground() {
        // Draw decorative elements similar to the screenshot
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        
        // Draw some decorative crosses
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            const size = 15;
            
            this.ctx.fillRect(x - size/2, y - 2, size, 4);
            this.ctx.fillRect(x - 2, y - size/2, 4, size);
        }
        
        // Draw some small circles
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw background elements
        this.drawBackground();
        
        // Draw game elements
        this.drawCirclePath();
        this.drawAlien();
        this.drawFireballs();
        this.drawHero();
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
    }
    
    gameOver() {
        this.gameRunning = false;
        document.getElementById('finalScore').textContent = this.score;
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

// Initialize game when page loads
let game;
window.addEventListener('load', () => {
    game = new Game();
}); 