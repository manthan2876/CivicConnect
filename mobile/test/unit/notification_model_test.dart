import 'package:flutter_test/flutter_test.dart';
import 'package:civic_connect_mobile/modules/notifications/models/notification_model.dart';

void main() {
  group('NotificationModel Tests', () {
    test('fromJson correctly parses notification payload', () {
      final json = {
        'id': 'notif-123',
        'title': 'Resolution Verified',
        'body': 'Your report has been resolved and approved.',
        'is_read': true,
        'createdAt': '2026-11-23T01:30:00.000Z',
        'data': {'issue_id': 'issue-456', 'type': 'RESOLVED'}
      };

      final notif = NotificationModel.fromJson(json);

      expect(notif.id, equals('notif-123'));
      expect(notif.title, equals('Resolution Verified'));
      expect(notif.body, equals('Your report has been resolved and approved.'));
      expect(notif.isRead, isTrue);
      expect(notif.createdAt, equals(DateTime.parse('2026-11-23T01:30:00.000Z')));
      expect(notif.data?['issue_id'], equals('issue-456'));
    });

    test('fromJson handles default is_read and null data', () {
      final json = {
        'id': 'notif-789',
        'title': 'New Nearby Issue',
        'body': 'A new report was filed in your ward.',
        'createdAt': '2026-11-23T02:00:00.000Z',
      };

      final notif = NotificationModel.fromJson(json);

      expect(notif.id, equals('notif-789'));
      expect(notif.isRead, isFalse);
      expect(notif.data, isNull);
    });
  });
}
