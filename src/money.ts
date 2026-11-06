/** Rounds to the nearest cent, halves away from zero. */
export function round2(value: number): number {
  return Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100;
}

export function assertAmount(name: string, value: number): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite number of 0 or more, got ${value}`);
  }
}
