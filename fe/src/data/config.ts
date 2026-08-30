// Powerup config (F3, BR-I1)
export const POWERUPS = {
  star: { durationS: 5 },
  speed: { durationS: 8, mult: 1.5 },
  doubleJump: { durationS: 10 },
  maxHearts: 3,
} as const;

// Physics (BR-C1, BA §2.2)
export const PHYS = {
  gravity: 900,
  moveAccel: 420,
  maxSpeedX: 200,
  jumpVel: -400,
  coyoteMs: 100,   // AC-02
  bufferMs: 120,   // AC-03
  iFrameS: 2,      // AC-06/07
} as const;
