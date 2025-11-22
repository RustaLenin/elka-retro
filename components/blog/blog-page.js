/**
 * Blog page orchestrator.
 *
 * Responsibilities:
 * - Bootstrap blog results component.
 * - Handle infinite scroll for blog posts.
 * - Load posts from WordPress REST API.
 */

import { renderResultsContainer } from './results/results-template.js';
import BlogResults from './results/blog-results.js';
import { renderLoadingSkeleton } from './results/results-template.js';

const SCROLL_PREFETCH_OFFSET = 0.6;
const DEFAULT_PER_PAGE = 10;

export default class BlogPage {
  constructor(options = {}) {
    this.options = {
      endpoint: options.endpoint || '/wp-json/wp/v2/posts',
      perPage: options.perPage || DEFAULT_PER_PAGE,
      ...options,
    };

    this.root = null;
    this.resultsComponent = null;
    this.sentinel = null;
    this.observer = null;
    this.pendingRequest = null;
    this.pendingAppend = false;
    
    // Состояние загрузки
    this.loadedCount = 0;
    this.total = 0;
    this.isLoading = false;
  }

  init(rootElement) {
    if (!rootElement) {
      throw new Error('[blog] root element is required for initialization');
    }

    this.root = rootElement;
    
    // Если контейнер результатов уже есть, используем его, иначе создаём новый
    let resultsRoot = this.root.querySelector('[data-blog-results-root]');
    if (!resultsRoot) {
      // Создаём контейнер результатов
      const container = document.createElement('div');
      container.innerHTML = renderResultsContainer();
      resultsRoot = container.querySelector('[data-blog-results-root]');
      
      // Находим контейнер для вставки (blog-posts-container)
      // Ищем в родительском элементе (section_container) или в самом root
      const postsContainer = this.root.closest('.section_container')?.querySelector('.blog-posts-container') 
        || this.root.querySelector('.blog-posts-container')
        || this.root;
      
      // Очищаем контейнер от старых данных (пагинация, старые посты)
      if (postsContainer) {
        // Удаляем старые элементы, но сохраняем структуру
        const oldPosts = postsContainer.querySelectorAll('.post-cards-container, .pagination, .no-posts-message');
        oldPosts.forEach(el => el.remove());
        
        postsContainer.appendChild(resultsRoot);
      } else {
        this.root.appendChild(resultsRoot);
      }
    }

    const resultsContainer = resultsRoot.querySelector('[data-blog-results]');
    const emptyStateEl = resultsRoot.querySelector('[data-blog-empty]');
    const errorEl = resultsRoot.querySelector('[data-blog-error]');
    const endMessageEl = resultsRoot.querySelector('[data-blog-end-message]');
    this.sentinel = resultsRoot.querySelector('[data-blog-sentinel]');

    // Инициализируем компонент результатов
    this.resultsComponent = new BlogResults({
      container: resultsContainer,
      emptyElement: emptyStateEl,
      errorElement: errorEl,
      endMessageElement: endMessageEl,
    });

    // Первоначальная загрузка данных
    this.fetchAndRender();

    // Настраиваем IntersectionObserver для infinite scroll
    this.setupObserver();
  }

