import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart' as auth;
import '../models/novel.dart';
import '../models/chapter.dart';

class FirebaseService {
  final _firestore = FirebaseFirestore.instance;
  final _auth = auth.FirebaseAuth.instance;
  
  // Auth Stream
  Stream<auth.User?> get authStateChanges => _auth.authStateChanges();
  
  // Current User
  auth.User? get currentUser => _auth.currentUser;

  // Sign In
  Future<auth.UserCredential> signIn(String email, String password) async {
    return await _auth.signInWithEmailAndPassword(email: email, password: password);
  }

  // Sign Up
  Future<auth.UserCredential> signUp(String email, String password, String username) async {
    final response = await _auth.createUserWithEmailAndPassword(
      email: email, 
      password: password,
    );
    
    if (response.user != null) {
      await response.user!.updateDisplayName(username);
      // Save additional user info to Firestore
      await _firestore.collection('users').doc(response.user!.uid).set({
        'username': username,
        'email': email,
        'created_at': FieldValue.serverTimestamp(),
      });
    }
    return response;
  }

  // Sign Out
  Future<void> signOut() async {
    await _auth.signOut();
  }

  // Fetch Novels
  Future<List<Novel>> getNovels({int limit = 10}) async {
    final querySnapshot = await _firestore
        .collection('novels')
        .limit(limit)
        .get();
    
    return querySnapshot.docs.map((doc) {
      final data = doc.data();
      data['id'] = doc.id; // Include document ID
      return Novel.fromJson(data);
    }).toList();
  }
  
  // Fetch Chapters List (Without content to save bandwidth)
  Future<List<Chapter>> getNovelChapters(String novelId) async {
    final querySnapshot = await _firestore
        .collection('chapters')
        .where('novel_id', isEqualTo: novelId)
        .orderBy('chapter_num', descending: false)
        .get();
        
    return querySnapshot.docs.map((doc) {
      final data = doc.data();
      data['id'] = doc.id; // Include document ID
      return Chapter.fromJson(data);
    }).toList();
  }
  
  // Fetch Specific Chapter Content
  Future<Chapter> getChapterContent(String chapterId) async {
    final docSnapshot = await _firestore
        .collection('chapters')
        .doc(chapterId)
        .get();
        
    if (!docSnapshot.exists || docSnapshot.data() == null) {
      throw Exception('Chapter not found');
    }

    final data = docSnapshot.data()!;
    data['id'] = docSnapshot.id;
        
    // Increment view count
    try {
      await _firestore.collection('chapters').doc(chapterId).update({
        'views': FieldValue.increment(1)
      });
    } catch (_) {}
        
    return Chapter.fromJson(data);
  }
}
