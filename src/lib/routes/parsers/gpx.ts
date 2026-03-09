import { XMLParser } from 'fast-xml-parser';
import * as toGeoJSON from '@tmcw/togeojson';
import type { FeatureCollection, Geometry, LineString, MultiLineString } from 'geojson';

export type ParsedRoute = {
  name: string;
  description?: string;
  coordinates: [number, number, number?][];
  totalDistance: number;
  elevationGain: number;
  elevationLoss: number;
};

const XML_OPTIONS = {
  ignoreAttributes: false,
  trimValues: true,
};

const EARTH_RADIUS_M = 6371008.8;

function stripFileExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').trim();
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceMeters(
  a: [number, number],
  b: [number, number],
): number {
  const dLat = toRadians(b[1] - a[1]);
  const dLng = toRadians(b[0] - a[0]);
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function getCoordinatesFromGeometry(
  geometry: Geometry,
): [number, number, number?][][] {
  if (geometry.type === 'LineString') {
    const line = geometry as LineString;
    return [line.coordinates.map((coord) => normalizeCoordinate(coord))];
  }

  if (geometry.type === 'MultiLineString') {
    const multiline = geometry as MultiLineString;
    return multiline.coordinates.map((segment) =>
      segment.map((coord) => normalizeCoordinate(coord)),
    );
  }

  return [];
}

function normalizeCoordinate(coord: number[]): [number, number, number?] {
  const lng = Number(coord[0]);
  const lat = Number(coord[1]);
  const ele = Number(coord[2]);

  if (
    !Number.isFinite(lng) ||
    !Number.isFinite(lat) ||
    lng < -180 ||
    lng > 180 ||
    lat < -90 ||
    lat > 90
  ) {
    throw new Error('Track contains invalid coordinates');
  }

  if (Number.isFinite(ele)) {
    return [lng, lat, ele];
  }

  return [lng, lat];
}

function mergeSegments(
  segments: [number, number, number?][][],
): [number, number, number?][] {
  const merged: [number, number, number?][] = [];

  for (const segment of segments) {
    for (const coord of segment) {
      const prev = merged[merged.length - 1];
      if (
        prev &&
        prev[0] === coord[0] &&
        prev[1] === coord[1] &&
        (prev[2] ?? null) === (coord[2] ?? null)
      ) {
        continue;
      }
      merged.push(coord);
    }
  }

  return merged;
}

function computeTrackStats(
  coordinates: [number, number, number?][],
): Pick<ParsedRoute, 'totalDistance' | 'elevationGain' | 'elevationLoss'> {
  let totalDistance = 0;
  let elevationGain = 0;
  let elevationLoss = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const current = coordinates[index];
    totalDistance += haversineDistanceMeters(
      [previous[0], previous[1]],
      [current[0], current[1]],
    );

    const prevEle = previous[2];
    const currEle = current[2];
    if (typeof prevEle === 'number' && typeof currEle === 'number') {
      const delta = currEle - prevEle;
      if (delta > 0) {
        elevationGain += delta;
      } else if (delta < 0) {
        elevationLoss += Math.abs(delta);
      }
    }
  }

  return { totalDistance, elevationGain, elevationLoss };
}

function parseXmlObject(xml: string): Record<string, unknown> {
  const parser = new XMLParser(XML_OPTIONS);
  const parsed = parser.parse(xml) as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Unable to parse XML file');
  }
  return parsed;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

function getStringValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractGpxMetadata(
  gpxObject: Record<string, unknown>,
): { name: string | null; description: string | null } {
  const gpx = (gpxObject.gpx ?? null) as Record<string, unknown> | null;
  if (!gpx) return { name: null, description: null };

  const metadata = (gpx.metadata ?? null) as Record<string, unknown> | null;
  const trackEntries = toArray(gpx.trk as Record<string, unknown> | Record<string, unknown>[] | null);

  const metadataName = getStringValue(metadata?.name);
  const metadataDescription =
    getStringValue(metadata?.desc) ?? getStringValue(metadata?.description);
  const firstTrack = trackEntries[0];
  const trackName = getStringValue(firstTrack?.name);
  const trackDescription = getStringValue(firstTrack?.desc);

  return {
    name: metadataName ?? trackName,
    description: metadataDescription ?? trackDescription,
  };
}

function extractKmlMetadata(
  kmlObject: Record<string, unknown>,
): { name: string | null; description: string | null } {
  const kmlRoot = (kmlObject.kml ?? null) as Record<string, unknown> | null;
  if (!kmlRoot) return { name: null, description: null };

  const documentNode = (kmlRoot.Document ?? null) as Record<string, unknown> | null;
  const placemarkNodes = toArray(
    documentNode?.Placemark as Record<string, unknown> | Record<string, unknown>[] | null,
  );
  const firstPlacemark = placemarkNodes[0];

  return {
    name:
      getStringValue(documentNode?.name) ??
      getStringValue(firstPlacemark?.name),
    description:
      getStringValue(documentNode?.description) ??
      getStringValue(firstPlacemark?.description),
  };
}

