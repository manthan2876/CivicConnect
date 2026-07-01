import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';

class ThemeProvider with ChangeNotifier {
  static const String _boxName = 'settings';
  static const String _themeKey = 'theme_mode';

  ThemeMode _themeMode = ThemeMode.dark;

  ThemeMode get themeMode => _themeMode;

  ThemeProvider() {
    _loadTheme();
  }

  void _loadTheme() {
    final box = Hive.box(_boxName);
    final themeIndex = box.get(_themeKey, defaultValue: ThemeMode.dark.index);
    _themeMode = ThemeMode.values[themeIndex];
    notifyListeners();
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    _themeMode = mode;
    final box = Hive.box(_boxName);
    await box.put(_themeKey, mode.index);
    notifyListeners();
  }

  bool get isDarkMode => _themeMode == ThemeMode.dark;
  
  void toggleTheme(bool isOn) {
    setThemeMode(isOn ? ThemeMode.dark : ThemeMode.light);
  }
}
