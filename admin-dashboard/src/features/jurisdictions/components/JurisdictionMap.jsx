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
    activeTab
}) => {
    return (
        <div className="lg:col-span-2 relative h-[600px] rounded-3xl overflow-hidden shadow-xl border border-gray-200 dark:border-white/5">
            {showHelp && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] p-4 w-[90%] md:w-[60%] rounded-2xl shadow-2xl backdrop-blur-md bg-violet-900/90 text-white flex items-start gap-4 border border-violet-500/30 animate-fade-in-up">
                    <HelpCircle className="shrink-0 mt-0.5 text-violet-300" />
                    <div>
                        <h4 className="font-bold text-sm text-violet-100">Interactive Map Boundaries Drawing</h4>
                        <p className="text-[11px] text-violet-200/90 mt-1">
                            Click anywhere on the map to define the boundary vertices of your {activeTab === 'wards' ? 'Ward' : 'City (ULB)'}.
                            The polygon will draw automatically as you place markers. Connect at least 3 points, then click **Save Jurisdiction** to submit.
                        </p>
                    </div>
                    <button
                        onClick={onCloseHelp}
                        className="text-violet-300 hover:text-white font-bold text-xs"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            <MapContainer center={mapCenter} zoom={13} className="h-full w-full z-10">
                <ChangeView center={mapCenter} />
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                <MapClickHandler onMapClick={onMapClick} />

                {drawnPoints.length >= 2 && (
                    <Polygon
                        positions={drawnPoints}
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
