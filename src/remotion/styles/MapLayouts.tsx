import React, { useEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, useDelayRender, useVideoConfig, useCurrentFrame, spring, interpolate, Easing } from "remotion";
import maplibregl, { Map } from "maplibre-gl";
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import { DARK_MINT } from "../themes/darkMint";
import type { MapPinData, RouteMapData, LocationListData, ZoomMapData, PanMapData, FlightPathData, PulseMapData } from "../types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.REMOTION_MAPBOX_TOKEN || "";

const getMapStyle = (): maplibregl.StyleSpecification => {
  if (MAPBOX_TOKEN) {
    return {
      version: 8,
      sources: {
        'mapbox-dark': {
          type: 'raster',
          tiles: [
            `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`
          ],
          tileSize: 512,
          attribution: '&copy; Mapbox &copy; OpenStreetMap'
        }
      },
      layers: [
        {
          id: 'mapbox-dark-layer',
          type: 'raster',
          source: 'mapbox-dark',
          minzoom: 0,
          maxzoom: 20
        }
      ]
    };
  }
  return {
    version: 8,
    sources: {
      'carto-dark': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }
    },
    layers: [
      {
        id: 'carto-dark-layer',
        type: 'raster',
        source: 'carto-dark',
        minzoom: 0,
        maxzoom: 20
      }
    ]
  };
};

/* ── WebGL 가용성 체크 ── */
function isWebGLAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('webgl2') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

/* ── 맵 없이 사용하는 정적 배경 (WebGL 폴백) ── */
const StaticMapFallback: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#0d1821" }}>
      {/* Subtle animated grid */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {[...Array(12)].map((_, i) => (
          <React.Fragment key={i}>
            <div style={{
              position: "absolute", top: 0, bottom: 0,
              left: `${(i * 8.33) + (frame * 0.02) % 8.33}%`,
              width: 1, background: "rgba(0,255,136,0.06)",
            }} />
            <div style={{
              position: "absolute", left: 0, right: 0,
              top: `${(i * 8.33) + (frame * 0.015) % 8.33}%`,
              height: 1, background: "rgba(0,255,136,0.06)",
            }} />
          </React.Fragment>
        ))}
      </div>
      {/* Radial glow in center */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(circle at 50% 45%, rgba(0,255,136,0.08) 0%, transparent 60%)",
      }} />
      {children}
    </AbsoluteFill>
  );
};

