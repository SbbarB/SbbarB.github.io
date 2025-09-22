# ar_mini_golf_vscode.py
import cv2
import torch
import numpy as np
import math
import time

# ----------------------------
# CONFIGURATION
# ----------------------------
MAX_HOLES = 9
PAR_VALUES = [3,4,3,5,4,3,4,5,4]
BALL_RADIUS = 15
HOLE_RADIUS = 20
FRICTION = 0.92
VELOCITY_SCALE = 0.5

# ----------------------------
# GAME STATE
# ----------------------------
class Player:
    def __init__(self, name):
        self.name = name
        self.strokes = []
        self.total = 0

class Ball:
    def __init__(self, pos):
        self.x, self.y, self.z = pos
        self.vx = self.vy = self.vz = 0

class Hole:
    def __init__(self, pos):
        self.x, self.y, self.z = pos

game_state = {
    'players': [],
    'current_player': 0,
    'current_hole': 0,
    'ball': None,
    'hole': None,
    'tee': None,
    'objects': [],
    'game_started': False
}

# ----------------------------
# YOLO MODEL
# ----------------------------
model = torch.hub.load('ultralytics/yolov8', 'yolov8n', pretrained=True)

# ----------------------------
# UTILITY FUNCTIONS
# ----------------------------
def estimate_depth(box):
    w, h = box[2]-box[0], box[3]-box[1]
    size = (w+h)/2
    return max(50, 1000/size)

def setup_game(frame, detections):
    # Players = all detected persons
    players = [Player(f"Player {i+1}") for i, det in enumerate(detections) if det['class']=='person']
    if not players:
        players = [Player("Player 1")]
    game_state['players'] = players

    # Objects = everything else (x_center, y_center, z, width, height)
    game_state['objects'] = []
    for det in detections:
        if det['class'] != 'person':
            x = int((det['box'][0]+det['box'][2])/2)
            y = int((det['box'][1]+det['box'][3])/2)
            z = estimate_depth(det['box'])
            w = det['box'][2]-det['box'][0]
            h = det['box'][3]-det['box'][1]
            game_state['objects'].append({'x':x,'y':y,'z':z,'w':w,'h':h,'class':det['class']})

    # Tee and Hole positions (simple initial placement)
    game_state['tee'] = (100, frame.shape[0]-100, 200)
    game_state['hole'] = (frame.shape[1]-150, 100, 200)
    game_state['ball'] = Ball(game_state['tee'])
    game_state['hole'] = Hole(game_state['hole'])
    game_state['game_started'] = True
    game_state['current_hole'] = 1
    game_state['current_player'] = 0

def distance3D(a,b):
    return math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2)

# ----------------------------
# PHYSICS
# ----------------------------
def update_ball():
    ball = game_state['ball']
    if ball is None: return

    # Apply friction
    ball.vx *= FRICTION
    ball.vy *= FRICTION
    ball.vz *= FRICTION

    # Update position
    ball.x += ball.vx
    ball.y += ball.vy
    ball.z += ball.vz

    # Collision with objects
    for obj in game_state['objects']:
        if abs(ball.x - obj['x'])<obj['w']/2 and abs(ball.y - obj['y'])<obj['h']/2:
            ball.vx *= -0.5
            ball.vy *= -0.5

    # Check hole
    if distance3D(ball, game_state['hole']) < HOLE_RADIUS:
        player = game_state['players'][game_state['current_player']]
        player.strokes.append(1)
        player.total += 1
        next_player_or_hole()

def next_player_or_hole():
    # Move to next player or next hole
    if game_state['current_player'] < len(game_state['players'])-1:
        game_state['current_player'] += 1
    else:
        if game_state['current_hole'] < MAX_HOLES:
            game_state['current_hole'] += 1
            game_state['current_player'] = 0
            # Reset tee/hole/ball positions (simple random offset)
            game_state['tee'] = (100+np.random.randint(0,200), 400+np.random.randint(-50,50), 200)
            game_state['hole'] = Hole((500+np.random.randint(0,200), 150+np.random.randint(-50,50), 200))
            game_state['ball'] = Ball(game_state['tee'])
        else:
            print("Game over!")
            for p in game_state['players']:
                print(f"{p.name}: {p.total} strokes")
            game_state['game_started'] = False

# ----------------------------
# RENDER
# ----------------------------
def render(frame):
    # Draw objects
    for obj in game_state['objects']:
        cv2.rectangle(frame,(obj['x']-obj['w']//2,obj['y']-obj['h']//2),(obj['x']+obj['w']//2,obj['y']+obj['h']//2),(0,128,255),2)
        cv2.putText(frame,obj['class'],(obj['x']-obj['w']//2,obj['y']-obj['h']//2-5),cv2.FONT_HERSHEY_SIMPLEX,0.5,(0,255,255),1)

    # Draw hole
    h = game_state['hole']
    cv2.circle(frame,(int(h.x),int(h.y)),HOLE_RADIUS,(0,0,255),-1)

    # Draw ball
    b = game_state['ball']
    if b:
        cv2.circle(frame,(int(b.x),int(b.y)),BALL_RADIUS,(0,255,255),-1)

    # Draw UI
    y = 20
    for i,p in enumerate(game_state['players']):
        text = f"{p.name}: Total {p.total} | Hole {game_state['current_hole']} Strokes {len(p.strokes)}"
        if i == game_state['current_player']:
            text = "-> " + text
        cv2.putText(frame,text,(10,y),cv2.FONT_HERSHEY_SIMPLEX,0.6,(255,255,0),2)
        y += 25

# ----------------------------
# MAIN LOOP
# ----------------------------
def main():
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Cannot open camera")
        return

    setup_done = False

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # YOLO detection
        results = model(frame)
        detections = []
        for det in results.xyxy[0]:
            x1,y1,x2,y2,conf,cls = det
            detections.append({
                'box':[int(x1),int(y1),int(x2),int(y2)],
                'conf': float(conf),
                'class': model.names[int(cls)]
            })

        if not setup_done:
            setup_game(frame, detections)
            setup_done = True

        # Update physics
        if game_state['game_started']:
            update_ball()

        # Render overlay
        render(frame)
        cv2.imshow("AR Mini Golf", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == 27:  # ESC
            break
        elif key == ord(' '):
            # Space = swing ball toward hole
            ball = game_state['ball']
            hole = game_state['hole']
            dx = hole.x - ball.x
            dy = hole.y - ball.y
            dz = hole.z - ball.z
            mag = math.sqrt(dx*dx+dy*dy+dz*dz)
            ball.vx = dx/mag * 20
            ball.vy = dy/mag * 20
            ball.vz = dz/mag * 20

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
