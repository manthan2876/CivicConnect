import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:civic_connect_mobile/shared/utils/responsive_helper.dart';

void main() {
  group('Responsive Widget Tests', () {
    testWidgets('Renders mobile widget when screen width < 600', (tester) async {
      tester.view.physicalSize = const Size(400, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(
        const MaterialApp(
          home: Responsive(
            mobile: Text('Mobile View'),
            desktop: Text('Desktop View'),
          ),
        ),
      );

      expect(find.text('Mobile View'), findsOneWidget);
      expect(find.text('Desktop View'), findsNothing);
    });

    testWidgets('Renders tablet widget when 600 <= screen width < 1100', (tester) async {
      tester.view.physicalSize = const Size(768, 1024);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(
        const MaterialApp(
          home: Responsive(
            mobile: Text('Mobile View'),
            tablet: Text('Tablet View'),
            desktop: Text('Desktop View'),
          ),
        ),
      );

      expect(find.text('Tablet View'), findsOneWidget);
      expect(find.text('Mobile View'), findsNothing);
      expect(find.text('Desktop View'), findsNothing);
    });

    testWidgets('Renders desktop widget when screen width >= 1100', (tester) async {
      tester.view.physicalSize = const Size(1200, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(
        const MaterialApp(
          home: Responsive(
            mobile: Text('Mobile View'),
            desktop: Text('Desktop View'),
          ),
        ),
      );

      expect(find.text('Desktop View'), findsOneWidget);
      expect(find.text('Mobile View'), findsNothing);
    });
  });
}
