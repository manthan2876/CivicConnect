import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import 'package:civic_connect_mobile/config/api_client.dart' as http;
import '../../../config/api_config.dart';
import './report_detail_screen.dart';

class StaffDashboardScreen extends StatefulWidget {
  const StaffDashboardScreen({super.key});

  @override
  State<StaffDashboardScreen> createState() => _StaffDashboardScreenState();
}

class _StaffDashboardScreenState extends State<StaffDashboardScreen> {
  List<dynamic> _tasks = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchTasks();
  }

  Future<void> _fetchTasks() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.reportsUrl}?assigned_staff_id=me'),
        headers: ApiConfig.getHeaders(),
      );

      if (response.statusCode == 200) {
        if (mounted) {
          setState(() {
            _tasks = json.decode(response.body);
            _isLoading = false;
          });
        }
      } else {
        if (mounted) setState(() => _isLoading = false);
      }
    } catch (e) {
      debugPrint('Error fetching tasks: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('My Field Tasks', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        backgroundColor: theme.appBarTheme.backgroundColor,
        foregroundColor: theme.appBarTheme.foregroundColor,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _fetchTasks),
        ],
      ),
      body: _isLoading 
        ? _buildSkeletonList(theme)
        : _tasks.isEmpty
          ? const Center(child: Text('No assigned tasks right now. Great job!'))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _tasks.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final task = _tasks[index];
                return GestureDetector(
                  onTap: () async {
                    await Navigator.push(
                      context, 
                      MaterialPageRoute(builder: (context) => ReportDetailScreen(reportId: task['id']))
                    );
                    _fetchTasks(); // Refresh after returning in case it was resolved
                  },
                  child: _TaskListItem(task: task)
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

class _TaskListItem extends StatelessWidget {
  final Map<String, dynamic> task;

  const _TaskListItem({required this.task});

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
        border: isDark ? Border.all(color: theme.dividerColor) : Border.all(color: Colors.transparent),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    task['category'] ?? 'Issue Task',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                _StatusBadge(
                  status: task['status'] ?? 'Pending',
                  color: (task['status'] == 'Resolved') ? Colors.green : (task['status'] == 'In Progress' ? Colors.orange : theme.colorScheme.primary),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              task['description'] ?? 'No description provided.',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: theme.hintColor, fontSize: 14),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.map_outlined, size: 14, color: theme.colorScheme.secondary),
                const SizedBox(width: 4),
                Text(
                  'Priority: ${task['priority_score']?.toStringAsFixed(1) ?? 'N/A'}',
                  style: TextStyle(color: theme.colorScheme.secondary, fontSize: 13, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                Text(
                  'Resolve >',
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
