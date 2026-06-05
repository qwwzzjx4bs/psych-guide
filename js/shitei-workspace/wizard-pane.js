import { FORM_FIELDS, CHECK_FIELDS, getCharCount } from './form-fields.js';
import { CASE_CATEGORIES, ICD_DATA } from './case-categories.js';
import { touchDocument } from './schema.js';

export class WizardPane {
  constructor(root, { onChange, onStepChange, onStepCopy, onPreviewDraft, onPreviewForm }) {
    this.root = root;
    this.onChange = onChange;
    this.onStepChange = onStepChange;
    this.onStepCopy = onStepCopy;
    this.onPreviewDraft = onPreviewDraft;
    this.onPreviewForm = onPreviewForm;
    this.doc = null;
    this.currentCase = 1;
    this.currentStep = 1;
    this._silent = false;

    root.addEventListener('input', () => this.handleInput());
    root.addEventListener('change', (e) => {
      if (e.target.name === 's1_restriction') this.toggleRestrictionArea();
      if (e.target.id === 's1_adm_type') this.updateAdmHints(e.target.value);
      this.handleInput();
    });

    root.querySelectorAll('[data-goto-step]').forEach((btn) => {
      btn.addEventListener('click', () => this.goToStep(parseInt(btn.dataset.gotoStep, 10)));
    });

    root.querySelectorAll('.case-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.selectCase(parseInt(btn.dataset.case, 10)));
    });

