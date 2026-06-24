import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:provider/provider.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';

import 'modules/auth/screens/login_screen.dart';
import 'modules/auth/screens/signup_screen.dart';
import 'modules/reports/models/report_draft.dart';
import 'modules/reports/services/sync_service.dart';
import 'main_navigation.dart';
import 'modules/reports/screens/report_form_screen.dart';
import 'modules/reports/screens/nearby_issues_screen.dart';
import 'modules/reports/screens/notification_list_screen.dart';
import 'shared/providers/theme_provider.dart';
import 'shared/providers/navigation_provider.dart';
import 'modules/reports/services/notification_service.dart';
import 'modules/auth/screens/splash_screen.dart';

void main() async {
  try {
    print("RUNNING MAIN WITH FIREBASE WEB FIX");
    WidgetsFlutterBinding.ensureInitialized();
    
    try {
      print("Initializing Firebase with Default Options...");
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
    } catch (e) {
      debugPrint("Firebase initialization failed: $e");
    }
    
    await dotenv.load(fileName: ".env");
    await Hive.initFlutter();
    Hive.registerAdapter(ReportDraftAdapter());
    await Hive.openBox<ReportDraft>('report_drafts');
    await Hive.openBox('settings');

    SyncService.initialize();

    await Supabase.initialize(
      url: dotenv.get('SUPABASE_URL'),
      anonKey: dotenv.get('SUPABASE_ANON_KEY'),
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.implicit,
      ),
    );

    runApp(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => ThemeProvider()),
          ChangeNotifierProvider(create: (_) => NavigationProvider()),
        ],
        child: const MyApp(),
      ),
    );
  } catch (e, stack) {
    debugPrint("CRITICAL STARTUP ERROR: $e");
    debugPrint("STACK TRACE: $stack");
    // Show a minimal error app if initialization fails
    runApp(MaterialApp(home: Scaffold(body: Center(child: Text("App failed to start: $e")))));
  }
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final NotificationService _notificationService = NotificationService();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _notificationService.initialize(context);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();

    return MaterialApp(
      title: 'CivicConnect',
      debugShowCheckedModeBanner: false,
      themeMode: themeProvider.themeMode,
      theme: ThemeData(
        brightness: Brightness.light,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC), // Platinum White
        primaryColor: const Color(0xFF8B5CF6), // Violet
        colorScheme: const ColorScheme.light(
          primary: Color(0xFF8B5CF6),
          secondary: Color(0xFF10B981), // Emerald
          surface: Colors.white,
          surfaceContainer: Color(0xFFF1F5F9),
          onSurface: Color(0xFF0F172A),
          error: Color(0xFFF43F5E),
        ),
        textTheme: GoogleFonts.outfitTextTheme(ThemeData.light().textTheme).copyWith(
          displayLarge: GoogleFonts.outfit(fontWeight: FontWeight.w900, letterSpacing: -1.5, color: const Color(0xFF0F172A)),
          headlineMedium: GoogleFonts.outfit(fontWeight: FontWeight.w800, letterSpacing: -0.5, color: const Color(0xFF0F172A)),
          titleLarge: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)),
          bodyMedium: GoogleFonts.outfit(fontWeight: FontWeight.w500, color: const Color(0xFF334155)),
        ),
        appBarTheme: AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          centerTitle: true,
          iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
          titleTextStyle: GoogleFonts.outfit(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
            color: const Color(0xFF0F172A),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF8B5CF6),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 4,
            shadowColor: const Color(0xFF8B5CF6).withOpacity(0.3),
            textStyle: GoogleFonts.outfit(fontWeight: FontWeight.w800, letterSpacing: 0.5),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: const BorderSide(color: Color(0xFF8B5CF6), width: 1.5),
          ),
          contentPadding: const EdgeInsets.all(20),
          hintStyle: GoogleFonts.outfit(color: const Color(0xFF94A3B8), fontWeight: FontWeight.w500),
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: const BorderSide(color: Color(0xFFF1F5F9)),
          ),
          elevation: 2,
          shadowColor: Colors.black.withOpacity(0.04),
        ),
      ),
      darkTheme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF030304), // Ultra deep black
        primaryColor: const Color(0xFF8B5CF6), // Violet
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF8B5CF6),
          secondary: Color(0xFF10B981), // Emerald
          surface: Color(0xFF121214), // Glass-like surface base
          surfaceContainer: Color(0xFF1A1A1D),
          onSurface: Colors.white,
          error: Color(0xFFF43F5E), // Rose
        ),
        textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme).copyWith(
          displayLarge: GoogleFonts.outfit(fontWeight: FontWeight.w900, letterSpacing: -1.5),
          headlineMedium: GoogleFonts.outfit(fontWeight: FontWeight.w800, letterSpacing: -0.5),
          titleLarge: GoogleFonts.outfit(fontWeight: FontWeight.w700),
          bodyMedium: GoogleFonts.outfit(fontWeight: FontWeight.w500),
        ),
        appBarTheme: AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          centerTitle: true,
          titleTextStyle: GoogleFonts.outfit(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
            color: Colors.white,
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF8B5CF6),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 0,
            textStyle: GoogleFonts.outfit(fontWeight: FontWeight.w800, letterSpacing: 0.5),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white.withOpacity(0.04),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: const BorderSide(color: Color(0xFF8B5CF6), width: 1.5),
          ),
          contentPadding: const EdgeInsets.all(20),
          hintStyle: GoogleFonts.outfit(color: Colors.grey.shade600, fontWeight: FontWeight.w500),
        ),
        cardTheme: CardThemeData(
          color: const Color(0xFF121214),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: BorderSide(color: Colors.white.withOpacity(0.04)),
          ),
          elevation: 0,
        ),
      ),
      home: const SplashScreen(),
      routes: {
        '/login': (context) => const LoginScreen(),
        '/signup': (context) => const SignUpScreen(),
        '/home': (context) => const MainNavigationScreen(),
        '/report': (context) => const ReportFormScreen(),
        '/nearby-issues': (context) => const NearbyIssuesScreen(),
        '/notifications': (context) => const NotificationListScreen(),
      },
    );
  }
}
