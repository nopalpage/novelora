import { Novel, Genre } from '../data';
import { supabase } from './supabase';

let baseUrl = import.meta.env.VITE_API_URL || 'https://api.novelora.my.id/api';
baseUrl = baseUrl.replace(/\/+$/, '');
if (!baseUrl.endsWith('/api')) {
  baseUrl += '/api';
}
export const API_BASE_URL = baseUrl;

// Create a module-scoped fetch wrapper to automatically inject the API Key and real JWT token
const globalFetch = window.fetch;
const fetch = async (url: RequestInfo | URL, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});
  const apiKey = import.meta.env.VITE_API_SECRET_KEY;
  if (apiKey) {
    headers.set('x-api-key', apiKey);
  }
  
  // Automatically attach real Supabase token if available
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  // If a dummy-token was explicitly set by legacy code, the real token above will override it,
  // or we can just ensure it doesn't get sent if no real token exists.
  if (headers.get('Authorization') === 'Bearer dummy-token') {
    if (!session?.access_token) {
      headers.delete('Authorization');
    }
  }

  return globalFetch(url, { ...options, headers });
};

/**
 * Maps the backend novel summary to the frontend Novel interface.
 */
export function mapBackendNovel(backendNovel: any): Novel {
  return {
    id: backendNovel.id,
    slug: backendNovel.slug,
    title: backendNovel.title,
    type: backendNovel.type || (backendNovel.origin === 'KR' || backendNovel.origin === 'CN' ? 'Web Novel' : 'Light Novel'),
    image: backendNovel.image || backendNovel.cover_url || 'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=400&auto=format&fit=crop',
    origin: backendNovel.origin,
    status: backendNovel.status,
    description: backendNovel.description,
    rating: backendNovel.rating !== undefined ? backendNovel.rating : backendNovel.avg_rating,
    genres: backendNovel.genres || [],
    tags: backendNovel.tags || [],
    author: backendNovel.author || backendNovel.author_name || 'Unknown',
    alternativeTitles: backendNovel.alternative_titles || [],
    rank: backendNovel.views !== undefined ? Math.floor(backendNovel.views) : (backendNovel.total_views ? Math.floor(backendNovel.total_views) : undefined),
  };
}

export const getNovelUrl = (novel: any) => {
  const typeStr = novel.type === 'Light Novel' ? 'ln' : 'wn';
  const slug = novel.slug || novel.id;
  return `/${typeStr}/${slug}`;
};

export const getChapterUrl = (novel: any, chapterNum: number) => {
  const typeStr = novel.type === 'Light Novel' ? 'ln' : 'wn';
  const slug = novel.slug || novel.id;
  return `/${typeStr}/${slug}/chapter-${chapterNum}`;
};

