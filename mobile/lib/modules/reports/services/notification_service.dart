import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/material.dart';
import 'package:civic_connect_mobile/config/api_client.dart' as http;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../../../config/api_config.dart';

class NotificationService {
  final SupabaseClient _client = Supabase.instance.client;
  final FlutterLocalNotificationsPlugin _localNotificationsPlugin = FlutterLocalNotificationsPlugin();
  
  FirebaseMessaging? get _fcm => kIsWeb ? null : FirebaseMessaging.instance;
  RealtimeChannel? _notificationChannel;

  Future<void> initialize(BuildContext context) async {
    // 1. Local Notifications Setup
    if (!kIsWeb) {
      const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
      const iosInit = DarwinInitializationSettings();
      const initSettings = InitializationSettings(android: androidInit, iOS: iosInit);
      
      await (_localNotificationsPlugin as dynamic).initialize(initSettings);
      
      _localNotificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
    }

    // 2. FCM Setup
    if (_fcm != null) {
      await _setupFirebaseMessaging();
    }

    // 3. Auth State Listener
    _client.auth.onAuthStateChange.listen((data) async {
      final session = data.session;
      if (session != null) {
        final user = session.user;
        _setupRealtimeSubscription(user.id);
        if (_fcm != null) _registerDeviceToken(); // Register FCM token on login
      } else {
        _notificationChannel?.unsubscribe();
        _notificationChannel = null;
      }
    });

    // Handle initial user if already logged in
    final currentUser = _client.auth.currentUser;
    if (currentUser != null) {
      _setupRealtimeSubscription(currentUser.id);
      if (_fcm != null) _registerDeviceToken();
    }
  }

  Future<void> _setupFirebaseMessaging() async {
    // Request permission (iOS/Android 13+)
    await _fcm?.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      if (message.notification != null) {
        _showLocalNotification(
          message.notification!.title ?? 'CivicConnect Update',
          message.notification!.body ?? '',
          data: message.data,
        );
      }
    });

    // Handle app opening from notification
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('A new onMessageOpenedApp event was published!');
    });
  }

  Future<void> _registerDeviceToken() async {
    try {
      final token = await _fcm?.getToken();
      if (token != null) {
        debugPrint('[FCM] Device Token: $token');
        await http.post(
          Uri.parse('${ApiConfig.baseUrl}/users/device-token'),
          headers: ApiConfig.getHeaders(),
          body: json.encode({'fcm_token': token}),
        );
      }
    } catch (e) {
      debugPrint('[FCM] Token registration failed: $e');
    }
  }

  void _setupRealtimeSubscription(String userId) {
    if (_notificationChannel != null) return;

    _notificationChannel = _client.channel('notifications:$userId');
    _notificationChannel!.onBroadcast(
      event: 'new_notification',
      callback: (payload) {
        _showLocalNotification(
          payload['title'] ?? 'CivicConnect Update', 
          payload['body'] ?? '',
          data: payload['data'],
        );
      }
    ).subscribe();
  }

  Future<void> _showLocalNotification(String title, String body, {Map<String, dynamic>? data}) async {
    if (kIsWeb) {
      debugPrint('[Web Notification] $title: $body');
      return;
    }
    
    const androidDetails = AndroidNotificationDetails(
      'civic_updates', 
      'Civic Updates',
      channelDescription: 'Important updates about your reports',
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
    );
    const notificationDetails = NotificationDetails(android: androidDetails, iOS: DarwinNotificationDetails());
    
    await (_localNotificationsPlugin as dynamic).show(
      DateTime.now().millisecond,
      title,
      body,
      notificationDetails,
      payload: data != null ? json.encode(data) : null,
    );
  }

  Future<List<dynamic>> getNotifications() async {
    final user = _client.auth.currentUser;
    if (user == null) return [];

    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/notifications'),
        headers: ApiConfig.getHeaders(),
      );
      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching notifications: $e');
      return [];
    }
  }

  Future<void> markAsRead(String notificationId) async {
    try {
      await http.patch(
        Uri.parse('${ApiConfig.baseUrl}/notifications/$notificationId/read'),
        headers: ApiConfig.getHeaders(),
      );
    } catch (e) {
      debugPrint('Error marking notification as read: $e');
    }
  }
}