function extractTrackCoordinates(
  featureCollection: FeatureCollection<Geometry | null>,
): [number, number, number?][] {
  const segments: [number, number, number?][][] = [];

  for (const feature of featureCollection.features) {
    if (!feature.geometry) continue;
    const geometrySegments = getCoordinatesFromGeometry(feature.geometry);
    for (const segment of geometrySegments) {
      if (segment.length > 0) {
        segments.push(segment);
      }
    }
  }

  const merged = mergeSegments(segments);
  if (merged.length < 2) {
    throw new Error('No valid track segments found in file');
  }
  return merged;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function extractGpxCoordinatesFromXml(
  xmlObject: Record<string, unknown>,
): [number, number, number?][] {
  const gpx = asRecord(xmlObject.gpx);
  if (!gpx) return [];

  const tracks = toArray(gpx.trk as unknown);
  const merged: [number, number, number?][] = [];

  for (const track of tracks) {
    const trackRecord = asRecord(track);
    const segments = toArray(trackRecord?.trkseg as unknown);
    for (const segment of segments) {
      const segmentRecord = asRecord(segment);
      const points = toArray(segmentRecord?.trkpt as unknown);
      for (const point of points) {
        const pointRecord = asRecord(point);
        if (!pointRecord) continue;
        const lat = toFiniteNumber(pointRecord['@_lat']);
        const lng = toFiniteNumber(pointRecord['@_lon']);
        if (lat == null || lng == null) continue;
        const ele = toFiniteNumber(pointRecord.ele);
        merged.push(
          ele == null ? [lng, lat] : [lng, lat, ele],
        );
      }
    }
  }

  return mergeSegments([merged]);
}

function collectCoordinateStrings(node: unknown, out: string[]): void {
  if (node == null) return;
  if (typeof node === 'string') {
    if (node.includes(',')) out.push(node);
    return;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      collectCoordinateStrings(child, out);
    }
    return;
  }

  const record = asRecord(node);
  if (!record) return;
  for (const [key, value] of Object.entries(record)) {
    if (key === 'coordinates' && typeof value === 'string') {
      out.push(value);
    } else if (key === 'gx:coord') {
      if (typeof value === 'string') {
        out.push(value.replace(/\s+/g, ','));
      } else if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'string') {
            out.push(item.replace(/\s+/g, ','));
          }
        });
      }
    } else {
      collectCoordinateStrings(value, out);
    }
  }
}

function extractKmlCoordinatesFromXml(
  xmlObject: Record<string, unknown>,
): [number, number, number?][] {
  const kmlRoot = asRecord(xmlObject.kml);
  if (!kmlRoot) return [];

  const coordinateStrings: string[] = [];
  collectCoordinateStrings(kmlRoot, coordinateStrings);
  const coordinates: [number, number, number?][] = [];

  for (const coordinateString of coordinateStrings) {
    const tokens = coordinateString
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
    for (const token of tokens) {
      const [lngRaw, latRaw, eleRaw] = token.split(',');
      const lng = toFiniteNumber(lngRaw);
      const lat = toFiniteNumber(latRaw);
      if (lng == null || lat == null) continue;
      const ele = toFiniteNumber(eleRaw);
      coordinates.push(ele == null ? [lng, lat] : [lng, lat, ele]);
    }
  }

  return mergeSegments([coordinates]);
}

function parseXmlDocument(xml: string): Document | null {
  if (typeof DOMParser === 'undefined') {
    return null;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const parserErrors = doc.getElementsByTagName('parsererror');
  if (parserErrors.length > 0) {
    throw new Error('Invalid XML file');
  }
  return doc;
}

function parseCommon(
  file: File,
  xml: string,
  format: 'gpx' | 'kml',
): ParsedRoute {
  const xmlObject = parseXmlObject(xml);
  const doc = parseXmlDocument(xml);
  const metadata =
    format === 'gpx'
      ? extractGpxMetadata(xmlObject)
      : extractKmlMetadata(xmlObject);

  const coordinates =
    doc !== null
      ? extractTrackCoordinates(
          format === 'gpx' ? toGeoJSON.gpx(doc) : toGeoJSON.kml(doc),
        )
      : format === 'gpx'
        ? extractGpxCoordinatesFromXml(xmlObject)
        : extractKmlCoordinatesFromXml(xmlObject);

  if (coordinates.length < 2) {
    throw new Error('No valid track segments found in file');
  }

  const stats = computeTrackStats(coordinates);
  const fallbackName = stripFileExtension(file.name) || 'Imported route';

  return {
    name: metadata.name ?? fallbackName,
    description: metadata.description ?? undefined,
    coordinates,
    totalDistance: stats.totalDistance,
    elevationGain: stats.elevationGain,
    elevationLoss: stats.elevationLoss,
  };
}

export async function parseGPX(file: File): Promise<ParsedRoute> {
  const xml = await file.text();
  if (!xml.trim()) {
    throw new Error('GPX file is empty');
  }
  return parseCommon(file, xml, 'gpx');
}

export async function parseKML(file: File): Promise<ParsedRoute> {
  const xml = await file.text();
  if (!xml.trim()) {
    throw new Error('KML file is empty');
  }
  return parseCommon(file, xml, 'kml');
}
