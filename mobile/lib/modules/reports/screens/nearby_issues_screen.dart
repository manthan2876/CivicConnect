import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:civic_connect_mobile/config/api_client.dart' as http;
import 'package:geolocator/geolocator.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../config/api_config.dart';
import '../services/location_service.dart';
import './report_detail_screen.dart';

class NearbyIssuesScreen extends StatefulWidget {
  const NearbyIssuesScreen({super.key});

  @override
  State<NearbyIssuesScreen> createState() => _NearbyIssuesScreenState();
}

class _NearbyIssuesScreenState extends State<NearbyIssuesScreen> {
  final LocationService _locationService = LocationService();
  List<dynamic> _nearbyReports = [];
  bool _isLoading = true;
  bool _isMapView = false;
  final MapController _mapController = MapController();
  Position? _currentLocation;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchNearbyReports();
  }

  Future<void> _fetchNearbyReports() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _error = null;
    });


    try {
      // 1. Get current location
      final locationData = await _locationService.getCurrentLocation();
      if (locationData == null) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not get your location. Please ensure location services are enabled and permissions are granted.';
        _isLoading = false;
      });

        return;
      }

      if (!mounted) return;
      setState(() => _currentLocation = locationData);


      // 2. Fetch nearby reports from backend
      final url = Uri.parse('${ApiConfig.nearbyReportsUrl}'
          '?latitude=${_currentLocation!.latitude}'
          '&longitude=${_currentLocation!.longitude}'
          '&radius=10000'); // 10km radius

      final response = await http.get(url, headers: ApiConfig.getHeaders());
      debugPrint('Nearby API Status: ${response.statusCode}');
      if (response.statusCode == 200) {
        final List<dynamic> reports = json.decode(response.body);
        debugPrint('Fetched ${reports.length} reports from backend');
        
        // 3. Process reports and calculate distances
        final List<Map<String, dynamic>> processedReports = [];
        
        for (var report in reports) {
          if (report['location'] != null && report['location']['coordinates'] != null) {
            final coords = report['location']['coordinates'];
            // coordinates are [lon, lat] in GeoJSON
            final double reportLon = (coords[0] as num).toDouble();
            final double reportLat = (coords[1] as num).toDouble();
            
            final distance = _calculateDistance(
              _currentLocation!.latitude!,
              _currentLocation!.longitude!,
              reportLat,
              reportLon,
            );
            
            final reportMap = Map<String, dynamic>.from(report);
            reportMap['distance'] = distance;
            processedReports.add(reportMap);
          }
        }
        
        if (!mounted) return;
        setState(() {
          _nearbyReports = processedReports;
          _isLoading = false;
          _updateMarkers();
        });

      } else {
        if (!mounted) return;
        setState(() {
          _error = 'Failed to load reports from server.';
          _isLoading = false;
        });

      }
    } catch (e) {
      debugPrint('Error fetching nearby reports: $e');
      if (!mounted) return;
      setState(() {
        _error = 'An error occurred while fetching reports.';
        _isLoading = false;
      });

    }
  }

  void _updateMarkers() {
    debugPrint('Updating markers for ${_nearbyReports.length} reports');
    // Markers are now built directly in the widget tree for better flexibility
    if (!mounted) return;
    setState(() {});

  }

  double _calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    const p = 0.017453292519943295; // Math.PI / 180
    final a = 0.5 - cos((lat2 - lat1) * p) / 2 +
              cos(lat1 * p) * cos(lat2 * p) *
              (1 - cos((lon2 - lon1) * p)) / 2;
    return 12742 * asin(sqrt(a)); // 2 * R; R = 6371 km
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('Nearby Issues', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        backgroundColor: theme.appBarTheme.backgroundColor,
        foregroundColor: theme.appBarTheme.foregroundColor,
        actions: [
          IconButton(
            icon: Icon(_isMapView ? Icons.list : Icons.map_outlined),
            onPressed: () => setState(() => _isMapView = !_isMapView),
            tooltip: _isMapView ? 'Switch to List View' : 'Switch up Map View',
          ),
          IconButton(icon: const Icon(Icons.refresh), onPressed: _fetchNearbyReports),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
                        const SizedBox(height: 16),
                        Text(_error!, textAlign: TextAlign.center, style: TextStyle(color: theme.hintColor)),
                        const SizedBox(height: 24),
                        ElevatedButton(onPressed: _fetchNearbyReports, child: const Text('Retry')),
                      ],
                    ),
                  ),
                )
              : _nearbyReports.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.location_off_outlined, size: 64, color: theme.hintColor.withValues(alpha: 0.5)),
                          const SizedBox(height: 16),
                          Text('No issues found within 10km of you.', style: TextStyle(color: theme.hintColor)),
                        ],
                      ),
                    )
                  : _isMapView 
                      ? _buildMapView()
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _nearbyReports.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final report = _nearbyReports[index];
                            return _NearbyReportListItem(report: report);
                          },
                        ),
    );
  }

  Widget _buildMapView() {
    if (_currentLocation == null) return const Center(child: Text("Location not available"));
    
    return FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        initialCenter: LatLng(_currentLocation!.latitude!, _currentLocation!.longitude!),
        initialZoom: 13,
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.civicconnect.civic_connect_mobile',
        ),
        MarkerLayer(
          markers: _nearbyReports.map((report) {
            final coords = report['location']['coordinates'];
            final double lat = (coords[1] as num).toDouble();
            final double lon = (coords[0] as num).toDouble();
            
            return Marker(
              point: LatLng(lat, lon),
              width: 40,
              height: 40,
              alignment: Alignment.topCenter,
              child: GestureDetector(
                onTap: () => _showIssuePopup(report),
                child: const Icon(
                  Icons.location_on,
                  color: Colors.red,
                  size: 40,
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  void _showIssuePopup(Map<String, dynamic> report) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) {
        final theme = Theme.of(context);
        return Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: theme.cardColor,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.1),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    report['category'] ?? 'Issue',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                  _StatusBadge(
                    status: report['status'] ?? 'Pending',
                    color: (report['status'] == 'Resolved') 
                        ? Colors.green 
                        : (report['status'] == 'In Progress' ? Colors.orange : Colors.blue),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                report['description'] ?? 'No description provided.',
                style: TextStyle(color: theme.hintColor),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => ReportDetailScreen(reportId: report['id']),
                      ),

                    );
                  },
                  icon: const Icon(Icons.remove_red_eye_outlined),
                  label: const Text('Inspect Issue'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _NearbyReportListItem extends StatelessWidget {
  final Map<String, dynamic> report;

  const _NearbyReportListItem({required this.report});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final distance = report['distance'] as double;
    final distanceStr = distance < 1.0 
        ? '${(distance * 1000).toInt()} m away' 
        : '${distance.toStringAsFixed(1)} km away';

    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => ReportDetailScreen(reportId: report['id'])),
      ),

      child: Container(
        decoration: BoxDecoration(
          color: theme.cardColor,
          borderRadius: BorderRadius.circular(16),
          boxShadow: theme.brightness == Brightness.dark ? [] : [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
          border: theme.brightness == Brightness.dark ? Border.all(color: theme.dividerColor) : null,
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    report['category'] ?? 'General',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.location_on, size: 12, color: theme.colorScheme.primary),
                        const SizedBox(width: 4),
                        Text(
                          distanceStr,
                          style: TextStyle(
                            color: theme.colorScheme.primary,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                report['description'] ?? 'No description provided.',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: theme.hintColor, fontSize: 14),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _StatusBadge(
                    status: report['status'] ?? 'Submitted',
                    color: (report['status'] == 'Resolved') ? Colors.green : (report['status'] == 'In Progress' ? Colors.orange : theme.colorScheme.primary),
                  ),
                  Text(
                    'View Details',
                    style: TextStyle(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  final Color color;

  const _StatusBadge({required this.status, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