/* ── 공통: 하단 큰 텍스트 오버레이 ── */
const BigLocationText: React.FC<{ text: string; sub?: string; frame: number; fps: number; delay?: number }> = ({ text, sub, frame, fps, delay = 25 }) => {
  const p = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 70 } });
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      padding: "60px 80px 50px",
      background: "linear-gradient(transparent, rgba(0,0,0,0.85) 40%)",
      opacity: interpolate(p, [0, 1], [0, 1]),
      transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px)`,
    }}>
      <h1 style={{
        fontSize: 64, fontWeight: 900, color: "#ffffff",
        letterSpacing: -1,
        textShadow: `0 0 40px ${DARK_MINT.accent.glow}, 0 4px 20px rgba(0,0,0,0.8)`,
        lineHeight: 1.1,
      }}>{text}</h1>
      {sub && (
        <p style={{
          fontSize: 24, color: DARK_MINT.text.secondary, marginTop: 12, fontWeight: 500,
          textShadow: "0 2px 10px rgba(0,0,0,0.6)",
        }}>{sub}</p>
      )}
    </div>
  );
};

/* ── 공통: 맵 초기화 훅 (WebGL 폴백 포함) ── */
function useMapInit(
  ref: React.RefObject<HTMLDivElement | null>,
  opts: Omit<maplibregl.MapOptions, 'container'>,
  onLoad?: (map: Map) => void,
): { map: Map | null; webglFailed: boolean } {
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender("Loading map..."));
  const [map, setMap] = useState<Map | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    if (!isWebGLAvailable() || !ref.current) {
      setWebglFailed(true);
      continueRender(handle);
      return;
    }

    try {
      const _map = new Map({
        container: ref.current!,
        ...opts,
        interactive: false,
        fadeDuration: 0,
      });

      _map.on("load", () => {
        onLoad?.(_map);
        setMap(_map);
        continueRender(handle);
      });

      _map.on("error", () => {
        setWebglFailed(true);
        continueRender(handle);
      });

      return () => _map.remove();
    } catch {
      setWebglFailed(true);
      continueRender(handle);
    }
  }, [handle, continueRender]);

  return { map, webglFailed };
}

export const MapPin: React.FC<{ data: MapPinData }> = ({ data }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const coords = data.coordinates ? [Number(data.coordinates.lng), Number(data.coordinates.lat)] as [number, number] : [126.9780, 37.5665] as [number, number];

  const { map, webglFailed } = useMapInit(ref, {
    zoom: 3, center: coords, pitch: 60, bearing: 0, style: getMapStyle(),
  }, (_map) => {
    const el = document.createElement('div');
    el.innerHTML = `<div style="font-size: 60px; filter: drop-shadow(0 0 20px ${DARK_MINT.accent.glow})">📍</div>`;
    el.style.transform = 'translate(-50%, -100%)';
    new maplibregl.Marker({ element: el }).setLngLat(coords).addTo(_map);
  });

  useEffect(() => {
    if (!map) return;
    const progress = Math.max(0, Math.min(1, interpolate(frame, [0, 60], [0, 1], { easing: Easing.out(Easing.cubic) })));
    map.jumpTo({ center: coords, zoom: interpolate(progress, [0, 1], [3, 11]), pitch: interpolate(progress, [0, 1], [0, 60]) });
  }, [frame, map, coords]);

  const style: React.CSSProperties = useMemo(() => ({ width, height, position: "absolute" as const }), [width, height]);

  if (webglFailed) {
    return (
      <StaticMapFallback>
        <BigLocationText text={data.location} sub={data.address} frame={frame} fps={fps} delay={15} />
      </StaticMapFallback>
    );
  }

  return (
    <AbsoluteFill style={{ background: DARK_MINT.bg.primary }}>
      <div ref={ref} style={style} />
      <BigLocationText text={data.location} sub={data.address} frame={frame} fps={fps} delay={40} />
    </AbsoluteFill>
  );
};

export const RouteMap: React.FC<{ data: RouteMapData }> = ({ data }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  const routeCoords = useMemo(() => {
    if (data.routeCoordinates && data.routeCoordinates.length >= 2) {
      return data.routeCoordinates.map(c => [Number(c.lng), Number(c.lat)] as [number, number]);
    }
    return [[126.9780, 37.5665], [129.0756, 35.1796]] as [number, number][];
  }, [data.routeCoordinates]);

  const { map, webglFailed } = useMapInit(ref, {
    zoom: 6, center: routeCoords[0], pitch: 45, style: getMapStyle(),
  }, (_map) => {
    _map.addSource('route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: routeCoords } } });
    _map.addLayer({ type: 'line', source: 'route', id: 'line', paint: { 'line-color': DARK_MINT.accent.primary, 'line-width': 6 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
    const startEl = document.createElement('div');
    startEl.innerHTML = `<div style="font-size: 40px">📍</div>`;
    new maplibregl.Marker({ element: startEl }).setLngLat(routeCoords[0]).addTo(_map);
    const endEl = document.createElement('div');
    endEl.innerHTML = `<div style="font-size: 40px">🏁</div>`;
    new maplibregl.Marker({ element: endEl }).setLngLat(routeCoords[routeCoords.length - 1]).addTo(_map);
  });

  useEffect(() => {
    if (!map || !map.getSource('route')) return;
    const progress = Math.max(0, Math.min(1, interpolate(frame, [15, durationInFrames - 30], [0, 1], { easing: Easing.inOut(Easing.cubic) })));
    if (progress > 0) {
      const routeLine = turf.lineString(routeCoords);
      const routeDistance = turf.length(routeLine);
      const currentDistance = Math.max(0.001, routeDistance * progress);
      const slicedLine = turf.lineSliceAlong(routeLine, 0, currentDistance);
      const source = map.getSource('route') as maplibregl.GeoJSONSource;
      source.setData({ type: 'Feature', properties: {}, geometry: slicedLine.geometry });
      const currentPos = slicedLine.geometry.coordinates[slicedLine.geometry.coordinates.length - 1] as [number, number];
      const zoom = interpolate(Math.sin(progress * Math.PI), [0, 1], [6, 4.5]);
      map.jumpTo({ center: currentPos, zoom });
    }
  }, [frame, map, routeCoords, durationInFrames]);

  const style: React.CSSProperties = useMemo(() => ({ width, height, position: "absolute" as const }), [width, height]);
  const subText = [data.distance, data.duration].filter(Boolean).join("  ·  ") || undefined;

  if (webglFailed) {
    return (
      <StaticMapFallback>
        <BigLocationText text={`${data.from}  →  ${data.to}`} sub={subText} frame={frame} fps={fps} delay={15} />
      </StaticMapFallback>
    );
  }

  return (
    <AbsoluteFill style={{ background: DARK_MINT.bg.primary }}>
      <div ref={ref} style={style} />
      <BigLocationText text={`${data.from}  →  ${data.to}`} sub={subText} frame={frame} fps={fps} delay={10} />
    </AbsoluteFill>
  );
};

export const LocationList: React.FC<{ data: LocationListData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProgress = spring({ frame: frame - 4, fps, config: { damping: 20, stiffness: 80 } });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: DARK_MINT.bg.primary, padding: 60 }}>
      {data.title && (
        <h2 style={{ fontSize: 32, fontWeight: 700, color: DARK_MINT.text.primary, marginBottom: 40, opacity: interpolate(titleProgress, [0, 1], [0, 1]) }}>
          {data.title}
        </h2>
      )}
      <div style={{ width: "100%", maxWidth: 450 }}>
        {(data.locations || []).map((loc, i) => {
          const delay = 8 + i * 5;
          const p = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 100 } });
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "16px 20px", background: DARK_MINT.bg.secondary, borderRadius: 12, marginBottom: 12,
              opacity: interpolate(p, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(p, [0, 1], [-20, 0])}px)`,
            }}>
              <span style={{ fontSize: 28 }}>📍</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: DARK_MINT.text.primary }}>{loc.name}</p>
                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                  {loc.type && <span style={{ fontSize: 12, color: DARK_MINT.accent.primary }}>{loc.type}</span>}
                  {loc.distance && <span style={{ fontSize: 12, color: DARK_MINT.text.muted }}>{loc.distance}</span>}
                </div>
              </div>
              {loc.rating && (
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: "#ffd700", fontSize: 14 }}>★</span>
                  <span style={{ fontSize: 14, color: DARK_MINT.text.primary, marginLeft: 4 }}>{loc.rating}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── ZoomMap ── */

