import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/novel.dart';
import '../models/chapter.dart';

class SupabaseService {
  final _client = Supabase.instance.client;
  
  // Auth Stream
  Stream<AuthState> get authStateChanges => _client.auth.onAuthStateChange;
  
  // Current User
  User? get currentUser => _client.auth.currentUser;

  // Sign In
  Future<AuthResponse> signIn(String email, String password) async {
    return await _client.auth.signInWithPassword(email: email, password: password);
  }

  // Sign Up
  Future<AuthResponse> signUp(String email, String password, String username) async {
    final response = await _client.auth.signUp(
      email: email, 
      password: password,
      data: {'username': username},
    );
    return response;
  }

  // Sign Out
  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  // Fetch Novels
  Future<List<Novel>> getNovels({int limit = 10}) async {
    final response = await _client
        .from('novels')
        .select()
        .limit(limit);
    
    return (response as List).map((json) => Novel.fromJson(json)).toList();
  }
  
  // Fetch Chapters List (Without content to save bandwidth)
  Future<List<Chapter>> getNovelChapters(String novelId) async {
    final response = await _client
        .from('chapters')
        .select('id, novel_id, chapter_number, title, created_at')
        .eq('novel_id', novelId)
        .order('chapter_number', ascending: true);
        
    return (response as List).map((json) => Chapter.fromJson(json)).toList();
  }
  
  // Fetch Specific Chapter Content
  Future<Chapter> getChapterContent(String chapterId) async {
    final response = await _client
        .from('chapters')
        .select()
        .eq('id', chapterId)
        .single();
        
    // Increment view count via RPC if available, or ignore if not
    try {
      await _client.rpc('increment_chapter_views', params: {'chapter_id': chapterId});
    } catch (_) {}
        
    return Chapter.fromJson(response);
  }
}

