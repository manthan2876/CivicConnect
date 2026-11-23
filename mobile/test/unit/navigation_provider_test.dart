import 'package:flutter_test/flutter_test.dart';
import 'package:civic_connect_mobile/shared/providers/navigation_provider.dart';

void main() {
  group('NavigationProvider Tests', () {
    test('Default index is 0', () {
      final nav = NavigationProvider();
      expect(nav.currentIndex, equals(0));
    });

    test('setIndex updates index and notifies listeners', () {
      final nav = NavigationProvider();
      int notifyCount = 0;
      nav.addListener(() {
        notifyCount++;
      });

      nav.setIndex(2);
      expect(nav.currentIndex, equals(2));
      expect(notifyCount, equals(1));

      // Setting same index does not re-notify
      nav.setIndex(2);
      expect(notifyCount, equals(1));
    });
  });
}
