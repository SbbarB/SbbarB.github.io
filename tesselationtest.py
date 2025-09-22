import turtle
import math
import random

# Constants
r3 = 1.7320508075688772  # sqrt(3)
hr3 = 0.8660254037844386  # sqrt(3)/2
SCALE = 20  # Size scaling factor
COLORS = ["#F05A5A", "#0A214C", "#F0E9D9"]  # Red, Navy blue, Beige

def pt(x, y):
    """Create a point object"""
    return {"x": x, "y": y}

def hexPt(x, y):
    """Convert hex coordinates to Cartesian coordinates"""
    return pt(x + 0.5 * y, hr3 * y)

def draw_hat(t, center_x, center_y, rotation, color):
    """Draw a hat shape at specified position with rotation and color"""
    # Define the hat shape based on hexagonal coordinates
    hat_outline = [
        hexPt(0, 0), hexPt(-1, -1), hexPt(0, -2), hexPt(2, -2),
        hexPt(2, -1), hexPt(4, -2), hexPt(5, -1), hexPt(4, 0),
        hexPt(3, 0), hexPt(2, 2), hexPt(0, 3), hexPt(0, 2),
        hexPt(-1, 2)
    ]
    
    # Scale and rotate points
    scaled_points = []
    for p in hat_outline:
        # Scale
        x = p["x"] * SCALE
        y = p["y"] * SCALE
        
        # Rotate
        angle_rad = math.radians(rotation)
        rotated_x = x * math.cos(angle_rad) - y * math.sin(angle_rad)
        rotated_y = x * math.sin(angle_rad) + y * math.cos(angle_rad)
        
        # Translate
        scaled_points.append((rotated_x + center_x, rotated_y + center_y))
    
    # Draw the hat
    t.penup()
    t.goto(scaled_points[0])
    t.pendown()
    t.fillcolor(color)
    t.begin_fill()
    for point in scaled_points:
        t.goto(point)
    t.goto(scaled_points[0])
    t.end_fill()

def create_tessellation(width, height):
    """Create a tessellation pattern similar to the image"""
    screen = turtle.Screen()
    screen.setup(width, height)
    screen.bgcolor("white")
    screen.title("Hat Tessellation Pattern")
    screen.tracer(0)  # Turn off animation for faster drawing
    
    t = turtle.Turtle()
    t.hideturtle()
    t.speed(0)
    t.pensize(1)
    
    # Calculate grid parameters for tessellation
    hat_size = SCALE * 6  # Approximate size of a hat
    cols = int(width / (hat_size * 0.8)) + 2
    rows = int(height / (hat_size * 0.7)) + 2
    
    start_x = -width/2 - hat_size
    start_y = -height/2 - hat_size
    
    # Draw the tessellation
    for row in range(rows):
        for col in range(cols):
            # Calculate position with slight offset for each row
            x = start_x + col * hat_size * 0.8
            y = start_y + row * hat_size * 0.7
            
            # Add some variation to make it look more like the reference
            offset_x = random.uniform(-5, 5)
            offset_y = random.uniform(-5, 5)
            
            # Choose one of three possible rotations (0°, 120°, 240°)
            rotation = random.choice([0, 120, 240])
            
            # Choose a color randomly from the palette
            color = random.choice(COLORS)
            
            # Draw the hat shape
            draw_hat(t, x + offset_x, y + offset_y, rotation, color)
    
    screen.update()
    turtle.done()

# Run the tessellation generator
if __name__ == "__main__":
    create_tessellation(800, 600)