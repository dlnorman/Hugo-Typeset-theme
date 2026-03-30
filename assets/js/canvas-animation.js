// Retro Particle Animation for Hugo Typeset Theme
// Dynamically adapts to theme changes (light/dark/terminal)
// Features vintage arcade-style ships with physics and AI behaviors

class RetroParticleAnimation {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.warn('Canvas element not found:', canvasId);
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.ships = [];
        this.asteroids = [];
        this.projectiles = [];
        this.explosions = [];
        this.ufo = null;
        this.respawnQueue = []; // Ships waiting to respawn
        this.time = 0;
        this.animationFrame = null;
        this.currentTheme = 'light'; // Default theme

        // Physics constants
        this.THRUST_POWER = 0.08;
        this.DRAG = 0.995;
        this.TURN_SPEED = 0.04;
        this.MAX_SPEED = 3;
        this.MAX_PARTICLE_SPEED = 1;
        this.PARTICLE_DRAG = 0.992;
        this.BULLET_SPEED = 7;
        this.BULLET_LIFETIME = 120;
        this.SHOOT_COOLDOWN = 90;
        this.RESPAWN_DELAY = 120; // 2 seconds at 60fps
        this.UFO_SPAWN_CHANCE = 0.001; // Chance per frame to spawn UFO
        this.UFO_SPEED = 0.9;
        this.MAX_ASTEROIDS = 25; // Upper limit to prevent performance degradation
        this.MAX_WAVE_NUMBER = 10; // Cap difficulty scaling

        // Cursor interaction constants
        this.CURSOR_REPULSION_RADIUS = 120;
        this.CURSOR_REPULSION_STRENGTH = 0.12;
        this.GRAVITY_RADIUS = 1200;
        this.GRAVITY_FORCE = 0.06;
        this.mouse = { x: -9999, y: -9999 };
        this.mouseDown = false;

        // Get CSS variables
        this.updateColors();

        // Initialize
        this.resize();
        this.initParticles();
        this.initShips();
        this.initAsteroids();

        // Event listeners
        window.addEventListener('resize', () => {
            this.resize();
            this.initParticles();
            this.initShips();
            this.initAsteroids();
        });

        // Cursor interaction listeners
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        window.addEventListener('mouseleave', () => {
            this.mouse.x = -9999;
            this.mouse.y = -9999;
            this.mouseDown = false;
        });
        window.addEventListener('mousedown', () => { this.mouseDown = true; });
        window.addEventListener('mouseup', () => { this.mouseDown = false; });

        // Listen for theme changes
        this.observeThemeChanges();