export const ZoomMap: React.FC<{ data: ZoomMapData }> = ({ data }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const coords = [Number(data.coordinates.lng), Number(data.coordinates.lat)] as [number, number];
  const color = data.highlightColor || DARK_MINT.accent.primary;

  const { map, webglFailed } = useMapInit(ref, { zoom: 2, center: coords, style: getMapStyle() });

  useEffect(() => {
    if (!map) return;
    const p = Math.max(0, Math.min(1, interpolate(frame, [0, Math.floor(durationInFrames * 0.6)], [0, 1], { easing: Easing.out(Easing.cubic) })));
    map.jumpTo({ center: coords, zoom: interpolate(p, [0, 1], [2, 6]), pitch: interpolate(p, [0, 1], [0, 40]), bearing: interpolate(p, [0, 1], [0, -15]) });
  }, [frame, map, coords, durationInFrames]);

  const style: React.CSSProperties = useMemo(() => ({ width, height, position: "absolute" as const }), [width, height]);
  const flagProgress = spring({ frame: frame - 20, fps, config: { damping: 20, stiffness: 120 } });
  const titleText = `${data.flag || ""} ${data.country}`;

  if (webglFailed) {
    return (
      <StaticMapFallback>
        <BigLocationText text={titleText} sub={data.description} frame={frame} fps={fps} delay={15} />
      </StaticMapFallback>
    );
  }

  return (
    <AbsoluteFill style={{ background: DARK_MINT.bg.primary }}>
      <div ref={ref} style={style} />
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: `translate(-50%, -50%) scale(${interpolate(flagProgress, [0, 1], [0, 1])})`,
        width: 180, height: 180, borderRadius: "50%",
        border: `4px solid ${color}`,
        boxShadow: `0 0 40px ${color}40, inset 0 0 40px ${color}20`,
        opacity: interpolate(flagProgress, [0, 1], [0, 0.8]),
      }} />
      <BigLocationText text={titleText} sub={data.description} frame={frame} fps={fps} delay={30} />
    </AbsoluteFill>
  );
};

/* ── PanMap ── */

