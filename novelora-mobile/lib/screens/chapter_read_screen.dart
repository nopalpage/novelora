import 'package:flutter/material.dart';
import '../models/chapter.dart';
import '../services/supabase_service.dart';
import '../services/local_storage_service.dart';

class ChapterReadScreen extends StatefulWidget {
  final String chapterId;

  const ChapterReadScreen({super.key, required this.chapterId});

  @override
  State<ChapterReadScreen> createState() => _ChapterReadScreenState();
}

class _ChapterReadScreenState extends State<ChapterReadScreen> {
  final _supabaseService = SupabaseService();
  Chapter? _chapter;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchContent();
  }

  final _localStorage = LocalStorageService();

  Future<void> _fetchContent() async {
    try {
      // 1. Try to load from cache
      final cachedChapter = await _localStorage.getChapterContent(widget.chapterId);
      if (cachedChapter != null) {
        setState(() {
          _chapter = cachedChapter;
          _isLoading = false;
        });
      }

      // 2. Fetch fresh data
      final chapter = await _supabaseService.getChapterContent(widget.chapterId);
      
      // 3. Save to local storage
      await _localStorage.saveChapterContent(widget.chapterId, chapter);

      if (mounted) {
        setState(() {
          _chapter = chapter;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error fetching chapter: $e');
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
        title: _isLoading 
            ? const Text('Loading...') 
            : Text('Chapter ${_chapter?.chapterNumber}'),
        backgroundColor: const Color(0xFF121213),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _chapter == null
              ? const Center(child: Text('Failed to load chapter.'))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _chapter!.title,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        _chapter!.content,
                        style: const TextStyle(
                          fontSize: 16,
                          height: 1.8,
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }
}
