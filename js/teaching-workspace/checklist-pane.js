import {
  evaluateChecklist, getCheckScores, toggleManualOverride, getCategories, getDomainCoverage,
} from './checklist-engine.js';
import { resolveCheckNavigation, getCheckNavKind } from './check-navigation.js';

export class ChecklistPane {
  constructor(root, { getDoc, getCurrentCaseId, onNavigate, onDocChange }) {
    this.root = root;
    this.getDoc = getDoc;
    this.getCurrentCaseId = getCurrentCaseId;
    this.onNavigate = onNavigate;
    this.onDocChange = onDocChange;
    this.coverageEl = root.querySelector('#coverageMatrix');
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

  renderCoverage(doc) {
    if (!this.coverageEl) return;
    const coverage = getDomainCoverage(doc);
    this.coverageEl.innerHTML = `
      <div class="coverage-title">F章カバレッジ</div>
      <div class="coverage-grid">
        ${coverage.map((c) => {
          const cls = c.presented ? 'presented' : c.ready ? 'ready' : c.hasCase ? 'draft' : 'empty';
          const sym = c.presented ? '●' : c.ready ? '◐' : c.hasCase ? '○' : '·';
          const caseInDomain = doc.cases.find((x) => x.domainTag === c.domain);
          return `<button type="button" class="coverage-cell ${cls}" data-domain="${c.domain}"
            ${caseInDomain ? `data-case-id="${caseInDomain.id}"` : ''} title="${c.domain}">
            <span class="coverage-sym">${sym}</span><span class="coverage-label">${c.domain}</span>
          </button>`;
        }).join('')}
      </div>
      <p class="coverage-legend">●提示済 ◐準備完了 ○下書き ·未記録</p>`;

    this.coverageEl.querySelectorAll('.coverage-cell[data-case-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.onNavigate({ caseId: btn.dataset.caseId, step: 1 });
      });
    });
  }

  render() {
    const doc = this.getDoc();
    const currentCaseId = this.getCurrentCaseId?.();
    this.renderCoverage(doc);

    const results = evaluateChecklist(doc, currentCaseId);
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
        const d = this.getDoc();
        d.checklist = toggleManualOverride(d.checklist, cb.dataset.id, cb.checked);
        this.onDocChange(d, { immediateCheck: true });
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
    const currentCaseId = this.getCurrentCaseId?.();

    if (navKind === 'hint') {
      const result = resolveCheckNavigation(ruleId, doc, currentCaseId);
      if (result?.type === 'manual' && result.hint) {
        this.showToast(result.hint, 5000);
      }
      return;
    }

    if (navKind === 'jump') {
      const result = resolveCheckNavigation(ruleId, doc, currentCaseId);
      if (result?.type === 'nav') {
        this.onNavigate(result.target);
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
