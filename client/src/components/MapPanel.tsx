import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Radio } from "lucide-react";

export interface RideMapData {
  id: string;
  status: string;
  demoMode: number;
  pickup: string;
  dropoff: string;
  pickupLat: number | null;
  pickupLng: number | null;
  locationLat: number | null;
  locationLng: number | null;
  locationUpdatedAt: Date | string | null;
}

interface MapPanelProps {
  pickup: string;
  dropoff: string;
  pickupCoordinates: { lat: number; lng: number } | null;
  ride: RideMapData | null;
  centerRequest: number;
}

const pickupIcon = L.divIcon({
  className: "osm-marker-icon",
  html: '<span class="osm-marker osm-marker-pickup">P</span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const driverIcon = L.divIcon({
  className: "osm-marker-icon",
  html: '<span class="osm-marker osm-marker-driver"><span></span></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const defaultCenter: L.LatLngExpression = [20, 0];

export default function MapPanel({ pickup, dropoff, pickupCoordinates, ride, centerRequest }: MapPanelProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return;
    const initialPosition = pickupCoordinates ?? (
      ride?.pickupLat != null && ride.pickupLng != null
        ? { lat: ride.pickupLat, lng: ride.pickupLng }
        : null
    );
    const map = L.map(mapElement.current, {
      center: initialPosition ?? defaultCenter,
      zoom: initialPosition ? 15 : 2,
      zoomControl: true,
      scrollWheelZoom: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      pickupMarkerRef.current = null;
      driverMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pickupPosition = pickupCoordinates ?? (
      ride?.pickupLat != null && ride.pickupLng != null
        ? { lat: ride.pickupLat, lng: ride.pickupLng }
        : null
    );

    if (pickupPosition) {
      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = L.marker(pickupPosition, { icon: pickupIcon, title: "Pickup location" })
          .bindPopup(`<strong>Pickup</strong><br>${escapeHtml(pickup || ride?.pickup || "GPS location")}`)
          .addTo(map);
      } else {
        pickupMarkerRef.current.setLatLng(pickupPosition);
        pickupMarkerRef.current.setPopupContent(`<strong>Pickup</strong><br>${escapeHtml(pickup || ride?.pickup || "GPS location")}`);
        if (!map.hasLayer(pickupMarkerRef.current)) pickupMarkerRef.current.addTo(map);
      }
      map.setView(pickupPosition, Math.max(map.getZoom(), 15));
    } else if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
    }

    const driverPosition = ride?.demoMode === 0 && ride.locationLat != null && ride.locationLng != null
      ? { lat: ride.locationLat, lng: ride.locationLng }
      : null;
    if (driverPosition) {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = L.marker(driverPosition, { icon: driverIcon, title: "Driver GPS location" })
          .bindPopup("Driver GPS location")
          .addTo(map);
      } else {
        driverMarkerRef.current.setLatLng(driverPosition);
      }
    } else if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }
  }, [
    pickup,
    pickupCoordinates?.lat,
    pickupCoordinates?.lng,
    ride?.demoMode,
    ride?.pickup,
    ride?.pickupLat,
    ride?.pickupLng,
    ride?.locationLat,
    ride?.locationLng,
  ]);

  useEffect(() => {
    if (centerRequest === 0 || !mapRef.current) return;
    const position = pickupCoordinates ?? (
      ride?.pickupLat != null && ride.pickupLng != null
        ? { lat: ride.pickupLat, lng: ride.pickupLng }
        : null
    );
    if (position) mapRef.current.setView(position, 15);
  }, [centerRequest, pickupCoordinates?.lat, pickupCoordinates?.lng, ride?.pickupLat, ride?.pickupLng]);

  const hasPickupGps = Boolean(
    pickupCoordinates || (ride?.pickupLat != null && ride.pickupLng != null),
  );
  const hasDriverGps = Boolean(
    ride?.demoMode === 0 && ride.locationLat != null && ride.locationLng != null,
  );

  return (
    <div className="map-shell live-map-shell">
      <div ref={mapElement} className="google-map osm-map" aria-label="OpenStreetMap ride map" />
      {!hasPickupGps && (
        <div className="map-empty-note">
          <MapPin size={20} />
          <span>Use the pickup location button to show your GPS position on the map</span>
        </div>
      )}
      <div className="map-topline">
        <span className={`map-live-pill ${!hasDriverGps ? "is-demo" : ""}`}>
          <span />{hasDriverGps ? "DRIVER GPS" : hasPickupGps ? "PICKUP GPS" : "OPENSTREETMAP"}
        </span>
        <span className="map-surface-label"><Navigation size={13} /> {dropoff.trim() ? "Map view" : "GPS map"}</span>
      </div>
      <div className="map-attribution">
        {hasDriverGps ? "Driver GPS position" : hasPickupGps ? "Blue marker shows your pickup GPS" : "OpenStreetMap · GPS permission required"}
      </div>
      <div className="map-zoom-control">
        <button type="button" aria-label="Map details" title="OpenStreetMap map">
          <Radio size={14} />
        </button>
      </div>
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}
