'use client';

import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Stop } from '@/lib/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface RouteMapProps {
  stops: Stop[];
  start: [number, number]; // [lng, lat]
  end: [number, number];
  activeStop?: number;
  onStopClick?: (index: number) => void;
}

export default function RouteMap({ stops, start, end, activeStop, onStopClick }: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: start,
      zoom: 6,
      scrollZoom: typeof window !== 'undefined' && window.innerWidth > 768,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      // Build waypoints for the route
      const allPoints = [start, ...stops.map((s) => [s.lng, s.lat] as [number, number]), end];
      const waypoints = allPoints.map((p) => p.join(',')).join(';');

      // Fetch driving route from Mapbox Directions API
      fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (!data.routes?.[0]) return;

          const route = data.routes[0].geometry;

          // Draw route line
          map.current!.addSource('route', {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: route },
          });

          // Route glow
          map.current!.addLayer({
            id: 'route-glow',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#D85A30', 'line-width': 8, 'line-opacity': 0.15 },
          });

          // Route line
          map.current!.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#D85A30', 'line-width': 3.5 },
          });

          // Fit map to route bounds
          const coordinates = route.coordinates as [number, number][];
          const bounds = coordinates.reduce(
            (b, coord) => b.extend(coord),
            new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
          );
          map.current!.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 80, right: 80 }, maxZoom: 12 });
        });

      // Start marker (green)
      new mapboxgl.Marker({ color: '#1D9E75' }).setLngLat(start).setPopup(new mapboxgl.Popup().setText('Start')).addTo(map.current!);

      // End marker (navy)
      new mapboxgl.Marker({ color: '#1B2D45' }).setLngLat(end).setPopup(new mapboxgl.Popup().setText('End')).addTo(map.current!);

      // Stop markers (coral with numbers)
      stops.forEach((stop, index) => {
        const el = document.createElement('div');
        el.style.cssText = `
          width: 32px; height: 32px; border-radius: 50%;
          background: #D85A30; color: white;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 13px; cursor: pointer;
          border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          transition: transform 0.2s;
        `;
        el.innerHTML = `<span>${index + 1}</span>`;
        el.addEventListener('mouseenter', () => (el.style.transform = 'scale(1.2)'));
        el.addEventListener('mouseleave', () => (el.style.transform = 'scale(1)'));
        el.addEventListener('click', () => onStopClick?.(index));

        const marker = new mapboxgl.Marker(el)
          .setLngLat([stop.lng, stop.lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>${stop.name}</strong><br/>${stop.city}`))
          .addTo(map.current!);

        markersRef.current.push(marker);
      });
    });

    return () => map.current?.remove();
  }, [stops, start, end]);

  // Fly to active stop
  useEffect(() => {
    if (activeStop !== undefined && stops[activeStop] && map.current) {
      map.current.flyTo({
        center: [stops[activeStop].lng, stops[activeStop].lat],
        zoom: 12,
        duration: 1200,
      });
    }
  }, [activeStop, stops]);

  return <div ref={mapContainer} className="w-full h-full" style={{ minHeight: '400px' }} />;
}
