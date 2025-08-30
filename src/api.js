// API for Bible App - Reads from D1 cache (fast) with PostgreSQL fallback
// This replaces mockApi.js with real database integration

const API_BASE = '/api';

class BibleAPI {
  constructor() {
    this.cache = new Map();
  }

  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Books API
  async getBooks() {
    const cacheKey = 'books';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const books = await this.request('/books');
    this.cache.set(cacheKey, books);
    return books;
  }

  async getBook(bookId) {
    return await this.request(`/books/${bookId}`);
  }

  // Verses API
  async getVerses(bookId, chapter = null) {
    const endpoint = chapter 
      ? `/books/${bookId}/chapters/${chapter}/verses`
      : `/books/${bookId}/verses`;
    
    return await this.request(endpoint);
  }

  async getVerse(verseId) {
    return await this.request(`/verses/${verseId}`);
  }

  async searchVerses(query) {
    return await this.request('/search/verses', {
      method: 'POST',
      body: JSON.stringify({ query })
    });
  }

  // Audio Resources API
  async getAudioForBook(bookId) {
    return await this.request(`/books/${bookId}/audio`);
  }

  async getAudioForVerse(verseId) {
    return await this.request(`/verses/${verseId}/audio`);
  }

  // Entities API (people, places, themes)
  async getEntities(type = null) {
    const endpoint = type ? `/entities?type=${type}` : '/entities';
    return await this.request(endpoint);
  }

  async getVerseEntities(verseId) {
    return await this.request(`/verses/${verseId}/entities`);
  }

  // Sync Status API
  async getSyncStatus() {
    return await this.request('/sync/status');
  }

  // Clear cache (useful after sync updates)
  clearCache() {
    this.cache.clear();
  }
}

// Create singleton instance
const bibleApi = new BibleAPI();

export default bibleApi;

// Convenience exports for common operations
export const {
  getBooks,
  getBook,
  getVerses,
  getVerse,
  searchVerses,
  getAudioForBook,
  getAudioForVerse,
  getEntities,
  getVerseEntities,
  getSyncStatus
} = bibleApi;
