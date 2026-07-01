import 'package:flutter/material.dart';
import 'package:hive/hive.dart';

class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen> {
  bool _pushNotifications = true;
  bool _emailNotifications = true;
  bool _reportUpdates = true;
  bool _communityAlerts = false;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  void _loadSettings() {
    final box = Hive.box('settings');
    setState(() {
      _pushNotifications = box.get('push_notifications', defaultValue: true);
      _emailNotifications = box.get('email_notifications', defaultValue: true);
      _reportUpdates = box.get('report_updates', defaultValue: true);
      _communityAlerts = box.get('community_alerts', defaultValue: false);
    });
  }

  void _updateSetting(String key, bool val) {
    final box = Hive.box('settings');
    box.put(key, val);
    setState(() {
      if (key == 'push_notifications') _pushNotifications = val;
      if (key == 'email_notifications') _emailNotifications = val;
      if (key == 'report_updates') _reportUpdates = val;
      if (key == 'community_alerts') _communityAlerts = val;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
      ),
      body: ListView(
        children: [
          _buildSwitchTile(
            title: 'Push Notifications',
            subtitle: 'Receive alerts on your device',
            value: _pushNotifications,
            onChanged: (val) => _updateSetting('push_notifications', val),
          ),
          _buildSwitchTile(
            title: 'Email Notifications',
            subtitle: 'Receive updates via email',
            value: _emailNotifications,
            onChanged: (val) => _updateSetting('email_notifications', val),
          ),
          const Divider(),
          _buildSwitchTile(
            title: 'Report Updates',
            subtitle: 'Get notified when your report status changes',
            value: _reportUpdates,
            onChanged: (val) => _updateSetting('report_updates', val),
          ),
          _buildSwitchTile(
            title: 'Community Alerts',
            subtitle: 'Stay informed about issues in your area',
            value: _communityAlerts,
            onChanged: (val) => _updateSetting('community_alerts', val),
          ),
        ],
      ),
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required bool value,
    required Function(bool) onChanged,
  }) {
    return SwitchListTile(
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
      value: value,
      onChanged: onChanged,
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      activeThumbColor: Theme.of(context).colorScheme.primary,
    );
  }
}
