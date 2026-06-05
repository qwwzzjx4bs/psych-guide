import { DocumentManager, loadRecentFiles, checkRecovery } from '../document/document-manager';
import { CASE_CATEGORIES, ICD_DATA } from '../domain/case-categories';
import { CHECK_FIELDS, emptyCaseData, getCharCount, type CaseData } from '../domain/form-fields';
import { evaluateChecklist, getCheckScores, toggleManualOverride, CATEGORIES, type CheckResult } from '../checklist/checklist-engine';
import { getCheckNavKind, resolveCheckNavigation, type NavTarget } from '../checklist/check-navigation';
import { buildForm31Html, printForm31 } from '../export/form31-renderer';
import { exportDocx } from '../export/docx-export';
import {
  getStep1AdmHint,
  getStep3AdmissionHint,
  getStep4MseHint,
  getStep5AdmBasisHint,
  getStep5DxHint,
  getStep6LegalChecksHtml,
  hintBox,
} from './adm-hints';

const LAYOUT_FIELDS = new Set(['s1_adm_type', 's1_restriction', 's1_icd']);

export class WizardApp {
  private dm = new DocumentManager();
  private currentCase = 1;
  private currentStep = 1;
  private showVersionPanel = false;
  private showStepCopyModal = false;
  private showPreview = false;
  private root: HTMLElement;
  private checkDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private undoChromeTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingFocusField: string | undefined;

  constructor(root: HTMLElement) {
    this.root = root;
    this.dm.onChange(() => {
      document.body.dataset.dirty = this.dm.isDirty() ? 'true' : 'false';
      this.renderFull();
    });
    this.setupKeyboard();
    void this.init();
  }

  private async init(): Promise<void> {
    const recovery = await checkRecovery();
    if (recovery) {
      const ok = confirm('前回の編集内容が見つかりました。復元しますか？');
      if (ok) this.dm.loadFromJson(recovery, null);
    }
    this.renderFull();
  }

