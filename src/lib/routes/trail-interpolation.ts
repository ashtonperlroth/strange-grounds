import { distance, lineSlice, point } from '@turf/turf';
import type { Feature, LineString, Position } from 'geojson';

function reverseLineString(line: LineString): LineString {
  return {
    ...line,
    coordinates: [...line.coordinates].reverse(),
  };
}

export function interpolateAlongTrail(
  from: [number, number],
  to: [number, number],
  trail: Feature<LineString>,
): LineString {
  if (from[0] === to[0] && from[1] === to[1]) {
    return {
      type: 'LineString',
      coordinates: [from, to],
    };
  }

  const startPoint = point(from);
  const endPoint = point(to);
  const sliced = lineSlice(startPoint, endPoint, trail);
  if (sliced.geometry.coordinates.length < 2) {
    return {
      type: 'LineString',
      coordinates: [from, to],
    };
  }

  // lineSlice follows source line orientation; reverse if needed so the
  // resulting segment starts at `from` and ends at `to`.
  const startCoord = sliced.geometry.coordinates[0];
  const dStartToFrom = distance(point(startCoord), startPoint, {
    units: 'meters',
  });
  const dStartToTo = distance(point(startCoord), endPoint, { units: 'meters' });

  if (dStartToFrom <= dStartToTo) {
    return sliced.geometry;
  }

  return reverseLineString(sliced.geometry);
}

export function buildStraightSegment(
  from: Position,
  to: Position,
): LineString {
  return {
    type: 'LineString',
    coordinates: [from, to],
  };
}
