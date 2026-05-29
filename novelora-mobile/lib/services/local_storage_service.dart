import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/novel.dart';
import '../models/chapter.dart';

class LocalStorageService {
  static const String _novelsKey = 'local_novels';
  static const String _chaptersKeyPrefix = 'local_chapters_';
  static const String _chapterContentKeyPrefix = 'local_content_';

  // Save list of novels
  Future<void> saveNovels(List<Novel> novels) async {
    final prefs = await SharedPreferences.getInstance();
    final String data = jsonEncode(novels.map((n) => n.toJson()).toList());
    await prefs.setString(_novelsKey, data);
  }

  // Get cached novels
  Future<List<Novel>?> getNovels() async {
    final prefs = await SharedPreferences.getInstance();
    final String? data = prefs.getString(_novelsKey);
    if (data != null) {
      final List<dynamic> jsonList = jsonDecode(data);
      return jsonList.map((json) => Novel.fromJson(json)).toList();
    }
    return null;
  }

  // Save novel chapters list
  Future<void> saveNovelChapters(String novelId, List<Chapter> chapters) async {
    final prefs = await SharedPreferences.getInstance();
    final String data = jsonEncode(chapters.map((c) => {
      'id': c.id,
      'novel_id': c.novelId,
      'chapter_num': c.chapterNumber,
      'title': c.title,
      'content': c.content, // likely empty for list
      'created_at': c.createdAt.toIso8601String()
    }).toList());
    await prefs.setString('$_chaptersKeyPrefix$novelId', data);
  }

  // Get cached chapters for novel
  Future<List<Chapter>?> getNovelChapters(String novelId) async {
    final prefs = await SharedPreferences.getInstance();
    final String? data = prefs.getString('$_chaptersKeyPrefix$novelId');
    if (data != null) {
      final List<dynamic> jsonList = jsonDecode(data);
      return jsonList.map((json) => Chapter.fromJson(json)).toList();
    }
    return null;
  }

  // Save specific chapter content
  Future<void> saveChapterContent(String chapterId, Chapter chapter) async {
    final prefs = await SharedPreferences.getInstance();
    final String data = jsonEncode({
      'id': chapter.id,
      'novel_id': chapter.novelId,
      'chapter_num': chapter.chapterNumber,
      'title': chapter.title,
      'content': chapter.content,
      'created_at': chapter.createdAt.toIso8601String()
    });
    await prefs.setString('$_chapterContentKeyPrefix$chapterId', data);
  }

  // Get specific chapter content
  Future<Chapter?> getChapterContent(String chapterId) async {
    final prefs = await SharedPreferences.getInstance();
    final String? data = prefs.getString('$_chapterContentKeyPrefix$chapterId');
    if (data != null) {
      final Map<String, dynamic> json = jsonDecode(data);
      return Chapter.fromJson(json);
    }
    return null;
  }
}
