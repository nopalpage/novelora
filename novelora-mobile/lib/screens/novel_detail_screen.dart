import 'package:flutter/material.dart';
import '../models/novel.dart';
import '../models/chapter.dart';
import '../services/supabase_service.dart';
import 'chapter_read_screen.dart';

class NovelDetailScreen extends StatefulWidget {
  final Novel novel;
  
  const NovelDetailScreen({super.key, required this.novel});

  @override
  State<NovelDetailScreen> createState() => _NovelDetailScreenState();
}

class _NovelDetailScreenState extends State<NovelDetailScreen> {
  final _supabaseService = SupabaseService();
  List<Chapter> _chapters = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchChapters();
  }

  Future<void> _fetchChapters() async {
    try {
      final chapters = await _supabaseService.getNovelChapters(widget.novel.id);
      setState(() {
        _chapters = chapters;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error fetching chapters: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  widget.novel.coverUrl.isNotEmpty
                      ? Image.network(
                          widget.novel.coverUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(color: Colors.grey),
                        )
                      : Container(color: Colors.grey),
                  // Dark gradient overlay
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          Theme.of(context).scaffoldBackgroundColor,
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.novel.title,
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    widget.novel.author,
                    style: const TextStyle(fontSize: 16, color: Colors.grey),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      const Icon(Icons.remove_red_eye, size: 20, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text('${widget.novel.views} Views'),
                      const SizedBox(width: 16),
                      const Icon(Icons.star, size: 20, color: Colors.amber),
                      const SizedBox(width: 4),
                      Text('${widget.novel.rating}'),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Synopsis',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    widget.novel.description,
                    style: const TextStyle(fontSize: 14, height: 1.5),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Chapters',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            ),
          ),
          _isLoading
              ? const SliverToBoxAdapter(
                  child: Center(child: CircularProgressIndicator()),
                )
              : _chapters.isEmpty
                  ? const SliverToBoxAdapter(
                      child: Center(child: Text('No chapters yet.')),
                    )
                  : SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final chapter = _chapters[index];
                          return ListTile(
                            title: Text('Chapter ${chapter.chapterNumber}'),
                            subtitle: Text(chapter.title),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => ChapterReadScreen(chapterId: chapter.id),
                                ),
                              );
                            },
                          );
                        },
                        childCount: _chapters.length,
                      ),
                    ),
        ],
      ),
    );
  }
}
