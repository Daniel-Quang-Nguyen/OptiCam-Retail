import type { Obstacle } from '../types';
import { distToObs } from './geometry';

export const PERSON_FOOTPRINT_RADIUS = 0.28;

export function canPlacePerson(
  x: number,
  y: number,
  roomW: number,
  roomH: number,
  obstacles: Obstacle[]
): boolean {
  const radius = PERSON_FOOTPRINT_RADIUS;
  if (x < radius || y < radius || x > roomW - radius || y > roomH - radius) return false;
  return obstacles.every((obstacle) =>
    obstacle.type === 'entrance' || distToObs(x, y, obstacle) >= radius
  );
}
