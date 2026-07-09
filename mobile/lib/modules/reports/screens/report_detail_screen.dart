import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/report_service.dart';
import '../services/location_service.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart' as ll;
import '../widgets/report_detail_widgets.dart';
import '../../../shared/utils/verification_helper.dart';

class ReportDetailScreen extends StatefulWidget {
  final String reportId;

  const ReportDetailScreen({super.key, required this.reportId});

  @override
  State<ReportDetailScreen> createState() => _ReportDetailScreenState();
}

class _ReportDetailScreenState extends State<ReportDetailScreen> {
  Map<String, dynamic>? _report;
  bool _isLoading = true;
  String? _error;
  final ReportService _reportService = ReportService();
  bool _isUpvoting = false;
  bool _isConfirming = false;
  bool _isUploadingResolution = false;
  final ImagePicker _picker = ImagePicker();
  final LocationService _locationService = LocationService();

  @override
  void initState() {
    super.initState();
    _fetchReportDetails();
  }

  Future<void> _fetchReportDetails() async {
    if (!mounted) return;
    setState(() => _isLoading = true);

    try {
      final data = await _reportService.getReportById(widget.reportId);
      if (!mounted) return;
      setState(() {
        _report = data;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _handleUpvote() async {
    if (!VerificationHelper.checkVerification(context, action: 'upvote reports')) {
      return;
    }
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    final identifier = user.phone ?? user.email ?? user.id;
    
    if (!mounted) return;
    setState(() => _isUpvoting = true);

    try {
      await _reportService.upvoteReport(widget.reportId, identifier);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Report upvoted!'), backgroundColor: Colors.green),
      );
      _fetchReportDetails(); 
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Upvote failed: ${e.toString().replaceAll('Exception: ', '')}'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) {
        setState(() => _isUpvoting = false);
      }
    }
  }

  Future<void> _handleConfirmResolution(int rating) async {
    if (!VerificationHelper.checkVerification(context, action: 'confirm resolutions')) {
      return;
    }
    if (!mounted) return;
    setState(() => _isConfirming = true);

    try {
      await _reportService.citizenConfirm(widget.reportId, rating);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Resolution verified! Green Credits awarded.'), backgroundColor: Colors.green),
      );
      _fetchReportDetails();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Verification failed: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) {
        setState(() => _isConfirming = false);
      }
    }
  }

