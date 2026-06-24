import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ApiConfig {
  // Read primary and local fallback URLs
  static final String primaryBaseUrl = dotenv.get('API_BASE_URL', fallback: 'http://10.0.2.2:5000/api');
  static final String localBaseUrl = 'http://10.0.2.2:5000/api'; // standard Android emulator loopback to localhost:5000

  // Track if we shifted to local
  static bool useLocalFallback = false;

  static String get baseUrl => useLocalFallback ? localBaseUrl : primaryBaseUrl;
  
  static String get reportsUrl => '$baseUrl/reports';
  static String get nearbyReportsUrl => '$baseUrl/reports/nearby';
  static String get statsUrl => '$baseUrl/reports/stats';
  static String get usersUrl => '$baseUrl/users';
  static String get leaderboardUrl => '$baseUrl/users/leaderboard';


  static Map<String, String> getHeaders({bool includeContentType = true}) {
    final session = Supabase.instance.client.auth.currentSession;
    final token = session?.accessToken;
    
    return {
      if (includeContentType) 'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

}

