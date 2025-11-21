import { BaseElement } from '../../base-element.js';
import { ny_accessory_single_template } from './ny-accessory-single-template.js';
import { getAccessoryCatalogTaxonomyUrl } from '../../catalog/catalog-link-utils.js';

/**
 * Ny Accessory Single Component
 * Страница/контейнер для отображения одиночного аксессуара.
 */
export class NyAccessorySingle extends BaseElement {
  static stateSchema = {
    id: { type: 'number', default: null, attribute: { name: 'id', observed: true, reflect: true } },
    data: { type: 'json', default: null, attribute: null, internal: true },
    related: { type: 'json', default: [], attribute: null, internal: true },
    gallery: { type: 'json', default: [], attribute: null, internal: true },
    termsMap: { type: 'json', default: null, attribute: null, internal: true },
    price: { type: 'number', default: null, attribute: null, internal: true },
    index: { type: 'string', default: '', attribute: null, internal: true },
    excerpt: { type: 'string', default: '', attribute: null, internal: true },
    loading: { type: 'boolean', default: false, attribute: null, internal: true },
    error: { type: 'string', default: null, attribute: null, internal: true }
  };

  constructor() {
    super();
    this._loadingPromise = null;
  }

  connectedCallback() {
    window.app.toolkit.loadCSSOnce(new URL('./ny-accessory-single-styles.css', import.meta.url));
    super.connectedCallback();
    if (this.state.id) {
      void this.loadData();
    } else {
      this.render();
    }
  }

  async loadData() {
    const { id } = this.state;
    if (!id) return;
    if (this._loadingPromise) {
      return this._loadingPromise;
    }

    this.setState({ loading: true, error: null });
    this._loadingPromise = this._performLoad(id);

    try {
      await this._loadingPromise;
    } finally {
      this._loadingPromise = null;
    }
  }

