import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/novel.dart';
import '../services/supabase_service.dart';
import '../services/local_storage_service.dart';
import 'novel_detail_screen.dart';
import 'login_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _supabaseService = SupabaseService();
  List<Novel> _novels = [];
  bool _isLoading = true;
  User? _currentUser;

  @override
  void initState() {
    super.initState();
    _fetchNovels();
    _currentUser = _supabaseService.currentUser;
    _supabaseService.authStateChanges.listen((user) {
      if (mounted) {
        setState(() {
          _currentUser = user.session?.user; // In Supabase, AuthState contains session which has user
        });
      }
    });
  }

  final _localStorage = LocalStorageService();

  Future<void> _fetchNovels() async {
    try {
      // 1. Try to load from cache first for fast display
      final cachedNovels = await _localStorage.getNovels();
      if (cachedNovels != null && cachedNovels.isNotEmpty) {
        setState(() {
          _novels = cachedNovels;
          _isLoading = false;
        });
      }

      // 2. Fetch fresh data from Supabase
      final novels = await _supabaseService.getNovels(limit: 20);
      
      // 3. Save to local storage
      await _localStorage.saveNovels(novels);
      
      if (mounted) {
        setState(() {
          _novels = novels;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error fetching novels: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Novelora',
          style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF6366F1)),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {},
          ),
          if (_currentUser == null)
            TextButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                );
              },
              child: const Text('Login'),
            )
          else
            PopupMenuButton<String>(
              icon: const Icon(Icons.person),
              onSelected: (value) {
        if (value == 'logout') {
          _supabaseService.signOut();
        }
      },
              itemBuilder: (BuildContext context) {
                return [
                  const PopupMenuItem(
                    value: 'logout',
                    child: Text('Logout'),
                  ),
                ];
              },
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _novels.isEmpty
              ? const Center(child: Text('No novels found.'))
              : RefreshIndicator(
                  onRefresh: _fetchNovels,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _novels.length,
                    itemBuilder: (context, index) {
                      final novel = _novels[index];
                      return _NovelCard(novel: novel);
                    },
                  ),
                ),
    );
  }
}

class _NovelCard extends StatelessWidget {
  final Novel novel;
  const _NovelCard({required this.novel});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      color: const Color(0xFF1E1E20),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => NovelDetailScreen(novel: novel),
            ),
          );
        },
        child: Row(

          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRElevated(
              borderRadius: const BorderRadius.horizontal(left: Radius.circular(12)),
              child: novel.coverUrl.isNotEmpty
                  ? Image.network(
                      novel.coverUrl,
                      width: 100,
                      height: 150,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          _placeholderImage(),
                    )
                  : _placeholderImage(),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      novel.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      novel.author,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Colors.grey,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.remove_red_eye, size: 16, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text(
                          '${novel.views}',
                          style: const TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                        const SizedBox(width: 12),
                        const Icon(Icons.star, size: 16, color: Colors.amber),
                        const SizedBox(width: 4),
                        Text(
                          '${novel.rating}',
                          style: const TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF6366F1).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        novel.origin.isNotEmpty ? novel.origin : 'ID',
                        style: const TextStyle(
                          color: Color(0xFF6366F1),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeholderImage() {
    return Container(
      width: 100,
      height: 150,
      color: const Color(0xFF2A2A2C),
      child: const Icon(Icons.book, color: Colors.grey),
    );
  }
}

// Widget Helper
class ClipRElevated extends StatelessWidget {
  final Widget child;
  final BorderRadius borderRadius;
  const ClipRElevated({super.key, required this.child, required this.borderRadius});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: borderRadius,
      child: child,
    );
  }
}
