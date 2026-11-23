import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:civic_connect_mobile/config/api_config.dart';

void main() {
  setUpAll(() {
    dotenv.loadFromString(
      envString: 'API_BASE_URL=https://civicconnect-ezaj.onrender.com/api\nLOCAL_API_BASE_URL=http://10.0.2.2:5000/api',
    );
  });

  group('ApiConfig Tests', () {
    test('Default endpoints construct correctly', () {
      expect(ApiConfig.baseUrl, equals('https://civicconnect-ezaj.onrender.com/api'));
      expect(ApiConfig.reportsUrl, equals('https://civicconnect-ezaj.onrender.com/api/reports'));
      expect(ApiConfig.nearbyReportsUrl, equals('https://civicconnect-ezaj.onrender.com/api/reports/nearby'));
      expect(ApiConfig.statsUrl, equals('https://civicconnect-ezaj.onrender.com/api/reports/stats'));
      expect(ApiConfig.usersUrl, equals('https://civicconnect-ezaj.onrender.com/api/users'));
      expect(ApiConfig.leaderboardUrl, equals('https://civicconnect-ezaj.onrender.com/api/users/leaderboard'));
    });

    test('Local fallback switches base URL appropriately', () {
      ApiConfig.useLocalFallback = true;
      expect(ApiConfig.baseUrl, equals('http://10.0.2.2:5000/api'));

      ApiConfig.useLocalFallback = false;
      expect(ApiConfig.baseUrl, equals('https://civicconnect-ezaj.onrender.com/api'));
    });

    test('getHeaders returns JSON content type by default', () {
      final headers = ApiConfig.getHeaders();
      expect(headers['Content-Type'], equals('application/json'));
    });

    test('getHeaders can omit content type for multipart requests', () {
      final headers = ApiConfig.getHeaders(includeContentType: false);
      expect(headers.containsKey('Content-Type'), isFalse);
    });
  });
}
