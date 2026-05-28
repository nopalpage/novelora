export interface Novel {
  id: string;
  title: string;
  image: string;
  rank?: number;
  latestChapter?: string;
  timeAgo?: string;
  author?: string;
  status?: string;
  type?: string;
  origin?: "JP" | "KR" | "CN";
  alternativeTitles?: string[];
  genres?: string[];
  tags?: string[];
  description?: string;
  rating?: number;
  relatedWorks?: { id: string, title: string, type: string, relation: string, image: string }[];
}

export interface Genre {
  name: string;
  count: number;
}


