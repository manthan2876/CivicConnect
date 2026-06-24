import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:civic_connect_mobile/config/api_client.dart' as http;
import '../../../config/api_config.dart';

class UserService {
  final SupabaseClient _client = Supabase.instance.client;

  User? get currentUser => _client.auth.currentUser;

  Future<void> updateProfile({
    String? displayName, 
    String? photoURL,
    Map<String, double>? homeLocation,
    int? alertRadius,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) return;

    // 1. Update Supabase Auth Metadata
    if (displayName != null || photoURL != null) {
      await _client.auth.updateUser(
        UserAttributes(
          data: {
            'full_name': ?displayName,
            'avatar_url': ?photoURL,
          },
        ),
      );
    }

    // 2. Update Public DB Profile via Backend API
    try {
      final body = <String, dynamic>{
        'home_location': ?homeLocation,
        'alert_radius_meters': ?alertRadius,
      };


      if (body.isNotEmpty) {
        final response = await http.patch(
          Uri.parse('${ApiConfig.usersUrl}/${user.id}'),
          headers: ApiConfig.getHeaders(),
          body: json.encode(body),
        );
        if (response.statusCode != 200) {
          throw Exception('Failed to update DB profile: ${response.body}');
        }
      }
    } catch (e) {
      debugPrint('Error updating public DB profile: $e');
    }
  }


  Future<Map<String, dynamic>> getUserStats() async {
    final user = _client.auth.currentUser;
    if (user == null) return {'total': 0, 'resolved': 0, 'rank': 'Newbie'};

    try {
      final identifier = user.phone ?? user.email ?? user.id;
      final response = await http.get(
        Uri.parse('${ApiConfig.statsUrl}?citizen_phone=$identifier'),
        headers: ApiConfig.getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'total': data['total'].toString(),
          'resolved': data['resolved'].toString(),
          'rank': data['rank'] ?? 'Newbie',
        };
      }
      return {'total': '0', 'resolved': '0', 'rank': 'Newbie'};
    } catch (e) {
      debugPrint('Error fetching user stats: $e');
      return {'total': '0', 'resolved': '0', 'rank': 'Newbie'};
    }
  }

  Future<List<dynamic>> getLeaderboard() async {
    try {
      final response = await http.get(
        Uri.parse(ApiConfig.leaderboardUrl),
        headers: ApiConfig.getHeaders(),
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching leaderboard: $e');
      return [];
    }
  }

}
