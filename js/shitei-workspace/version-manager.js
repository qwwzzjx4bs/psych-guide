export const MAX_VERSIONS = 50;

export function addSnapshot(doc, message) {
  const snap = {
    cases: JSON.parse(JSON.stringify(doc.cases)),
    checklist: JSON.parse(JSON.stringify(doc.checklist)),
  };
  const ver = {
    id: `v_${Date.now()}`,
    timestamp: new Date().toISOString(),
    message: message || '（メッセージなし）',
    snapshot: snap,
  };
  if (!doc.versions) doc.versions = [];
  doc.versions.unshift(ver);
  if (doc.versions.length > MAX_VERSIONS) {
    doc.versions = doc.versions.slice(0, MAX_VERSIONS);
  }
  return ver;
}

export function restoreSnapshot(doc, id) {
  const ver = doc.versions?.find((v) => v.id === id);
  if (!ver) return false;
  addSnapshot(doc, '復元前の自動バックアップ');
  doc.cases = JSON.parse(JSON.stringify(ver.snapshot.cases));
  doc.checklist = JSON.parse(JSON.stringify(ver.snapshot.checklist));
  return true;
}

export function removeSnapshot(doc, id) {
  if (!doc.versions) return;
  doc.versions = doc.versions.filter((v) => v.id !== id);
}