  async _performLoad(id) {
    const getTaxonomyUrl = (taxonomySlug, termSlug, termId = null) => {
      // Используем ID термина для формирования ссылки на каталог аксессуаров
      if (taxonomySlug && termId) {
        return getAccessoryCatalogTaxonomyUrl(taxonomySlug, termId);
      }
      // Fallback: если ID нет, возвращаем базовую ссылку на каталог аксессуаров
      return '/accessories/';
    };

    const hydrateTermsFromIds = (ids, taxonomySlug) => {
      if (!ids || !taxonomySlug) return [];
      const list = Array.isArray(ids) ? ids : [ids];
      const storage = window.taxonomy_terms?.[taxonomySlug] || {};
      return list
        .map(idValue => {
          const term = storage[idValue];
          if (!term) return null;
          return {
            id: term.id,
            name: term.name,
            slug: term.slug,
            link: getTaxonomyUrl(taxonomySlug, term.slug, term.id)
          };
        })
        .filter(Boolean);
    };

    const buildTermsMap = (json) => {
      const map = {};
      const embeddedTerms = json?._embedded?.['wp:term'] || [];

      embeddedTerms.forEach(group => {
        if (!Array.isArray(group)) return;
        group.forEach(term => {
          if (!term || !term.taxonomy) return;
          const taxonomy = term.taxonomy;
          if (!map[taxonomy]) {
            map[taxonomy] = [];
          }
          map[taxonomy].push({
            id: term.id || term.term_id || null,
            name: term.name || '',
            slug: term.slug || '',
            link: term.link || getTaxonomyUrl(taxonomy, term.slug || '', term.id || term.term_id || null)
          });
        });
      });

      return map;
    };

    const parseCurrencyValue = (raw) => {
      if (raw == null) return null;
      if (typeof raw === 'number') return raw;
      if (typeof raw === 'string') {
        const cleaned = raw.replace(/[^\d.,]/g, '').replace(',', '.');
        const parsed = parseFloat(cleaned);
        return Number.isFinite(parsed) ? parsed : null;
      }
      if (typeof raw === 'object') {
        if (raw.amount != null) return parseCurrencyValue(raw.amount);
        if (raw.value != null) return parseCurrencyValue(raw.value);
        if (raw.number != null) return parseCurrencyValue(raw.number);
      }
      return null;
    };

    const getFieldValue = (json, slug, fallback) => {
      if (!json) return null;
      if (slug && json[slug] != null) return json[slug];
      if (slug && json.meta && json.meta[slug] != null) return json.meta[slug];
      if (fallback && json[fallback] != null) return json[fallback];
      if (fallback && json.meta && json.meta[fallback] != null) return json.meta[fallback];
      return null;
    };

    const normalizeTermsValue = (value, taxonomySlug) => {
      if (!value) return [];
      const list = Array.isArray(value) ? value : [value];
      return list
        .map(entry => {
          if (entry && typeof entry === 'object') {
            const slug = entry.slug || '';
            return {
              id: entry.id || entry.term_id || null,
              name: entry.name || '',
              slug,
              link: entry.link || getTaxonomyUrl(taxonomySlug, slug, entry.id || entry.term_id || null)
            };
          }

          if (typeof entry === 'number') {
            const hydrated = hydrateTermsFromIds(entry, taxonomySlug);
            return hydrated[0] || null;
          }

          if (typeof entry === 'string') {
            return {
              id: null,
              name: entry,
              slug: entry,
              link: getTaxonomyUrl(taxonomySlug, entry)
            };
          }

          return null;
        })
        .filter(Boolean);
    };

    try {
      const response = await fetch(`/wp-json/wp/v2/ny_accessory/${id}?_embed=1`, { credentials: 'same-origin' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      const dataModel = window.data_model;
      const accessoryConfig = dataModel?.post_types?.ny_accessory || {};
      const fields = accessoryConfig.fields || {};

      const slugFor = (fieldKey, fallback) => {
        const field = fields[fieldKey] || {};
        return field.slug || field.meta_field || fallback;
      };

      const indexSlug = slugFor('ny_accecory_index', 'ny_accecory_index');
      const costSlug = slugFor('ny_cost', 'ny_cost');
      const imagesSlug = slugFor('ny_images', 'ny_images');
      const conditionFieldSlug = slugFor('ny_condition_field', 'ny_condition_field');
      const materialFieldSlug = slugFor('ny_material_field', 'ny_material_field');
      const yearFieldSlug = slugFor('ny_year_of_production_field', 'ny_year_of_production_field');
      const categoryFieldSlug = slugFor('ny_category_field', 'ny_category');
      const lotFieldSlug = slugFor('ny_lot_configuration_field', 'ny_lot_configuratation_field');

      const indexValueRaw = getFieldValue(json, indexSlug, 'ny_accecory_index');
      const priceRaw = getFieldValue(json, costSlug, 'ny_cost');

      const gallery = [];
      const seenUrls = new Set();
      const pushImage = (url, alt = '') => {
        if (!url || seenUrls.has(url)) return;
        seenUrls.add(url);
        gallery.push({ url, alt });
      };

      const featuredMedia = json?._embedded?.['wp:featuredmedia'] || [];
      if (featuredMedia.length > 0) {
        const media = featuredMedia[0];
        if (media?.source_url) {
          pushImage(media.source_url, media.alt_text || media.title?.rendered || '');
        }
      }

      const attachments = json?._embedded?.['wp:attachment'] || [];
      attachments.forEach(media => {
        if (media?.source_url) {
          pushImage(media.source_url, media.alt_text || media.title?.rendered || '');
        }
      });

      const additionalImages = getFieldValue(json, imagesSlug, 'ny_images');
      if (Array.isArray(additionalImages)) {
        additionalImages.forEach(item => {
          if (typeof item === 'string' && item.startsWith('http')) {
            pushImage(item);
          } else if (item && typeof item === 'object') {
            const url = item.url || item.guid || item.source_url || item.original || '';
            if (url) pushImage(url);
          }
        });
      } else if (typeof additionalImages === 'string' && additionalImages.startsWith('http')) {
        pushImage(additionalImages);
      }

      if (gallery.length === 0 && json.guid?.rendered) {
        pushImage(json.guid.rendered, json.title?.rendered || '');
      }

      const termsMap = buildTermsMap(json);

      const normalizedCondition = normalizeTermsValue(json[conditionFieldSlug], 'condition');
      if (normalizedCondition.length) {
        termsMap.condition = normalizedCondition;
      }

      const normalizedMaterial = normalizeTermsValue(json[materialFieldSlug], 'material');
      if (normalizedMaterial.length) {
        termsMap.material = normalizedMaterial;
      }

      const normalizedYear = normalizeTermsValue(json[yearFieldSlug], 'year_of_production');
      if (normalizedYear.length) {
        termsMap.year_of_production = normalizedYear;
      }

      const normalizedCategory = normalizeTermsValue(json[categoryFieldSlug], 'ny_category');
      if (normalizedCategory.length) {
        termsMap.ny_category = normalizedCategory;
      }

      const normalizedLot = normalizeTermsValue(json[lotFieldSlug], 'lot_configurations');
      if (normalizedLot.length) {
        termsMap.lot_configurations = normalizedLot;
      }

      const rawExcerpt = json.excerpt?.rendered || '';
      const excerpt = rawExcerpt.replace(/<[^>]+>/g, '').trim();

      this.setState({
        data: json,
        related: [],
        gallery,
        termsMap,
        price: parseCurrencyValue(priceRaw),
        index: indexValueRaw != null ? String(indexValueRaw) : '',
        excerpt
      });
    } catch (error) {
      console.error('[ny-accessory-single] load failed', error);
      this.setState({ error: 'Ошибка загрузки данных аксессуара' });
    } finally {
      this.setState({ loading: false });
      this.render();
    }
  }

  render() {
    this.innerHTML = ny_accessory_single_template(this.state);
    this._applyGalleryImages();
  }

  _applyGalleryImages() {
    const galleryElement = this.querySelector('ui-image-gallery');
    if (!galleryElement) return;
    const images = Array.isArray(this.state.gallery) ? this.state.gallery : [];

    if (typeof galleryElement.setImages === 'function') {
      galleryElement.setImages(images);
    } else if (images.length) {
      galleryElement.setAttribute('images', JSON.stringify(images));
    }
  }
}

customElements.define('ny-accessory-single', NyAccessorySingle);


