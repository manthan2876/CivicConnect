import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../services/user_service.dart';



class LocationSettingsScreen extends StatefulWidget {
  const LocationSettingsScreen({super.key});

  @override
  State<LocationSettingsScreen> createState() => _LocationSettingsScreenState();
}

class _LocationSettingsScreenState extends State<LocationSettingsScreen> {
  final UserService _userService = UserService();
  LatLng _selectedLocation = const LatLng(19.0760, 72.8777); // Default to Mumbai
  double _radiusInMeters = 2000;
  bool _isLoading = true;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _loadCurrentSettings();
  }

  Future<void> _loadCurrentSettings() async {
    final user = _userService.currentUser;
    if (user != null) {
      try {
        final profile = await _userService.getProfile();
        if (profile != null && mounted) {
          setState(() {
            if (profile['alert_radius_meters'] != null) {
              _radiusInMeters = (profile['alert_radius_meters'] as num).toDouble();
            }
            if (profile['home_location'] != null && profile['home_location']['coordinates'] != null) {
              final coords = profile['home_location']['coordinates'] as List;
              if (coords.length == 2) {
                final double lon = (coords[0] as num).toDouble();
                final double lat = (coords[1] as num).toDouble();
                _selectedLocation = LatLng(lat, lon);
              }
            }
          });
        }
      } catch (e) {
        debugPrint('Error loading current location settings: $e');
      } finally {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
        }
      }
    }
  }

  Future<void> _saveSettings() async {
    setState(() => _isSaving = true);
    try {
      await _userService.updateProfile(
        homeLocation: {
          'lat': _selectedLocation.latitude,
          'lon': _selectedLocation.longitude,
        },
        alertRadius: _radiusInMeters.toInt(),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Safety zone updated successfully!')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Location & Privacy'),
        actions: [
          if (_isSaving)
            const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator(strokeWidth: 2)))
          else
            TextButton(
              onPressed: _saveSettings,
              child: const Text('SAVE', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
            ),
        ],
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : Column(
            children: [
              Expanded(
                child: Stack(
                  children: [
                    FlutterMap(
                      options: MapOptions(
                        initialCenter: _selectedLocation,
                        initialZoom: 13.0,
                        onTap: (tapPosition, point) {
                          setState(() {
                            _selectedLocation = point;
                          });
                        },
                      ),
                      children: [
                        TileLayer(
                          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName: 'com.civicconnect.app',
                        ),
                        CircleLayer(
                          circles: [
                            CircleMarker(
                              point: _selectedLocation,
                              radius: _radiusInMeters,
                              useRadiusInMeter: true,
                              color: Colors.blue.withValues(alpha: 0.2),
                              borderColor: Colors.blue,
                              borderStrokeWidth: 2,
                            ),
                          ],
                        ),
                        MarkerLayer(
                          markers: [
                            Marker(
                              point: _selectedLocation,
                              width: 40,
                              height: 40,
                              child: const Icon(Icons.home, color: Colors.red, size: 40),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Positioned(
                      top: 16,
                      left: 16,
                      right: 16,
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10)],

                        ),
                        child: const Text(
                          'Tap on the map to set your home location.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -5))],

                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Alert Radius', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        Text('${(_radiusInMeters / 1000).toStringAsFixed(1)} km', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.blue)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Receive neighborhood alerts if an issue is reported within this distance of your home.',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                    const SizedBox(height: 16),
                    Slider(
                      value: _radiusInMeters,
                      min: 500,
                      max: 10000,
                      divisions: 19,
                      label: '${(_radiusInMeters / 1000).toStringAsFixed(1)} km',
                      onChanged: (value) {
                        setState(() {
                          _radiusInMeters = value;
                        });
                      },
                    ),
                    const SizedBox(height: 8),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('500m', style: TextStyle(fontSize: 12, color: Colors.grey)),
                        Text('10km', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
    );
  }
}