  private setupKeyboard(): void {
    document.addEventListener('keydown', (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 's') { e.preventDefault(); void (e.shiftKey ? this.dm.saveAs() : this.dm.save()); return; }
      if (e.key === 'o') { e.preventDefault(); void this.dm.open(); return; }
      if (e.key === 'n') { e.preventDefault(); this.confirmNew(); return; }
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (this.dm.canRedo()) this.dm.redo();
        } else if (this.dm.canUndo()) {
          this.dm.undo();
        }
      }
    });
  }

  private confirmNew(): void {
    if (this.dm.isDirty() && !confirm('未保存の変更があります。新規作成しますか？')) return;
    this.dm.newDocument();
    this.currentCase = 1;
    this.currentStep = 1;
  }

  private getCaseData(): CaseData {
    return { ...this.dm.getDocument().cases[`case${this.currentCase}`] };
  }

  private setField(id: string, value: string | boolean, opts?: { layout?: boolean }): void {
    const key = `case${this.currentCase}`;
    const data = { ...this.dm.getDocument().cases[key], [id]: value };
    this.dm.updateCase(key, data, { silent: true });
    this.updateChrome();
    this.scheduleCheckUpdate();
    this.scheduleUndoChromeUpdate();
    if (opts?.layout || LAYOUT_FIELDS.has(id)) {
      this.refreshWizardCard();
    }
  }

  private scheduleCheckUpdate(): void {
    if (this.checkDebounceTimer) clearTimeout(this.checkDebounceTimer);
    this.checkDebounceTimer = setTimeout(() => this.updateCheckPanel(), 500);
  }

  private scheduleUndoChromeUpdate(): void {
    if (this.undoChromeTimer) clearTimeout(this.undoChromeTimer);
    this.undoChromeTimer = setTimeout(() => this.updateUndoButtons(), 850);
  }

  private updateUndoButtons(): void {
    const undo = this.root.querySelector('[data-action="undo"]') as HTMLButtonElement | null;
    const redo = this.root.querySelector('[data-action="redo"]') as HTMLButtonElement | null;
    if (undo) undo.disabled = !this.dm.canUndo();
    if (redo) redo.disabled = !this.dm.canRedo();
  }

  private renderFull(): void {
    const doc = this.dm.getDocument();
    const data = doc.cases[`case${this.currentCase}`] || emptyCaseData();

    this.root.innerHTML = `
<div class="app-shell">
  <header class="app-header">
    <div>
      <p class="app-subtitle">精神保健指定医 レポート作成 — 令和7年新基準</p>
      <h1 class="app-title" id="app-title">${esc(this.dm.getTitle())}</h1>
    </div>
    <div class="header-actions">
      <button data-action="undo" ${this.dm.canUndo() ? '' : 'disabled'}>元に戻す</button>
      <button data-action="redo" ${this.dm.canRedo() ? '' : 'disabled'}>やり直し</button>
      <button data-action="new">新規</button>
      <button data-action="open">開く</button>
      <button data-action="save" id="save-btn">${this.dm.getFilePath() ? '上書き保存' : '保存'}</button>
      <button data-action="save-as">名前を付けて保存</button>
      <button data-action="import">旧JSON取込</button>
      <button data-action="recent">最近のファイル</button>
      <button data-action="export-docx-all">5症例 docx 出力</button>
      <button data-action="versions" id="versions-btn">履歴 (${doc.versions.length})</button>
    </div>
  </header>
  <div class="main-layout">
    <div class="wizard-column">
      <div class="case-tabs">${this.renderCaseTabs()}</div>
      <div id="wizard-content">${this.showPreview ? this.renderPreview(data) : this.renderWizard(data)}</div>
    </div>
    <aside class="check-panel" id="check-panel">${this.renderCheckPanelContent()}</aside>
  </div>
</div>
${this.showVersionPanel ? this.renderVersionPanel(doc) : ''}
${this.showStepCopyModal ? this.renderStepCopyModal() : ''}
<div id="toast" class="toast hidden"></div>`;

    this.bindEvents();
    this.applyPendingFocus();
  }

  private renderCaseTabs(): string {
    return [1, 2, 3, 4, 5].map(n => `
      <button class="case-tab ${n === this.currentCase ? 'active' : ''}" data-case="${n}">第${n}症例</button>`).join('');
  }

  private refreshWizardCard(): void {
    const el = this.root.querySelector('#wizard-content');
    if (!el) return;
    const data = this.dm.getDocument().cases[`case${this.currentCase}`] || emptyCaseData();
    el.innerHTML = this.showPreview ? this.renderPreview(data) : this.renderWizard(data);
    this.bindWizardEvents();
    this.applyPendingFocus();
  }

  private updateChrome(): void {
    document.body.dataset.dirty = this.dm.isDirty() ? 'true' : 'false';
    const titleEl = this.root.querySelector('#app-title');
    if (titleEl) titleEl.textContent = this.dm.getTitle();
    const saveBtn = this.root.querySelector('#save-btn');
    if (saveBtn) saveBtn.textContent = this.dm.getFilePath() ? '上書き保存' : '保存';
    const versionsBtn = this.root.querySelector('#versions-btn');
    if (versionsBtn) versionsBtn.textContent = `履歴 (${this.dm.getDocument().versions.length})`;

    const data = this.getCaseData();
    const total = getCharCount(data);
    const charBox = this.root.querySelector('#char-box');
    if (charBox) {
      charBox.className = `char-box ${total < 1200 ? 'warn' : total > 2500 ? 'over' : 'ok'}`;
      charBox.innerHTML = `合計字数: <strong>${total}</strong> / 1200〜2500字`;
    }
    const charInfo = this.root.querySelector('#char-info-step3');
    if (charInfo) {
      charInfo.textContent = `入院時状況+入院後経過+考察 = 1200〜2500字（現在 ${total}字）`;
    }
  }

  private updateCheckPanel(): void {
    const panel = this.root.querySelector('#check-panel');
    if (!panel) return;
    panel.innerHTML = this.renderCheckPanelContent();
    this.bindCheckEvents();
  }

  private renderCheckPanelContent(): string {
    const doc = this.dm.getDocument();
    const results = evaluateChecklist(doc);
    const scores = getCheckScores(results);
    return `
      <div class="check-header">
        <h2>申請チェックリスト</h2>
        <div class="check-progress">
          <div class="progress-bar"><div class="progress-fill" style="width:${scores.total.pct}%"></div></div>
          <span id="check-score-label">${scores.total.done}/${scores.total.count} (${scores.total.pct}%)</span>
        </div>
      </div>
      <div class="check-list">${Object.entries(CATEGORIES).map(([cat, def]) => {
        const catDef = def as { title: string; ids: string[]; group: string };
        const catResults = results.filter((r: CheckResult) => r.category === cat);
        const done = catResults.filter((r: CheckResult) => r.checked).length;
        return `<details open class="check-cat"><summary>${esc(catDef.title)} <span>${done}/${catResults.length}</span></summary>
          ${catResults.map((r: CheckResult) => this.renderCheckItem(r)).join('')}
        </details>`;
      }).join('')}</div>`;
  }

  private renderCheckItem(r: CheckResult): string {
    const cls = r.checked ? 'check-ok' : r.status === 'fail' ? 'check-fail' : r.status === 'warn' ? 'check-warn' : 'check-manual';
    const navKind = getCheckNavKind(r.id);
    const navCls = navKind === 'jump' ? 'check-row-jumpable' : navKind === 'hint' ? 'check-row-hintable' : '';
    const navTitle = navKind === 'jump' ? 'クリックで該当欄へ移動' : navKind === 'hint' ? 'クリックで案内を表示' : '';
    return `<label class="check-row ${cls} ${navCls}" data-check-nav="${r.id}" title="${navTitle}">
      <input type="checkbox" data-check-id="${r.id}" ${r.checked ? 'checked' : ''} ${r.ruleType !== 'manual' && r.status === 'ok' ? 'disabled' : ''}>
      <span>${esc(r.label)}</span>
      ${r.ruleType !== 'manual' ? `<span class="check-badge">${r.status}</span>` : ''}
    </label>`;
  }

  private renderWizard(data: CaseData): string {
    const steps = ['表紙', '背景', '現病歴', '精神症状', '診断', '法的手続', '治療'];
    return `
      <div class="step-indicator">${steps.map((s, i) => {
        const n = i + 1;
        const cls = n === this.currentStep ? 'active' : n < this.currentStep ? 'done' : '';
        return `<button class="step-dot ${cls}" data-step="${n}">${n}</button><span class="step-label">${s}</span>`;
      }).join('')}</div>
      <div class="wizard-card">${this.renderStep(data)}</div>`;
  }

  private renderStep(data: CaseData): string {
    const cat = CASE_CATEGORIES[this.currentCase];
    const adm = String(data.s1_adm_type || '');
    const total = getCharCount(data);
    const icdGroup = Object.keys(ICD_DATA)[this.currentCase - 1];
    const icdChips = (ICD_DATA[icdGroup] || []).map((i: { code: string; label: string }) =>
      `<button type="button" class="icd-chip ${data.s1_icd === i.code ? 'selected' : ''}" data-icd="${i.code}">${i.code}</button>`).join('');

    const nav = (prev: number | null, next: number | null, extra = '') => {
      const copyBtn = this.currentStep >= 2 && this.currentStep <= 7
        ? `<button type="button" class="btn-secondary" data-action="open-step-copy">他症例へコピー</button>`
        : '';
      return `
      <div class="step-nav">
        ${prev ? `<button class="btn-secondary" data-step="${prev}">戻る</button>` : '<span></span>'}
        <div class="step-nav-right">${copyBtn}${extra}${next ? `<button class="btn-primary" data-step="${next}">次へ</button>` : ''}</div>
      </div>`;
    };

    switch (this.currentStep) {
      case 1: return `
        <h2>Step 1: 表紙情報</h2>
        <div class="info-box">${esc(cat.label)} — ${esc(cat.hint)}</div>
        <div class="grid-2">
          <label>申請日<input type="date" data-field="s1_date" value="${v(data, 's1_date')}"></label>
          <label>入院形態<select data-field="s1_adm_type"><option value="">選択</option>
            <option value="措置入院" ${adm === '措置入院' ? 'selected' : ''}>措置入院</option>
            <option value="医療保護入院" ${adm === '医療保護入院' ? 'selected' : ''}>医療保護入院</option></select></label>
        </div>
        ${(() => {
          const h = getStep1AdmHint(adm);
          return h.variant === 'none' ? '' : hintBox(h.html, h.variant === 'warn' ? 'warn' : 'info');
        })()}
        <div class="grid-2">
          <label>最終診断名<input type="text" data-field="s1_dx_name" value="${v(data, 's1_dx_name')}"></label>
          <label>ICD-10<div class="icd-chips">${icdChips}</div><input type="text" data-field="s1_icd" value="${v(data, 's1_icd')}"></label>
        </div>
        <div class="grid-2">
          <label>医療機関<input type="text" data-field="s1_hospital" value="${v(data, 's1_hospital')}"></label>
          <label>イニシャル<input type="text" data-field="s1_initial" value="${v(data, 's1_initial')}"></label>
        </div>
        <div class="grid-2">
          <label>生年月日<input type="date" data-field="s1_dob" value="${v(data, 's1_dob')}"></label>
          <label>入院日<input type="date" data-field="s1_admit_date" value="${v(data, 's1_admit_date')}"></label>
        </div>
        <div class="grid-2">
          <label>退院日<input type="date" data-field="s1_discharge_date" value="${v(data, 's1_discharge_date')}"></label>
          <label>担当開始<input type="date" data-field="s1_attend_start" value="${v(data, 's1_attend_start')}"></label>
        </div>
        <label>指導医<input type="text" data-field="s1_supervisor" value="${v(data, 's1_supervisor')}"></label>
        <div class="common-fields-bar">
          <button type="button" class="btn-secondary" data-action="apply-common">空欄へ一括反映（申請日・医療機関・指導医）</button>
          <p class="field-hint">現在の症例の3項目を、他症例の空欄のみにコピーします（既存入力は保護）</p>
        </div>
        <fieldset><legend>行動制限</legend>
          <label><input type="radio" name="rest" value="有" ${data.s1_restriction === '有' ? 'checked' : ''}> 有</label>
          <label><input type="radio" name="rest" value="無" ${data.s1_restriction === '無' ? 'checked' : ''}> 無</label>
          ${data.s1_restriction === '有' ? `<div class="rest-types">${CHECK_FIELDS.map(f => {
            const labels: Record<string, string> = { rt_kal: '隔離', rt_phy: '身体的拘束', rt_tel: '電話制限', rt_vis: '面会制限', rt_opn: '開放処遇制限' };
            return `<label><input type="checkbox" data-check-field="${f}" ${data[f] ? 'checked' : ''}> ${labels[f]}</label>`;
          }).join('')}</div>` : ''}
        </fieldset>
        ${nav(null, 2)}`;

      case 2: return `
        <h2>Step 2: 患者背景</h2>
        <div class="grid-2">
          <label>年齢<input type="text" data-field="s2_age" value="${v(data, 's2_age')}"></label>
          <label>性別<select data-field="s2_sex"><option value="">選択</option><option ${v(data, 's2_sex') === '男性' ? 'selected' : ''}>男性</option><option ${v(data, 's2_sex') === '女性' ? 'selected' : ''}>女性</option></select></label>
        </div>
        ${ta('家族歴', 's2_family', data)}${ta('生活歴', 's2_life', data)}${ta('既往歴', 's2_hx', data)}
        <label>初診時主訴<input type="text" data-field="s2_cc" value="${v(data, 's2_cc')}"></label>
        ${nav(1, 3)}`;

      case 3: return `
        <h2>Step 3: 現病歴</h2>
        <div class="info-box" id="char-info-step3">入院時状況+入院後経過+考察 = 1200〜2500字（現在 ${total}字）</div>
        ${hintBox(getStep3AdmissionHint(adm))}
        ${ta('入院前経過', 's3_pre', data)}
        ${ta('入院時の状況（字数対象）', 's3_admission', data, 6)}
        ${ta('入院後経過（字数対象）', 's3_course', data, 7)}
        ${nav(2, 4)}`;

      case 4: return `
        <h2>Step 4: 精神症状・MSE</h2>
        ${hintBox(getStep4MseHint(this.currentCase))}
        ${field('外観・行動', 's4_behavior', data)}${field('意識・見当識', 's4_consciousness', data)}
        ${field('知的機能', 's4_cognition', data)}${field('気分・感情', 's4_mood', data)}
        ${field('思考', 's4_thought', data)}${field('知覚', 's4_perception', data)}
        ${field('自傷他害リスク', 's4_risk', data)}${field('病識', 's4_insight', data)}
        ${ta('追記', 's4_other', data)}
        ${nav(3, 5)}`;

      case 5: return `
        <h2>Step 5: 診断・根拠</h2>
        ${hintBox(getStep5DxHint(this.currentCase))}
        ${ta('診断根拠', 's5_dx_basis', data, 4)}
        ${ta('鑑別診断', 's5_diff_dx', data, 3)}
        ${hintBox(getStep5AdmBasisHint(adm))}
        ${ta('入院形態の法的根拠', 's5_adm_basis', data, 5)}
        ${nav(4, 6)}`;

      case 6: return `
        <h2>Step 6: 法的手続</h2>
        <div class="legal-checks-box ${adm === '医療保護入院' ? 'legal-checks-warn' : 'legal-checks-info'}">${getStep6LegalChecksHtml(adm)}</div>
        ${ta('行動制限詳細', 's6_restriction_detail', data, 4)}
        <label>退院後生活環境相談員<input type="text" data-field="s6_seisanin" value="${v(data, 's6_seisanin')}"></label>
        ${nav(5, 7)}`;

      case 7: return `
        <h2>Step 7: 治療・考察</h2>
        ${ta('薬物療法', 's7_pharma', data, 3)}
        ${ta('非薬物療法', 's7_nonpharma', data, 3)}
        ${ta('退院後支援', 's7_aftercare', data, 3)}
        ${ta('考察（字数対象・任意）', 's7_consider', data, 4)}
        <div id="char-box" class="char-box ${total < 1200 ? 'warn' : total > 2500 ? 'over' : 'ok'}">
          合計字数: <strong>${total}</strong> / 1200〜2500字
        </div>
        ${nav(6, null, `<button class="btn-secondary" data-action="text-draft">テキスト草案</button>
          <button class="btn-secondary" data-action="export-docx-case">この症例を docx 出力</button>
          <button class="btn-primary" data-action="form31">様式3-1プレビュー</button>`)}`;

      default: return '';
    }
  }

  private renderPreview(data: CaseData): string {
    return `
      <div class="preview-toolbar">
        <button class="btn-secondary" data-action="back-wizard">← 入力に戻る</button>
        <button class="btn-primary" data-action="print">印刷/PDF</button>
      </div>
      <div class="form31-wrap">${buildForm31Html(this.currentCase, data)}</div>`;
  }

  private renderVersionPanel(doc: ReturnType<DocumentManager['getDocument']>): string {
    return `<div class="modal-overlay" data-action="close-versions">
      <div class="modal" onclick="event.stopPropagation()">
        <h2>バージョン履歴</h2>
        <div class="version-form">
          <input id="commit-msg" placeholder="バージョンメッセージ">
          <button data-action="commit">スナップショット保存</button>
          <button data-action="export-versions">JSON書出</button>
          <button data-action="import-versions">JSON読込</button>
        </div>
        <ul class="version-list">${doc.versions.length ? doc.versions.map((ver: { id: string; timestamp: string; message: string }) => `
          <li><time>${new Date(ver.timestamp).toLocaleString('ja-JP')}</time>
            <strong>${esc(ver.message)}</strong>
            <button data-restore="${ver.id}">復元</button>
            <button data-delete-ver="${ver.id}">削除</button>
          </li>`).join('') : '<li class="empty">履歴なし</li>'}</ul>
        <button class="btn-secondary" data-action="close-versions">閉じる</button>
      </div>
    </div>`;
  }

  private renderStepCopyModal(): string {
    const stepLabels = ['', '表紙', '背景', '現病歴', '精神症状', '診断', '法的手続', '治療'];
    const targets = [1, 2, 3, 4, 5].filter((n) => n !== this.currentCase);
    return `<div class="modal-overlay step-copy-overlay" data-action="close-step-copy">
      <div class="step-copy-modal" onclick="event.stopPropagation()">
        <h2>Step ${this.currentStep}（${stepLabels[this.currentStep]}）を他症例へコピー</h2>
        <p class="step-copy-desc">第${this.currentCase}症例の入力内容を、選択した症例の<strong>空欄のみ</strong>に反映します。既存の入力は保護されます。</p>
        <div class="step-copy-targets">${targets.map((n) => `
          <label class="step-copy-target">
            <input type="checkbox" data-step-copy-target="${n}" checked>
            第${n}症例
          </label>`).join('')}</div>
        <div class="step-copy-actions">
          <button class="btn-secondary" data-action="close-step-copy">キャンセル</button>
          <button class="btn-primary" data-action="execute-step-copy">反映</button>
        </div>
      </div>
    </div>`;
  }

  private bindEvents(): void {
    this.root.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', () => void this.handleAction((el as HTMLElement).dataset.action!));
    });
    this.root.querySelectorAll('[data-case]').forEach(el => {
      el.addEventListener('click', () => {
        this.currentCase = Number((el as HTMLElement).dataset.case);
        this.currentStep = 1;
        this.showPreview = false;
        this.renderFull();
        this.updateCheckPanel();
      });
    });
    this.bindWizardEvents();
    this.bindCheckEvents();
    this.root.querySelectorAll('[data-restore]').forEach(el => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.restore!;
        if (confirm('このバージョンに復元しますか？')) {
          this.dm.restoreVersion(id);
          this.showToast('復元しました');
        }
      });
    });
    this.root.querySelectorAll('[data-delete-ver]').forEach(el => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.deleteVer!;
        if (confirm('削除しますか？')) { this.dm.deleteVersion(id); this.showToast('削除しました'); }
      });
    });
  }

  private bindWizardEvents(): void {
    const scope = this.root.querySelector('#wizard-content');
    if (!scope) return;
    scope.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', () => void this.handleAction((el as HTMLElement).dataset.action!));
    });
    scope.querySelectorAll('[data-step]').forEach(el => {
      el.addEventListener('click', () => {
        this.currentStep = Number((el as HTMLElement).dataset.step);
        this.refreshWizardCard();
      });
    });
    scope.querySelectorAll('[data-field]').forEach(el => {
      const id = (el as HTMLElement).dataset.field!;
      el.addEventListener('input', () => this.setField(id, (el as HTMLInputElement).value));
      el.addEventListener('change', () => this.setField(id, (el as HTMLInputElement).value));
    });
    scope.querySelectorAll('[data-check-field]').forEach(el => {
      const id = (el as HTMLElement).dataset.checkField!;
      el.addEventListener('change', () => this.setField(id, (el as HTMLInputElement).checked));
    });
    scope.querySelectorAll('[data-icd]').forEach(el => {
      el.addEventListener('click', () => this.setField('s1_icd', (el as HTMLElement).dataset.icd!, { layout: true }));
    });
    scope.querySelectorAll('input[name="rest"]').forEach(el => {
      el.addEventListener('change', () => this.setField('s1_restriction', (el as HTMLInputElement).value, { layout: true }));
    });
  }

  private bindCheckEvents(): void {
    this.root.querySelectorAll('[data-check-id]').forEach(el => {
      el.addEventListener('change', (e) => {
        e.stopPropagation();
        const id = (el as HTMLElement).dataset.checkId!;
        const doc = this.dm.getDocument();
        this.dm.updateChecklist(toggleManualOverride(doc.checklist, id, (el as HTMLInputElement).checked), { silent: true });
        this.updateCheckPanel();
      });
    });
    this.root.querySelectorAll('[data-check-nav]').forEach(el => {
      el.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        const id = (el as HTMLElement).dataset.checkNav!;
        this.handleCheckNavClick(id);
      });
    });
  }

  private handleCheckNavClick(ruleId: string): void {
    const result = resolveCheckNavigation(ruleId, this.dm.getDocument());
    if (!result) return;
    if (result.type === 'manual') {
      this.showToast(result.hint, 5000);
      return;
    }
    this.navigateToCheckTarget(result.target);
  }

  private navigateToCheckTarget(target: NavTarget): void {
    this.currentCase = target.caseNum;
    this.currentStep = target.step;
    this.showPreview = false;
    this.pendingFocusField = target.fields?.[0];
    const tabs = this.root.querySelector('.case-tabs');
    const wizard = this.root.querySelector('#wizard-content');
    if (tabs) tabs.innerHTML = this.renderCaseTabs();
    if (wizard) {
      const data = this.dm.getDocument().cases[`case${this.currentCase}`] || emptyCaseData();
      wizard.innerHTML = this.showPreview ? this.renderPreview(data) : this.renderWizard(data);
    }
    this.root.querySelectorAll('[data-case]').forEach(el => {
      el.addEventListener('click', () => {
        this.currentCase = Number((el as HTMLElement).dataset.case);
        this.currentStep = 1;
        this.showPreview = false;
        this.renderFull();
        this.updateCheckPanel();
      });
    });
    this.bindWizardEvents();
    this.applyPendingFocus();
  }

  private applyPendingFocus(): void {
    const field = this.pendingFocusField;
    if (!field) return;
    this.pendingFocusField = undefined;
    requestAnimationFrame(() => {
      const el = this.root.querySelector(`[data-field="${field}"]`) as HTMLElement | null;
      el?.focus();
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }

  private async handleAction(action: string): Promise<void> {
    switch (action) {
      case 'new': this.confirmNew(); break;
      case 'open': await this.dm.open(); this.showToast('ファイルを開きました'); break;
      case 'save': await this.dm.save(); this.showToast('保存しました'); break;
      case 'save-as': await this.dm.saveAs(); this.showToast('保存しました'); break;
      case 'import': await this.dm.importLegacy(); this.showToast('旧JSONを取り込みました'); break;
      case 'recent': await this.showRecentDialog(); break;
      case 'apply-common': {
        const result = this.dm.applyCommonFields(`case${this.currentCase}`);
        this.showToast(`${result.applied}件反映、${result.skipped}件スキップ（既存入力）`);
        this.updateCheckPanel();
        this.updateUndoButtons();
        break;
      }
      case 'undo':
        if (this.dm.undo()) {
          this.updateCheckPanel();
          this.updateUndoButtons();
        }
        break;
      case 'redo':
        if (this.dm.redo()) {
          this.updateCheckPanel();
          this.updateUndoButtons();
        }
        break;
      case 'open-step-copy':
        this.showStepCopyModal = true;
        this.renderFull();
        break;
      case 'close-step-copy':
        this.showStepCopyModal = false;
        this.renderFull();
        break;
      case 'execute-step-copy': {
        const targets = [...this.root.querySelectorAll('[data-step-copy-target]:checked')]
          .map((el) => Number((el as HTMLElement).dataset.stepCopyTarget));
        if (!targets.length) {
          alert('コピー先の症例を1件以上選択してください');
          return;
        }
        const result = this.dm.copyStepToCases(`case${this.currentCase}`, this.currentStep, targets);
        this.showStepCopyModal = false;
        this.showToast(`${result.applied}件反映、${result.skipped}件スキップ`);
        this.updateCheckPanel();
        this.updateUndoButtons();
        this.renderFull();
        break;
      }
      case 'versions': this.showVersionPanel = true; this.renderFull(); break;
      case 'close-versions': this.showVersionPanel = false; this.renderFull(); break;
      case 'commit': {
        const msg = (document.getElementById('commit-msg') as HTMLInputElement)?.value.trim();
        if (!msg) { alert('メッセージを入力してください'); return; }
        this.dm.addVersion(msg);
        this.showToast('スナップショットを保存しました');
        break;
      }
      case 'export-versions': {
        const blob = new Blob([this.dm.exportVersionsJson()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `shitei_versions_${Date.now()}.json`;
        a.click();
        break;
      }
      case 'import-versions': {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async () => {
          const f = input.files?.[0];
          if (!f) return;
          const text = await f.text();
          const mode = confirm('上書きしますか？（キャンセル=マージ）') ? 'replace' : 'merge';
          this.dm.importVersionsJson(text, mode as 'replace' | 'merge');
          this.showToast('バージョン履歴を読み込みました');
        };
        input.click();
        break;
      }
      case 'text-draft': {
        const d = this.getCaseData();
        const w = window.open('', '_blank');
        w?.document.write(`<pre style="font-family:sans-serif;padding:20px;white-space:pre-wrap">${esc(JSON.stringify(d, null, 2))}</pre>`);
        break;
      }
      case 'form31': this.showPreview = true; this.renderFull(); break;
      case 'back-wizard': this.showPreview = false; this.renderFull(); break;
      case 'print': printForm31(this.currentCase, this.getCaseData()); break;
      case 'export-docx-case': {
        const result = await exportDocx(this.dm.getDocument(), 'single', this.currentCase);
        if (result) this.showToast(`${result.files.length}件の docx を出力しました`);
        break;
      }
      case 'export-docx-all': {
        const result = await exportDocx(this.dm.getDocument(), 'all', this.currentCase);
        if (result) this.showToast(`${result.files.length}件の docx を出力しました`);
        break;
      }
    }
  }

  private showToast(msg: string, ms = 2500): void {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), ms);
  }

  async showRecentDialog(): Promise<void> {
    const recent = await loadRecentFiles();
    if (!recent.length) { alert('最近使ったファイルはありません'); return; }
    const labels = recent.map((r, i) => `${i + 1}. ${r.title || r.path.split(/[/\\]/).pop}`).join('\n');
    const pick = prompt(`開くファイル番号を入力:\n${labels}`);
    if (!pick) return;
    const idx = parseInt(pick, 10) - 1;
    if (idx < 0 || idx >= recent.length) return;
    await this.dm.openPath(recent[idx].path);
    this.showToast('ファイルを開きました');
  }
}

function v(data: CaseData, id: string): string {
  return esc(String(data[id] ?? ''));
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function ta(label: string, id: string, data: CaseData, rows = 3): string {
  return `<label>${label}<textarea data-field="${id}" rows="${rows}">${v(data, id)}</textarea></label>`;
}

function field(label: string, id: string, data: CaseData): string {
  return `<label>${label}<input type="text" data-field="${id}" value="${v(data, id)}"></label>`;
}
