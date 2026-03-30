(function() {
    'use strict';
    
    console.log('Flock script loaded');
    
    const config = {
        particleCount: 40,
        maxSpeed: 1.5,
        cursorAttractionRadius: 350,
        cursorAttractionForce: 0.08,
        cursorAttractionForceMouseDown: 0.3,
        separationRadius: 8,
        separationForce: 0.1,
        cohesionRadius: 150,
        cohesionForce: 0.015,  // Reduced from 0.02 - slightly less pull together
        alignmentRadius: 100,
        alignmentForce: 0.05,
        friction: 0.99
    };

    let particles = [];
    let mouse = { x: 0, y: 0, down: false };
    let container;
    let bounds = { width: 0, height: 0 };
    
    // Abstract particle types
    const shapes = ['dot', 'dash', 'streak', 'smudge', 'wisp', 'mote', 'trace', 'speck'];

    function updateBounds() {
        bounds.width = window.innerWidth;
        bounds.height = window.innerHeight;
        console.log('Bounds updated:', bounds);
    }

    class Particle {
        constructor(x, y) {
            this.x = x !== undefined ? x : Math.random() * bounds.width;
            this.y = y !== undefined ? y : Math.random() * bounds.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.type = shapes[Math.floor(Math.random() * shapes.length)];
            this.size = Math.random() > 0.7 ? 'large' : '';
            this.age = 0;
            
            this.element = document.createElement('div');
            this.element.className = `flock-particle ${this.type} ${this.size}`;
            
            this.element.style.position = 'fixed';
            this.element.style.zIndex = '999999';
            this.element.style.pointerEvents = 'none';
            
            container.appendChild(this.element);
            
            console.log('Created particle:', this.type, 'at', this.x, this.y, 'element:', this.element);
            
            this.updatePosition();
        }

        updatePosition() {
            this.element.style.left = this.x + 'px';
            this.element.style.top = this.y + 'px';
            
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            this.angle = Math.atan2(dy, dx);
            
            const degrees = (this.angle * 180 / Math.PI) + 90;
            this.element.style.transform = `rotate(${degrees}deg)`;
        }

        update() {
            this.age++;
            
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distToMouse = Math.sqrt(dx * dx + dy * dy);

            const attractionRadius = mouse.down ? bounds.width * 2 : config.cursorAttractionRadius;
            const attractionForce = mouse.down ? config.cursorAttractionForceMouseDown : config.cursorAttractionForce;

            if (distToMouse < attractionRadius && distToMouse > 0) {
                const normalizedDist = distToMouse / attractionRadius;
                const force = attractionForce * (1 - normalizedDist * normalizedDist);
                this.vx += (dx / distToMouse) * force;
                this.vy += (dy / distToMouse) * force;
            }

            let separationX = 0, separationY = 0;
            let cohesionX = 0, cohesionY = 0;
            let alignmentX = 0, alignmentY = 0;
            let separationCount = 0;
            let cohesionCount = 0;
            let alignmentCount = 0;

            for (let other of particles) {
                if (other === this) continue;

                const dx = other.x - this.x;
                const dy = other.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < config.separationRadius && dist > 0) {
                    separationX -= dx / dist;
                    separationY -= dy / dist;
                    separationCount++;
                }

                if (dist < config.cohesionRadius) {
                    cohesionX += other.x;
                    cohesionY += other.y;
                    cohesionCount++;
                }

                if (dist < config.alignmentRadius) {
                    alignmentX += other.vx;
                    alignmentY += other.vy;
                    alignmentCount++;
                }
            }

            if (separationCount > 0) {
                this.vx += separationX * config.separationForce;
                this.vy += separationY * config.separationForce;
            }

            if (cohesionCount > 0) {
                cohesionX /= cohesionCount;
                cohesionY /= cohesionCount;
                this.vx += (cohesionX - this.x) * config.cohesionForce;
                this.vy += (cohesionY - this.y) * config.cohesionForce;
            }

            if (alignmentCount > 0) {
                alignmentX /= alignmentCount;
                alignmentY /= alignmentCount;
                this.vx += (alignmentX - this.vx) * config.alignmentForce;
                this.vy += (alignmentY - this.vy) * config.alignmentForce;
            }

            this.vx *= config.friction;
            this.vy *= config.friction;

            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed > config.maxSpeed) {
                this.vx = (this.vx / speed) * config.maxSpeed;
                this.vy = (this.vy / speed) * config.maxSpeed;
            }

            this.x += this.vx;
            this.y += this.vy;

            if (this.x < -20) this.x = bounds.width + 20;
            if (this.x > bounds.width + 20) this.x = -20;
            if (this.y < -20) this.y = bounds.height + 20;
            if (this.y > bounds.height + 20) this.y = -20;

            this.updatePosition();
        }
        
        destroy() {
            this.element.remove();
        }
    }

    function spawnParticle(x, y) {
        if (particles.length >= config.maxParticles) {
            const oldest = particles.shift();
            oldest.destroy();
        }
        
        const particle = new Particle(x, y);
        particles.push(particle);
        console.log('Particle spawned at', x, y, '- Total:', particles.length);
    }

    function init() {
        console.log('Init called, readyState:', document.readyState);
        
        container = document.body;
        if (!container) {
            console.error('Body element not found!');
            return;
        }
        
        console.log('Container:', container);
        
        updateBounds();
        
        mouse.x = bounds.width / 2;
        mouse.y = bounds.height / 2;

        console.log('Creating initial particles...');
        for (let i = 0; i < config.particleCount; i++) {
            particles.push(new Particle());
        }
        console.log('Created', particles.length, 'particles');
        
        if (particles.length > 0) {
            const first = particles[0];
            console.log('First particle computed styles:', window.getComputedStyle(first.element));
        }

        document.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });

        document.addEventListener('mousedown', (e) => {
            mouse.down = true;
            console.log('Mouse down - attracting all particles');
        });

        document.addEventListener('mouseup', (e) => {
            mouse.down = false;
            console.log('Mouse up - normal behavior');
        });

        document.addEventListener('click', (e) => {
            const target = e.target;
            const isClickable = target.tagName === 'A' || 
                              target.tagName === 'BUTTON' || 
                              target.tagName === 'INPUT' ||
                              target.tagName === 'TEXTAREA' ||
                              target.tagName === 'SELECT' ||
                              target.onclick !== null ||
                              target.hasAttribute('onclick') ||
                              window.getComputedStyle(target).cursor === 'pointer';
            
            if (!isClickable) {
                console.log('Click detected at', e.clientX, e.clientY);
                spawnParticle(e.clientX, e.clientY);
            }
        });

        window.addEventListener('resize', () => {
            updateBounds();
        });

        console.log('Starting animation loop...');
        animate();
    }

    function animate() {
        for (let particle of particles) {
            particle.update();
        }
        requestAnimationFrame(animate);
    }

    if (document.readyState === 'loading') {
        console.log('Document still loading, waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', init);
    } else {
        console.log('Document already loaded, initializing immediately');
        init();
    }
})();
