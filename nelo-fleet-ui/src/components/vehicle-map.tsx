import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon issue with Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function RecenterMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const newPosition = L.latLng(latitude, longitude);
    
    // Check if this is actually a new position
    if (lastPositionRef.current) {
      const lastPosition = L.latLng(lastPositionRef.current.lat, lastPositionRef.current.lng);
      const distance = lastPosition.distanceTo(newPosition);
      
      // Only update if the distance is greater than 50 meters to avoid constant jitter
      if (distance > 50) {
        map.flyTo(newPosition, map.getZoom(), {
          duration: 1,
          easeLinearity: 0.25
        });
        lastPositionRef.current = { lat: latitude, lng: longitude };
      }
    } else {
      // First time - just set the view without animation
      map.setView(newPosition, map.getZoom());
      lastPositionRef.current = { lat: latitude, lng: longitude };
    }
  }, [latitude, longitude, map]);
  
  return null;
}

export default function VehicleMap({ longitude, latitude }: { longitude: number; latitude: number }) {
  // Use provided coordinates or default to Cape Town
  const defaultLocation: [number, number] = [-33.9249, 18.4241];
  
  // Determine the location to display
  const hasValidCoords = latitude !== 0 && longitude !== 0;
  
  // Memoize vehicleLocation to prevent unnecessary re-renders
  const vehicleLocation: [number, number] = useMemo(
    () => hasValidCoords ? [latitude, longitude] : defaultLocation,
    [latitude, longitude, hasValidCoords]
  );

  return (
    <div style={{ height: '100%', width: '100%' }} className='flex flex-col  flex-grow h-full w-full'>
      <MapContainer
        center={vehicleLocation}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={vehicleLocation}>
          <Popup>
            {hasValidCoords ? 'Vehicle location' : 'Default location (no GPS data)'}
          </Popup>
        </Marker>
        <RecenterMap latitude={vehicleLocation[0]} longitude={vehicleLocation[1]} />
      </MapContainer>
    </div>
  );
}

