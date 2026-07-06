import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../services/user_service.dart';
import '../services/auth_service.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final UserService _userService = UserService();
  final AuthService _authService = AuthService();
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  bool _isLoading = false;
  Uint8List? _pickedImageBytes;
  String? _pickedImageName;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    final user = _userService.currentUser;
    _nameController = TextEditingController(text: user?.userMetadata?['full_name'] ?? '');
    _emailController = TextEditingController(text: user?.email ?? '');
    _phoneController = TextEditingController(text: user?.phone ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _sendPhoneVerification() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a phone number')),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      await _authService.updatePhone(phone);
      if (!mounted) return;
      setState(() => _isLoading = false);
      _showOtpDialog(phone);
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to send verification code: $e')),
      );
    }
  }

  void _showOtpDialog(String phone) {
    final otpController = TextEditingController();
    bool dialogLoading = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Verify Phone Number'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('We sent a 6-digit verification code to $phone'),
              const SizedBox(height: 16),
              TextField(
                controller: otpController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Verification Code',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: dialogLoading ? null : () async {
                final otp = otpController.text.trim();
                if (otp.isEmpty) return;

                setDialogState(() => dialogLoading = true);
                try {
                  await _authService.verifyPhoneChange(phone, otp);
                  if (context.mounted) {
                    Navigator.pop(context); // Close dialog
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Phone number verified successfully!')),
                    );
                    setState(() {}); // Refresh page to show verified status
                  }
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Invalid code: $e')),
                    );
                  }
                } finally {
                  setDialogState(() => dialogLoading = false);
                }
              },
              child: dialogLoading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Verify'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showImageSourceActionSheet(BuildContext context) async {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Camera'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Gallery'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: source,
        maxWidth: 500,
        maxHeight: 500,
        imageQuality: 85,
      );
      if (photo != null) {
        final bytes = await photo.readAsBytes();
        setState(() {
          _pickedImageBytes = bytes;
          _pickedImageName = photo.name;
        });
      }
    } catch (e) {
      debugPrint('Error picking image: $e');
    }
  }

  Future<void> _saveProfile() async {
    if (_formKey.currentState!.validate()) {
      setState(() => _isLoading = true);
      try {
        String? avatarUrl;
        if (_pickedImageBytes != null && _pickedImageName != null) {
          avatarUrl = await _userService.uploadAvatar(_pickedImageBytes!, _pickedImageName!);
        }

        await _userService.updateProfile(
          displayName: _nameController.text.trim(),
          photoURL: avatarUrl,
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Profile updated successfully')),
          );
          Navigator.pop(context, true);
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to update profile: $e')),
          );
        }
      } finally {
        if (mounted) setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final user = _userService.currentUser;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Profile', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: GestureDetector(
                      onTap: () => _showImageSourceActionSheet(context),
                      child: Stack(
                        children: [
                          CircleAvatar(
                            radius: 60,
                            backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.1),
                            child: _pickedImageBytes != null
                                ? ClipOval(
                                    child: Image.memory(
                                      _pickedImageBytes!,
                                      width: 120,
                                      height: 120,
                                      fit: BoxFit.cover,
                                    ),
                                  )
                                : user?.userMetadata?['avatar_url'] != null
                                    ? ClipOval(
                                        child: Image.network(
                                          user!.userMetadata!['avatar_url']!,
                                          width: 120,
                                          height: 120,
                                          fit: BoxFit.cover,
                                        ),
                                      )
                                    : Icon(Icons.person, size: 70, color: theme.colorScheme.primary),
                          ),
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: CircleAvatar(
                              backgroundColor: theme.colorScheme.secondary,
                              radius: 18,
                              child: const Icon(Icons.camera_alt, size: 18, color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  const Text('Full Name', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(
                      hintText: 'Enter your name',
                      prefixIcon: Icon(Icons.person_outline),
                    ),
                    validator: (value) => value == null || value.isEmpty ? 'Please enter your name' : null,
                  ),
                   const SizedBox(height: 20),
                  const Text('Email Address', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _emailController,
                    enabled: false, // Email usually handled via auth flow
                    decoration: const InputDecoration(
                      hintText: 'Email',
                      prefixIcon: Icon(Icons.email_outlined),
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text('Phone Number', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(
                            hintText: 'Enter phone number',
                            prefixIcon: Icon(Icons.phone_outlined),
                          ),
                          enabled: _userService.currentUser?.phone == null || _userService.currentUser!.phone!.isEmpty,
                        ),
                      ),
                      if (_userService.currentUser?.phone != null && _userService.currentUser!.phone!.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          decoration: BoxDecoration(
                            color: Colors.green.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.green.withValues(alpha: 0.3)),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.check_circle_outline, color: Colors.green, size: 20),
                              SizedBox(width: 4),
                              Text('Verified', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ] else ...[
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: _isLoading ? null : _sendPhoneVerification,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('Verify'),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 40),
                  ElevatedButton(
                    onPressed: _isLoading ? null : _saveProfile,
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size(double.infinity, 56),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: const Text('Save Changes', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ),
    );
  }
}
