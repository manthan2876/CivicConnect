import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:civic_connect_mobile/config/api_client.dart' as http;
import '../../../config/api_config.dart';

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
  bool _isLoading = true;

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
    setState(() => _isLoading = true);

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
          _isLoading = false;
        });
      } else {
        if (!mounted) return;
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final summary = _stats['summary'] as List;
    final total = summary.firstWhere((s) => s['title'] == 'Total Issues', orElse: () => {'value': 0})['value'].toString();
    final resolved = summary.firstWhere((s) => s['title'] == 'Resolved', orElse: () => {'value': 0})['value'].toString();
    final credits = _stats['green_credits']?.toString() ?? '0';

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Stack(
        children: [
          // Background Glows
          Positioned(
            top: -100,
            right: -50,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF8B5CF6).withOpacity(isDark ? 0.08 : 0.05),
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
                  // Custom Header
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
                              _CircularAction(
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

                  // Bento Grid
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
                        // Large Report Card
                        _BentoCard(
                          title: 'Submit\nReport',
                          subtitle: 'AI Sync Assist',
                          icon: Icons.add_rounded,
                          color: const Color(0xFF8B5CF6),
                          isLarge: true,
                          onTap: () => Navigator.pushNamed(context, '/report'),
                        ).animate().fadeIn(delay: 500.ms).scale(begin: const Offset(0.9, 0.9)),

                        // Green Credits Card (Primary Focus)
                        _StatBento(
                          label: 'Green Credits',
                          value: credits,
                          icon: Icons.eco_rounded,
                          color: const Color(0xFF10B981),
                        ).animate().fadeIn(delay: 600.ms).moveX(begin: 20),

                        // Stats Card
                        _StatBento(
                          label: 'My Logs',
                          value: total,
                          icon: Icons.analytics_outlined,
                          color: const Color(0xFF8B5CF6),
                        ).animate().fadeIn(delay: 700.ms).moveY(begin: 20),
                        
                        // Nearby Card
                        _BentoCard(
                          title: 'Nearby',
                          subtitle: 'GIS Mapping',
                          icon: Icons.map_rounded,
                          color: const Color(0xFF3B82F6),
                          onTap: () => Navigator.pushNamed(context, '/nearby-issues'),
                        ).animate().fadeIn(delay: 800.ms).scale(begin: const Offset(0.9, 0.9)),
                      ]),
                    ),
                  ),

                  // Feed Header
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
                                color: theme.textTheme.bodyMedium?.color?.withOpacity(0.4),
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

                  // Recent List
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    sliver: _recentReports.isEmpty 
                      ? SliverToBoxAdapter(
                          child: Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32.0),
                              child: Text(
                                'No recent reports found.',
                                style: TextStyle(color: theme.hintColor.withOpacity(0.5)),
                              ),
                            ),
                          ),
                        )
                      : SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final report = _recentReports[index];
                              return _LogItem(
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

class _CircularAction extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _CircularAction({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(50),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: isDark ? Colors.white.withOpacity(0.03) : Colors.black.withOpacity(0.03),
          border: Border.all(color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.05)),
        ),
        child: Icon(icon, color: isDark ? Colors.white : const Color(0xFF0F172A), size: 22),
      ),
    );
  }
}

class _BentoCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final bool isLarge;
  final VoidCallback onTap;

  const _BentoCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    this.isLarge = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(28),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isLarge 
                ? (isDark ? color.withOpacity(0.8) : color)
                : (isDark ? Colors.white.withOpacity(0.04) : Colors.white),
              borderRadius: BorderRadius.circular(28),
              border: Border.all(
                color: isLarge 
                  ? color.withOpacity(0.2) 
                  : (isDark ? Colors.white.withOpacity(0.05) : const Color(0xFFF1F5F9)),
                width: 1.5,
              ),
              boxShadow: isLarge && !isDark ? [
                BoxShadow(
                  color: color.withOpacity(0.2),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                )
              ] : null,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isLarge 
                      ? Colors.white.withOpacity(0.2) 
                      : color.withOpacity(0.1),
                  ),
                  child: Icon(
                    icon, 
                    color: isLarge ? Colors.white : color, 
                    size: 24
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.outfit(
                        textStyle: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          height: 1.1,
                          color: isLarge ? Colors.white : theme.textTheme.titleLarge?.color,
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: GoogleFonts.outfit(
                        textStyle: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: isLarge 
                            ? Colors.white.withOpacity(0.7) 
                            : theme.textTheme.bodyMedium?.color?.withOpacity(0.5),
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StatBento extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _StatBento({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF121214) : Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: isDark ? Colors.white.withOpacity(0.03) : const Color(0xFFF1F5F9),
        ),
        boxShadow: !isDark ? [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 20,
            offset: const Offset(0, 10),
          )
        ] : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color.withOpacity(isDark ? 0.4 : 0.6), size: 20),
          const Spacer(),
          Text(
            value,
            style: GoogleFonts.outfit(
              textStyle: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.w900,
                color: theme.textTheme.titleLarge?.color,
                letterSpacing: -1,
              ),
            ),
          ),
          Text(
            label.toUpperCase(),
            style: GoogleFonts.outfit(
              textStyle: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w900,
                color: theme.textTheme.bodyMedium?.color?.withOpacity(0.4),
                letterSpacing: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LogItem extends StatelessWidget {
  final String title;
  final String status;
  final String time;
  final IconData icon;

  const _LogItem({
    required this.title,
    required this.status,
    required this.time,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF121214) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? Colors.white.withOpacity(0.03) : const Color(0xFFF1F5F9),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFF8B5CF6).withOpacity(0.05),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: const Color(0xFF8B5CF6).withOpacity(0.8), size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.w800, 
                    color: theme.textTheme.titleLarge?.color, 
                    fontSize: 13
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  status.toUpperCase(),
                  style: GoogleFonts.outfit(
                    textStyle: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                      color: status == 'Resolved' ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                      letterSpacing: 1,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Text(
            time,
            style: TextStyle(
              color: theme.textTheme.bodyMedium?.color?.withOpacity(0.3), 
              fontSize: 10, 
              fontWeight: FontWeight.w700
            ),
          ),
        ],
      ),
    );
  }
}

