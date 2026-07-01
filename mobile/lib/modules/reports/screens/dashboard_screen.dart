import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:civic_connect_mobile/config/api_client.dart' as http;
import '../../../config/api_config.dart';
import '../widgets/dashboard_widgets.dart';
import '../../../shared/utils/verification_helper.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => DashboardScreenState();
}

class DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic> _stats = {
    'summary': [
      {'title': 'Total Issues', 'value': 0},
      {'value': 0, 'title': 'Resolved'},
    ]
  };
  List<dynamic> _recentReports = [];

  String _getRelativeTime(String? dateStr) {
    if (dateStr == null) return 'recently';
    try {
      final date = DateTime.parse(dateStr);
      final diff = DateTime.now().difference(date);
      if (diff.inSeconds < 60) return 'just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      if (diff.inDays < 7) return '${diff.inDays}d ago';
      return '${(diff.inDays / 7).floor()}w ago';
    } catch (_) {
      return 'recently';
    }
  }

  IconData _getCategoryIcon(String category) {
    category = category.toLowerCase();
    if (category.contains('pothole') || category.contains('road')) return Icons.engineering_rounded;
    if (category.contains('garbage') || category.contains('waste')) return Icons.delete_outline_rounded;
    if (category.contains('light')) return Icons.lightbulb_outline_rounded;
    if (category.contains('water')) return Icons.water_drop_outlined;
    if (category.contains('noise')) return Icons.volume_up_outlined;
    return Icons.warning_amber_rounded;
  }

  @override
  void initState() {
    super.initState();
    _fetchStats();
  }

  void refreshStats() => _fetchStats();

  Future<void> _fetchStats() async {
    if (!mounted) return;

    try {
      final user = Supabase.instance.client.auth.currentUser;
      String queryParams = '';
      if (user != null) {
        final identifier = user.phone ?? user.email ?? user.id;
        queryParams = '?user_id=$identifier';
      }

      final response = await http.get(
        Uri.parse('${ApiConfig.statsUrl}$queryParams'),
        headers: ApiConfig.getHeaders(),
      );

      final reportsResponse = await http.get(
        Uri.parse(ApiConfig.reportsUrl),
        headers: ApiConfig.getHeaders(),
      );

      if (response.statusCode == 200) {
        if (!mounted) return;
        setState(() {
          _stats = json.decode(response.body);
          if (reportsResponse.statusCode == 200) {
            final List<dynamic> allReports = json.decode(reportsResponse.body);
            _recentReports = allReports.take(5).toList();
          }
        });
      }
    } catch (_) {
      // Fail silently
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final summary = _stats['summary'] as List;
    final total = summary.firstWhere((s) => s['title'] == 'Total Issues', orElse: () => {'value': 0})['value'].toString();
    final credits = _stats['green_credits']?.toString() ?? '0';

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Stack(
        children: [
          Positioned(
            top: -100,
            right: -50,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF8B5CF6).withValues(alpha: isDark ? 0.08 : 0.05),
              ),
            ).animate().fadeIn(duration: 2.seconds).scale(begin: const Offset(0.8, 0.8)),
          ),
          
          SafeArea(
            child: RefreshIndicator(
              onRefresh: _fetchStats,
              color: const Color(0xFF8B5CF6),
              backgroundColor: theme.cardTheme.color,
              child: CustomScrollView(
                physics: const BouncingScrollPhysics(),
                slivers: [
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'CIVIC CONNECT',
                                    style: GoogleFonts.outfit(
                                      textStyle: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 4,
                                        color: const Color(0xFF8B5CF6),
                                      ),
                                    ),
                                  ).animate().fadeIn(duration: 800.ms).slideX(begin: -0.2),
                                  const SizedBox(height: 4),
                                  Text(
                                    'City Overview',
                                    style: theme.textTheme.headlineMedium?.copyWith(
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ).animate().fadeIn(delay: 200.ms, duration: 800.ms).slideX(begin: -0.1),
                                ],
                              ),
                              CircularAction(
                                icon: Icons.notifications_none_rounded,
                                onTap: () => Navigator.pushNamed(context, '/notifications'),
                              ).animate().fadeIn(delay: 400.ms).scale(),
                            ],
                          ),
                          const SizedBox(height: 32),
                        ],
                      ),
                    ),
                  ),

                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    sliver: SliverGrid(
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 16,
                        crossAxisSpacing: 16,
                        childAspectRatio: 0.85,
                      ),
                      delegate: SliverChildListDelegate([
                        BentoCard(
                          title: 'Submit\nReport',
                          subtitle: 'AI Sync Assist',
                          icon: Icons.add_rounded,
                          color: const Color(0xFF8B5CF6),
                          isLarge: true,
                          onTap: () {
                            if (VerificationHelper.checkVerification(context, action: 'submit reports')) {
                              Navigator.pushNamed(context, '/report');
                            }
                          },
                        ).animate().fadeIn(delay: 500.ms).scale(begin: const Offset(0.9, 0.9)),

                        StatBento(
                          label: 'Green Credits',
                          value: credits,
                          icon: Icons.eco_rounded,
                          color: const Color(0xFF10B981),
                        ).animate().fadeIn(delay: 600.ms).moveX(begin: 20),

                        StatBento(
                          label: 'My Logs',
                          value: total,
                          icon: Icons.analytics_outlined,
                          color: const Color(0xFF8B5CF6),
                        ).animate().fadeIn(delay: 700.ms).moveY(begin: 20),
                        
                        BentoCard(
                          title: 'Nearby',
                          subtitle: 'GIS Mapping',
                          icon: Icons.map_rounded,
                          color: const Color(0xFF3B82F6),
                          onTap: () => Navigator.pushNamed(context, '/nearby-issues'),
                        ).animate().fadeIn(delay: 800.ms).scale(begin: const Offset(0.9, 0.9)),
                      ]),
                    ),
                  ),

                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(24, 40, 24, 16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'RECENT PULSE',
                            style: GoogleFonts.outfit(
                              textStyle: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 2,
                                color: theme.textTheme.bodyMedium?.color?.withValues(alpha: 0.4),
                              ),
                            ),
                          ),
                          Text(
                            'VIEW ALL',
                            style: GoogleFonts.outfit(
                              textStyle: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF8B5CF6),
                              ),
                            ),
                          ),
                        ],
                      ).animate().fadeIn(delay: 1.seconds),
                    ),
                  ),

                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    sliver: _recentReports.isEmpty 
                      ? SliverToBoxAdapter(
                          child: Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32.0),
                              child: Text(
                                'No recent reports found.',
                                style: TextStyle(color: theme.hintColor.withValues(alpha: 0.5)),
                              ),
                            ),
                          ),
                        )
                      : SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final report = _recentReports[index];
                              return LogItem(
                                title: report['category'] ?? 'New Issue',
                                status: report['status'] ?? 'Pending',
                                time: _getRelativeTime(report['createdAt']),
                                icon: _getCategoryIcon(report['category'] ?? ''),
                              ).animate().fadeIn(delay: (1000 + (index * 100)).ms).slideX(begin: 0.1);
                            },
                            childCount: _recentReports.length,
                          ),
                        ),
                  ),
                  
                  const SliverToBoxAdapter(child: SizedBox(height: 100)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
