import { STEP_TOOL_HINTS } from './step-hints.js';
import { loadJsonWithFallback } from './json-loader.js';

const DEFAULT_FAV_KEY = 'shiteiWorkspaceFavorites';

export class PortalPalette {
  constructor(root, {
    onSelect,
    onStepChange,
    favKey = DEFAULT_FAV_KEY,
    relevantFlag = 'caseReportRelevant',
    stepHints = STEP_TOOL_HINTS,
    registryPath = 'data/portal-tools-registry.json',
    embedId = 'portal-tools-registry-embed',
  } = {}) {
    this.root = root;
    this.onSelect = onSelect;
    this.favKey = favKey;
    this.relevantFlag = relevantFlag;
    this.stepHints = stepHints;
    this.registryPath = registryPath;
    this.embedId = embedId;
    this.tools = [];
    this.currentStep = 1;
    this.filter = { q: '', section: '', relevantOnly: false, favoritesOnly: false };

    this.listEl = root.querySelector('#paletteList');
    this.suggestEl = root.querySelector('#paletteSuggest');
    this.searchEl = root.querySelector('#paletteSearch');
    this.sectionEl = root.querySelector('#paletteSection');
    this.relevantEl = root.querySelector('#paletteRelevant');
    this.favOnlyEl = root.querySelector('#paletteFavOnly');

    this.searchEl?.addEventListener('input', () => {
      this.filter.q = this.searchEl.value.trim();
      this.render();
    });
    this.sectionEl?.addEventListener('change', () => {
      this.filter.section = this.sectionEl.value;
      this.render();
    });
    this.relevantEl?.addEventListener('change', () => {
      this.filter.relevantOnly = this.relevantEl.checked;
      this.render();
    });
    this.favOnlyEl?.addEventListener('change', () => {
      this.filter.favoritesOnly = this.favOnlyEl.checked;
      this.render();
    });

    this.onStepChange = onStepChange;
  }

  async init() {
    const data = await loadJsonWithFallback(
      this.registryPath,
      this.embedId,
    );
    this.tools = data.tools;
    this.populateSections();
    this.render();
  }

  populateSections() {
    if (!this.sectionEl) return;
    const sections = [...new Set(this.tools.map((t) => t.section))];
    const labels = Object.fromEntries(this.tools.map((t) => [t.section, t.sectionLabel]));
    this.sectionEl.innerHTML = '<option value="">すべて</option>'
      + sections.map((s) => `<option value="${s}">${labels[s] || s}</option>`).join('');
  }

  getFavorites() {
    try {
      return new Set(JSON.parse(localStorage.getItem(this.favKey) || '[]'));
    } catch {
      return new Set();
    }
  }

  toggleFavorite(id) {
    const favs = this.getFavorites();
    if (favs.has(id)) favs.delete(id);
    else favs.add(id);
    localStorage.setItem(this.favKey, JSON.stringify([...favs]));
    this.render();
  }

  setStep(step) {
    this.currentStep = step;
    this.renderSuggestions();
  }

  renderSuggestions() {
    if (!this.suggestEl) return;
    const hrefs = this.stepHints[this.currentStep] || [];
    const items = hrefs
      .map((href) => this.tools.find((t) => t.href === href))
      .filter(Boolean)
      .slice(0, 5);

    if (!items.length) {
      this.suggestEl.innerHTML = '<p class="palette-hint">ステップに応じたおすすめはありません</p>';
      return;
    }

    this.suggestEl.innerHTML = `
      <p class="palette-suggest-label">Step ${this.currentStep} のおすすめ</p>
      <div class="palette-suggest-list">
        ${items.map((t) => `
          <button type="button" class="palette-suggest-btn" data-href="${t.href}" data-title="${escapeAttr(t.title)}">${escapeHtml(t.title)}</button>
        `).join('')}
      </div>`;

    this.suggestEl.querySelectorAll('.palette-suggest-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.onSelect(btn.dataset.href, btn.dataset.title);
      });
    });
  }

  getFilteredTools() {
    const favs = this.getFavorites();
    const q = this.filter.q.toLowerCase();
    return this.tools.filter((t) => {
      if (this.filter.section && t.section !== this.filter.section) return false;
      if (this.filter.relevantOnly && !t[this.relevantFlag]) return false;
      if (this.filter.favoritesOnly && !favs.has(t.id)) return false;
      if (q) {
        const hay = `${t.title} ${t.sectionLabel} ${t.href}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  render() {
    this.renderSuggestions();
    if (!this.listEl) return;
    const favs = this.getFavorites();
    const filtered = this.getFilteredTools();

    if (!filtered.length) {
      this.listEl.innerHTML = '<p class="palette-empty">該当ツールがありません</p>';
      return;
    }

    this.listEl.innerHTML = filtered.map((t) => `
      <div class="palette-item ${favs.has(t.id) ? 'is-fav' : ''}" data-id="${t.id}">
        <button type="button" class="palette-fav" title="お気に入り" data-id="${t.id}">${favs.has(t.id) ? '★' : '☆'}</button>
        <button type="button" class="palette-link" data-href="${t.href}" data-title="${escapeAttr(t.title)}">
          <span class="palette-item-title">${escapeHtml(t.title)}</span>
          <span class="palette-item-meta">${escapeHtml(t.sectionLabel)}</span>
        </button>
      </div>
    `).join('');

    this.listEl.querySelectorAll('.palette-fav').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFavorite(btn.dataset.id);
      });
    });
    this.listEl.querySelectorAll('.palette-link').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.onSelect(btn.dataset.href, btn.dataset.title);
      });
    });
  }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;');
}
