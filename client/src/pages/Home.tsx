import { useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Bell,
  CarFront,
  Check,
  Clock3,
  Compass,
  Inbox,
  LogOut,
  LocateFixed,
  MapPin,
  MessageCircle,
  Navigation,
  Route,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import MapPanel, { type RideMapData } from "@/components/MapPanel";
import { trpc } from "@/lib/trpc";

type View = "book" | "trip" | "messages";

function formatTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function statusLabel(status: string) {
  return ({
    requested: "Request saved",
    assigned: "Driver assigned",
    arriving: "Driver en route",
    in_progress: "Trip in progress",
    completed: "Trip complete",
    cancelled: "Trip cancelled",
  } as Record<string, string>)[status] ?? "Trip update";
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [view, setView] = useState<View>("book");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPending, setLocationPending] = useState(false);
  const [mapCenterRequest, setMapCenterRequest] = useState(0);
  const locationRequestRef = useRef(0);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);

  const utilities = trpc.useUtils();
  const rideQuery = trpc.ride.list.useQuery(undefined, { refetchInterval: 8000, retry: 1 });
  const messageQuery = trpc.message.list.useQuery(undefined, { refetchInterval: 12000, retry: 1 });
  const rides = rideQuery.data ?? [];
  const messages = messageQuery.data ?? [];
  const selectedRide = rides.find(ride => ride.id === selectedRideId);
  const activeRide = selectedRide ?? rides.find(ride => ["requested", "assigned", "arriving", "in_progress"].includes(ride.status)) ?? null;
  const selectedMessage = messages.find(message => message.id === selectedMessageId) ?? null;
  const unreadCount = useMemo(() => messages.filter(message => !message.isRead).length, [messages]);
  const currentPickup = activeRide?.pickup ?? pickup;
  const currentDropoff = activeRide?.dropoff ?? dropoff;

  const createRide = trpc.ride.create.useMutation({
    onSuccess: ride => {
      setSelectedRideId(ride.id);
      setView("trip");
      void utilities.ride.list.invalidate();
      void utilities.message.list.invalidate();
      toast.success("Your demo request is saved");
    },
    onError: error => toast.error(error.message || "Could not save the ride request"),
  });
  const cancelRide = trpc.ride.cancel.useMutation({
    onSuccess: ride => {
      void utilities.ride.list.invalidate();
      void utilities.message.list.invalidate();
      if (ride) toast.success("Demo ride cancelled");
    },
    onError: error => toast.error(error.message || "Could not cancel this request"),
  });
  const markRead = trpc.message.markRead.useMutation({
    onSuccess: () => void utilities.message.list.invalidate(),
    onError: error => toast.error(error.message || "Could not update this message"),
  });
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utilities.auth.me.setData(undefined, null);
      setLocation("/login");
    },
    onError: error => toast.error(error.message || "Could not sign out"),
  });

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Location access is not available in this browser");
      return;
    }
    const requestId = ++locationRequestRef.current;
    setLocationPending(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        if (requestId !== locationRequestRef.current) return;
        const coordinates = { lat: position.coords.latitude, lng: position.coords.longitude };
        const coordinateLabel = `Current location (${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)})`;
        setPickup(coordinateLabel);
        setPickupCoordinates(coordinates);
        setLocationPending(false);
        setMapCenterRequest(value => value + 1);
        toast.success(`Pickup GPS set (accuracy about ${Math.round(position.coords.accuracy)} m)`);
      },
      error => {
        if (requestId !== locationRequestRef.current) return;
        setLocationPending(false);
        const message = error.code === error.PERMISSION_DENIED
          ? "Location permission is blocked. Allow location access in your browser, then try again."
          : error.code === error.TIMEOUT
            ? "Getting your location timed out. Try again or enter a pickup address."
            : "Your location is unavailable. Check that device location is enabled or enter an address.";
        toast.error(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  function submitRide(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pickup.trim().length < 2 || dropoff.trim().length < 2) {
      toast.error("Add a pickup and drop-off to continue");
      return;
    }
    createRide.mutate({
      pickup: pickup.trim(),
      dropoff: dropoff.trim(),
      ...(pickupCoordinates ? { pickupLat: pickupCoordinates.lat, pickupLng: pickupCoordinates.lng } : {}),
    });
  }

  function openMessage(message: (typeof messages)[number]) {
    setSelectedMessageId(message.id);
    setView("messages");
    if (!message.isRead) markRead.mutate({ rideId: message.rideId, messageId: message.id });
  }

  const isDatabaseUnavailable = rideQuery.isError || messageQuery.isError;
  const actualGps = Boolean(activeRide && activeRide.demoMode === 0 && activeRide.locationLat !== null && activeRide.locationLng !== null);

  return (
    <div className="ride-app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Ride home">
          <span className="brand-mark"><Route size={20} strokeWidth={2.4} /></span>
          <span className="brand-copy"><strong>ride<span>line</span></strong><small>YOUR RIDE, IN VIEW</small></span>
        </a>
        <div className="topbar-center"><span className="service-indicator"><span /> RIDE SERVICE <i>DEMO</i></span></div>
        <div className="topbar-actions">
          <button className={`top-nav-button ${view === "book" ? "selected" : ""}`} type="button" onClick={() => setView("book")}><Compass size={16} /><span>Book</span></button>
          <button className={`top-nav-button ${view === "trip" ? "selected" : ""}`} type="button" onClick={() => setView("trip")}><Navigation size={16} /><span>Track</span></button>
          <button className={`top-nav-button ${view === "messages" ? "selected" : ""}`} type="button" onClick={() => { setView("messages"); setSelectedMessageId(null); }}>
            <span className="nav-icon-wrap"><Inbox size={16} />{unreadCount > 0 && <b className="unread-dot" />}</span><span>Messages</span>
          </button>
          <button className="sign-out-button" type="button" onClick={() => logout.mutate()} disabled={logout.isPending} aria-label="Sign out" title="Sign out"><LogOut size={15} /><span>Sign out</span></button>
        </div>
      </header>

      {isDatabaseUnavailable && (
        <div className="database-notice"><span><Sparkles size={15} /> The trip service is connecting.</span><button type="button" onClick={() => { void rideQuery.refetch(); void messageQuery.refetch(); }}>Try again</button></div>
      )}

      <main className="workspace">
        <aside className="side-panel">
          <div className="panel-scroll">
            <div className="eyebrow"><span className="eyebrow-line" /> {view === "book" ? "PLAN YOUR RIDE" : view === "trip" ? "TRIP CONTROL" : "RIDE INBOX"}</div>

            {view === "book" && (
              <>
                <div className="page-title-block"><h1>Where to<br /><em>next?</em></h1><p>A smoother ride starts with two places.</p></div>
                <form className="booking-card" onSubmit={submitRide}>
                  <div className="field-stack">
                    <label className="location-field pickup-field">
                      <span className="field-icon pickup-dot"><MapPin size={16} /></span>
                      <span className="field-copy"><small>PICKUP</small><input value={pickup} onChange={event => { locationRequestRef.current += 1; setLocationPending(false); setPickup(event.target.value); setPickupCoordinates(null); }} placeholder="Enter pickup address" autoComplete="street-address" /></span>
                      <button className="field-locate" type="button" onClick={useCurrentLocation} disabled={locationPending} title="Use my current location" aria-label="Use my current location">{locationPending ? <span className="mini-spinner" /> : <LocateFixed size={17} />}</button>
                    </label>
                    <div className="field-connector"><span /><span /><span /></div>
                    <label className="location-field dropoff-field">
                      <span className="field-icon destination-dot"><MapPin size={16} /></span>
                      <span className="field-copy"><small>DROP-OFF</small><input value={dropoff} onChange={event => setDropoff(event.target.value)} placeholder="Where are you headed?" autoComplete="street-address" /></span>
                      <button className="field-locate" type="button" onClick={() => { locationRequestRef.current += 1; setLocationPending(false); setPickup(dropoff); setDropoff(pickup); setPickupCoordinates(null); }} title="Swap locations" aria-label="Swap pickup and drop-off"><ArrowDownUp size={16} /></button>
                    </label>
                  </div>
                  <div className="booking-divider" />
                  <div className="ride-type-row"><span className="ride-type-icon"><CarFront size={21} /></span><span className="ride-type-copy"><strong>Everyday</strong><small>Comfortable city ride</small></span><span className="ride-type-tag">DEMO</span></div>
                  <button className="primary-action" type="submit" disabled={createRide.isPending}>
                    {createRide.isPending ? <><span className="button-spinner" /> Saving request…</> : <>Request a demo ride <ArrowRight size={17} /> </>}
                  </button>
                  <div className="booking-note"><ShieldCheck size={14} /><span>Prototype only — no taxi will be dispatched.</span></div>
                </form>
                <div className="small-section-heading"><span>RECENT TRIPS</span><button type="button" onClick={() => setView("trip")}>View all <ArrowRight size={13} /></button></div>
                {rides.length > 0 ? rides.slice(0, 3).map(ride => (
                  <button className={`recent-trip ${activeRide?.id === ride.id ? "active" : ""}`} type="button" key={ride.id} onClick={() => { setSelectedRideId(ride.id); setView("trip"); }}>
                    <span className="recent-trip-icon"><Route size={15} /></span><span className="recent-trip-copy"><strong>{ride.dropoff}</strong><small>{formatDate(ride.createdAt)}</small></span><span className={`trip-status-dot status-${ride.status}`} />
                  </button>
                )) : <div className="empty-recent">Your saved demo rides will appear here.</div>}
              </>
            )}

            {view === "trip" && (
              <>
                <div className="page-title-block compact-title"><button className="back-link" type="button" onClick={() => setView("book")}><ArrowLeft size={14} /> Back to booking</button><h1>Your<br /><em>ride.</em></h1><p>Trip details and vehicle location.</p></div>
                {activeRide ? (
                  <div className="trip-card">
                    <div className="trip-card-top"><span className={`ride-status-badge ${activeRide.status === "cancelled" ? "cancelled" : ""}`}><span />{statusLabel(activeRide.status)}</span><span className="demo-chip">{actualGps ? "GPS" : "DEMO"}</span></div>
                    <div className="driver-card"><div className="driver-avatar"><CarFront size={22} /></div><div className="driver-details"><small>VEHICLE</small><strong>{activeRide.vehicleName || "Sample vehicle"}</strong><span>{activeRide.driverName || "Demo driver"} · {activeRide.vehiclePlate || "Demo trip"}</span></div><div className="driver-rating"><Sparkles size={12} /> sample</div></div>
                    <div className="trip-route-list"><div className="trip-route-point"><span className="point-icon point-pickup" /><div><small>PICKUP</small><strong>{activeRide.pickup}</strong></div></div><div className="route-line-segment" /><div className="trip-route-point"><span className="point-icon point-dropoff" /><div><small>DROP-OFF</small><strong>{activeRide.dropoff}</strong></div></div></div>
                    <div className="trip-location-status"><span className={`gps-pulse ${actualGps ? "gps-live" : "gps-demo"}`} />{actualGps ? "Driver GPS received" : "Sample car position · not live GPS"}</div>
                    <div className="trip-message-preview"><MessageCircle size={15} /><span>{messages.find(message => message.rideId === activeRide.id)?.body ?? "No trip messages yet."}</span><button type="button" aria-label="Open trip messages" onClick={() => { setView("messages"); setSelectedMessageId(null); }}><ArrowRight size={15} /></button></div>
                    {activeRide.status !== "cancelled" && activeRide.status !== "completed" && <button className="cancel-ride-button" type="button" disabled={cancelRide.isPending} onClick={() => cancelRide.mutate({ rideId: activeRide.id })}><X size={15} /> Cancel demo request</button>}
                    <p className="demo-disclaimer">This prototype does not contact a taxi company. Vehicle details and any moving marker are sample data until a real dispatch and driver GPS feed are connected.</p>
                  </div>
                ) : (
                  <div className="empty-panel"><span className="empty-icon"><Navigation size={22} /></span><h2>No trip to track</h2><p>Choose a pickup and destination to create a demo request and preview the tracking view.</p><button className="primary-action" type="button" onClick={() => setView("book")}>Plan a ride <ArrowRight size={16} /></button></div>
                )}
              </>
            )}

            {view === "messages" && (
              <>
                <div className="page-title-block compact-title"><h1>Ride<br /><em>updates.</em></h1><p>Messages attached to your demo trips.</p></div>
                {selectedMessage ? (
                  <article className="message-detail">
                    <button className="back-link" type="button" onClick={() => setSelectedMessageId(null)}><ArrowLeft size={14} /> All messages</button>
                    <div className="message-detail-icon"><MessageCircle size={21} /></div>
                    <div className="message-sender"><strong>{selectedMessage.sender}</strong><span>{formatDate(selectedMessage.createdAt)}</span></div>
                    <div className="message-detail-body">{selectedMessage.body}</div>
                    <div className="message-context"><Route size={15} /><span><small>TRIP DESTINATION</small><strong>{selectedMessage.dropoff}</strong></span></div>
                    <div className="read-receipt"><Check size={13} /> {selectedMessage.isRead ? "Read" : "Marked as read"}</div>
                  </article>
                ) : messages.length > 0 ? (
                  <div className="message-list">
                    {messages.map(message => (
                      <button className={`message-row ${!message.isRead ? "unread" : ""}`} key={message.id} type="button" onClick={() => openMessage(message)}>
                        <span className="message-avatar"><MessageCircle size={16} /></span>
                        <span className="message-row-copy"><span className="message-row-heading"><strong>{message.sender}</strong><time>{formatTime(message.createdAt)}</time></span><span className="message-row-text">{message.body}</span><span className="message-row-context">Trip to {message.dropoff}</span></span>
                        {!message.isRead && <span className="message-unread-dot" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-panel message-empty"><span className="empty-icon"><Bell size={21} /></span><h2>All quiet for now</h2><p>Ride and driver updates will show up here after you create a demo request.</p><button className="secondary-action" type="button" onClick={() => setView("book")}>Book a demo ride <ArrowRight size={15} /></button></div>
                )}
              </>
            )}
          </div>
          <div className="sidebar-footer"><span className="footer-status"><span /> SERVICE READY</span><span>RIDE APP · PREVIEW</span></div>
        </aside>

        <section className="map-column" aria-label="Trip map and route overview">
          <div className="map-heading-row"><div><span className="map-overline"><span className="eyebrow-line" /> MAP OVERVIEW</span><h2>{activeRide ? (activeRide.status === "cancelled" ? "Trip request closed" : "Your pickup, on the map") : "See your pickup location."}</h2></div><div className="map-heading-actions">{activeRide && <span className={`map-state-tag ${actualGps ? "connected" : ""}`}><span /> {actualGps ? "DRIVER GPS" : "SAMPLE TRIP"}</span>}<button className="map-icon-button" type="button" aria-label="Center map on pickup" onClick={() => setMapCenterRequest(value => value + 1)}><LocateFixed size={16} /></button></div></div>
          <MapPanel
            pickup={currentPickup}
            dropoff={currentDropoff}
            pickupCoordinates={activeRide?.pickupLat !== null && activeRide?.pickupLat !== undefined && activeRide?.pickupLng !== null && activeRide?.pickupLng !== undefined ? { lat: activeRide.pickupLat, lng: activeRide.pickupLng } : pickupCoordinates}
            ride={(activeRide as RideMapData | null) ?? null}
            centerRequest={mapCenterRequest}
          />
          <div className="route-summary">
            <div className="summary-location"><span className="summary-point summary-origin" /><span><small>PICKUP</small><strong>{currentPickup || "Set your pickup"}</strong></span></div>
            <div className="summary-route-line"><span /><ArrowRight size={14} /><span /></div>
            <div className="summary-location"><span className="summary-point summary-destination" /><span><small>DROP-OFF</small><strong>{currentDropoff || "Add a destination"}</strong></span></div>
            <div className="summary-divider" />
            <div className="map-summary-note"><Clock3 size={15} /><span>{activeRide ? (actualGps ? "Location updates refresh automatically" : "Waiting for a real driver GPS feed") : "Use GPS to mark your pickup; live driver tracking needs a driver feed"}</span></div>
          </div>
          <div className="map-bottom-strip"><span><span className="bottom-status-dot" /> SECURE SESSION</span><span>GPS is requested only when you tap the location button</span><span>Map tiles © OpenStreetMap contributors</span></div>
        </section>
      </main>
    </div>
  );
}
