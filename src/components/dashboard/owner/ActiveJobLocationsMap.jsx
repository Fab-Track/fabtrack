import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

// Fix leaflet default icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Stage → color mapping
const STAGE_COLORS = {
  design: "#7c3aed",    // purple
  fab: "#f97316",       // orange
  powder: "#3b82f6",    // blue
  install: "#16a34a",   // green
};

function getStageGroup(stage = "", pipeline_board = "") {
  if (pipeline_board === "Shop") {
    const s = stage.toLowerCase();
    if (s.includes("design") || s.includes("drawing") || s.includes("measure") || s.includes("approval") || s.includes("new jobs")) return "design";
    if (s.includes("fab") || s.includes("cut") || s.includes("weld") || s.includes("fit")) return "fab";
    if (s.includes("powder") || s.includes("coat")) return "powder";
    if (s.includes("install") || s.includes("ready")) return "install";
  }
  return "design";
}

const STAGE_LABELS = {
  design: { label: "Design / Drawing", color: STAGE_COLORS.design },
  fab: { label: "Fabrication", color: STAGE_COLORS.fab },
  powder: { label: "Powder Coat", color: STAGE_COLORS.powder },
  install: { label: "Ready / Install", color: STAGE_COLORS.install },
};

function getStageBadgeClass(group) {
  const map = {
    design: "bg-purple-100 text-purple-700 border-purple-200",
    fab: "bg-orange-100 text-orange-700 border-orange-200",
    powder: "bg-blue-100 text-blue-700 border-blue-200",
    install: "bg-green-100 text-green-700 border-green-200",
  };
  return map[group] || "bg-gray-100 text-gray-600";
}

function createPinIcon(color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24S24 21 24 12C24 5.373 18.627 0 12 0z"
        fill="#1e293b" stroke="#fff" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="${color}"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

// Geocode cache to avoid repeated lookups
const geocodeCache = {};

async function geocodeAddress(address) {
  if (geocodeCache[address]) return geocodeCache[address];
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  const data = await res.json();
  if (data && data[0]) {
    const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    geocodeCache[address] = result;
    return result;
  }
  return null;
}

// Auto-fit bounds when markers change
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 11);
      return;
    }
    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [points, map]);
  return null;
}

// Utah center default
const UTAH_CENTER = [39.5, -111.5];
const UTAH_ZOOM = 7;

// Shop flow stages to include
const SHOP_STAGES_FILTER = (job) => job.pipeline_board === "Shop";

export default function ActiveJobLocationsMap({ jobs = [] }) {
  const [markers, setMarkers] = useState([]);
  const [noAddressCount, setNoAddressCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const shopJobs = jobs.filter(SHOP_STAGES_FILTER);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (shopJobs.length === 0) {
      setMarkers([]);
      setNoAddressCount(0);
      setLoading(false);
      return;
    }

    let withAddress = 0;
    let withoutAddress = 0;
    shopJobs.forEach(j => (j.site_address ? withAddress++ : withoutAddress++));
    setNoAddressCount(withoutAddress);

    const jobsWithAddr = shopJobs.filter(j => j.site_address && j.site_address.trim());

    setLoading(true);
    const batchSize = 3;
    const results = [];
    let processed = 0;

    async function processBatch(startIdx) {
      const batch = jobsWithAddr.slice(startIdx, startIdx + batchSize);
      await Promise.all(batch.map(async (job) => {
        const coords = await geocodeAddress(job.site_address);
        if (coords) {
          results.push({ job, ...coords });
        }
      }));
      processed += batch.length;
      if (!mountedRef.current) return;
      if (processed < jobsWithAddr.length) {
        // Small delay between batches to respect Nominatim rate limit
        setTimeout(() => processBatch(processed), 200);
      } else {
        setMarkers([...results]);
        setLoading(false);
      }
    }

    processBatch(0);
  }, [shopJobs.length, shopJobs.map(j => j.id).join(",")]);

  return (
    <div className="bg-card rounded-xl border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-accent" />
          <p className="text-sm font-semibold text-foreground">Active Job Locations</p>
          {!loading && (
            <span className="text-xs text-muted-foreground">
              {markers.length} job{markers.length !== 1 ? "s" : ""} across Utah
            </span>
          )}
        </div>
        {loading && (
          <span className="text-xs text-muted-foreground animate-pulse">Locating jobs…</span>
        )}
      </div>

      {/* Map */}
      <div className="rounded-lg overflow-hidden" style={{ height: 350 }}>
        <MapContainer
          center={UTAH_CENTER}
          zoom={UTAH_ZOOM}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          <FitBounds points={markers} />
          {markers.map(({ job, lat, lng }) => {
            const group = getStageGroup(job.stage, job.pipeline_board);
            const icon = createPinIcon(STAGE_COLORS[group]);
            return (
              <Marker key={job.id} position={[lat, lng]} icon={icon}>
                <Popup maxWidth={240}>
                  <div className="text-xs space-y-1 min-w-[180px]">
                    <div className="font-bold text-sm text-foreground">{job.job_number}</div>
                    <div className="font-medium text-foreground">{job.job_name}</div>
                    <div className="text-muted-foreground">{job.customer_name}</div>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStageBadgeClass(group)}`}>
                        {job.stage}
                      </span>
                    </div>
                    {(job.promised_install_date || job.expected_install_date) && (
                      <div className="text-muted-foreground">
                        Install: {job.promised_install_date || job.expected_install_date}
                      </div>
                    )}
                    <div className="pt-1">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        View Job →
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3">
        {Object.entries(STAGE_LABELS).map(([key, { label, color }]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* No-address note */}
      {noAddressCount > 0 && (
        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
          {noAddressCount} job{noAddressCount !== 1 ? "s" : ""} {noAddressCount !== 1 ? "have" : "has"} no address and {noAddressCount !== 1 ? "are" : "is"} not shown.
        </p>
      )}
    </div>
  );
}