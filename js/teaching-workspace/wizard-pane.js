import { FORM_FIELDS } from './form-fields.js';
import {
  createEmptyCase, getCaseById, sortCases, touchDocument,
} from './schema.js';
import { getAllIcdGroups, getDomainHint } from './domain-catalog.js';

const STEP_COUNT = 6;

export class WizardPane {
  constructor(root, { onChange, onStepChange, onStepCopy, onPreviewText, onPreviewMd }) {
    this.root = root;
    this.onChange = onChange;
    this.onStepChange = onStepChange;
    this.onStepCopy = onStepCopy;
    this.onPreviewText = onPreviewText;
    this.onPreviewMd = onPreviewMd;
    this.doc = null;
    this.currentCaseId = null;
    this.currentStep = 1;
    this._silent = false;

    root.addEventListener('input', (e) => {
      if (e.target.dataset?.meta) this.handleMetaInput(e.target);
      else this.handleInput();
    });
    root.addEventListener('change', (e) => {
      if (e.target.id === 'caseDomainTag' || e.target.id === 'caseStatus' || e.target.id === 'caseLabel') {
        this.handleCaseMetaChange();
      } else if (e.target.dataset?.meta) {
        this.handleMetaInput(e.target);
      } else {
        this.handleInput();
      }
    });

    root.querySelectorAll('[data-goto-step]').forEach((btn) => {
      btn.addEventListener('click', () => this.goToStep(parseInt(btn.dataset.gotoStep, 10)));
    });

    root.querySelector('#btnAddCase')?.addEventListener('click', () => this.addCase());
    root.querySelector('#btnDupCase')?.addEventListener('click', () => this.duplicateCase());
    root.querySelector('#btnDelCase')?.addEventListener('click', () => this.deleteCase());
    root.querySelector('#btnStepCopy')?.addEventListener('click', () => this.onStepCopy?.());
    root.querySelector('#btnPreviewText')?.addEventListener('click', () => this.onPreviewText?.());
    root.querySelector('#btnPreviewMd')?.addEventListener('click', () => this.onPreviewMd?.());
  }

  getCurrentCaseId() {
    return this.currentCaseId;
  }

  getCurrentStep() {
    return this.currentStep;
  }

  setDocument(doc) {
    this.doc = doc;
    if (!this.currentCaseId || !getCaseById(doc, this.currentCaseId)) {
      this.currentCaseId = doc.cases[0]?.id || null;
    }
    this.flushToDom();
    this.goToStep(this.currentStep);
  }

  getDocument() {
    this.syncFromDom();
    return this.doc;
  }

  getCurrentCase() {
    return getCaseById(this.doc, this.currentCaseId);
  }

  syncFromDom() {
    if (!this.doc) return;
    const c = getCaseById(this.doc, this.currentCaseId);
    if (!c) return;
    c.fields = this.readFormData();
    touchDocument(this.doc);
  }

  readFormData() {
    const data = {};
    FORM_FIELDS.forEach((id) => {
      const el = this.root.querySelector(`#${id}`);
      if (el) data[id] = el.value;
    });
    return data;
  }

  writeFormData(fields) {
    if (!fields) return;
    this._silent = true;
    FORM_FIELDS.forEach((id) => {
      const el = this.root.querySelector(`#${id}`);
      if (el && fields[id] !== undefined) el.value = fields[id];
    });
    if (fields.t1_icd) this.syncIcdChip(fields.t1_icd);
    this._silent = false;
  }

  flushToDom() {
    this.renderCaseList();
    this.syncMetaToDom();
    const c = this.getCurrentCase();
    if (c) {
      this.writeFormData(c.fields);
      const labelEl = this.root.querySelector('#caseLabel');
      const domainEl = this.root.querySelector('#caseDomainTag');
      const statusEl = this.root.querySelector('#caseStatus');
      if (labelEl) labelEl.value = c.label || '';
      if (domainEl) domainEl.value = c.domainTag || '';
      if (statusEl) statusEl.value = c.status || 'draft';
      this.updateDomainHint();
      this.renderIcdSelector();
    }
  }

  syncMetaToDom() {
    if (!this.doc) return;
    ['presenter', 'institution', 'supervisor'].forEach((key) => {
      const el = this.root.querySelector(`[data-meta="${key}"]`);
      if (el) el.value = this.doc.meta[key] || '';
    });
  }

  handleMetaInput(el) {
    if (!this.doc || this._silent) return;
    const key = el.dataset.meta;
    if (key) this.doc.meta[key] = el.value;
    touchDocument(this.doc);
    this.onChange(this.doc);
  }

  handleCaseMetaChange() {
    if (!this.doc || this._silent) return;
    const c = this.getCurrentCase();
    if (!c) return;
    this.syncFromDom();
    const labelEl = this.root.querySelector('#caseLabel');
    const domainEl = this.root.querySelector('#caseDomainTag');
    const statusEl = this.root.querySelector('#caseStatus');
    if (labelEl) c.label = labelEl.value || c.label;
    if (domainEl) c.domainTag = domainEl.value;
    if (statusEl) c.status = statusEl.value;
    this.updateDomainHint();
    this.renderCaseList();
    touchDocument(this.doc);
    this.onChange(this.doc);
  }

  handleInput() {
    if (this._silent || !this.doc) return;
    this.syncFromDom();
    this.renderCaseList();
    this.onChange(this.doc);
  }