  async fetchAndRender() {
    // Сбрасываем loadedCount при первой загрузке
    this.loadedCount = 0;
    
    // Отключаем IntersectionObserver во время загрузки
    this.teardownObserver();
    
    this.isLoading = true;
    this.resultsComponent.showSkeleton(renderLoadingSkeleton(this.options.perPage));

    try {
      const { posts, total } = await this.fetchData({ append: false, offset: 0, limit: this.options.perPage });

      this.resultsComponent.hideSkeleton();
      this.isLoading = false;

      const postsArray = Array.isArray(posts) ? posts : [];
      
      this.resultsComponent.renderInitial(postsArray);
      
      // Обновляем метаданные
      this.loadedCount = postsArray.length;
      this.total = total || postsArray.length;

      // Проверяем, все ли элементы загружены
      if (this.loadedCount >= this.total && this.total > 0) {
        // Все элементы загружены, показываем плашку
        if (this.resultsComponent && typeof this.resultsComponent.showEndMessage === 'function') {
          this.resultsComponent.showEndMessage();
        }
      } else {
        // Включаем IntersectionObserver обратно только если есть что загружать
        this.setupObserver();
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      
      console.error('[blog] Failed to fetch data', error);
      this.resultsComponent.hideSkeleton();
      this.isLoading = false;
      this.resultsComponent.showError('Не удалось загрузить новости. Попробуйте обновить страницу.');
      
      // Включаем IntersectionObserver обратно даже при ошибке
      this.setupObserver();
    }
  }

  async fetchData({ append = false, offset, limit } = {}) {
    // Если уже есть активный запрос, отменяем его
    if (this.pendingRequest) {
      this.pendingRequest.abort();
    }
    
    // Создаём новый controller для текущего запроса
    const controller = new AbortController();
    this.pendingRequest = controller;

    const endpointBase = this.options.endpoint.replace(/\/$/, '');
    const params = new URLSearchParams();

    // Определяем offset и limit
    if (append) {
      // Infinite scroll: используем offset из loadedCount и limit из perPage
      params.set('offset', String(this.loadedCount));
      params.set('per_page', String(this.options.perPage));
    } else {
      // Первая загрузка: используем offset=0 и limit из perPage
      params.set('offset', String(offset !== undefined ? offset : 0));
      params.set('per_page', String(limit !== undefined ? limit : this.options.perPage));
    }

    // Добавляем _embed для получения featured_media
    params.set('_embed', '1');

    const queryString = params.toString();
    const url = `${endpointBase}?${queryString}`;
    
    console.log('[blog] Fetching data:', { append, offset, limit, url });
    
    try {
      const response = await fetch(url, { credentials: 'same-origin', signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Blog request failed with status ${response.status}`);
      }

      const posts = await response.json();
      
      // Получаем общее количество из заголовков
      const totalHeader = response.headers.get('X-WP-Total');
      const total = totalHeader ? parseInt(totalHeader, 10) : (Array.isArray(posts) ? posts.length : 0);
      
      console.log('[blog] Raw API response:', posts);
      console.log('[blog] Response posts:', posts?.length || 0, posts);
      console.log('[blog] Total posts:', total);
      
      // Очищаем pendingRequest только если это всё ещё наш запрос
      if (this.pendingRequest === controller) {
        this.pendingRequest = null;
      }

      return { posts, total };
    } catch (fetchError) {
      // Если запрос был отменён, просто выходим без ошибки
      if (fetchError.name === 'AbortError') {
        console.log('[blog] Fetch aborted (AbortError)');
        if (this.pendingRequest === controller) {
          this.pendingRequest = null;
        }
        return { posts: [], total: 0 };
      }
      
      // Очищаем pendingRequest перед пробросом ошибки
      if (this.pendingRequest === controller) {
        this.pendingRequest = null;
      }
      
      // Пробрасываем другие ошибки
      throw fetchError;
    }
  }

  setupObserver() {
    if (!this.sentinel || typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.teardownObserver();

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && this.shouldLoadMore()) {
            this.loadNextPage();
          }
        });
      },
      {
        root: null,
        rootMargin: `0px 0px ${Math.round(window.innerHeight * (1 - SCROLL_PREFETCH_OFFSET))}px 0px`,
        threshold: 0,
      }
    );

    this.observer.observe(this.sentinel);
  }

  teardownObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  shouldLoadMore() {
    // Не загружаем следующую страницу, если идет загрузка
    if (this.isLoading) {
      return false;
    }
    
    // Проверяем, есть ли ещё элементы для загрузки
    return this.loadedCount < this.total && !this.pendingAppend;
  }

  async loadNextPage() {
    if (!this.shouldLoadMore()) {
      return;
    }

    this.pendingAppend = true;

    try {
      // Infinite scroll: используем offset из loadedCount и limit из perPage
      const { posts, total } = await this.fetchData({ append: true });

      const postsArray = Array.isArray(posts) ? posts : [];
      if (postsArray.length) {
        this.resultsComponent.appendPosts(postsArray);
        
        // Обновляем loadedCount после успешной загрузки
        this.loadedCount += postsArray.length;
      }

      // Обновляем метаданные
      if (total !== undefined) {
        this.total = total;
      }
      
      // Проверяем, все ли элементы загружены
      if (this.loadedCount >= this.total && this.total > 0) {
        if (this.resultsComponent && typeof this.resultsComponent.showEndMessage === 'function') {
          this.resultsComponent.showEndMessage();
        }
        this.teardownObserver();
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('[blog] Failed to load next page', error);
        this.resultsComponent.showError('Не удалось загрузить новости. Попробуйте обновить страницу.');
        
        // Если ошибка 400, останавливаем infinite scroll
        if (error.message && error.message.includes('400')) {
          console.warn('[blog] Received 400 error, stopping infinite scroll to prevent recursion');
          this.teardownObserver();
        }
      }
    } finally {
      this.pendingAppend = false;
    }
  }

  destroy() {
    if (this.resultsComponent) {
      this.resultsComponent.destroy();
    }

    this.resultsComponent = null;
    this.root = null;
    this.sentinel = null;
    this.teardownObserver();

    if (this.pendingRequest) {
      this.pendingRequest.abort();
      this.pendingRequest = null;
    }
  }
}

