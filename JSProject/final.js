const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const width = (canvas.width = window.innerWidth);
const height = (canvas.height = window.innerHeight);

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomRGB() {
    return `rgb(${random(0, 255)},${random(0, 255)},${random(0, 255)})`;
}

class Ball {
    constructor(x, y, velX, velY, color, size) {
        this.x = x;
        this.y = y;
        this.velX = velX;
        this.velY = velY;
        this.color = color;
        this.size = size;
        this.volume = random(1, 25); 
        this.tail = []; 
        this.tailLength = 65;
    }
  
    draw(){
        for (let i = 0; i < this.tail.length; i++) {
            const alpha = (i + 1) / this.tail.length; // Fade out effect
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.tail[i].x, this.tail[i].y, this.size * (1 - alpha), 0, 2 * Math.PI);
            ctx.fill();
        }

        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(this.volume, this.x - 6, this.y + 4);

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 6;
        ctx.stroke();

        this.tail.unshift({ x: this.x, y: this.y }); // Add current position to tail
        if (this.tail.length > this.tailLength) {
            this.tail.pop(); // Remove oldest point if tail is too long
        }
    }

    collisionDetect() {
        for (const ball of balls) {
            if (this !== ball) {
                const dx = ball.x - this.x;
                const dy = ball.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
    
                if (distance < this.size + ball.size) {
                    const angle = Math.atan2(dy, dx);
    
                    const thisVelX = this.velX * Math.cos(angle) + this.velY * Math.sin(angle);
                    const thisVelY = this.velY * Math.cos(angle) - this.velX * Math.sin(angle);
                    const ballVelX = ball.velX * Math.cos(angle) + ball.velY * Math.sin(angle);
                    const ballVelY = ball.velY * Math.cos(angle) - ball.velX * Math.sin(angle);
    
                    this.velX = ballVelX;
                    this.velY = ballVelY;
                    ball.velX = thisVelX;
                    ball.velY = thisVelY;
    
                    const overlap = this.size + ball.size - distance;
                    const moveX = overlap * Math.cos(angle);
                    const moveY = overlap * Math.sin(angle);
                    this.x -= moveX / 2;
                    this.y -= moveY / 2;
                    ball.x += moveX / 2;
                    ball.y += moveY / 2;
                }
            }
        }
    }

    update() {
        if ((this.x + this.size) >= width) {
          this.velX = -(this.velX);
        }
      
        if ((this.x - this.size) <= 0) {
          this.velX = -(this.velX);
        }
      
        if ((this.y + this.size) >= height) {
          this.velY = -(this.velY);
        }
      
        if ((this.y - this.size) <= 0) {
          this.velY = -(this.velY);
        }
      
        this.x += this.velX/1.5; 
        this.y += this.velY/1.5; 
    }
}

const balls = [];

while (balls.length < 25) {
    const size = random(20, 35);
    const ball = new Ball(
        random(0 + size, width - size),
        random(0 + size, height - size),
        random(-7, 7),
        random(-7, 7),
        randomRGB(),
        size,
    );

    balls.push(ball);
}

function loop() {
    ctx.fillStyle = "rgb(0 0 0 / 25%)";
    ctx.fillRect(0, 0, width, height);
  
    for (const ball of balls) {
        ball.draw();
        ball.update();
        ball.collisionDetect();
    }
  
    requestAnimationFrame(loop);
}

loop();

canvas.addEventListener('click', function(event) {
    const x = event.clientX;
    const y = event.clientY;

    for (const ball of balls) {
        const dx = x - ball.x;
        const dy = y - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= ball.size) {
            document.querySelector('h1').textContent = `VOLUME: ${ball.volume}`;
            break;
        }
    }
});