export const PanMap: React.FC<{ data: PanMapData }> = ({ data }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const fromCoords = [Number(data.fromCoordinates.lng), Number(data.fromCoordinates.lat)] as [number, number];
  const toCoords = [Number(data.toCoordinates.lng), Number(data.toCoordinates.lat)] as [number, number];

  const { map, webglFailed } = useMapInit(ref, { zoom: 4, center: fromCoords, pitch: 30, style: getMapStyle() }, (_map) => {
    _map.addSource('arrow', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [fromCoords, toCoords] } } });
    _map.addLayer({ type: 'line', source: 'arrow', id: 'arrow-line', paint: { 'line-color': DARK_MINT.accent.primary, 'line-width': 4, 'line-dasharray': [3, 3] }, layout: { 'line-cap': 'round' } });
  });

  useEffect(() => {
    if (!map) return;
    const phase1End = Math.floor(durationInFrames * 0.25);
    const phase2End = Math.floor(durationInFrames * 0.75);
    let center: [number, number], zoom: number, pitch: number;
    if (frame <= phase1End) {
      const p = Math.max(0, Math.min(1, interpolate(frame, [0, phase1End], [0, 1], { easing: Easing.out(Easing.cubic) })));
      center = fromCoords; zoom = interpolate(p, [0, 1], [3, 6]); pitch = interpolate(p, [0, 1], [0, 40]);
    } else if (frame <= phase2End) {
      const p = Math.max(0, Math.min(1, interpolate(frame, [phase1End, phase2End], [0, 1], { easing: Easing.inOut(Easing.cubic) })));
      center = [interpolate(p, [0, 1], [fromCoords[0], toCoords[0]]), interpolate(p, [0, 1], [fromCoords[1], toCoords[1]])];
      zoom = interpolate(Math.sin(p * Math.PI), [0, 1], [6, 4]); pitch = 40;
    } else {
      const p = Math.max(0, Math.min(1, interpolate(frame, [phase2End, durationInFrames], [0, 1], { easing: Easing.out(Easing.cubic) })));
      center = toCoords; zoom = interpolate(p, [0, 1], [4, 7]); pitch = interpolate(p, [0, 1], [40, 50]);
    }
    map.jumpTo({ center, zoom, pitch });
  }, [frame, map, fromCoords, toCoords, durationInFrames]);

  const style: React.CSSProperties = useMemo(() => ({ width, height, position: "absolute" as const }), [width, height]);
  const titleText = `${data.from}  →  ${data.to}`;

  if (webglFailed) {
    return (
      <StaticMapFallback>
        <BigLocationText text={titleText} sub={data.description} frame={frame} fps={fps} delay={15} />
      </StaticMapFallback>
    );
  }

  return (
    <AbsoluteFill style={{ background: DARK_MINT.bg.primary }}>
      <div ref={ref} style={style} />
      <BigLocationText text={titleText} sub={data.description} frame={frame} fps={fps} delay={10} />
    </AbsoluteFill>
  );
};

/* ── FlightPath ── */

