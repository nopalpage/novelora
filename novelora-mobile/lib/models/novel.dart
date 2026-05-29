class Novel {
  final String id;
  final String title;
  final String author;
  final String coverUrl;
  final String description;
  final String status;
  final String origin;
  final double rating;
  final int views;

  Novel({
    required this.id,
    required this.title,
    required this.author,
    required this.coverUrl,
    required this.description,
    required this.status,
    required this.origin,
    required this.rating,
    required this.views,
  });

  factory Novel.fromJson(Map<String, dynamic> json) {
    return Novel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Unknown Title',
      author: json['author']?.toString() ?? 'Unknown Author',
      coverUrl: json['cover_url']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      origin: json['origin']?.toString() ?? '',
      rating: (json['rating'] as num?)?.toDouble() ?? (json['avg_rating'] as num?)?.toDouble() ?? 0.0,
      views: json['views'] as int? ?? json['total_views'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'author': author,
      'cover_url': coverUrl,
      'description': description,
      'status': status,
      'origin': origin,
      'rating': rating,
      'views': views,
    };
  }
}
