export interface CaseCategory {
  label: string;
  icdRange: string;
  hint: string;
}

export const CASE_CATEGORIES: Record<number, CaseCategory> = {
  1: { label: '第1症例（F0 器質性精神障害）', icdRange: 'F00〜F09', hint: '器質性精神障害（老年期認知症を除く）。せん妄（F05）・器質性精神障害（F06）など。' },
  2: { label: '第2症例（F1 依存症）', icdRange: 'F10〜F19（依存症のみ）', hint: '精神作用物質依存症のみ（依存症候群 F1x.2以上）。有害使用・急性中毒のみでは不可。' },
  3: { label: '第3症例（F2 統合失調症）', icdRange: 'F20〜F29', hint: '統合失調症・統合失調症型障害・妄想性障害。F20〜F29。' },
  4: { label: '第4症例（F3 気分障害）', icdRange: 'F30〜F39', hint: '気分（感情）障害。双極性感情障害（F31）・うつ病エピソード（F32）など。' },
  5: { label: '第5症例（F4〜F9 その他）', icdRange: 'F40〜F98', hint: '神経症性障害（F4）・生理的障害（F5）・パーソナリティ障害（F6）・知的障害（F7）・発達障害（F8）・小児期の障害（F9）から選択。' },
};

export const ICD_DATA: Record<string, { code: string; label: string }[]> = {
  'F0 器質性精神障害': [
    { code: 'F05.0', label: 'F05.0 せん妄（認知症に重畳しないもの）' },
    { code: 'F05.1', label: 'F05.1 認知症に重畳するせん妄' },
    { code: 'F06.0', label: 'F06.0 器質性幻覚症' },
    { code: 'F06.2', label: 'F06.2 器質性妄想性障害' },
    { code: 'F06.3', label: 'F06.3 器質性気分障害' },
    { code: 'F07.0', label: 'F07.0 器質性人格障害' },
    { code: 'F09', label: 'F09 特定不能の器質性精神障害' },
  ],
  'F1 精神作用物質依存症（依存症のみ）': [
    { code: 'F10.2', label: 'F10.2 アルコール依存症候群' },
    { code: 'F11.2', label: 'F11.2 オピオイド依存症候群' },
    { code: 'F12.2', label: 'F12.2 大麻依存症候群' },
    { code: 'F13.2', label: 'F13.2 鎮静薬/催眠薬依存症候群' },
    { code: 'F14.2', label: 'F14.2 コカイン依存症候群' },
    { code: 'F15.2', label: 'F15.2 覚醒剤等依存症候群' },
  ],
  'F2 統合失調症スペクトラム': [
    { code: 'F20.0', label: 'F20.0 妄想型統合失調症' },
    { code: 'F20.1', label: 'F20.1 破瓜型統合失調症' },
    { code: 'F20.2', label: 'F20.2 緊張型統合失調症' },
    { code: 'F20.5', label: 'F20.5 残遺型統合失調症' },
    { code: 'F20.9', label: 'F20.9 統合失調症（特定不能）' },
    { code: 'F21', label: 'F21 統合失調症型障害' },
    { code: 'F22', label: 'F22 持続性妄想性障害' },
    { code: 'F25', label: 'F25 統合失調感情障害' },
  ],
  'F3 気分障害': [
    { code: 'F30.1', label: 'F30.1 躁病エピソード（精神病症状なし）' },
    { code: 'F30.2', label: 'F30.2 精神病症状を伴う躁病エピソード' },
    { code: 'F31.0', label: 'F31.0 双極性感情障害（軽躁エピソード）' },
    { code: 'F31.4', label: 'F31.4 双極性感情障害（精神病症状を伴う重うつエピソード）' },
    { code: 'F31.5', label: 'F31.5 双極性感情障害（重うつエピソード）' },
    { code: 'F32.2', label: 'F32.2 重症うつ病エピソード（精神病症状なし）' },
    { code: 'F32.3', label: 'F32.3 重症うつ病エピソード（精神病症状あり）' },
    { code: 'F33.2', label: 'F33.2 反復性うつ病（重症エピソード）' },
  ],
  'F4〜F9 その他': [
    { code: 'F40.0', label: 'F40.0 広場恐怖' },
    { code: 'F41.0', label: 'F41.0 パニック障害' },
    { code: 'F42', label: 'F42 強迫性障害（OCD）' },
    { code: 'F43.1', label: 'F43.1 PTSD' },
    { code: 'F50.0', label: 'F50.0 神経性無食欲症（AN）' },
    { code: 'F60.3', label: 'F60.3 境界性人格障害（BPD）' },
    { code: 'F70', label: 'F70 軽度知的障害' },
    { code: 'F84.0', label: 'F84.0 小児自閉症（ASD）' },
    { code: 'F90.0', label: 'F90.0 注意欠陥多動性障害（ADHD）' },
  ],
};

export function icdMatchesCategory(caseNum: number, icd: string): boolean {
  const n = parseIcd(icd);
  if (n === null) return false;
  switch (caseNum) {
    case 1: return n >= 0 && n <= 9;
    case 2: return n >= 10 && n <= 19;
    case 3: return n >= 20 && n <= 29;
    case 4: return n >= 30 && n <= 39;
    case 5: return n >= 40 && n <= 98;
    default: return false;
  }
}

function parseIcd(icd: string): number | null {
  const m = String(icd || '').trim().match(/^F(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}
