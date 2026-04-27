import time
import numpy as np
from collections import deque

class RasenganDetector:
    # Thresholds (normalized landmark coordinates, ~0-1 range)
    WRIST_CLOSE = 0.18        # wrists must be within this to enter FORMING
    WRIST_FAR   = 0.25        # wrists beyond this → reset
    HOLD_TIME   = 1.2         # seconds of holding hands together → CHAKRA_READY
    SPIN_ANGULAR = 1.5        # angular change threshold for spin shortcut
    SPIN_TIME    = 0.8        # seconds of spinning → CHAKRA_READY

    def __init__(self):
        self.state = "IDLE"
        self.center_history = deque(maxlen=20)
        self.angle_history = deque(maxlen=20)
        self.start_time = None

    def reset(self):
        self.state = "IDLE"
        self.center_history.clear()
        self.angle_history.clear()
        self.start_time = None

    def update(self, left_hand, right_hand):
        if left_hand is None or right_hand is None:
            self.reset()
            return "IDLE"

        lw = np.array([left_hand[0].x, left_hand[0].y])
        rw = np.array([right_hand[0].x, right_hand[0].y])
        wrist_dist = np.linalg.norm(lw - rw)

        center = (lw + rw) / 2
        self.center_history.append(center)

        # Compute angular change if we have enough history
        angular_change = 0.0
        if len(self.center_history) >= 5:
            v = self.center_history[-1] - self.center_history[-5]
            angle = np.arctan2(v[1], v[0])
            self.angle_history.append(angle)

            if len(self.angle_history) >= 8:
                for i in range(1, len(self.angle_history)):
                    delta = self.angle_history[i] - self.angle_history[i - 1]
                    delta = (delta + np.pi) % (2 * np.pi) - np.pi
                    angular_change += abs(delta)

        # State machine 
        if self.state == "IDLE":
            if wrist_dist < self.WRIST_CLOSE:
                self.state = "FORMING"
                self.start_time = time.time()

        elif self.state == "FORMING":
            if wrist_dist > self.WRIST_FAR:
                self.reset()
                return self.state
            elapsed = time.time() - self.start_time
            # Fast path: spinning motion detected → jump to SPINNING
            if angular_change > self.SPIN_ANGULAR:
                self.state = "SPINNING"
                self.start_time = time.time()
            # Slow path: just hold hands together long enough
            elif elapsed > self.HOLD_TIME:
                self.state = "CHAKRA_READY"

        elif self.state == "SPINNING":
            if wrist_dist > self.WRIST_FAR:
                self.reset()
                return self.state

            if time.time() - self.start_time > self.SPIN_TIME:
                self.state = "CHAKRA_READY"

        return self.state
    