    root.querySelector('#btnStepCopy')?.addEventListener('click', () => this.onStepCopy?.());
    root.querySelector('#btnPreviewDraft')?.addEventListener('click', () => this.onPreviewDraft?.());
    root.querySelector('#btnPreviewForm')?.addEventListener('click', () => this.onPreviewForm?.());
  }

  getCurrentCase() {
    return this.currentCase;
  }

  getCurrentStep() {
    return this.currentStep;
  }

  setDocument(doc) {
    this.doc = doc;
    this.flushToDom();
    this.updateCaseHints();
    this.goToStep(this.currentStep);
  }

  getDocument() {
    this.syncFromDom();
    return this.doc;
  }

  syncFromDom() {
    if (!this.doc) return;
    const data = this.readFormData();
    this.doc.cases[`case${this.currentCase}`] = data;
    touchDocument(this.doc);
  }

  readFormData() {
    const data = {};
    FORM_FIELDS.forEach((id) => {
      const el = this.root.querySelector(`#${id}`);
      if (el) data[id] = el.value;
    });
    const restChecked = this.root.querySelector('input[name=s1_restriction]:checked');
    data.s1_restriction = restChecked ? restChecked.value : '';
    CHECK_FIELDS.forEach((id) => {
      const el = this.root.querySelector(`#${id}`);
      if (el) data[id] = el.checked;
    });
    return data;
  }

  writeFormData(data) {
    if (!data) return;
    this._silent = true;
    FORM_FIELDS.forEach((id) => {
      const el = this.root.querySelector(`#${id}`);
      if (el && data[id] !== undefined) el.value = data[id];
    });
    const restVal = data.s1_restriction || '';
    this.root.querySelectorAll('input[name=s1_restriction]').forEach((r) => {
      r.checked = r.value === restVal;
    });
    CHECK_FIELDS.forEach((id) => {
      const el = this.root.querySelector(`#${id}`);
      if (el) el.checked = !!data[id];
    });
    this.toggleRestrictionArea();
    this.updateCharCount();
    if (data.s1_icd) this.syncIcdChip(data.s1_icd);
    this._silent = false;
  }

  flushToDom() {
    const data = this.doc?.cases[`case${this.currentCase}`];
    this.writeFormData(data || {});
    this.updateCaseTabStates();
    const admType = this.root.querySelector('#s1_adm_type')?.value || '';
    this.updateAdmHints(admType);
  }

  handleInput() {
    if (this._silent || !this.doc) return;
    this.syncFromDom();
    this.updateCharCount();
    this.updateCaseTabStates();
    this.onChange(this.doc);
  }

  selectCase(n) {
    if (!this.doc) return;
    this.syncFromDom();
    this.currentCase = n;
    this.root.querySelectorAll('.case-btn').forEach((b) => {
      b.classList.toggle('active', parseInt(b.dataset.case, 10) === n);
    });
    this.flushToDom();
    this.updateCaseHints();
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
    if (copyBtn) copyBtn.classList.toggle('hidden', n < 2 || n > 7);
    this.root.querySelector('.wizard-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navigateTo(target) {
    if (!target) return;
    if (target.caseNum && target.caseNum !== this.currentCase) {
      this.selectCase(target.caseNum);
    }
    if (target.step) this.goToStep(target.step);
    if (target.fields?.length) {
      requestAnimationFrame(() => {
        const el = this.root.querySelector(`#${target.fields[0]}`);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }
  }

  updateStepIndicator(active) {
    for (let i = 1; i <= 7; i++) {
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
    for (let i = 1; i <= 6; i++) {
      const line = this.root.querySelector(`#sl${i}${i + 1}`);
      if (line) line.className = i < active ? 'step-line done' : 'step-line';
    }
  }

  updateCaseTabStates() {
    if (!this.doc) return;
    for (let i = 1; i <= 5; i++) {
      const btn = this.root.querySelector(`.case-btn[data-case="${i}"]`);
      if (!btn) continue;
      const d = this.doc.cases[`case${i}`] || {};
      const hasData = FORM_FIELDS.some((f) => String(d[f] || '').trim());
      btn.classList.toggle('done', hasData && i !== this.currentCase);
    }
  }

  updateCaseHints() {
    const cat = CASE_CATEGORIES[this.currentCase];
    const hint = this.root.querySelector('#caseInfoHint');
    if (hint) {
      hint.innerHTML = `<p><strong>対象症例：${cat.label}</strong><br>疾患範囲：${cat.icdRange} — ${cat.hint}</p>`;
    }
    this.renderIcdSelector();
    const admType = this.root.querySelector('#s1_adm_type')?.value || '';
    this.updateAdmHints(admType);
  }

  updateAdmHints(admType) {
    const hogoHint = this.root.querySelector('#hogoHint');
    if (hogoHint) {
      if (admType === '医療保護入院') {
        hogoHint.className = 'hint-box warn';
        hogoHint.innerHTML = '<p><strong>医療保護入院：</strong>5症例のうち1例は<strong>入院時の指定医診察に立ち会った症例</strong>が必要です。</p>';
      } else if (admType === '措置入院') {
        hogoHint.className = 'hint-box info';
        hogoHint.innerHTML = '<p><strong>措置入院：</strong>措置診察の契機と自傷他害のおそれの具体的根拠の記載が必須です。</p>';
      } else {
        hogoHint.className = 'hidden';
        hogoHint.innerHTML = '';
      }
    }

    const el = this.root.querySelector('#hint_admission_situation');
    if (el) {
      if (admType === '措置入院') {
        el.innerHTML = '<p><strong>措置入院の入院時状況：</strong>①精神障害者であること ②入院の必要 ③<strong>自傷他害のおそれ</strong>（具体的行為・発言）</p>';
      } else if (admType === '医療保護入院') {
        el.innerHTML = '<p><strong>医療保護入院の入院時状況：</strong>①精神障害者 ②入院の必要 ③<strong>任意入院不可</strong>（病識欠如等）④努めたが困難 ⑤告知内容</p>';
      } else {
        el.innerHTML = '<p>ステップ1で入院形態を選択すると記載要件が表示されます。</p>';
      }
    }

    const ms = this.root.querySelector('#hint_mental_status');
    if (ms) {
      const hints = {
        1: '<p><strong>F0器質性：</strong>意識・見当識・認知機能変化を重点的に記載。</p>',
        2: '<p><strong>F1依存症：</strong>離脱症状・渇望・依存の程度を記載。</p>',
        3: '<p><strong>F2統合失調症：</strong>陽性・陰性症状・思考形式の障害を体系的に記載。</p>',
        4: '<p><strong>F3気分障害：</strong>うつ・希死念慮・躁症状の有無を記載。</p>',
      };
      ms.innerHTML = hints[this.currentCase] || `<p><strong>${CASE_CATEGORIES[this.currentCase].label}</strong>：疾患特有の精神医学的所見を記載。</p>`;
    }

    const dxEl = this.root.querySelector('#hint_dx_basis');
    if (dxEl) {
      const dxHints = {
        1: '<p><strong>F0診断根拠：</strong>器質性原因と精神症状の時系列的関連。</p>',
        2: '<p><strong>F1依存症：</strong>依存症候群（F1x.2）の診断基準への対応。</p>',
        3: '<p><strong>F2：</strong>ICD-10 F20のA/B基準への対応。</p>',
        4: '<p><strong>F3：</strong>気分エピソードの診断基準・除外根拠。</p>',
      };
      dxEl.innerHTML = dxHints[this.currentCase] || '<p>選択した疾患のICD-10診断基準への対応を記載。</p>';
    }

    const admBasis = this.root.querySelector('#hint_adm_basis');
    if (admBasis) {
      if (admType === '措置入院') {
        admBasis.innerHTML = '<p><strong>措置入院の根拠：</strong>自傷他害のおそれの具体的根拠と措置診察の契機。</p>';
      } else if (admType === '医療保護入院') {
        admBasis.innerHTML = '<p><strong>医療保護入院の根拠：</strong>任意入院不可の根拠・同意者・告知内容。</p>';
      } else {
        admBasis.innerHTML = '<p>ステップ1で入院形態を選択すると記載要件が表示されます。</p>';
      }
    }

    this.renderLegalChecks(admType);
  }

  renderLegalChecks(admType) {
    const area = this.root.querySelector('#legal_checks_area');
    if (!area) return;
    if (admType === '措置入院') {
      area.innerHTML = `<div class="hint-box info"><p class="font-bold">措置入院 — 法的手続確認</p><ul>
        <li>措置診察の契機を確認</li><li>症状消退届（退院時）</li><li>退院後生活環境相談員の選任</li></ul></div>`;
    } else if (admType === '医療保護入院') {
      area.innerHTML = `<div class="hint-box warn"><p class="font-bold">医療保護入院 — 法的手続確認</p><ul>
        <li>指定医による判定</li><li>同意者の続柄・同意日</li><li>書面告知</li><li>入院届10日以内</li></ul></div>`;
    } else {
      area.innerHTML = '<p class="text-muted">ステップ1で入院形態を選択すると確認事項が表示されます。</p>';
    }
  }

  renderIcdSelector() {
    const container = this.root.querySelector('#icdSelector');
    if (!container) return;
    const groupKey = Object.keys(ICD_DATA)[this.currentCase - 1];
    const items = ICD_DATA[groupKey] || [];
    container.innerHTML = `<div class="icd-group"><div class="icd-group-title">${groupKey}</div><div class="icd-chips">`
      + items.map((item) => `<button type="button" class="icd-chip" data-code="${item.code}">${item.code}</button>`).join('')
      + '</div></div>';
    container.querySelectorAll('.icd-chip').forEach((chip) => {
      chip.addEventListener('click', () => this.selectIcd(chip.dataset.code, chip));
    });
    const icd = this.root.querySelector('#s1_icd')?.value;
    if (icd) this.syncIcdChip(icd);
  }

  selectIcd(code, el) {
    this.root.querySelectorAll('.icd-chip').forEach((c) => c.classList.remove('selected'));
    el.classList.add('selected');
    const input = this.root.querySelector('#s1_icd');
    if (input) input.value = code;
    this.handleInput();
  }

  syncIcdChip(icdVal) {
    if (!icdVal) return;
    this.root.querySelectorAll('.icd-chip').forEach((chip) => {
      chip.classList.toggle('selected', chip.dataset.code === icdVal || chip.textContent.trim() === icdVal);
    });
  }

  toggleRestrictionArea() {
    const restChecked = this.root.querySelector('input[name=s1_restriction]:checked');
    const area = this.root.querySelector('#restrictionTypes');
    if (!area) return;
    if (restChecked?.value === '有') area.classList.remove('hidden');
    else area.classList.add('hidden');
  }

  updateCharCount() {
    const data = this.readFormData();
    const total = getCharCount(data);
    const adm = String(data.s3_admission || '').length;
    const course = String(data.s3_course || '').length;
    const cons = String(data.s7_consider || '').length;

    const el = this.root.querySelector('#totalCharDisplay');
    if (el) {
      el.textContent = `${total}字`;
      el.className = total < 1200 ? 'char-total warn' : total > 2500 ? 'char-total over' : 'char-total ok';
    }
    const bar = this.root.querySelector('#charBar');
    if (bar) bar.style.width = `${Math.min(100, total / 25)}%`;
    const lbl = this.root.querySelector('#charBarLabel');
    if (lbl) {
      lbl.textContent = total < 1200 ? `目標まで${1200 - total}字不足` : total > 2500 ? `${total - 2500}字超過` : '字数：OK（1200〜2500字）';
    }
    const countAdm = this.root.querySelector('#countAdm');
    if (countAdm) countAdm.textContent = `${adm}字`;
    const countCourse = this.root.querySelector('#countCourse');
    if (countCourse) countCourse.textContent = `${course}字`;
    const countConsider = this.root.querySelector('#countConsider');
    if (countConsider) countConsider.textContent = `${cons}字`;
  }
}