  renderCaseList() {
    const list = this.root.querySelector('#caseList');
    if (!list || !this.doc) return;
    const cases = sortCases(this.doc.cases);
    list.innerHTML = cases.map((c) => {
      const active = c.id === this.currentCaseId;
      const tag = c.domainTag || '—';
      const hasData = FORM_FIELDS.some((f) => String(c.fields?.[f] || '').trim());
      return `<button type="button" class="case-btn ${active ? 'active' : ''} ${hasData && !active ? 'done' : ''}"
        data-case-id="${c.id}" title="${escapeAttr(c.label)}">
        <span class="case-num-badge">${c.order + 1}</span> ${escapeHtml(c.label)} <span class="case-tag">${escapeHtml(tag)}</span>
      </button>`;
    }).join('');

    list.querySelectorAll('.case-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.selectCase(btn.dataset.caseId));
    });
  }

  selectCase(caseId) {
    if (!this.doc || caseId === this.currentCaseId) return;
    this.syncFromDom();
    this.currentCaseId = caseId;
    this.flushToDom();
    this.onChange(this.doc);
  }

  addCase() {
    if (!this.doc) return;
    this.syncFromDom();
    const order = this.doc.cases.length;
    const c = createEmptyCase(`症例${order + 1}`, order);
    this.doc.cases.push(c);
    this.currentCaseId = c.id;
    touchDocument(this.doc);
    this.flushToDom();
    this.onChange(this.doc);
  }

  duplicateCase() {
    if (!this.doc) return;
    this.syncFromDom();
    const src = this.getCurrentCase();
    if (!src) return;
    const c = createEmptyCase(`${src.label}（複製）`, this.doc.cases.length);
    c.domainTag = src.domainTag;
    c.status = 'draft';
    c.fields = JSON.parse(JSON.stringify(src.fields));
    this.doc.cases.push(c);
    this.currentCaseId = c.id;
    touchDocument(this.doc);
    this.flushToDom();
    this.onChange(this.doc);
  }

  deleteCase() {
    if (!this.doc || this.doc.cases.length <= 1) {
      alert('最低1症例は必要です。');
      return;
    }
    const c = this.getCurrentCase();
    if (!c) return;
    if (!confirm(`「${c.label}」を削除しますか？`)) return;
    this.syncFromDom();
    this.doc.cases = this.doc.cases.filter((x) => x.id !== c.id);
    this.doc.cases.forEach((x, i) => { x.order = i; });
    this.currentCaseId = this.doc.cases[0].id;
    touchDocument(this.doc);
    this.flushToDom();
    this.onChange(this.doc);
  }

  goToStep(n) {
    this.currentStep = n;
    this.root.querySelectorAll('.step-page').forEach((p) => p.classList.remove('active'));
    const page = this.root.querySelector(`#page${n}`);
    if (page) page.classList.add('active');
    this.updateStepIndicator(n);
    this.onStepChange(n);
    const copyBtn = this.root.querySelector('#btnStepCopy');
    if (copyBtn) copyBtn.classList.toggle('hidden', n < 2);
    this.root.querySelector('.wizard-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navigateTo(target) {
    if (!target) return;
    if (target.caseId && target.caseId !== this.currentCaseId) {
      this.selectCase(target.caseId);
    }
    if (target.step) this.goToStep(target.step);
    if (target.fields?.length) {
      const field = target.fields[0];
      if (field.startsWith('meta_')) {
        const metaKey = field.replace('meta_', '');
        const el = this.root.querySelector(`[data-meta="${metaKey}"]`);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      if (field === 't1_domain_tag') {
        const el = this.root.querySelector('#caseDomainTag');
        if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        return;
      }
      if (field === 't1_status') {
        const el = this.root.querySelector('#caseStatus');
        if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        return;
      }
      requestAnimationFrame(() => {
        const el = this.root.querySelector(`#${field}`);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }
  }

  updateStepIndicator(active) {
    for (let i = 1; i <= STEP_COUNT; i++) {
      const dot = this.root.querySelector(`#sd${i}`);
      if (!dot) continue;
      if (i < active) {
        dot.className = 'step-dot done';
        dot.textContent = '✓';
      } else if (i === active) {
        dot.className = 'step-dot active';
        dot.textContent = String(i);
      } else {
        dot.className = 'step-dot pending';
        dot.textContent = String(i);
      }
    }
    for (let i = 1; i < STEP_COUNT; i++) {
      const line = this.root.querySelector(`#sl${i}${i + 1}`);
      if (line) line.className = i < active ? 'step-line done' : 'step-line';
    }
  }

  updateDomainHint() {
    const el = this.root.querySelector('#domainHint');
    const tag = this.root.querySelector('#caseDomainTag')?.value || '';
    if (el) {
      const hint = getDomainHint(tag);
      el.innerHTML = hint
        ? `<p><strong>${escapeHtml(tag)}</strong> — ${escapeHtml(hint)}</p>`
        : '<p>F章タグを選択すると記載のヒントが表示されます。</p>';
    }
  }

  renderIcdSelector() {
    const container = this.root.querySelector('#icdSelector');
    if (!container) return;
    const current = this.root.querySelector('#t1_icd')?.value || '';
    let html = '';
    for (const [group, items] of getAllIcdGroups()) {
      html += `<div class="icd-group"><div class="icd-group-title">${escapeHtml(group)}</div><div class="icd-chips">`;
      for (const item of items) {
        const sel = current === item.code ? ' selected' : '';
        html += `<button type="button" class="icd-chip${sel}" data-code="${escapeAttr(item.code)}">${escapeHtml(item.label)}</button>`;
      }
      html += '</div></div>';
    }
    container.innerHTML = html;
    container.querySelectorAll('.icd-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const input = this.root.querySelector('#t1_icd');
        if (input) input.value = chip.dataset.code;
        this.syncIcdChip(chip.dataset.code);
        this.handleInput();
      });
    });
  }

  syncIcdChip(code) {
    this.root.querySelectorAll('.icd-chip').forEach((chip) => {
      chip.classList.toggle('selected', chip.dataset.code === code);
    });
  }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;');
}
