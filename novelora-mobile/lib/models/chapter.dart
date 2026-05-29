class Chapter {
  final String id;
  final String novelId;
  final double chapterNumber;
  final String title;
  final String content;
  final DateTime createdAt;

  Chapter({
    required this.id,
    required this.novelId,
    required this.chapterNumber,
    required this.title,
    required this.content,
    required this.createdAt,
  });

  factory Chapter.fromJson(Map<String, dynamic> json) {
    return Chapter(
      id: json['id'] as String? ?? '',
      novelId: json['novel_id'] as String? ?? '',
      chapterNumber: (json['chapter_number'] as num?)?.toDouble() ?? 0.0,
      title: json['title'] as String? ?? 'Unknown Title',
      content: json['content'] as String? ?? '',
      createdAt: json['created_at'] != null 
          ? DateTime.tryParse(json['created_at']) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
