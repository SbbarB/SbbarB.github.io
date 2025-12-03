/**
 * Gravitational Physics System for Portfolio Cards
 * Implements magnetic cursor attraction, parallax, and micro-physics
 */

class PhysicsCard {
    constructor(element, index) {
        this.element = element;
        this.index = index;

        // Get initial position
        const rect = element.getBoundingClientRect();
        this.restX = rect.left + rect.width / 2;
        this.restY = rect.top + rect.height / 2;

        // Current position
        this.x = this.restX;
        this.y = this.restY;

        // Velocity
        this.vx = 0;
        this.vy = 0;

        // Physics properties
        this.mass = 1 + Math.random() * 0.5;
        this.damping = 0.85;
        this.springStrength = 0.02;
        this.maxVelocity = 3;

        // Gravitational influence
        this.gravitationalRadius = 300;
        this.gravitationalStrength = 0.5;

        // Parallax depth
        this.depth = 0.5 + Math.random() * 0.5; // 0.5 to 1.0

        // Rotation
        this.rotation = 0;
        this.rotationVelocity = 0;

        // Scale
        this.scale = 1;
        this.targetScale = 1;

        // Initialize transform
        this.updateTransform();
    }

    applyForce(fx, fy) {
        this.vx += fx / this.mass;
        this.vy += fy / this.mass;
    }

    gravitateTo(targetX, targetY, strength = 1) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.gravitationalRadius && distance > 10) {
            // Inverse square law (softened)
            const force = (this.gravitationalStrength * strength) / (distance * 0.01);
            const forceX = (dx / distance) * force;
            const forceY = (dy / distance) * force;

            this.applyForce(forceX, forceY);
        }
    }

    repelFrom(targetX, targetY, strength = 1) {
        const dx = this.x - targetX;
        const dy = this.y - targetY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150 && distance > 10) {
            const force = (strength * 2) / (distance * 0.01);
            const forceX = (dx / distance) * force;
            const forceY = (dy / distance) * force;

            this.applyForce(forceX, forceY);
        }
    }

    applySpring() {
        // Spring force back to rest position
        const dx = this.restX - this.x;
        const dy = this.restY - this.y;

        this.applyForce(dx * this.springStrength, dy * this.springStrength);
    }

    update() {
        // Apply spring force
        this.applySpring();

        // Apply damping
        this.vx *= this.damping;
        this.vy *= this.damping;

        // Clamp velocity
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.maxVelocity) {
            this.vx = (this.vx / speed) * this.maxVelocity;
            this.vy = (this.vy / speed) * this.maxVelocity;
        }

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Update rotation based on velocity
        this.rotationVelocity = this.vx * 0.1;
        this.rotation += this.rotationVelocity;
        this.rotation *= 0.95; // Dampen rotation

        // Update scale
        this.scale += (this.targetScale - this.scale) * 0.1;

        // Update DOM
        this.updateTransform();
    }

    updateTransform() {
        const offsetX = this.x - this.restX;
        const offsetY = this.y - this.restY;

        this.element.style.transform = `
            translate(${offsetX}px, ${offsetY}px)
            rotate(${this.rotation}deg)
            scale(${this.scale})
        `;
    }

    updateRestPosition() {
        const rect = this.element.getBoundingClientRect();
        this.restX = rect.left + rect.width / 2 - (this.x - this.restX);
        this.restY = rect.top + rect.height / 2 - (this.y - this.restY);
    }
}

class PhysicsSystem {
    constructor() {
        this.cards = [];
        this.mouse = { x: 0, y: 0 };
        this.isMouseDown = false;
        this.scrollY = 0;
        this.mode = 'attract'; // 'attract' or 'repel'

        this.init();
    }

    init() {
        // Track mouse
        document.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        document.addEventListener('mousedown', () => {
            this.isMouseDown = true;
            this.mode = 'repel';
        });

        document.addEventListener('mouseup', () => {
            this.isMouseDown = false;
            this.mode = 'attract';
        });

        // Track scroll
        window.addEventListener('scroll', () => {
            this.scrollY = window.scrollY;
        });

        // Track resize
        window.addEventListener('resize', () => {
            this.cards.forEach(card => card.updateRestPosition());
        });

        // Start animation loop
        this.animate();
    }

    addCard(element, index) {
        const card = new PhysicsCard(element, index);
        this.cards.push(card);
        return card;
    }

    addCards(elements) {
        elements.forEach((el, i) => this.addCard(el, i));
    }

    clearCards() {
        this.cards = [];
    }

    animate() {
        // Update all cards
        this.cards.forEach(card => {
            // Apply gravitational or repelling force from mouse
            if (this.mode === 'attract') {
                card.gravitateTo(this.mouse.x, this.mouse.y + this.scrollY);
            } else {
                card.repelFrom(this.mouse.x, this.mouse.y + this.scrollY, 2);
            }

            // Card-to-card interactions (subtle)
            this.cards.forEach(otherCard => {
                if (card !== otherCard) {
                    const dx = otherCard.x - card.x;
                    const dy = otherCard.y - card.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Gentle repulsion between cards
                    if (distance < 100) {
                        card.repelFrom(otherCard.x, otherCard.y, 0.1);
                    }
                }
            });

            card.update();
        });

        requestAnimationFrame(() => this.animate());
    }
}

// Create global physics system
window.physicsSystem = new PhysicsSystem();