  Future<void> _handleDispute(String reason) async {
    if (!mounted) return;

    try {
      await _reportService.citizenDispute(widget.reportId, reason);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Dispute recorded. An authority will review.'), backgroundColor: Colors.orange),
      );
      _fetchReportDetails();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Dispute failed: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _handleProposeResolution() async {
    final XFile? photo = await _picker.pickImage(source: ImageSource.camera, imageQuality: 70);
    if (photo == null) return;

    if (!mounted) return;
    setState(() => _isUploadingResolution = true);

    try {
      final currentLocation = await _locationService.getCurrentLocation();
      if (currentLocation == null) {
        throw Exception('Could not get your current location. Please ensure location services are enabled.');
      }

      final reportCoords = _report!['location']?['coordinates'] ?? [0.0, 0.0];
      
      final distance = const ll.Distance().as(
        ll.LengthUnit.Meter,
        ll.LatLng(currentLocation.latitude, currentLocation.longitude),
        ll.LatLng(reportCoords[1], reportCoords[0]),
      );

      if (distance > 100) {
        throw Exception('You are too far from the issue location to resolve it. Distance: ${distance.toStringAsFixed(1)}m. You must be within 100 meters to capture proof.');
      }

      final bytes = await photo.readAsBytes();
      await _reportService.proposeResolution(widget.reportId, bytes, photo.name);
      
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Resolution submitted successfully!'), backgroundColor: Colors.green),
      );
      _fetchReportDetails();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceAll('Exception: ', '')), 
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 4),
        ),
      );
    } finally {
      if (mounted) setState(() => _isUploadingResolution = false);
    }
  }

  void _showRatingDialog() {
    int selectedRating = 5;
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Verify Resolution'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Are you satisfied with the fix? This will close the issue and award you Green Credits.'),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) => IconButton(
                  icon: Icon(
                    index < selectedRating ? Icons.star : Icons.star_border,
                    color: Colors.amber,
                    size: 32,
                  ),
                  onPressed: () => setDialogState(() => selectedRating = index + 1),
                )),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _showDisputeDialog();
              }, 
              child: const Text('Dispute', style: TextStyle(color: Colors.red))
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                _handleConfirmResolution(selectedRating);
              },
              child: const Text('Confirm'),
            ),
          ],
        ),
      ),
    );
  }

  void _showDisputeDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Dispute Resolution'),
        content: TextField(
          controller: controller,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'Explain why the work is unsatisfactory...',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _handleDispute(controller.text);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Submit Dispute'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_error != null || _report == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Details')),
        body: Center(child: Text('Error: ${_error ?? "Report not found"}')),
      );
    }

    final status = _report!['status'] ?? 'Pending';
    final coords = _report!['location']?['coordinates'] ?? [0, 0];
    
    String imageUrl = 'https://via.placeholder.com/400x300';
    if (_report!['s3_image_urls'] != null && (_report!['s3_image_urls'] as List).isNotEmpty) {
      imageUrl = _report!['s3_image_urls'][0];
    } else if (_report!['minio_image_urls'] != null && (_report!['minio_image_urls'] as List).isNotEmpty) {
      imageUrl = _report!['minio_image_urls'][0];
    } else if (_report!['s3_pre_key'] != null) {
      imageUrl = _report!['s3_pre_key'];
    } else if (_report!['minio_pre_key'] != null) {
      imageUrl = _report!['minio_pre_key'];
    }
    final category = _report!['category'] ?? 'General';
    final description = _report!['description'] ?? 'No description provided.';
    final reportedAt = _report!['reported_at'] ?? DateTime.now().toIso8601String();
    final metadata = _report!['metadata'] ?? {};
    final resolutionImageUrl = metadata['resolution_image_url'] ?? _report!['resolution_image_url'];

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;
    
    final user = Supabase.instance.client.auth.currentUser;
    final isStaff = user?.userMetadata?['role'] == 'staff';

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 250,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Image.network(
                imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  color: colorScheme.surfaceContainerHighest,
                  child: Icon(Icons.broken_image, size: 50, color: colorScheme.onSurfaceVariant),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          category,
                          style: textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      StatusBadge(status: status),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Submitted on ${DateTime.parse(reportedAt).toLocal().toString().split('.')[0]}',
                    style: textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
                  ),
                  const Divider(height: 32),
                  
                  const SectionHeader(icon: Icons.description_outlined, title: 'Description'),
                  const SizedBox(height: 8),
                  Text(
                    description,
                    style: textTheme.bodyLarge?.copyWith(color: colorScheme.onSurface, height: 1.5),
                  ),
                  const SizedBox(height: 24),
                  
                  const SectionHeader(icon: Icons.location_on_outlined, title: 'Location'),
                  const SizedBox(height: 8),
                  Text(
                    'Latitude: ${coords[1]}, Longitude: ${coords[0]}',
                    style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                  ),
                  if (metadata['jurisdiction'] != null)
                    Text(
                      'Jurisdiction: ${metadata['jurisdiction']}',
                      style: textTheme.bodyMedium?.copyWith(
                        color: colorScheme.primary, 
                        fontWeight: FontWeight.bold
                      ),
                    ),
                  const SizedBox(height: 24),
                  
                  const SectionHeader(icon: Icons.info_outline, title: 'Report ID'),
                  const SizedBox(height: 4),
                  Text(
                    _report!['id'],
                    style: textTheme.bodySmall?.copyWith(
                      fontFamily: 'Courier',
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const Divider(height: 48),

                  if (status == 'Pending Confirmation' || status == 'Pending Citizen Confirmation' || status == 'Resolved') ...[
                    ResolutionEvidenceCard(resolutionImageUrl: resolutionImageUrl),
                  ],

                  if (isStaff && status != 'Resolved' && status != 'Pending Confirmation' && status != 'Pending Citizen Confirmation') ...[
                    FieldResolutionCard(
                      isUploadingResolution: _isUploadingResolution,
                      onCapturePressed: _handleProposeResolution,
                    ),
                  ],

                  if (status == 'Pending Citizen Confirmation') ...[
                    VerifyFixCard(
                      isConfirming: _isConfirming,
                      onVerifyPressed: _showRatingDialog,
                    ),
                  ],

                  if (status == 'Pending Confirmation') ...[
                    PendingApprovalCard(resolutionImageUrl: resolutionImageUrl),
                  ],

                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _isUpvoting ? null : _handleUpvote,
                          icon: _isUpvoting 
                            ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.thumb_up_outlined),
                          label: Text('Upvote (${metadata['upvote_count'] ?? 0})'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
