import React from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap } from 'react-leaflet';
import { HelpCircle } from 'lucide-react';
import L from 'leaflet';

const ChangeView = ({ center }) => {
    const map = useMap();
    React.useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
};

const ZoneCentering = ({ zonePositions }) => {
    const map = useMap();
    React.useEffect(() => {
        if (zonePositions && zonePositions.length > 0) {
            // Find center
            let totalLat = 0;
            let totalLng = 0;
            zonePositions.forEach(p => {
                totalLat += p[0];
                totalLng += p[1];
            });
            map.setView([totalLat / zonePositions.length, totalLng / zonePositions.length], map.getZoom());
        }
    }, [zonePositions, map]);
    return null;
};

const UlbCentering = ({ ulbPositions }) => {
    const map = useMap();
    React.useEffect(() => {
        if (ulbPositions && ulbPositions.length > 0) {
            // Find center
            let totalLat = 0;
            let totalLng = 0;
            ulbPositions.forEach(p => {
                totalLat += p[0];
                totalLng += p[1];
            });
            map.setView([totalLat / ulbPositions.length, totalLng / ulbPositions.length], map.getZoom());
        }
    }, [ulbPositions, map]);
    return null;
};

const MapClickHandler = ({ onMapClick }) => {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        }
    });
    return null;
};

const JurisdictionMap = ({
    mapCenter,
    drawnPoints,
    onMapClick,
    showHelp,
    onCloseHelp,
    activeTab,
    selectedZone,
    zones = [],
    selectedUlb,
    ulbs = [],
    onMarkerDrag,
    onMarkerDelete
}) => {
    // Extract selected zone positions to render dashed border
    const activeZone = zones.find(z => z.id === selectedZone);
    const getZonePositions = () => {
        if (!activeZone || !activeZone.boundary || !activeZone.boundary.coordinates) return null;
        const coords = activeZone.boundary.coordinates[0];
        return coords.map(c => [c[1], c[0]]); // Swapping [lng, lat] to [lat, lng] for Leaflet
    };

    const zonePositions = getZonePositions();

    // Extract selected city (ULB) positions to render dashed border
    const activeUlb = ulbs.find(u => u.id.toString() === selectedUlb?.toString());
    const getUlbPositions = () => {
        if (!activeUlb || !activeUlb.geom || !activeUlb.geom.coordinates) return null;
        const geom = activeUlb.geom;
        if (geom.type === 'MultiPolygon') {
            const coords = geom.coordinates[0][0];
            return coords.map((c) => [c[1], c[0]]);
        } else if (geom.type === 'Polygon') {
            const coords = geom.coordinates[0];
            return coords.map((c) => [c[1], c[0]]);
        }
        return null;
    };

    const ulbPositions = getUlbPositions();

    return (
        <div className="lg:col-span-2 relative h-[600px] rounded-3xl overflow-hidden shadow-xl border border-gray-200 dark:border-white/5">
            {showHelp && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] p-4 w-[90%] md:w-[60%] rounded-2xl shadow-2xl backdrop-blur-md bg-violet-900/90 text-white flex items-start gap-4 border border-violet-500/30 animate-fade-in-up">
                    <HelpCircle className="shrink-0 mt-0.5 text-violet-300" />
                    <div>
                        <h4 className="font-bold text-sm text-violet-100">Interactive Map Boundaries Drawing</h4>
                        <p className="text-[11px] text-violet-200/90 mt-1">
                            • Click anywhere on the map to define boundary vertices of your {activeTab === 'wards' ? 'Ward' : activeTab === 'zones' ? 'Zone' : 'City'}.<br />
                            • <strong>Drag</strong> any vertex marker to move it.<br />
                            • <strong>Double-click</strong> any vertex marker to delete it.<br />
                            • Click close to a boundary edge line to <strong>insert</strong> a new vertex.<br />
                            • Connect at least 3 points, then click **Save Jurisdiction** to submit.
                        </p>
                    </div>
                    <button
                        onClick={onCloseHelp}
                        className="text-violet-300 hover:text-white font-bold text-xs shrink-0"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            <MapContainer center={mapCenter} zoom={13} className="h-full w-full z-10">
                <ChangeView center={mapCenter} />
                {ulbPositions && <UlbCentering ulbPositions={ulbPositions} />}
                {zonePositions && <ZoneCentering zonePositions={zonePositions} />}
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                <MapClickHandler onMapClick={onMapClick} />

                {/* Render Selected Parent City/ULB Boundary */}
                {ulbPositions && (
                    <Polygon
                        positions={ulbPositions}
                        interactive={false}
                        pathOptions={{
                            color: '#10B981', // Emerald green
                            fillColor: '#10B981',
                            fillOpacity: 0.02,
                            weight: 2.5,
                            dashArray: '8, 8'
                        }}
                    />
                )}

                {/* Render Selected Parent Zone Boundary */}
                {zonePositions && (
                    <Polygon
                        positions={zonePositions}
                        interactive={false}
                        pathOptions={{
                            color: '#F43F5E', // Rose/pink
                            fillColor: '#F43F5E',
                            fillOpacity: 0.04,
                            weight: 2,
                            dashArray: '6, 6'
                        }}
                    />
                )}

                {/* Render Currently Drawing Boundary */}
                {drawnPoints.length >= 2 && (
                    <Polygon
                        positions={drawnPoints}
                        interactive={false}
                        pathOptions={{
                            color: '#8B5CF6',
                            fillColor: '#8B5CF6',
                            fillOpacity: 0.15,
                            weight: 3,
                            dashArray: '5, 5'
                        }}
                    />
                )}

                {drawnPoints.map((point, index) => (
                    <Marker
                        key={index}
                        position={point}
                        draggable={true}
                        eventHandlers={{
                            dragend: (e) => {
                                onMarkerDrag(index, e.target.getLatLng());
                            },
                            dblclick: () => {
                                onMarkerDelete(index);
                            }
                        }}
                        icon={L.divIcon({
                            html: `
                                <div class="relative flex items-center justify-center">
                                    <div class="absolute w-6 h-6 bg-violet-500/30 rounded-full animate-ping"></div>
                                    <div class="w-3.5 h-3.5 bg-violet-600 border-2 border-white rounded-full shadow-md flex items-center justify-center text-[8px] font-black text-white">
                                        ${index + 1}
                                    </div>
                                </div>
                            `,
                            className: 'custom-map-vertex',
                            iconSize: [24, 24],
                            iconAnchor: [12, 12]
                        })}
                    />
                ))}
            </MapContainer>
        </div>
    );
};

export default JurisdictionMap;
