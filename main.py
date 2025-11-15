# =============================================
# 3D GRAVITY SIMULATION ENGINE — RUNNABLE PART 1
# =============================================

import math
import random
import numpy as np
import time


# ---------------------------------------------
#  VECTOR UTILITIES
# ---------------------------------------------

def vec(x=0, y=0, z=0):
    return np.array([float(x), float(y), float(z)], dtype=float)

def mag(v):
    return float(np.linalg.norm(v))

def norm(v):
    m = mag(v)
    return v / m if m != 0 else vec(0, 0, 0)

def limit(v, max_mag):
    m = mag(v)
    if m > max_mag:
        return v * (max_mag / m)
    return v

# ---------------------------------------------
#  BODY CLASSES
# ---------------------------------------------

class Body:
    def __init__(self, x, y, z, vx, vy, vz, mass, radius, color="white"):
        self.position = vec(x, y, z)
        self.velocity = vec(vx, vy, vz)
        self.mass = mass
        self.radius = radius
        self.color = color

    def apply_force(self, f, dt):
        a = f / self.mass
        self.velocity += a * dt

    def update(self, dt):
        self.position += self.velocity * dt

class Planet(Body):
    def __init__(self, x, y, z, vx, vy, vz, mass=6e24):
        super().__init__(x, y, z, vx, vy, vz, mass, radius=6e6, color="lightblue")

class Sun(Body):
    def __init__(self, x, y, z, vx, vy, vz, mass=2e30):
        super().__init__(x, y, z, vx, vy, vz, mass, radius=7e8, color="yellow")

class BlackHole(Body):
    def __init__(self, x, y, z, vx, vy, vz, mass=5e30):
        super().__init__(x, y, z, vx, vy, vz, mass, radius=1e7, color="purple")

# ---------------------------------------------
#  SIMULATION CORE
# ---------------------------------------------

class Simulation:
    def __init__(self):
        self.bodies = []
        self.G = 6.674e-11

    def add_body(self, b):
        self.bodies.append(b)

    def compute_gravity(self):
        n = len(self.bodies)
        forces = [vec(0, 0, 0) for _ in range(n)]

        for i in range(n):
            bi = self.bodies[i]
            for j in range(i + 1, n):
                bj = self.bodies[j]

                r = bj.position - bi.position
                dist = mag(r) + 1e-9
                f_mag = self.G * bi.mass * bj.mass / (dist**2)
                f = norm(r) * f_mag

                forces[i] += f
                forces[j] -= f

        return forces

    def update(self, dt):
        gravity_forces = self.compute_gravity()  # <-- define the correct variable

        for i, b in enumerate(self.bodies):
            b.apply_force(gravity_forces[i], dt)

        for b in self.bodies:
            b.update(dt)


# ======================================================
#  TEST DRIVER (THIS MAKES PART 1 RUNNABLE)
# ======================================================

if __name__ == "__main__":
    sim = Simulation()

    # Add a sun
    sun = Sun(0, 0, 0, 0, 0, 0)
    sim.add_body(sun)

    # Add an Earth-like planet
    earth = Planet(1.5e11, 0, 0, 0, 30000, 0)
    sim.add_body(earth)

    dt = 60 * 60  # one hour per step
    steps = 50    # simulate ~50 hours

    print("Starting simulation...\n")

    for step in range(steps):
        sim.update(dt)

        print(f"Step {step+1}")
        print(f"Earth pos: {earth.position}")
        print(f"Earth vel: {earth.velocity}")
        print("-" * 40)
        time.sleep(0.03)

    print("\nSimulation complete.")
