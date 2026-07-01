import 'package:flutter/material.dart';
import '../../reports/services/notification_service.dart';
import '../models/notification_model.dart';
import 'package:intl/intl.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  final NotificationService _notificationService = NotificationService();
  List<NotificationModel> _notifications = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoading = true);
    final data = await _notificationService.getNotifications();
    if (!mounted) return;
    setState(() {
      _notifications = data.map((n) => NotificationModel.fromJson(n)).toList();
      _isLoading = false;
    });
  }

  Future<void> _markAsRead(String id) async {
    await _notificationService.markAsRead(id);
    if (!mounted) return;
    setState(() {
      final index = _notifications.indexWhere((n) => n.id == id);
      if (index != -1) {
        _notifications[index] = NotificationModel(
          id: _notifications[index].id,
          title: _notifications[index].title,
          body: _notifications[index].body,
          isRead: true,
          createdAt: _notifications[index].createdAt,
          data: _notifications[index].data,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Notifications', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadNotifications,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: _loadNotifications,
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    itemCount: _notifications.length,
                    separatorBuilder: (context, index) => const Divider(height: 1, indent: 72),
                    itemBuilder: (context, index) {
                      final notification = _notifications[index];
                      return _buildNotificationItem(notification, theme);
                    },
                  ),
                ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.notifications_none_outlined, size: 80, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            'All caught up!',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey[600]),
          ),
          const SizedBox(height: 8),
          Text(
            'You have no new notifications.',
            style: TextStyle(color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationItem(NotificationModel notification, ThemeData theme) {
    return ListTile(
      onTap: () {
        if (!notification.isRead) {
          _markAsRead(notification.id);
        }
        // Potential: Navigate to issue details if issue_id is in data
        if (notification.data != null && notification.data!['issue_id'] != null) {
          // Navigator.pushNamed(context, '/issue-details', arguments: notification.data!['issue_id']);
        }
      },
      leading: CircleAvatar(
        backgroundColor: notification.isRead ? Colors.grey[100] : theme.colorScheme.primary.withValues(alpha: 0.1),
        child: Icon(
          _getIconForNotification(notification.title),
          color: notification.isRead ? Colors.grey[400] : theme.colorScheme.primary,
        ),
      ),
      title: Text(
        notification.title,
        style: TextStyle(
          fontWeight: notification.isRead ? FontWeight.normal : FontWeight.bold,
          fontSize: 15,
        ),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 4),
          Text(
            notification.body,
            style: TextStyle(color: Colors.grey[600], fontSize: 13),
          ),
          const SizedBox(height: 4),
          Text(
            DateFormat('MMM dd, hh:mm a').format(notification.createdAt),
            style: TextStyle(color: Colors.grey[400], fontSize: 11),
          ),
        ],
      ),
      trailing: !notification.isRead
          ? Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary,
                shape: BoxShape.circle,
              ),
            )
          : null,
    );
  }

  IconData _getIconForNotification(String title) {
    final t = title.toLowerCase();
    if (t.contains('resolved')) return Icons.check_circle_outline;
    if (t.contains('assigned')) return Icons.assignment_ind_outlined;
    if (t.contains('comment')) return Icons.chat_bubble_outline;
    if (t.contains('reward') || t.contains('credit')) return Icons.stars_outlined;
    return Icons.notifications_outlined;
  }
}
