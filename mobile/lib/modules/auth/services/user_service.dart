import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:civic_connect_mobile/config/api_client.dart' as http;
import 'package:http/http.dart' as raw_http;
import 'package:http_parser/http_parser.dart' as http_parser;
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
            if (displayName != null) 'full_name': displayName,
            if (photoURL != null) 'avatar_url': photoURL,
          },
        ),
      );
    }

    // 2. Update Public DB Profile via Backend API
    try {
      final body = <String, dynamic>{
        if (homeLocation != null) 'home_location': homeLocation,
        if (alertRadius != null) 'alert_radius_meters': alertRadius,
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

  Future<String?> uploadAvatar(Uint8List bytes, String filename) async {
    final user = _client.auth.currentUser;
    if (user == null) return null;

    try {
      // Create request URL pointing to users/avatar
      final url = Uri.parse('${ApiConfig.usersUrl}/avatar');
      
      // Determine request URL based on fallback config
      final requestUrl = ApiConfig.useLocalFallback 
          ? Uri.parse(url.toString().replaceFirst(ApiConfig.primaryBaseUrl, ApiConfig.localBaseUrl)) 
          : url;

      final request = raw_http.MultipartRequest('POST', requestUrl);
      request.headers.addAll(ApiConfig.getHeaders(includeContentType: false));

      final extension = filename.split('.').last.toLowerCase();
      final subType = (extension == 'jpg' || extension == 'jpeg') ? 'jpeg' : extension;

      request.files.add(
        raw_http.MultipartFile.fromBytes(
          'avatar',
          bytes,
          filename: filename,
          contentType: http_parser.MediaType('image', subType),
        ),
      );

      final streamedResponse = await request.send().timeout(const Duration(seconds: 30));
      final response = await raw_http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['avatar_url'];
      } else {
        throw Exception('Failed to upload avatar: ${response.body}');
      }
    } catch (e) {
      debugPrint('Error uploading avatar: $e');
      rethrow;
    }
  }
  Future<Map<String, dynamic>?> getProfile() async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.usersUrl}/me'),
        headers: ApiConfig.getHeaders(),
      );
      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return null;
    } catch (e) {
      debugPrint('Error getting user profile: $e');
      return null;
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
