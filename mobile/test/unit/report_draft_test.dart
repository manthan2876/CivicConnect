import 'package:flutter_test/flutter_test.dart';
import 'package:civic_connect_mobile/modules/reports/models/report_draft.dart';

void main() {
  group('ReportDraft Model Tests', () {
    test('Initializes with default isSynced false', () {
      final now = DateTime.now();
      final draft = ReportDraft(
        category: 'Solid Waste Management',
        description: 'Overflowing dustbin near bus stop',
        imagePath: '/tmp/test_image.jpg',
        latitude: 21.223,
        longitude: 72.821,
        timestamp: now,
        citizenPhone: '+919111111111',
      );

      expect(draft.category, equals('Solid Waste Management'));
      expect(draft.description, equals('Overflowing dustbin near bus stop'));
      expect(draft.imagePath, equals('/tmp/test_image.jpg'));
      expect(draft.latitude, equals(21.223));
      expect(draft.longitude, equals(72.821));
      expect(draft.timestamp, equals(now));
      expect(draft.citizenPhone, equals('+919111111111'));
      expect(draft.isSynced, isFalse);
    });

    test('Allows modifying isSynced status after background upload', () {
      final draft = ReportDraft(
        category: 'Road Development',
        description: 'Pothole on main lane',
        imagePath: '/tmp/pothole.jpg',
        latitude: 21.155,
        longitude: 72.855,
        timestamp: DateTime.now(),
        citizenPhone: '+919222222222',
        isSynced: false,
      );

      draft.isSynced = true;
      expect(draft.isSynced, isTrue);
    });
  });
}