export const FlightPath: React.FC<{ data: FlightPathData }> = ({ data }) => {
  const ref = useRef<HTMLDivElement>(null);
  const planeRef = useRef<maplibregl.Marker | null>(null);
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const fromCoords = [Number(data.fromCoordinates.lng), Number(data.fromCoordinates.lat)] as [number, number];
  const toCoords = [Number(data.toCoordinates.lng), Number(data.toCoordinates.lat)] as [number, number];

  const arcCoords = useMemo(() => {
    const line = turf.greatCircle(turf.point(fromCoords), turf.point(toCoords), { npoints: 100 });
    const geom = line.geometry;
    return (geom.type === 'MultiLineString' ? geom.coordinates[0] : geom.coordinates) as [number, number][];
  }, [fromCoords, toCoords]);

  const midLng = (fromCoords[0] + toCoords[0]) / 2;
  const midLat = (fromCoords[1] + toCoords[1]) / 2;

  const { map, webglFailed } = useMapInit(ref, { zoom: 3, center: [midLng, midLat], style: getMapStyle() }, (_map) => {
    _map.addSource('flight', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: arcCoords } } });
    _map.addLayer({ type: 'line', source: 'flight', id: 'flight-line', paint: { 'line-color': DARK_MINT.accent.primary, 'line-width': 4, 'line-opacity': 0.6 }, layout: { 'line-cap': 'round' } });
    _map.addSource('flight-active', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [arcCoords[0]] } } });
    _map.addLayer({ type: 'line', source: 'flight-active', id: 'flight-active-line', paint: { 'line-color': DARK_MINT.accent.primary, 'line-width': 6 }, layout: { 'line-cap': 'round' } });
    const startEl = document.createElement('div');
    startEl.innerHTML = `<div style="width:16px;height:16px;border-radius:50%;background:${DARK_MINT.accent.primary};border:3px solid white"></div>`;
    new maplibregl.Marker({ element: startEl }).setLngLat(fromCoords).addTo(_map);
    const endEl = document.createElement('div');
    endEl.innerHTML = `<div style="width:16px;height:16px;border-radius:50%;background:#ff4444;border:3px solid white"></div>`;
    new maplibregl.Marker({ element: endEl }).setLngLat(toCoords).addTo(_map);
    const planeEl = document.createElement('div');
    planeEl.innerHTML = `<div style="font-size:32px">✈️</div>`;
    planeRef.current = new maplibregl.Marker({ element: planeEl, rotationAlignment: 'map' }).setLngLat(fromCoords).addTo(_map);
  });

  useEffect(() => {
    if (!map || !map.getSource('flight-active') || !planeRef.current) return;
    const progress = Math.max(0, Math.min(1, interpolate(frame, [20, durationInFrames - 20], [0, 1], { easing: Easing.inOut(Easing.cubic) })));
    const idx = Math.min(Math.floor(progress * (arcCoords.length - 1)), arcCoords.length - 2);
    const sliced = arcCoords.slice(0, idx + 2);
    (map.getSource('flight-active') as maplibregl.GeoJSONSource).setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: sliced.length >= 2 ? sliced : [arcCoords[0], arcCoords[0]] } });
    planeRef.current.setLngLat(arcCoords[idx]);
    planeRef.current.setRotation(turf.bearing(turf.point(arcCoords[idx]), turf.point(arcCoords[Math.min(idx + 1, arcCoords.length - 1)])));
    map.jumpTo({ center: arcCoords[idx] as [number, number], zoom: interpolate(Math.sin(progress * Math.PI), [0, 1], [4, 2.5]) });
  }, [frame, map, arcCoords, durationInFrames]);

  const style: React.CSSProperties = useMemo(() => ({ width, height, position: "absolute" as const }), [width, height]);
  const titleText = `${data.from} ✈️ ${data.to}`;
  const subText = [data.distance, data.duration].filter(Boolean).join("  ·  ") || undefined;

  if (webglFailed) {
    return (
      <StaticMapFallback>
        <BigLocationText text={titleText} sub={subText} frame={frame} fps={fps} delay={15} />
      </StaticMapFallback>
    );
  }

  return (
    <AbsoluteFill style={{ background: DARK_MINT.bg.primary }}>
      <div ref={ref} style={style} />
      <BigLocationText text={titleText} sub={subText} frame={frame} fps={fps} delay={10} />
    </AbsoluteFill>
  );
};

/* ── PulseMap ── */

export const PulseMap: React.FC<{ data: PulseMapData }> = ({ data }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const coords = [Number(data.coordinates.lng), Number(data.coordinates.lat)] as [number, number];
  const color = data.highlightColor || DARK_MINT.accent.primary;

  const { map, webglFailed } = useMapInit(ref, { zoom: 4, center: coords, style: getMapStyle() });

  useEffect(() => {
    if (!map) return;
    const p = Math.max(0, Math.min(1, interpolate(frame, [0, 40], [0, 1], { easing: Easing.out(Easing.cubic) })));
    map.jumpTo({ center: coords, zoom: interpolate(p, [0, 1], [2, 5]) });
  }, [frame, map, coords]);

  const style: React.CSSProperties = useMemo(() => ({ width, height, position: "absolute" as const }), [width, height]);
  const pulsePhase = (frame % 40) / 40;
  const pulse2Phase = ((frame + 20) % 40) / 40;
  const pulse3Phase = ((frame + 10) % 40) / 40;

  const pulseRings = (
    <>
      {[pulsePhase, pulse2Phase, pulse3Phase].map((phase, i) => (
        <div key={i} style={{
          position: "absolute", top: "50%", left: "50%",
          transform: `translate(-50%, -50%) scale(${interpolate(phase, [0, 1], [0.3, 3])})`,
          width: 80, height: 80, borderRadius: "50%",
          border: `3px solid ${color}`,
          opacity: interpolate(phase, [0, 0.3, 1], [0, 0.8, 0]),
        }} />
      ))}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 20, height: 20, borderRadius: "50%",
        background: color,
        boxShadow: `0 0 30px ${color}, 0 0 60px ${color}40`,
      }} />
    </>
  );

  if (webglFailed) {
    return (
      <StaticMapFallback>
        {pulseRings}
        <BigLocationText text={data.location} sub={data.description} frame={frame} fps={fps} delay={15} />
      </StaticMapFallback>
    );
  }

  return (
    <AbsoluteFill style={{ background: DARK_MINT.bg.primary }}>
      <div ref={ref} style={style} />
      {pulseRings}
      <BigLocationText text={data.location} sub={data.description} frame={frame} fps={fps} delay={30} />
    </AbsoluteFill>
  );
};
