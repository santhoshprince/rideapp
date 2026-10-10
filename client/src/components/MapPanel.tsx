import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, MapPin, Navigation } from "lucide-react";

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
  deviceCoordinates: { lat: number; lng: number } | null;
  locationTracking: boolean;
  locationPending: boolean;
  onToggleLocationTracking: () => void;
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

const deviceIcon = L.divIcon({
  className: "osm-marker-icon",
  html: '<span class="osm-marker osm-marker-device" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 11 6.7 6.8A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.8 1.3L19 11l1.5 1.5v5h-2v-1.5h-13v1.5h-2v-5L5 11Zm1.7-.5h10.6l-1.2-3H7.9l-1.2 3ZM6.5 14.2a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Zm11 0a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Z"/></svg></span>',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

const defaultCenter: L.LatLngExpression = [20, 0];

export default function MapPanel({
  pickup,
  dropoff,
  pickupCoordinates,
  ride,
  centerRequest,
  deviceCoordinates,
  locationTracking,
  locationPending,
  onToggleLocationTracking,
}: MapPanelProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const deviceMarkerRef = useRef<L.Marker | null>(null);

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
      deviceMarkerRef.current = null;
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
    const map = mapRef.current;
    if (!map) return;
    if (deviceCoordinates) {
      if (!deviceMarkerRef.current) {
        deviceMarkerRef.current = L.marker(deviceCoordinates, {
          icon: deviceIcon,
          title: "This phone's GPS position (demo, not a taxi)",
        })
          .bindPopup("PHONE GPS · DEMO<br>This phone's location, not a taxi.")
          .addTo(map);
      } else {
        deviceMarkerRef.current.setLatLng(deviceCoordinates);
      }
    } else if (deviceMarkerRef.current) {
      deviceMarkerRef.current.remove();
      deviceMarkerRef.current = null;
    }
  }, [deviceCoordinates?.lat, deviceCoordinates?.lng]);

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
  const hasDeviceGps = Boolean(deviceCoordinates);

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
        <span className={`map-live-pill ${!hasDriverGps || hasDeviceGps ? "is-demo" : ""}`}>
          <span />{locationTracking ? "PHONE GPS · LIVE" : hasDeviceGps ? "PHONE GPS · LAST" : hasDriverGps ? "DRIVER GPS" : hasPickupGps ? "PICKUP GPS" : "OPENSTREETMAP"}
        </span>
        <span className="map-surface-label"><Navigation size={13} /> {dropoff.trim() ? "Map view" : "GPS map"}</span>
      </div>
      <div className="map-attribution">
        {hasDeviceGps ? "Phone GPS demo marker · not a taxi" : hasDriverGps ? "Driver GPS position" : hasPickupGps ? "Blue marker shows your pickup GPS" : "OpenStreetMap · GPS permission required"}
      </div>
      <div className="map-zoom-control">
        <button
          type="button"
          className={`phone-gps-button ${locationTracking ? "is-tracking" : ""}`}
          aria-label={locationTracking ? "Stop live phone GPS" : "Start live phone GPS"}
          title={locationTracking ? "Stop live phone GPS" : "Show this phone moving on the map"}
          disabled={locationPending && !locationTracking}
          onClick={onToggleLocationTracking}
        >
          {locationPending ? <span className="mini-spinner" /> : <LocateFixed size={15} />}
          {locationTracking ? "Stop phone GPS" : locationPending ? "Getting GPS…" : "Track this phone"}
        </button>
        {(locationTracking || hasDeviceGps) && <span className="phone-gps-disclaimer">Demo only · not a taxi</span>}
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
