'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Stop } from '@/lib/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface RouteMapProps {
  stops: Stop[];
  start: [number, number];
  end: [number, number];
  activeStop?: number;
  onStopClick?: (index: number) => void;
}

const ROUTE_SOURCE_ID = 'route';
const ROUTE_GLOW_ID = 'route-glow';
const ROUTE_LINE_ID = 'route-line';

export default function RouteMap({ stops, start, end, activeStop, onStopClick }: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const requestIdRef = useRef(0);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: start,
      zoom: 6,
      scrollZoom: typeof window !== 'undefined' && window.innerWidth > 768,
    });

    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapInstance.on('load', () => setMapLoaded(true));
    map.current = mapInstance;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, [start]);

  useEffect(() => {
    const mapInstance = map.current;
    if (!mapInstance || !mapLoaded) return;

    const clearRoute = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      if (mapInstance.getLayer(ROUTE_LINE_ID)) mapInstance.removeLayer(ROUTE_LINE_ID);
      if (mapInstance.getLayer(ROUTE_GLOW_ID)) mapInstance.removeLayer(ROUTE_GLOW_ID);
      if (mapInstance.getSource(ROUTE_SOURCE_ID)) mapInstance.removeSource(ROUTE_SOURCE_ID);
    };

    const addStopMarker = (stop: Stop, index: number) => {
      const isEnRoute = stop.stopType === 'en-route';
      const color = isEnRoute ? '#D85A30' : '#378ADD';

      const el = document.createElement('div');
      el.style.cssText = 'width:32px;height:32px;cursor:pointer;';

      const inner = document.createElement('div');
      inner.style.cssText = `
        width:32px;height:32px;border-radius:50%;
        background:${color};color:white;
        display:flex;align-items:center;justify-content:center;
        font-weight:800;font-size:13px;
        border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);
        transition:transform 0.15s;
      `;
      inner.innerHTML = `<span>${index + 1}</span>`;
      el.appendChild(inner);

      const popup = new mapboxgl.Popup({ offset: 28, closeButton: false, closeOnClick: false }).setHTML(
        `<strong style="font-size:13px;color:#1B2D45">${stop.name}</strong><br/><span style="font-size:11px;color:#6b7280">${stop.city}</span>`
      );

      el.addEventListener('mouseenter', () => {
        inner.style.transform = 'scale(1.15)';
        popup.setLngLat([stop.lng, stop.lat]).addTo(mapInstance);
      });
      el.addEventListener('mouseleave', () => {
        inner.style.transform = 'scale(1)';
        popup.remove();
      });
      el.addEventListener('click', () => onStopClick?.(index));

      const marker = new mapboxgl.Marker(el).setLngLat([stop.lng, stop.lat]).addTo(mapInstance);
      markersRef.current.push(marker);
    };

    const drawRoute = async () => {
      clearRoute();

      markersRef.current.push(
        new mapboxgl.Marker({ color: '#1D9E75' })
          .setLngLat(start)
          .setPopup(new mapboxgl.Popup().setText('Start'))
          .addTo(mapInstance)
      );

      markersRef.current.push(
        new mapboxgl.Marker({ color: '#1B2D45' })
          .setLngLat(end)
          .setPopup(new mapboxgl.Popup().setText('End'))
          .addTo(mapInstance)
      );

      stops.forEach(addStopMarker);

      const allPoints = [start, ...stops.map((stop) => [stop.lng, stop.lat] as [number, number]), end];
      const waypoints = allPoints.map((point) => point.join(',')).join(';');
      const requestId = ++requestIdRef.current;

      try {
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`
        );
        const data = await response.json();
        if (requestId !== requestIdRef.current || !map.current || !data.routes?.[0]) return;

        const route = data.routes[0].geometry;
        mapInstance.addSource(ROUTE_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: route },
        });

        mapInstance.addLayer({
          id: ROUTE_GLOW_ID,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#D85A30', 'line-width': 8, 'line-opacity': 0.15 },
        });

        mapInstance.addLayer({
          id: ROUTE_LINE_ID,
          type: 'line',
          source: ROUTE_SOURCE_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#D85A30', 'line-width': 3.5 },
        });

        const coordinates = route.coordinates as [number, number][];
        const bounds = coordinates.reduce(
          (currentBounds, coord) => currentBounds.extend(coord),
          new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
        );

        mapInstance.fitBounds(bounds, {
          padding: { top: 80, bottom: 80, left: 80, right: 80 },
          maxZoom: 12,
          duration: 0,
        });
      } catch {
        // Keep the map usable even if directions fail.
      }
    };

    void drawRoute();
  }, [mapLoaded, stops, start, end, onStopClick]);

  useEffect(() => {
    if (activeStop === undefined || activeStop < 0 || !stops[activeStop] || !map.current) return;

    map.current.flyTo({
      center: [stops[activeStop].lng, stops[activeStop].lat],
      zoom: 12,
      duration: 900,
      essential: true,
    });
  }, [activeStop, stops]);

  return <div ref={mapContainer} className="w-full h-full" style={{ minHeight: '400px' }} />;
}
