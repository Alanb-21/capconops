// Deterministic pseudo-random helpers. Every run of the demo produces the
// exact same seed data.

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed: number) {
  const r = mulberry32(seed);
  return {
    next: r,
    int(min: number, max: number) {
      return Math.floor(r() * (max - min + 1)) + min;
    },
    float(min: number, max: number) {
      return r() * (max - min) + min;
    },
    pick<T>(arr: readonly T[]): T {
      return arr[Math.floor(r() * arr.length)];
    },
    chance(p: number) {
      return r() < p;
    },
    shuffle<T>(arr: T[]): T[] {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

export type Rng = ReturnType<typeof makeRng>;
