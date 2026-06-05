import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { evaluateChecklist } from '../checklist/checklist-engine';
import type { CaseData } from '../domain/form-fields';
import type { ShiteiDocument } from '../domain/schema';
import {
  caseDataToDocxJson,
  docxJsonToString,
  isEmptyCase,
} from './case-to-docx';

export interface DocxExportResult {
  files: string[];
  outputDir: string;
}

function summarizeCheckIssues(doc: ShiteiDocument): string | null {
  const results = evaluateChecklist(doc);
  const fails = results.filter((r) => !r.checked && r.status === 'fail').length;
  const warns = results.filter((r) => !r.checked && r.status === 'warn').length;
  if (!fails && !warns) return null;
  return `チェック未達: fail ${fails}件、warn ${warns}件\n\nこのまま docx 出力を続行しますか？`;
}

function resolveCaseNumbers(mode: 'single' | 'all', currentCase: number): number[] {
  if (mode === 'single') return [currentCase];
  return [1, 2, 3, 4, 5];
}

function resolveExportCases(
  doc: ShiteiDocument,
  caseNums: number[],
  includeEmpty: boolean,
): number[] {
  const empty = caseNums.filter((n) => isEmptyCase(doc.cases[`case${n}`] || {}));
  if (!empty.length || includeEmpty) return caseNums;
  return caseNums.filter((n) => !empty.includes(n));
}

async function confirmEmptyCases(emptyNums: number[]): Promise<'skip' | 'all' | 'cancel'> {
  const list = emptyNums.map((n) => `第${n}症例`).join('、');
  const skip = confirm(
    `${list} は本文がほぼ空です。\n\nOK = 空症例をスキップして出力\nキャンセル = 次の選択へ`,
  );
  if (skip) return 'skip';
  const all = confirm('空症例も含めて全件出力しますか？\n\nOK = 全件出力\nキャンセル = 中止');
  if (all) return 'all';
  return 'cancel';
}

export async function exportDocx(
  doc: ShiteiDocument,
  mode: 'single' | 'all',
  currentCase: number,
): Promise<DocxExportResult | null> {
  let caseNums = resolveCaseNumbers(mode, currentCase);

  const checkMsg = summarizeCheckIssues(doc);
  if (checkMsg && !confirm(checkMsg)) return null;

  if (mode === 'all') {
    const emptyNums = caseNums.filter((n) => isEmptyCase(doc.cases[`case${n}`] || {}));
    if (emptyNums.length) {
      const choice = await confirmEmptyCases(emptyNums);
      if (choice === 'cancel') return null;
      if (choice === 'skip') {
        caseNums = resolveExportCases(doc, caseNums, false);
        if (!caseNums.length) {
          alert('出力対象の症例がありません');
          return null;
        }
      }
    }
  }

  const outputDir = await open({
    directory: true,
    multiple: false,
    title: mode === 'all' ? '5症例 docx の出力先フォルダ' : 'docx の出力先フォルダ',
  });
  if (!outputDir || typeof outputDir !== 'string') return null;

  const casesJson = caseNums.map((n) => {
    const data: CaseData = doc.cases[`case${n}`] || {};
    return docxJsonToString(caseDataToDocxJson(n, data));
  });

  const result = await invoke<DocxExportResult>('export_docx_cases', {
    casesJson,
    outputDir,
  });

  try {
    if (result.files.length) {
      await revealItemInDir(result.files[0]);
    } else {
      await revealItemInDir(result.outputDir);
    }
  } catch {
    // opener failure is non-fatal
  }

  return result;
}
