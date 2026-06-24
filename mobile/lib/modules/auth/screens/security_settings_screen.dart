import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:civic_connect_mobile/config/api_client.dart' as http;
import 'dart:convert';
import '../../../config/api_config.dart';


class SecuritySettingsScreen extends StatefulWidget {
  const SecuritySettingsScreen({super.key});

  @override
  State<SecuritySettingsScreen> createState() => _SecuritySettingsScreenState();
}

class _SecuritySettingsScreenState extends State<SecuritySettingsScreen> {
  bool _biometricEnabled = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Security', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
      ),
      body: ListView(
        children: [
          _buildOptionTile(
            icon: Icons.lock_reset_outlined,
            title: 'Change Password',
            subtitle: 'Update your login password',
            onTap: _showChangePasswordDialog,
          ),
          _buildOptionTile(
            icon: Icons.devices_outlined,
            title: 'Connected Devices',
            subtitle: 'Manage devices where you are logged in',
            onTap: () {},
          ),
          const Divider(),
          SwitchListTile(
            secondary: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.blue.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.fingerprint, color: Colors.blue),
            ),
            title: const Text('Biometric Authentication', style: TextStyle(fontWeight: FontWeight.bold)),
            subtitle: const Text('Use fingerprint or face ID to unlock', style: TextStyle(fontSize: 12)),
            value: _biometricEnabled,
            activeThumbColor: Theme.of(context).colorScheme.primary,
            onChanged: (val) => setState(() => _biometricEnabled = val),
            contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          ),
          _buildOptionTile(
            icon: Icons.delete_forever_outlined,
            title: 'Delete Account',
            subtitle: 'Permanently remove your account and data',
            textColor: Colors.red,
            iconColor: Colors.red,
            onTap: () {
              // TODO: Implement account deletion with confirmation
            },
          ),
        ],
      ),
    );
  }

  void _showChangePasswordDialog() {
    final oldPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    bool isLoading = false;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Change Password'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: oldPasswordController,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Current Password'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: newPasswordController,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'New Password'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: confirmPasswordController,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Confirm New Password'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: isLoading ? null : () async {
                if (newPasswordController.text != confirmPasswordController.text) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Passwords do not match')),
                  );
                  return;
                }
                setDialogState(() => isLoading = true);
                try {
                  final response = await http.post(
                    Uri.parse('${ApiConfig.baseUrl}/auth/change-password'),
                    headers: ApiConfig.getHeaders(),
                    body: json.encode({
                      'currentPassword': oldPasswordController.text,
                      'newPassword': newPasswordController.text,
                    }),
                  );

                  if (response.statusCode == 200) {
                    if (context.mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Password changed successfully')),
                      );
                    }
                  } else {
                    final errorData = json.decode(response.body);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(errorData['message'] ?? 'Failed to change password')),
                      );
                    }
                  }
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Error: $e')),
                    );
                  }
                } finally {
                  setDialogState(() => isLoading = false);
                }
              },
              child: isLoading ? const CircularProgressIndicator() : const Text('Update'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOptionTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    Color? textColor,
    Color? iconColor,
  }) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: (iconColor ?? Colors.blue).withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: iconColor ?? Colors.blue),
      ),
      title: Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: textColor)),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
      trailing: const Icon(Icons.chevron_right, size: 20),
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
    );
  }
}
