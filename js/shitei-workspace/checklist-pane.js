import { evaluateChecklist, getCheckScores, toggleManualOverride, getCategories } from './checklist-engine.js';
import { resolveCheckNavigation, getCheckNavKind } from './check-navigation.js';

export class ChecklistPane {
  constructor(root, { getDoc, onNavigate, onDocChange }) {
    this.root = root;
    this.getDoc = getDoc;
    this.onNavigate = onNavigate;
    this.onDocChange = onDocChange;
    this.listEl = root.querySelector('#checkList');
    this.progressEl = root.querySelector('#checkProgress');
    this.debounceTimer = null;
  }

  scheduleUpdate() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.render(), 500);
  }

  updateNow() {
    clearTimeout(this.debounceTimer);
    this.render();
  }

  render() {
    const doc = this.getDoc();
    const results = evaluateChecklist(doc);
    const scores = getCheckScores(results);
    const categories = getCategories();

    if (this.progressEl) {
      const fail = results.filter((r) => r.status === 'fail').length;
      const warn = results.filter((r) => r.status === 'warn').length;
      this.progressEl.innerHTML = `
        <div class="check-progress-bar"><div class="check-progress-fill" style="width:${scores.total.pct}%"></div></div>
        <p class="check-progress-text">${scores.total.done}/${scores.total.count}（${scores.total.pct}%）
          ${fail ? `<span class="check-fail">${fail} fail</span>` : ''}
          ${warn ? `<span class="check-warn">${warn} warn</span>` : ''}
        </p>`;
    }

    if (!this.listEl) return;

    const grouped = {};
    for (const r of results) {
      if (!grouped[r.category]) grouped[r.category] = [];
      grouped[r.category].push(r);
    }

    let html = '';
    for (const [catId, items] of Object.entries(grouped)) {
      const cat = categories[catId];
      const title = cat?.title || catId;
      const done = items.filter((i) => i.checked).length;
      html += `<div class="check-group">
        <div class="check-group-title">${escapeHtml(title)} <span class="check-group-count">${done}/${items.length}</span></div>`;

      for (const item of items) {
        const navKind = getCheckNavKind(item.id);
        const statusClass = item.status === 'fail' ? 'fail' : item.status === 'warn' ? 'warn' : item.status === 'manual' ? 'manual' : 'ok';
        const clickable = navKind === 'jump' || navKind === 'hint';
        const manualBox = item.ruleType === 'manual'
          ? `<input type="checkbox" class="check-manual-cb" data-id="${item.id}" ${item.checked ? 'checked' : ''}>`
          : `<span class="check-icon">${item.checked ? '✓' : '○'}</span>`;
        html += `
          <div class="check-row ${statusClass} ${item.checked ? 'checked' : ''} ${clickable ? 'clickable' : ''}"
               data-id="${item.id}" data-nav="${navKind}">
            ${manualBox}
            <span class="check-label">${escapeHtml(item.label)}</span>
          </div>`;
      }
      html += '</div>';
    }

    this.listEl.innerHTML = html;

    this.listEl.querySelectorAll('.check-manual-cb').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        const doc = this.getDoc();
        doc.checklist = toggleManualOverride(doc.checklist, cb.dataset.id, cb.checked);
        this.onDocChange(doc, { immediateCheck: true });
      });
    });
    this.listEl.querySelectorAll('.check-row.clickable').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.classList?.contains('check-manual-cb')) return;
        this.handleRowClick(row.dataset.id, row.dataset.nav);
      });
    });
  }

  handleRowClick(ruleId, navKind) {
    const doc = this.getDoc();

    if (navKind === 'hint') {
      const result = resolveCheckNavigation(ruleId, doc);
      if (result?.type === 'manual' && result.hint) {
        this.showToast(result.hint, 5000);
      }
      return;
    }

    if (navKind === 'jump') {
      const result = resolveCheckNavigation(ruleId, doc);
      if (result?.type === 'nav') {
        this.onNavigate(result.target);
        return;
      }
    }

  }

  showToast(msg, ms = 3000) {
    let el = document.getElementById('wsToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'wsToast';
      el.className = 'ws-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
