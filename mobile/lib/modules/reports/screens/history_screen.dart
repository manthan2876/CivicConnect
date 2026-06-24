import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:civic_connect_mobile/config/api_client.dart' as http;
import 'package:shimmer/shimmer.dart';
import '../../../config/api_config.dart';
import './report_detail_screen.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<dynamic> _reports = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchReports();
  }

  Future<void> _fetchReports() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    final identifier = user.phone ?? user.email ?? user.id;

    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.reportsUrl}?citizen_phone=$identifier'),
        headers: ApiConfig.getHeaders(),
      );

      if (response.statusCode == 200) {
        if (!mounted) return;
        setState(() {
          _reports = json.decode(response.body);
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error fetching reports: $e');
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('My Reports', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        backgroundColor: theme.appBarTheme.backgroundColor,
        foregroundColor: theme.appBarTheme.foregroundColor,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _fetchReports),
        ],
      ),
      body: _isLoading 
        ? _buildSkeletonList(theme)
        : _reports.isEmpty
          ? const Center(child: Text('No reports found'))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _reports.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final report = _reports[index];
                return GestureDetector(
                  onTap: () => Navigator.push(
                    context, 
                    MaterialPageRoute(builder: (context) => ReportDetailScreen(reportId: report['id']))
                  ),

                  child: _ReportListItem(report: report)
                );
              },
            ),
    );
  }

  Widget _buildSkeletonList(ThemeData theme) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 5,
      itemBuilder: (context, index) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Shimmer.fromColors(
            baseColor: theme.brightness == Brightness.dark ? Colors.grey[800]! : Colors.grey[300]!,
            highlightColor: theme.brightness == Brightness.dark ? Colors.grey[700]! : Colors.grey[100]!,
            child: Container(
              height: 120,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _ReportListItem extends StatelessWidget {
  final Map<String, dynamic> report;

  const _ReportListItem({required this.report});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: isDark ? [] : [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: isDark ? Border.all(color: theme.dividerColor) : null,
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
                _StatusBadge(
                  status: report['status'] ?? 'Submitted',
                  color: (report['status'] == 'Resolved') ? Colors.green : (report['status'] == 'In Progress' ? Colors.orange : theme.colorScheme.primary),
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
              children: [
                Icon(Icons.calendar_today, size: 14, color: theme.hintColor.withValues(alpha: 0.6)),
                const SizedBox(width: 4),
                Text(
                  report['reported_at'] != null ? report['reported_at'].toString().substring(0, 10) : 'Just now',
                  style: TextStyle(color: theme.hintColor.withValues(alpha: 0.6), fontSize: 12),
                ),

                const Spacer(),
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