        // Respect prefers-reduced-motion — draw a static frame and stop
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            this.animate(true);
            return;
        }

        // Start animation
        this.animate();
    }

    observeThemeChanges() {
        // Watch for data-theme attribute changes on html element
        const htmlElement = document.documentElement;
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    // Wait a bit for the CSS to load before updating colors
                    setTimeout(() => {
                        this.updateColors();
                    }, 100);
                }
            });
        });

        observer.observe(htmlElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
    }

    updateColors() {
        const root = getComputedStyle(document.documentElement);
        const theme = document.documentElement.getAttribute('data-theme') || 'light';

        this.colors = {
            bg: root.getPropertyValue('--page-bg-colour').trim(),
            accent: root.getPropertyValue('--accent-colour').trim(),
            accentColor: root.getPropertyValue('--accent-color').trim(),
            border: root.getPropertyValue('--border-colour').trim(),
            bgSecondary: root.getPropertyValue('--bg-secondary').trim(),
            hover: root.getPropertyValue('--hover-bg-colour').trim(),
            linkHover: root.getPropertyValue('--link-hover-colour').trim(),
            text: root.getPropertyValue('--text-colour').trim()
        };

        // Store theme for adaptive rendering
        this.currentTheme = theme;
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    initParticles() {
        this.particles = [];
        const particleCount = Math.floor((this.width * this.height) / 8000);

        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.3,
                twinkleSpeed: Math.random() * 0.03 + 0.01,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }
    }

    initShips() {
        this.ships = [];
        this.projectiles = [];
        this.explosions = [];
        this.ufo = null;
        this.respawnQueue = [];
        const shipCount = 1;

        // Ship types inspired by classic arcade games
        const shipTypes = ['asteroids'];

        for (let i = 0; i < shipCount; i++) {
            const shipType = shipTypes[i % shipTypes.length];
            this.ships.push(this.createShip(shipType));
        }
    }

    createShip(shipType) {
        return {
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            vx: 0,
            vy: 0,
            heading: Math.random() * Math.PI * 2, // Direction ship faces
            angularVelocity: 0,
            size: 18 + Math.random() * 8,
            type: shipType,
            opacity: 0.5 + Math.random() * 0.3,
            // AI state
            state: 'patrol', // patrol, chase, evade, attack
            targetAngle: Math.random() * Math.PI * 2,
            stateTimer: Math.floor(Math.random() * 200),
            thrustOn: false,
            shootCooldown: 0,
            burstRemaining: 0,
            burstCooldown: 0,
            target: null,
            // Visual effects
            thrustFlicker: 0,
            damageFlash: 0
        };
    }

    initAsteroids() {
        this.asteroids = [];
        // Start with a handful of large and medium asteroids
        const asteroidCount = Math.floor(this.width / 500) + 2;

        for (let i = 0; i < asteroidCount; i++) {
            const size = Math.random() < 0.4 ? 'large' : 'medium';
            this.asteroids.push(this.createAsteroid(
                Math.random() * this.width,
                Math.random() * this.height,
                size
            ));
        }
    }

    createAsteroid(x, y, size) {
        // Size categories like classic Asteroids
        const sizeMap = {
            large: 40 + Math.random() * 15,
            medium: 22 + Math.random() * 8,
            small: 10 + Math.random() * 5
        };

        const radius = sizeMap[size];

        // Generate irregular polygon vertices
        const vertexCount = 8 + Math.floor(Math.random() * 5); // 8-12 vertices
        const vertices = [];

        for (let i = 0; i < vertexCount; i++) {
            const angle = (Math.PI * 2 * i) / vertexCount;
            // Vary the radius for each vertex to create irregular shape
            const vertexRadius = radius * (0.7 + Math.random() * 0.5);
            vertices.push({
                x: Math.cos(angle) * vertexRadius,
                y: Math.sin(angle) * vertexRadius
            });
        }

        // Random velocity - smaller asteroids move faster
        const speedMultiplier = size === 'large' ? 0.5 : (size === 'medium' ? 0.8 : 1.2);
        const speed = (0.15 + Math.random() * 0.35) * speedMultiplier;
        const angle = Math.random() * Math.PI * 2;

        return {
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: radius,
            size: size, // 'large', 'medium', 'small'
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.008,
            vertices: vertices,
            opacity: 0.4 + Math.random() * 0.3
        };
    }

    drawAsteroid(asteroid) {
        this.ctx.save();
        this.ctx.translate(asteroid.x, asteroid.y);
        this.ctx.rotate(asteroid.rotation);

        const strokeOpacity = (this.currentTheme === 'light') ? asteroid.opacity : asteroid.opacity * 1.3;

        // Use a visible color for asteroids - text color works for both themes
        const asteroidColor = this.colors.text;

        this.ctx.strokeStyle = this.hexToRgba(asteroidColor, strokeOpacity);
        this.ctx.lineWidth = 2;

        // Draw the irregular polygon outline only (classic vector style)
        this.ctx.beginPath();
        this.ctx.moveTo(asteroid.vertices[0].x, asteroid.vertices[0].y);
        for (let i = 1; i < asteroid.vertices.length; i++) {
            this.ctx.lineTo(asteroid.vertices[i].x, asteroid.vertices[i].y);
        }
        this.ctx.closePath();
        this.ctx.stroke();

        this.ctx.restore();
    }

    // Returns {fx, fy} mouse force for an object at (x, y).
    // Positive = attract (mouseDown), negative = repel (hover).
    getMouseForce(x, y, gravityScale = 1, repelScale = 1) {
        if (this.mouse.x <= -1000) return { fx: 0, fy: 0 };

        let dx = this.mouse.x - x;
        let dy = this.mouse.y - y;
        // Toroidal shortest path
        if (Math.abs(dx) > this.width  / 2) dx -= Math.sign(dx) * this.width;
        if (Math.abs(dy) > this.height / 2) dy -= Math.sign(dy) * this.height;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (this.mouseDown) {
            if (dist < this.GRAVITY_RADIUS && dist > 1) {
                const force = (1 - dist / this.GRAVITY_RADIUS) * this.GRAVITY_FORCE * gravityScale;
                return { fx: (dx / dist) * force, fy: (dy / dist) * force };
            }
        } else {
            if (dist < this.CURSOR_REPULSION_RADIUS && dist > 0) {
                const force = (1 - dist / this.CURSOR_REPULSION_RADIUS) * this.CURSOR_REPULSION_STRENGTH * repelScale;
                return { fx: -(dx / dist) * force, fy: -(dy / dist) * force };
            }
        }
        return { fx: 0, fy: 0 };
    }

    updateAsteroids() {
        this.asteroids.forEach(asteroid => {
            // Mouse attract/repel
            const { fx, fy } = this.getMouseForce(asteroid.x, asteroid.y, 0.5, 0.6);
            asteroid.vx += fx;
            asteroid.vy += fy;

            // Update position
            asteroid.x += asteroid.vx;
            asteroid.y += asteroid.vy;

            // Rotate
            asteroid.rotation += asteroid.rotationSpeed;

            // Wrap around screen
            const margin = asteroid.radius + 10;
            if (asteroid.x < -margin) asteroid.x = this.width + margin;
            if (asteroid.x > this.width + margin) asteroid.x = -margin;
            if (asteroid.y < -margin) asteroid.y = this.height + margin;
            if (asteroid.y > this.height + margin) asteroid.y = -margin;
        });

        // Spawn new wave when all asteroids destroyed
        if (this.asteroids.length === 0) {
            this.spawnAsteroidWave();
        }
    }

    // Spawn a new wave of asteroids
    spawnAsteroidWave() {
        // Increase difficulty slightly each wave, but cap it
        this.waveNumber = (this.waveNumber || 0) + 1;
        const effectiveWave = Math.min(this.waveNumber, this.MAX_WAVE_NUMBER);
        const baseCount = Math.floor(this.width / 500) + 2;
        const asteroidCount = Math.min(
            baseCount + Math.floor(effectiveWave / 2),
            this.MAX_ASTEROIDS
        );

        for (let i = 0; i < asteroidCount; i++) {
            const size = Math.random() < 0.4 ? 'large' : 'medium';
            const radius = size === 'large' ? 40 : 25;
            const safeMargin = 120; // minimum distance from any ship

            let x, y, attempts = 0;
            do {
                x = radius + Math.random() * (this.width - radius * 2);
                y = radius + Math.random() * (this.height - radius * 2);
                attempts++;
            } while (
                attempts < 30 &&
                this.ships.some(ship => {
                    const dx = ship.x - x, dy = ship.y - y;
                    return Math.sqrt(dx * dx + dy * dy) < safeMargin;
                })
            );

            this.asteroids.push(this.createAsteroid(x, y, size));
        }
    }

    // Split asteroid into smaller pieces
    splitAsteroid(asteroid, index) {
        // Remove the original asteroid
        this.asteroids.splice(index, 1);

        // Create explosion at asteroid location
        this.createExplosion(asteroid.x, asteroid.y, asteroid.radius * 0.5);

        // Determine what size children to spawn
        let childSize = null;
        let childCount = 0;

        if (asteroid.size === 'large') {
            childSize = 'medium';
            childCount = 2 + Math.floor(Math.random() * 2); // 2-3 medium
        } else if (asteroid.size === 'medium') {
            childSize = 'small';
            childCount = 2 + Math.floor(Math.random() * 2); // 2-3 small
        }
        // Small asteroids just disappear

        // Spawn children (skip if already at asteroid limit)
        if (this.asteroids.length >= this.MAX_ASTEROIDS) childCount = 0;
        for (let i = 0; i < childCount; i++) {
            const offsetAngle = (Math.PI * 2 * i) / childCount + Math.random() * 0.5;
            const offsetDist = asteroid.radius * 0.3;
            const newAsteroid = this.createAsteroid(
                asteroid.x + Math.cos(offsetAngle) * offsetDist,
                asteroid.y + Math.sin(offsetAngle) * offsetDist,
                childSize
            );
            // Give children some velocity from the impact
            newAsteroid.vx += Math.cos(offsetAngle) * 0.5;
            newAsteroid.vy += Math.sin(offsetAngle) * 0.5;
            this.asteroids.push(newAsteroid);
        }
    }

    drawParticle(particle) {
        const twinkle = Math.sin(this.time * particle.twinkleSpeed + particle.twinklePhase) * 0.3 + 0.7;

        // Increase opacity for dark themes
        const baseOpacity = (this.currentTheme === 'light') ? particle.opacity : particle.opacity * 1.5;
        const opacity = baseOpacity * twinkle;

        this.ctx.fillStyle = this.hexToRgba(this.colors.accentColor, opacity);
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();

        // Add glow effect for larger particles
        if (particle.size > 1.5) {
            const glowOpacity = (this.currentTheme === 'light') ? opacity * 0.3 : opacity * 0.5;
            this.ctx.fillStyle = this.hexToRgba(this.colors.accentColor, glowOpacity);
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawShip(ship) {
        this.ctx.save();
        this.ctx.translate(ship.x, ship.y);
        this.ctx.rotate(ship.heading);

        const size = ship.size;

        // Use better colors for dark themes
        const strokeOpacity = (this.currentTheme === 'light') ? ship.opacity : ship.opacity * 1.3;
        const fillOpacity = (this.currentTheme === 'light') ? ship.opacity * 0.2 : ship.opacity * 0.3;

        // Damage flash effect
        let strokeColor = this.colors.linkHover;
        if (ship.damageFlash > 0) {
            strokeColor = '#ff4444';
        }

        this.ctx.strokeStyle = this.hexToRgba(strokeColor, strokeOpacity);
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = this.hexToRgba(this.colors.accent, fillOpacity);

        // Draw ship based on type
        switch(ship.type) {
            case 'asteroids':
                this.drawAsteroidsShip(size);
                break;
            case 'defender':
                this.drawDefenderShip(size);
                break;
            case 'starcastle':
                this.drawStarCastleShip(size);
                break;
            case 'deluxe':
                this.drawDeluxeShip(size);
                break;
        }

        this.ctx.fill();
        this.ctx.stroke();

        // Draw thrust flame when thrusting
        if (ship.thrustOn) {
            this.drawThrustFlame(ship, size);
        }

        this.ctx.restore();
    }

    // Classic Asteroids triangle ship
    drawAsteroidsShip(size) {
        this.ctx.beginPath();
        this.ctx.moveTo(size, 0);                    // Nose
        this.ctx.lineTo(-size * 0.7, -size * 0.6);   // Left wing
        this.ctx.lineTo(-size * 0.4, 0);              // Back indent
        this.ctx.lineTo(-size * 0.7, size * 0.6);    // Right wing
        this.ctx.closePath();
    }

    // Defender-style horizontal ship
    drawDefenderShip(size) {
        this.ctx.beginPath();
        // Main body - elongated shape
        this.ctx.moveTo(size, 0);                     // Nose
        this.ctx.lineTo(size * 0.3, -size * 0.4);    // Top front
        this.ctx.lineTo(-size * 0.5, -size * 0.5);   // Top back
        this.ctx.lineTo(-size * 0.8, -size * 0.3);   // Engine top
        this.ctx.lineTo(-size * 0.8, size * 0.3);    // Engine bottom
        this.ctx.lineTo(-size * 0.5, size * 0.5);    // Bottom back
        this.ctx.lineTo(size * 0.3, size * 0.4);     // Bottom front
        this.ctx.closePath();

        // Cockpit detail
        this.ctx.moveTo(size * 0.5, -size * 0.15);
        this.ctx.lineTo(size * 0.2, -size * 0.15);
        this.ctx.lineTo(size * 0.2, size * 0.15);
        this.ctx.lineTo(size * 0.5, size * 0.15);
    }

    // Star Castle-style geometric ship
    drawStarCastleShip(size) {
        this.ctx.beginPath();
        // Pointed angular design
        this.ctx.moveTo(size, 0);                     // Nose
        this.ctx.lineTo(size * 0.2, -size * 0.5);    // Upper wing inner
        this.ctx.lineTo(-size * 0.3, -size * 0.8);   // Upper wing tip
        this.ctx.lineTo(-size * 0.5, -size * 0.3);   // Upper wing back
        this.ctx.lineTo(-size * 0.7, 0);              // Center back
        this.ctx.lineTo(-size * 0.5, size * 0.3);    // Lower wing back
        this.ctx.lineTo(-size * 0.3, size * 0.8);    // Lower wing tip
        this.ctx.lineTo(size * 0.2, size * 0.5);     // Lower wing inner
        this.ctx.closePath();
    }

    // Asteroids Deluxe-style detailed ship
    drawDeluxeShip(size) {
        // Main hull - more angular than basic Asteroids
        this.ctx.beginPath();
        this.ctx.moveTo(size, 0);                      // Nose point
        this.ctx.lineTo(size * 0.3, -size * 0.15);    // Upper nose bevel
        this.ctx.lineTo(-size * 0.2, -size * 0.4);    // Upper hull
        this.ctx.lineTo(-size * 0.7, -size * 0.55);   // Left wing tip
        this.ctx.lineTo(-size * 0.5, -size * 0.25);   // Wing inner
        this.ctx.lineTo(-size * 0.6, 0);               // Back center
        this.ctx.lineTo(-size * 0.5, size * 0.25);    // Wing inner
        this.ctx.lineTo(-size * 0.7, size * 0.55);    // Right wing tip
        this.ctx.lineTo(-size * 0.2, size * 0.4);     // Lower hull
        this.ctx.lineTo(size * 0.3, size * 0.15);     // Lower nose bevel
        this.ctx.closePath();

        // Inner detail lines (cockpit area)
        this.ctx.moveTo(size * 0.4, 0);
        this.ctx.lineTo(0, -size * 0.2);
        this.ctx.lineTo(-size * 0.3, 0);
        this.ctx.lineTo(0, size * 0.2);
        this.ctx.closePath();
    }

    // Create UFO entity
    createUFO() {
        // Spawn from left or right edge
        const fromLeft = Math.random() < 0.5;
        return {
            x: fromLeft ? -30 : this.width + 30,
            y: Math.random() * this.height * 0.6 + this.height * 0.2,
            vx: fromLeft ? this.UFO_SPEED : -this.UFO_SPEED,
            vy: 0,
            size: 22,
            shootCooldown: 0,
            wobblePhase: 0,
            target: null,
            damageFlash: 0
        };
    }

    // Draw the UFO (classic saucer shape)
    drawUFO() {
        if (!this.ufo) return;

        this.ctx.save();
        this.ctx.translate(this.ufo.x, this.ufo.y);

        const size = this.ufo.size;
        const strokeOpacity = (this.currentTheme === 'light') ? 0.8 : 1.0;
        const fillOpacity = (this.currentTheme === 'light') ? 0.2 : 0.3;

        let strokeColor = this.colors.linkHover;
        if (this.ufo.damageFlash > 0) {
            strokeColor = '#ff4444';
        }

        this.ctx.strokeStyle = this.hexToRgba(strokeColor, strokeOpacity);
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = this.hexToRgba(this.colors.accent, fillOpacity);

        // Main saucer body (ellipse)
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, size, size * 0.4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Top dome
        this.ctx.beginPath();
        this.ctx.ellipse(0, -size * 0.2, size * 0.5, size * 0.35, 0, Math.PI, 0);
        this.ctx.stroke();

        // Bottom detail line
        this.ctx.beginPath();
        this.ctx.moveTo(-size * 0.7, size * 0.15);
        this.ctx.lineTo(size * 0.7, size * 0.15);
        this.ctx.stroke();

        this.ctx.restore();
    }

    // Update UFO behavior
    updateUFO() {
        // Maybe spawn a UFO
        if (!this.ufo && Math.random() < this.UFO_SPAWN_CHANCE) {
            this.ufo = this.createUFO();
        }

        if (!this.ufo) return;

        // Decrease damage flash
        if (this.ufo.damageFlash > 0) this.ufo.damageFlash--;

        // Wobble up and down
        this.ufo.wobblePhase += 0.05;
        this.ufo.vy = Math.sin(this.ufo.wobblePhase) * 0.5;

        // Move
        this.ufo.x += this.ufo.vx;
        this.ufo.y += this.ufo.vy;

        // Keep in vertical bounds
        if (this.ufo.y < 50) this.ufo.y = 50;
        if (this.ufo.y > this.height - 50) this.ufo.y = this.height - 50;

        // Remove if off screen
        if (this.ufo.x < -50 || this.ufo.x > this.width + 50) {
            this.ufo = null;
            return;
        }

        // Find target (nearest ship)
        this.ufo.shootCooldown = Math.max(0, this.ufo.shootCooldown - 1);

        let nearestShip = null;
        let nearestDist = Infinity;
        this.ships.forEach(ship => {
            const dx = ship.x - this.ufo.x;
            const dy = ship.y - this.ufo.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestShip = ship;
            }
        });

        // Shoot at nearest ship
        if (nearestShip && this.ufo.shootCooldown === 0 && nearestDist < 400) {
            this.fireUFOProjectile(nearestShip);
            this.ufo.shootCooldown = 90; // Slower fire rate than ships
        }
    }

    // UFO fires at a target
    fireUFOProjectile(target) {
        const angle = Math.atan2(target.y - this.ufo.y, target.x - this.ufo.x);
        // Add some inaccuracy
        const spread = (Math.random() - 0.5) * 0.3;

        this.projectiles.push({
            x: this.ufo.x,
            y: this.ufo.y,
            vx: Math.cos(angle + spread) * this.BULLET_SPEED * 0.8,
            vy: Math.sin(angle + spread) * this.BULLET_SPEED * 0.8,
            heading: angle + spread,
            lifetime: this.BULLET_LIFETIME,
            owner: this.ufo
        });
    }

    drawThrustFlame(ship, size) {
        // Flickering flame effect
        ship.thrustFlicker = (ship.thrustFlicker + 0.3) % (Math.PI * 2);
        const flicker = 0.7 + Math.sin(ship.thrustFlicker) * 0.3;
        const flameLength = size * 0.8 * flicker;

        const flameOpacity = (this.currentTheme === 'light') ? 0.6 : 0.8;

        // Flame position varies by ship type to match rear edge
        let flameX, flameWidth;
        switch (ship.type) {
            case 'defender':
                flameX = -size * 0.8;  // Engine is at -0.8
                flameWidth = 0.25;
                break;
            case 'starcastle':
                flameX = -size * 0.7;  // Back is at -0.7
                flameWidth = 0.2;
                break;
            case 'deluxe':
                flameX = -size * 0.6;  // Back center is at -0.6
                flameWidth = 0.2;
                break;
            case 'asteroids':
            default:
                flameX = -size * 0.5;  // Back indent is at -0.4, flame from -0.5
                flameWidth = 0.25;
                break;
        }

        // Outer flame (orange/yellow)
        this.ctx.fillStyle = this.hexToRgba('#ff6600', flameOpacity * 0.7);
        this.ctx.beginPath();
        this.ctx.moveTo(flameX, -size * flameWidth);
        this.ctx.lineTo(flameX - flameLength, 0);
        this.ctx.lineTo(flameX, size * flameWidth);
        this.ctx.closePath();
        this.ctx.fill();

        // Inner flame (bright yellow/white)
        this.ctx.fillStyle = this.hexToRgba('#ffcc00', flameOpacity);
        this.ctx.beginPath();
        this.ctx.moveTo(flameX, -size * flameWidth * 0.5);
        this.ctx.lineTo(flameX - flameLength * 0.6, 0);
        this.ctx.lineTo(flameX, size * flameWidth * 0.5);
        this.ctx.closePath();
        this.ctx.fill();
    }

    // Draw a projectile
    drawProjectile(proj) {
        const opacity = (this.currentTheme === 'light') ? 0.8 : 1.0;

        this.ctx.save();
        this.ctx.translate(proj.x, proj.y);
        this.ctx.rotate(proj.heading);

        // Bullet trail
        const trailLength = 8;
        const gradient = this.ctx.createLinearGradient(-trailLength, 0, 4, 0);
        gradient.addColorStop(0, this.hexToRgba(this.colors.accent, 0));
        gradient.addColorStop(1, this.hexToRgba(this.colors.accent, opacity));

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.moveTo(4, 0);
        this.ctx.lineTo(-trailLength, -2);
        this.ctx.lineTo(-trailLength, 2);
        this.ctx.closePath();
        this.ctx.fill();

        // Bullet head (bright)
        this.ctx.fillStyle = this.hexToRgba(this.colors.linkHover, opacity);
        this.ctx.beginPath();
        this.ctx.arc(2, 0, 2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    // Draw explosion particles
    drawExplosion(exp) {
        const progress = exp.age / exp.lifetime;
        const opacity = (1 - progress) * 0.8;

        this.ctx.save();
        this.ctx.translate(exp.x, exp.y);

        exp.particles.forEach(p => {
            const px = p.vx * exp.age;
            const py = p.vy * exp.age;
            const size = p.size * (1 - progress * 0.5);

            this.ctx.fillStyle = this.hexToRgba(p.color, opacity);
            this.ctx.beginPath();
            this.ctx.arc(px, py, size, 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.ctx.restore();
    }

    drawConnections() {
        const maxDistance = 150;
        const maxDistSq = maxDistance * maxDistance;
        const baseOpacity = (this.currentTheme === 'light') ? 0.15 : 0.25;

        // Pre-parse the hex color once instead of per-line
        const rgb = this.hexToRgb(this.colors.accentColor);

        // Batch lines into opacity buckets to avoid O(n²) stroke() calls,
        // which causes glitching when many particles cluster together.
        const BUCKETS = 8;
        const buckets = Array.from({length: BUCKETS}, () => []);

        for (let i = 0; i < this.particles.length; i++) {
            const pi = this.particles[i];
            for (let j = i + 1; j < this.particles.length; j++) {
                const pj = this.particles[j];
                const dx = pi.x - pj.x;
                const dy = pi.y - pj.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < maxDistSq) {
                    const distance = Math.sqrt(distSq);
                    // Bell-curve opacity: peaks around mid-range, fades at both close and far
                    const t = distance / maxDistance;
                    const opacity = t * (1 - t) * 4 * baseOpacity;
                    const bucketIdx = Math.min(BUCKETS - 1, Math.floor(opacity / baseOpacity * BUCKETS));
                    const bucket = buckets[bucketIdx];
                    bucket.push(pi.x, pi.y, pj.x, pj.y);
                }
            }
        }

        // One stroke() call per bucket instead of one per line
        this.ctx.lineWidth = 1;
        for (let b = 0; b < BUCKETS; b++) {
            const pts = buckets[b];
            if (pts.length === 0) continue;
            const bucketOpacity = (b + 0.5) / BUCKETS * baseOpacity;
            this.ctx.strokeStyle = `rgba(${rgb},${bucketOpacity})`;
            this.ctx.beginPath();
            for (let k = 0; k < pts.length; k += 4) {
                this.ctx.moveTo(pts[k], pts[k + 1]);
                this.ctx.lineTo(pts[k + 2], pts[k + 3]);
            }
            this.ctx.stroke();
        }
    }

    hexToRgb(hex) {
        hex = hex.trim().replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }
        if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
            return '200,200,200';
        }
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `${r},${g},${b}`;
    }

    hexToRgba(hex, alpha) {
        hex = hex.trim().replace('#', '');

        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }

        if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
            return `rgba(200, 200, 200, ${alpha})`;
        }

        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    updateParticles() {
        this.particles.forEach(particle => {
            // Apply drag so particles slow down over time
            particle.vx *= this.PARTICLE_DRAG;
            particle.vy *= this.PARTICLE_DRAG;

            // Add small random velocity perturbation to keep things dynamic
            if (Math.random() < 0.02) {
                particle.vx += (Math.random() - 0.5) * 0.1;
                particle.vy += (Math.random() - 0.5) * 0.1;
            }

            // Mouse gravity well (hold) / cursor repulsion (hover)
            const { fx: mfx, fy: mfy } = this.getMouseForce(particle.x, particle.y);
            particle.vx += mfx;
            particle.vy += mfy;

            const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
            if (speed > this.MAX_PARTICLE_SPEED) {
                particle.vx = (particle.vx / speed) * this.MAX_PARTICLE_SPEED;
                particle.vy = (particle.vy / speed) * this.MAX_PARTICLE_SPEED;
            }

            particle.x += particle.vx;
            particle.y += particle.vy;

            // Wrap around screen
            if (particle.x < 0) particle.x = this.width;
            if (particle.x > this.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.height;
            if (particle.y > this.height) particle.y = 0;
        });
    }


    // Ship AI - determines behavior
    updateShipAI(ship) {
        ship.stateTimer--;
        ship.shootCooldown = Math.max(0, ship.shootCooldown - 1);
        ship.burstCooldown = Math.max(0, ship.burstCooldown - 1);

        // Fire next shot in an active burst
        if (ship.burstRemaining > 0 && ship.burstCooldown === 0) {
            this.spawnBullet(ship);
            ship.burstRemaining--;
            if (ship.burstRemaining > 0) {
                ship.burstCooldown = 7; // frames between shots in a burst
            } else {
                ship.shootCooldown = this.SHOOT_COOLDOWN; // delay before next burst
            }
        }

        // Decrease damage flash
        if (ship.damageFlash > 0) ship.damageFlash--;

        // === STEP 1: Scan for threats and targets every frame ===

        // Find nearest asteroid by edge-to-edge distance
        let nearestAsteroid = null;
        let nearestAsteroidDist = Infinity;
        this.asteroids.forEach(asteroid => {
            const dx = asteroid.x - ship.x;
            const dy = asteroid.y - ship.y;
            const dist = Math.sqrt(dx * dx + dy * dy) - asteroid.radius;
            if (dist < nearestAsteroidDist) {
                nearestAsteroidDist = dist;
                nearestAsteroid = asteroid;
            }
        });

        // Find an asteroid on an actual collision course (must be approaching)
        let mostDangerousAsteroid = null;
        let shortestTimeToCollision = Infinity;
        this.asteroids.forEach(asteroid => {
            const dx = asteroid.x - ship.x;
            const dy = asteroid.y - ship.y;
            const relVx = asteroid.vx - ship.vx;
            const relVy = asteroid.vy - ship.vy;

            // Time of closest approach (negative = already past)
            const relSpeedSq = relVx * relVx + relVy * relVy;
            if (relSpeedSq < 0.0001) return;
            const t = -(dx * relVx + dy * relVy) / relSpeedSq;
            if (t < 0 || t > 180) return; // Not approaching, or too far in future

            // Distance at closest approach
            const cx = dx + relVx * t;
            const cy = dy + relVy * t;
            const closestDist = Math.sqrt(cx * cx + cy * cy);
            const safeRadius = ship.size + asteroid.radius + 20;

            if (closestDist < safeRadius && t < shortestTimeToCollision) {
                shortestTimeToCollision = t;
                mostDangerousAsteroid = asteroid;
            }
        });

        // === STEP 2: Immediate danger overrides — checked every frame ===

        if (mostDangerousAsteroid) {
            const dx = mostDangerousAsteroid.x - ship.x;
            const dy = mostDangerousAsteroid.y - ship.y;
            const edgeDist = Math.sqrt(dx * dx + dy * dy) - mostDangerousAsteroid.radius;

            if (edgeDist < ship.size + 20) {
                // CRITICAL: about to collide — hard turn away and thrust
                this.emergencyEvade(ship, mostDangerousAsteroid);
                return;
            }

            if (shortestTimeToCollision < 90) {
                // WARNING: collision predicted within ~1.5 seconds — steer clear
                this.collisionAvoidance(ship, mostDangerousAsteroid);
                return;
            }
        }

        // === STEP 3: State machine for normal hunting behavior ===

        const ufoTarget = this.ufo;
        let ufoDist = Infinity;
        if (ufoTarget) {
            const dx = ufoTarget.x - ship.x;
            const dy = ufoTarget.y - ship.y;
            ufoDist = Math.sqrt(dx * dx + dy * dy);
        }

        // Refresh target when timer expires or current target is gone
        const targetGone = ship.target && !this.asteroids.includes(ship.target) && ship.target !== this.ufo;
        if (ship.stateTimer <= 0 || targetGone) {
            if (ufoTarget && ufoDist < 250) {
                ship.state = 'attackUFO';
                ship.target = ufoTarget;
                ship.stateTimer = 120 + Math.floor(Math.random() * 80);
            } else if (nearestAsteroid) {
                ship.state = 'hunt';
                ship.target = nearestAsteroid;
                ship.stateTimer = 200 + Math.floor(Math.random() * 100);
            } else {
                ship.state = 'patrol';
                ship.targetAngle = Math.random() * Math.PI * 2;
                ship.stateTimer = 150 + Math.floor(Math.random() * 150);
            }
        }

        // Execute current behavior
        switch (ship.state) {
            case 'patrol':
                this.patrolBehavior(ship);
                break;
            case 'hunt':
                this.huntBehavior(ship);
                break;
            case 'attackUFO':
                this.attackBehavior(ship);
                break;
        }
    }

    emergencyEvade(ship, threat) {
        // Hard turn directly away from threat + full thrust
        const dx = threat.x - ship.x;
        const dy = threat.y - ship.y;
        const angleToThreat = Math.atan2(dy, dx);
        const awayAngle = angleToThreat + Math.PI;
        const angleDiff = this.normalizeAngle(awayAngle - ship.heading);
        ship.angularVelocity = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.TURN_SPEED * 2);
        ship.thrustOn = true;
    }

    collisionAvoidance(ship, threat) {
        // Steer 90° perpendicular to the threat — pick whichever side requires less turning
        const dx = threat.x - ship.x;
        const dy = threat.y - ship.y;
        const angleToThreat = Math.atan2(dy, dx);

        const perpRight = this.normalizeAngle(angleToThreat + Math.PI / 2);
        const perpLeft  = this.normalizeAngle(angleToThreat - Math.PI / 2);
        const diffRight = Math.abs(this.normalizeAngle(perpRight - ship.heading));
        const diffLeft  = Math.abs(this.normalizeAngle(perpLeft  - ship.heading));

        const targetAngle = diffRight < diffLeft ? perpRight : perpLeft;
        const angleDiff = this.normalizeAngle(targetAngle - ship.heading);
        // Gentle correction — let the ship drift naturally while it turns
        ship.angularVelocity = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.TURN_SPEED);
        // Don't force thrust; let momentum carry it clear
    }

    patrolBehavior(ship) {
        // Slowly turn toward target angle
        const angleDiff = this.normalizeAngle(ship.targetAngle - ship.heading);
        ship.angularVelocity = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.TURN_SPEED * 0.5);

        // Gentle thrust
        ship.thrustOn = Math.random() < 0.3;
    }

    huntBehavior(ship) {
        if (!ship.target || !this.asteroids.includes(ship.target)) {
            ship.state = 'patrol';
            return;
        }

        const asteroid = ship.target;
        const dx = asteroid.x - ship.x;
        const dy = asteroid.y - ship.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Maintain a standoff distance: just outside the asteroid so we can fire safely
        const standoff = asteroid.radius + ship.size + 70;

        // Lead the target: predict where the asteroid will be when the bullet arrives
        const bulletTravelTime = dist / this.BULLET_SPEED;
        const predictX = asteroid.x + (asteroid.vx || 0) * bulletTravelTime;
        const predictY = asteroid.y + (asteroid.vy || 0) * bulletTravelTime;

        const angleToTarget = Math.atan2(predictY - ship.y, predictX - ship.x);
        const angleDiff = this.normalizeAngle(angleToTarget - ship.heading);

        // Turn toward predicted position
        ship.angularVelocity = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.TURN_SPEED);

        if (dist > standoff + 50) {
            // Too far — approach, but only thrust when roughly aimed
            ship.thrustOn = Math.abs(angleDiff) < Math.PI / 2.5;
        } else {
            // In the sweet spot — hold position with minimal thrust
            ship.thrustOn = dist > standoff + 10 && Math.abs(angleDiff) < Math.PI / 4 && Math.random() < 0.3;
        }

        // Start a burst when well-aimed and ready
        if (Math.abs(angleDiff) < Math.PI / 10 && ship.shootCooldown === 0 && ship.burstRemaining === 0) {
            ship.burstRemaining = Math.floor(Math.random() * 5) + 1;
            ship.burstCooldown = 0; // fire first shot immediately on next tick
        }
    }

    evadeBehavior(ship) {
        if (!ship.target) {
            ship.state = 'patrol';
            return;
        }

        // Turn away from target
        const angleToTarget = Math.atan2(ship.target.y - ship.y, ship.target.x - ship.x);
        const awayAngle = angleToTarget + Math.PI;
        const angleDiff = this.normalizeAngle(awayAngle - ship.heading);
        ship.angularVelocity = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.TURN_SPEED * 1.2);

        // Full thrust to escape
        ship.thrustOn = true;
    }

    attackBehavior(ship) {
        if (!ship.target) {
            ship.state = 'patrol';
            return;
        }

        // Predict target position
        const targetVx = ship.target.vx || 0;
        const targetVy = ship.target.vy || 0;
        const predictX = ship.target.x + targetVx * 20;
        const predictY = ship.target.y + targetVy * 20;

        // Turn toward predicted position
        const angleToTarget = Math.atan2(predictY - ship.y, predictX - ship.x);
        const angleDiff = this.normalizeAngle(angleToTarget - ship.heading);
        ship.angularVelocity = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.TURN_SPEED);

        // Thrust intermittently
        ship.thrustOn = Math.random() < 0.5;

        // Shoot when aimed at target
        if (Math.abs(angleDiff) < Math.PI / 8 && ship.shootCooldown === 0) {
            this.fireProjectile(ship);
        }
    }

    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }

    fireProjectile(ship) {
        ship.shootCooldown = this.SHOOT_COOLDOWN;

        this.projectiles.push({
            x: ship.x + Math.cos(ship.heading) * ship.size,
            y: ship.y + Math.sin(ship.heading) * ship.size,
            vx: Math.cos(ship.heading) * this.BULLET_SPEED + ship.vx * 0.5,
            vy: Math.sin(ship.heading) * this.BULLET_SPEED + ship.vy * 0.5,
            heading: ship.heading,
            lifetime: this.BULLET_LIFETIME,
            owner: ship
        });
    }

    // Fire a bullet without touching cooldowns — used for mid-burst shots
    spawnBullet(ship) {
        this.projectiles.push({
            x: ship.x + Math.cos(ship.heading) * ship.size,
            y: ship.y + Math.sin(ship.heading) * ship.size,
            vx: Math.cos(ship.heading) * this.BULLET_SPEED + ship.vx * 0.5,
            vy: Math.sin(ship.heading) * this.BULLET_SPEED + ship.vy * 0.5,
            heading: ship.heading,
            lifetime: this.BULLET_LIFETIME,
            owner: ship
        });
    }

    createExplosion(x, y, size) {
        const particleCount = 8 + Math.floor(Math.random() * 8);
        const particles = [];

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
            const speed = 1 + Math.random() * 2;
            particles.push({
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 1 + Math.random() * 2,
                color: Math.random() < 0.5 ? this.colors.accent : this.colors.linkHover
            });
        }

        this.explosions.push({
            x, y,
            particles,
            age: 0,
            lifetime: 40
        });
    }

    // Destroy a ship - create explosion and queue respawn
    destroyShip(ship) {
        // Create big explosion
        this.createExplosion(ship.x, ship.y, ship.size);

        // Queue for respawn
        this.respawnQueue.push({
            type: ship.type,
            timer: this.RESPAWN_DELAY
        });

        // Remove from ships array
        const index = this.ships.indexOf(ship);
        if (index > -1) {
            this.ships.splice(index, 1);
        }
    }

    // Destroy the UFO
    destroyUFO() {
        if (!this.ufo) return;
        this.createExplosion(this.ufo.x, this.ufo.y, this.ufo.size);
        this.ufo = null;
    }

    // Update respawn queue
    updateRespawns() {
        for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
            this.respawnQueue[i].timer--;
            if (this.respawnQueue[i].timer <= 0) {
                // Respawn ship at random location away from other ships/asteroids
                const newShip = this.createShip(this.respawnQueue[i].type);
                // Try to find a safe spawn location
                for (let attempt = 0; attempt < 10; attempt++) {
                    newShip.x = Math.random() * this.width;
                    newShip.y = Math.random() * this.height;
                    let safe = true;
                    // Check distance from other ships
                    for (const ship of this.ships) {
                        const dx = ship.x - newShip.x;
                        const dy = ship.y - newShip.y;
                        if (Math.sqrt(dx * dx + dy * dy) < 100) {
                            safe = false;
                            break;
                        }
                    }
                    // Check distance from asteroids
                    if (safe) {
                        for (const asteroid of this.asteroids) {
                            const dx = asteroid.x - newShip.x;
                            const dy = asteroid.y - newShip.y;
                            if (Math.sqrt(dx * dx + dy * dy) < asteroid.radius + 50) {
                                safe = false;
                                break;
                            }
                        }
                    }
                    if (safe) break;
                }
                this.ships.push(newShip);
                this.respawnQueue.splice(i, 1);
            }
        }
    }

    // Ship-to-ship collision detection
    shipShipCollision() {
        for (let i = 0; i < this.ships.length; i++) {
            for (let j = i + 1; j < this.ships.length; j++) {
                const ship1 = this.ships[i];
                const ship2 = this.ships[j];

                const dx = ship1.x - ship2.x;
                const dy = ship1.y - ship2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = (ship1.size + ship2.size) * 0.7;

                if (dist < minDist && dist > 0) {
                    // Collision! Both ships explode
                    this.destroyShip(ship1);
                    this.destroyShip(ship2);
                    return; // Exit since we modified the array
                }
            }
        }
    }

    updateShips() {
        this.ships.forEach(ship => {
            // Update AI
            this.updateShipAI(ship);

            // Apply angular velocity
            ship.heading += ship.angularVelocity;
            ship.angularVelocity *= 0.95; // Angular drag

            // Apply thrust
            if (ship.thrustOn) {
                ship.vx += Math.cos(ship.heading) * this.THRUST_POWER;
                ship.vy += Math.sin(ship.heading) * this.THRUST_POWER;
            }

            // Apply drag
            ship.vx *= this.DRAG;
            ship.vy *= this.DRAG;

            // Mouse attract/repel (applied after drag so it can overcome drag)
            const { fx, fy } = this.getMouseForce(ship.x, ship.y, 0.7, 0.8);
            ship.vx += fx;
            ship.vy += fy;

            // Clamp to max speed
            const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
            if (speed > this.MAX_SPEED) {
                ship.vx = (ship.vx / speed) * this.MAX_SPEED;
                ship.vy = (ship.vy / speed) * this.MAX_SPEED;
            }

            // Update position
            ship.x += ship.vx;
            ship.y += ship.vy;

            // Wrap around screen (Asteroids style)
            if (ship.x < -50) ship.x = this.width + 50;
            if (ship.x > this.width + 50) ship.x = -50;
            if (ship.y < -50) ship.y = this.height + 50;
            if (ship.y > this.height + 50) ship.y = -50;
        });
    }

    updateProjectiles() {
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];

            // Mouse attract/repel bends bullet trajectories
            const { fx, fy } = this.getMouseForce(proj.x, proj.y, 0.3, 0.4);
            proj.vx += fx;
            proj.vy += fy;

            proj.x += proj.vx;
            proj.y += proj.vy;
            proj.lifetime--;

            // Remove expired projectiles
            if (proj.lifetime <= 0) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Wrap around screen
            if (proj.x < 0) proj.x = this.width;
            if (proj.x > this.width) proj.x = 0;
            if (proj.y < 0) proj.y = this.height;
            if (proj.y > this.height) proj.y = 0;

            // Check collision with ships
            let hitShip = false;
            for (const ship of this.ships) {
                if (ship === proj.owner) continue; // Don't hit self

                const dx = proj.x - ship.x;
                const dy = proj.y - ship.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < ship.size * 0.8) {
                    // Hit! Destroy the ship
                    this.destroyShip(ship);
                    this.projectiles.splice(i, 1);
                    hitShip = true;
                    break;
                }
            }
            if (hitShip) continue;

            // Check collision with UFO (elliptical hitbox)
            if (this.ufo && proj.owner !== this.ufo) {
                if (this.checkUFOCollision(proj.x, proj.y)) {
                    // Hit UFO! Destroy it
                    this.destroyUFO();
                    this.projectiles.splice(i, 1);
                    continue;
                }
            }

            // Check collision with asteroids
            let hitAsteroid = false;
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                const asteroid = this.asteroids[j];
                const dx = proj.x - asteroid.x;
                const dy = proj.y - asteroid.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < asteroid.radius * 0.9) {
                    // Hit asteroid! Split it
                    this.splitAsteroid(asteroid, j);
                    this.projectiles.splice(i, 1);
                    hitAsteroid = true;
                    break;
                }
            }
            if (hitAsteroid) continue;

            // Check collision with particles (scatter them)
            this.particles.forEach(particle => {
                const dx = proj.x - particle.x;
                const dy = proj.y - particle.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 15) {
                    // Push particle away
                    particle.vx += (particle.x - proj.x) * 0.05;
                    particle.vy += (particle.y - proj.y) * 0.05;
                }
            });
        }
    }

    updateExplosions() {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            this.explosions[i].age++;
            if (this.explosions[i].age >= this.explosions[i].lifetime) {
                this.explosions.splice(i, 1);
            }
        }
    }

    // Ships push particles out of their way
    shipParticleInteraction() {
        this.ships.forEach(ship => {
            const interactionRadius = ship.size * 2;

            this.particles.forEach(particle => {
                const dx = particle.x - ship.x;
                const dy = particle.y - ship.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < interactionRadius && dist > 0) {
                    // Push particle away with falloff
                    const force = (1 - dist / interactionRadius) * 0.1;
                    particle.vx += (dx / dist) * force;
                    particle.vy += (dy / dist) * force;
                }
            });
        });
    }

    // Ships and asteroids interact - ship is destroyed on collision
    shipAsteroidInteraction() {
        for (let i = this.ships.length - 1; i >= 0; i--) {
            const ship = this.ships[i];
            for (const asteroid of this.asteroids) {
                const dx = ship.x - asteroid.x;
                const dy = ship.y - asteroid.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = ship.size + asteroid.radius * 0.7;

                if (dist < minDist && dist > 0) {
                    // Collision! Ship is destroyed
                    this.destroyShip(ship);

                    // Give asteroid a small bump
                    if (dist > 0) {
                        const nx = dx / dist;
                        const ny = dy / dist;
                        asteroid.vx -= nx * 0.5;
                        asteroid.vy -= ny * 0.5;
                    }
                    break; // Ship is gone, move to next
                }
            }
        }

        // Also check UFO-asteroid collision (using elliptical hitbox)
        if (this.ufo) {
            for (const asteroid of this.asteroids) {
                if (this.checkUFOCollision(asteroid.x, asteroid.y, asteroid.radius * 0.7)) {
                    this.destroyUFO();
                    break;
                }
            }
        }

        // Check UFO-ship collision (ships can collide with UFO)
        if (this.ufo) {
            for (let i = this.ships.length - 1; i >= 0; i--) {
                const ship = this.ships[i];
                if (this.checkUFOCollision(ship.x, ship.y, ship.size * 0.5)) {
                    // Both UFO and ship are destroyed
                    this.destroyShip(ship);
                    this.destroyUFO();
                    break;
                }
            }
        }
    }

    // Check collision with UFO using proper elliptical hitbox
    // The UFO is drawn as an ellipse: width = size, height = size * 0.4
    checkUFOCollision(x, y, objectRadius = 0) {
        if (!this.ufo) return false;

        const dx = x - this.ufo.x;
        const dy = y - this.ufo.y;

        // UFO dimensions (from drawUFO): ellipse with radiusX = size, radiusY = size * 0.4
        // Add object's radius to expand the hitbox appropriately
        const radiusX = this.ufo.size + objectRadius;
        const radiusY = this.ufo.size * 0.5 + objectRadius; // Slightly larger than visual for better feel

        // Ellipse collision: (dx/radiusX)^2 + (dy/radiusY)^2 <= 1
        const normalizedDist = (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY);
        return normalizedDist <= 1;
    }

    // Asteroids push particles out of their way
    asteroidParticleInteraction() {
        this.asteroids.forEach(asteroid => {
            const interactionRadius = asteroid.radius * 1.5;

            this.particles.forEach(particle => {
                const dx = particle.x - asteroid.x;
                const dy = particle.y - asteroid.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < interactionRadius && dist > 0) {
                    // Push particle away with falloff
                    const force = (1 - dist / interactionRadius) * 0.08;
                    particle.vx += (dx / dist) * force;
                    particle.vy += (dy / dist) * force;
                }
            });
        });
    }

    animate(staticOnly = false) {
        // Clear canvas with background color
        this.ctx.fillStyle = this.colors.bg;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw connections between particles
        this.drawConnections();

        this.updateParticles();
        this.particles.forEach(particle => this.drawParticle(particle));

        // Asteroids game elements only visible in terminal theme
        if (this.currentTheme === 'terminal') {
            // Update interactions
            this.shipParticleInteraction();
            this.asteroidParticleInteraction();
            this.shipAsteroidInteraction();
            this.shipShipCollision();

            // Update respawns
            this.updateRespawns();

            // Update and draw asteroids
            this.updateAsteroids();
            this.asteroids.forEach(asteroid => this.drawAsteroid(asteroid));

            // Update and draw ships
            this.updateShips();
            this.ships.forEach(ship => this.drawShip(ship));

            // Update and draw UFO
            this.updateUFO();
            this.drawUFO();

            // Update and draw projectiles
            this.updateProjectiles();
            this.projectiles.forEach(proj => this.drawProjectile(proj));

            // Update and draw explosions
            this.updateExplosions();
            this.explosions.forEach(exp => this.drawExplosion(exp));
        }

        // Increment time
        this.time++;

        // Stop after first frame if reduced motion is preferred
        if (staticOnly) return;

        // Continue animation
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.particles = [];
        this.ships = [];
        this.asteroids = [];
        this.projectiles = [];
        this.explosions = [];
        this.ufo = null;
        this.respawnQueue = [];
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.canvasAnimation = new RetroParticleAnimation('retroCanvas');
    });
} else {
    window.canvasAnimation = new RetroParticleAnimation('retroCanvas');
}
