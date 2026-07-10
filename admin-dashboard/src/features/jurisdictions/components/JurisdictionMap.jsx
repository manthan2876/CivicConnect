import React from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap, Tooltip } from 'react-leaflet';
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

const PreviewCentering = ({ positions }) => {
    const map = useMap();
    React.useEffect(() => {
        if (positions && positions.length > 0) {
            map.fitBounds(positions, { padding: [50, 50] });
        }
    }, [positions, map]);
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
    onMarkerDelete,
    previewItem
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
        <div className="lg:col-span-2 relative h-[650px] rounded-3xl overflow-hidden shadow-2xl border border-white/5 bg-gray-900/10">
            {/* Help/Instruction Modal overlay */}
            {showHelp && (
                <div className="absolute top-4 left-4 z-[1000] p-5 rounded-2xl shadow-xl max-w-sm backdrop-blur-md bg-gray-900/80 border border-white/10 text-white animate-fade-in-up">
                    <div className="flex justify-between items-start gap-4 mb-2">
                        <div className="flex items-center gap-2">
                            <HelpCircle className="text-violet-400" size={18} />
                            <h4 className="font-extrabold text-sm">Boundary Editor Guide</h4>
                        </div>
                        <button onClick={onCloseHelp} className="text-gray-400 hover:text-white font-bold text-xs uppercase">Dismiss</button>
                    </div>
                    <ul className="text-xs space-y-1.5 text-gray-300 list-disc list-inside">
                        <li>Left-click anywhere on the map to add boundary points.</li>
                        <li>Click on the line between points to insert a vertex.</li>
                        <li>Drag markers to adjust boundary points.</li>
                        <li>Double-click any marker to delete that point.</li>
                        <li>Existing boundaries can be clicked to preview on map.</li>
                    </ul>
                </div>
            )}

            <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                className="z-10"
            >
                <ChangeView center={mapCenter} />
                {zonePositions && <ZoneCentering zonePositions={zonePositions} />}
                {ulbPositions && <UlbCentering ulbPositions={ulbPositions} />}
                <MapClickHandler onMapClick={onMapClick} />

                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />

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

                {/* Render Selected Preview Boundary */}
                {previewItem && previewItem.coordinates && (
                    <>
                        <Polygon
                            positions={previewItem.coordinates}
                            pathOptions={{
                                color: '#F59E0B', // Amber color for preview
                                fillColor: '#F59E0B',
                                fillOpacity: 0.2,
                                weight: 3
                            }}
                        >
                            <Tooltip sticky permanent={false} direction="center">
                                <div className="text-xs font-bold px-1 py-0.5">
                                    {previewItem.name} ({previewItem.type === 'ulbs' ? 'City' : previewItem.type === 'zones' ? 'Zone' : 'Ward'})
                                </div>
                            </Tooltip>
                        </Polygon>
                        <PreviewCentering positions={previewItem.coordinates} />
                    </>
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
                                <div class="relative flex items-center justify-center animate-fade-in">
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
                    >
                        <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                            <div className="text-[10px] font-bold p-1">
                                Vertex #{index + 1}
                                <div className="text-[8px] text-gray-400 font-normal mt-0.5">Drag to move • Double-click to delete</div>
                            </div>
                        </Tooltip>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default JurisdictionMap;