export const api = {
  getNovels: async (params?: { sort?: string; limit?: number; page?: number; origin?: string; status?: string; _t?: number }): Promise<Novel[]> => {
    try {
      const query = new URLSearchParams();
      if (params?.sort) query.append('sort', params.sort);
      if (params?.limit) query.append('limit', params.limit.toString());
      if (params?.page) query.append('page', params.page.toString());
      if (params?.origin) query.append('origin', params.origin);
      if (params?.status) query.append('status', params.status);
      if (params?._t) query.append('_t', params._t.toString());

      const res = await fetch(`${API_BASE_URL}/novels?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch novels');
      const data = await res.json();
      return (data.data || []).map(mapBackendNovel);
    } catch (error) {
      console.error('getNovels error:', error);
      return [];
    }
  },

  getNovelById: async (id: string): Promise<Novel | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/novels/${id}`);
      if (!res.ok) throw new Error('Failed to fetch novel details');
      const data = await res.json();
      return data.data ? mapBackendNovel(data.data) : null;
    } catch (error) {
      console.error('getNovelById error:', error);
      return null;
    }
  },

  getRelatedNovels: async (id: string): Promise<Novel[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/novels/${id}/related`);
      if (!res.ok) throw new Error('Failed to fetch related novels');
      const data = await res.json();
      return (data.data || []).map(mapBackendNovel);
    } catch (error) {
      console.error('getRelatedNovels error:', error);
      return [];
    }
  },

  getChapters: async (novelId: string): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/novels/${novelId}/chapters`);
      if (!res.ok) throw new Error('Failed to fetch chapters');
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      console.error('getChapters error:', error);
      return [];
    }
  },

  getComments: async (novelId: string): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/novels/${novelId}/comments`);
      if (!res.ok) throw new Error('Failed to fetch comments');
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      console.error('getComments error:', error);
      return [];
    }
  },

  getUserComments: async (userId: string): Promise<any[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}/comments`);
      if (!res.ok) throw new Error('Failed to fetch user comments');
      const data = await res.json();
      return data.data || [];
    } catch (error) {
      console.error('getUserComments error:', error);
      return [];
    }
  },

  getLatestChapters: async (page = 1, limit = 10): Promise<{novels: Novel[], total: number}> => {
    try {
      const res = await fetch(`${API_BASE_URL}/chapters/latest?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch latest chapters');
      const data = await res.json();
      
      const chapters = data.data?.chapters || [];
      const total = data.data?.total || 0;
      
      // The backend /chapters/latest returns chapters with nested novels(title)
      // We map this back to a Novel-like shape for the LatestUpdateCard
      const mappedNovels = chapters.map((ch: any) => {
        let timeAgoStr = 'Recently';
        if (ch.created_at) {
          const hours = Math.floor((Date.now() - new Date(ch.created_at).getTime()) / 3600000);
          if (hours < 1) timeAgoStr = 'Just now';
          else if (hours < 24) timeAgoStr = `${hours}h ago`;
          else timeAgoStr = `${Math.floor(hours/24)}d ago`;
        }
        return {
          id: ch.novel_id, // We use novel_id as the ID for routing purposes
          title: ch.novels?.title || 'Unknown Novel',
          image: ch.novels?.image || ch.novels?.cover_url || 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?q=80&w=300&auto=format&fit=crop',
          latestChapter: ch.title || `Chapter ${ch.chapter_num}`,
          timeAgo: timeAgoStr,
          origin: ch.novels?.origin,
          type: ch.novels?.type,
          slug: ch.novels?.slug,
        };
      });
      
      return { novels: mappedNovels, total };
    } catch (error) {
      console.error('getLatestChapters error:', error);
      return { novels: [], total: 0 };
    }
  },
  
  getChapterContent: async (chapterId: string): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/chapters/${chapterId}`);
      if (!res.ok) throw new Error('Failed to fetch chapter content');
      const data = await res.json();
      return data.data || null;
    } catch (error) {
      console.error('getChapterContent error:', error);
      return null;
    }
  },
  
  getChapterContentBySlug: async (slug: string, chapterNum: number): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/novels/${slug}/chapters/${chapterNum}`);
      if (!res.ok) throw new Error('Failed to fetch chapter content');
      const data = await res.json();
      return data.data || null;
    } catch (error) {
      console.error('getChapterContentBySlug error:', error);
      return null;
    }
  },

  getGenresAndTags: async (): Promise<{ genres: Genre[]; tags: Genre[] }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/meta/genres-tags`);
      if (!res.ok) throw new Error('Failed to fetch genres and tags');
      const data = await res.json();
      return data.data || { genres: [], tags: [] };
    } catch (error) {
      console.error('getGenresAndTags error:', error);
      return { genres: [], tags: [] };
    }
  },

  searchNovels: async (query: string): Promise<Novel[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/novels/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Failed to search novels');
      const data = await res.json();
      return (data.data || []).map(mapBackendNovel);
    } catch (error) {
      console.error('searchNovels error:', error);
      return [];
    }
  },

  // Admin Methods
  addNovel: async (novel: any, token: string): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/novels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(novel)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to add novel');
      }
      return await res.json();
    } catch (error) {
      console.error('addNovel error:', error);
      throw error;
    }
  },

  updateNovel: async (id: string, novel: any, token: string): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/novels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(novel)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to update novel');
      }
      return await res.json();
    } catch (error) {
      console.error('updateNovel error:', error);
      throw error;
    }
  },

  deleteNovel: async (id: string, token: string): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/novels/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete novel');
      return await res.json();
    } catch (error) {
      console.error('deleteNovel error:', error);
      throw error;
    }
  },

  // Admin Features
  addChapter: async (novelId: string, chapter: any, token: string): Promise<any> => {
    try {
      const payload = { ...chapter, novel_id: novelId };
      if (payload.id && payload.id.toString().startsWith('new-')) {
        delete payload.id;
      }
      
      const res = await fetch(`${API_BASE_URL}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to add chapter');
      }
      return await res.json();
    } catch (error) {
      console.error('addChapter error:', error);
      throw error;
    }
  },

  updateChapter: async (chapterId: string, chapter: any, token: string): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/chapters/${chapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(chapter)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to update chapter');
      }
      return await res.json();
    } catch (error) {
      console.error('updateChapter error:', error);
      throw error;
    }
  },

  deleteChapter: async (chapterId: string, token: string): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE_URL}/chapters/${chapterId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete chapter');
      return await res.json();
    } catch (error) {
      console.error('deleteChapter error:', error);
      throw error;
    }
  },

  async getAdminStats(token: string) {
    const res = await fetch(`${API_BASE_URL}/admin/dashboard-stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json().then(data => data.data);
  },
  
  async getUsers(token: string) {
    const res = await fetch(`${API_BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json().then(data => data.data);
  },
  
  async updateUser(id: string | number, data: any, token: string) {
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update user');
    return res.json();
  },

  async getAdminComments(token: string) {
    const res = await fetch(`${API_BASE_URL}/admin/comments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch comments');
    return res.json().then(data => data.data);
  },

  async deleteAdminComment(id: string | number, token: string) {
    const res = await fetch(`${API_BASE_URL}/admin/comments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to delete comment');
    return res.json();
  },

  async getAdminReports(token: string) {
    const res = await fetch(`${API_BASE_URL}/admin/reports`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch reports');
    return res.json().then(data => data.data);
  },

  async resolveAdminReport(id: string | number, token: string) {
    const res = await fetch(`${API_BASE_URL}/admin/reports/${id}/resolve`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to resolve report');
    return res.json();
  },

  async getAdminActivityLogs(token: string, params: { page?: number, limit?: number, search?: string, start_date?: string, end_date?: string } = {}) {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE_URL}/admin/activity-logs?${query}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch activity logs');
    return res.json().then(data => data.data);
  },

  async submitReport(data: { target_id: string, target_type: string, reason: string, details?: string }, token: string) {
    const res = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to submit report');
    return res.json();
  }
};
