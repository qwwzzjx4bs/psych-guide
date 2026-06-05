export const MAX_UNDO = 50;

export function cloneEditSnapshot(doc) {
  return {
    cases: JSON.parse(JSON.stringify(doc.cases)),
    checklist: JSON.parse(JSON.stringify(doc.checklist)),
    meta: JSON.parse(JSON.stringify({
      presenter: doc.meta.presenter,
      institution: doc.meta.institution,
      supervisor: doc.meta.supervisor,
    })),
  };
}

export function snapshotsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function applyEditSnapshot(doc, snapshot) {
  doc.cases = JSON.parse(JSON.stringify(snapshot.cases));
  doc.checklist = JSON.parse(JSON.stringify(snapshot.checklist));
  if (snapshot.meta) {
    doc.meta.presenter = snapshot.meta.presenter ?? '';
    doc.meta.institution = snapshot.meta.institution ?? '';
    doc.meta.supervisor = snapshot.meta.supervisor ?? '';
  }
}

export class UndoStack {
  constructor() {
    this.past = [];
    this.future = [];
  }

  clear() {
    this.past = [];
    this.future = [];
  }

  canUndo() {
    return this.past.length > 0;
  }

  canRedo() {
    return this.future.length > 0;
  }

  push(snapshot) {
    this.past.push(snapshot);
    if (this.past.length > MAX_UNDO) this.past.shift();
    this.future = [];
  }

  undo(current) {
    if (!this.past.length) return null;
    this.future.push(current);
    return this.past.pop();
  }

  redo(current) {
    if (!this.future.length) return null;
    this.past.push(current);
    return this.future.pop();
  }
}
