// setup canvas

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const width = (canvas.width = window.innerWidth);
const height = (canvas.height = window.innerHeight);

// function to generate random number

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// function to generate random color

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
    }
  
  

    draw(){
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
        ctx.fill();
    }
    collisionDetect() {
        for (const ball of balls) {
            if (this !== ball) {
                const dx = ball.x - this.x;
                const dy = ball.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
    
                if (distance < this.size + ball.size) {
                    // Calculate angle of collision
                    const angle = Math.atan2(dy, dx);
    
                    // Calculate new velocities using trigonometry
                    const thisVelX = this.velX * Math.cos(angle) + this.velY * Math.sin(angle);
                    const thisVelY = this.velY * Math.cos(angle) - this.velX * Math.sin(angle);
                    const ballVelX = ball.velX * Math.cos(angle) + ball.velY * Math.sin(angle);
                    const ballVelY = ball.velY * Math.cos(angle) - ball.velX * Math.sin(angle);
    
                    // Swap velocities to simulate bouncing off each other
                    this.velX = ballVelX;
                    this.velY = ballVelY;
                    ball.velX = thisVelX;
                    ball.velY = thisVelY;
    
                    // Move balls slightly apart to avoid sticking together
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
      
        this.x += this.velX;
        this.y += this.velY;
      }
      
      

}

const balls = [];

while (balls.length < 25) {
  const size = random(10, 20);
  const ball = new Ball(
    // ball position always drawn at least one ball width
    // away from the edge of the canvas, to avoid drawing errors
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
