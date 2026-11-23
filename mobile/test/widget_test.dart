import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:civic_connect_mobile/modules/reports/widgets/nearby_report_item.dart';

void main() {
  group('Mobile Widget Smoke Tests', () {
    testWidgets('NearbyReportListItem renders issue category and distance', (tester) async {
      final mockReport = {
        'id': 'issue-uuid-1234',
        'category': 'Solid Waste Management',
        'description': 'Garbage pile near Adajan market',
        'status': 'Pending',
        'priority_score': 8.5,
        'distance': 0.45, // 450 m
        's3_pre_key': null,
      };

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: NearbyReportListItem(report: mockReport),
          ),
        ),
      );

      expect(find.text('Solid Waste Management'), findsOneWidget);
      expect(find.text('450 m away'), findsOneWidget);
      expect(find.text('Pending'), findsOneWidget);
    });

    testWidgets('NearbyReportListItem formats kilometer distance correctly', (tester) async {
      final mockReport = {
        'id': 'issue-uuid-5678',
        'category': 'Street Light',
        'description': 'Broken lamp post',
        'status': 'In Progress',
        'priority_score': 6.0,
        'distance': 2.34, // 2.3 km
        's3_pre_key': null,
      };

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: NearbyReportListItem(report: mockReport),
          ),
        ),
      );

      expect(find.text('Street Light'), findsOneWidget);
      expect(find.text('2.3 km away'), findsOneWidget);
      expect(find.text('In Progress'), findsOneWidget);
    });
  });
}
