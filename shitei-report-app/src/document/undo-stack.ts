import type { CaseData } from '../domain/form-fields';
import type { ChecklistState, ShiteiDocument } from '../domain/schema';
import { MAX_VERSIONS } from '../domain/schema';

export interface EditSnapshot {
  cases: Record<string, CaseData>;
  checklist: ChecklistState;
}

export function cloneEditSnapshot(doc: ShiteiDocument): EditSnapshot {
  return {
    cases: JSON.parse(JSON.stringify(doc.cases)),
    checklist: JSON.parse(JSON.stringify(doc.checklist)),
  };
}

export function snapshotsEqual(a: EditSnapshot, b: EditSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export class UndoStack {
  private past: EditSnapshot[] = [];
  private future: EditSnapshot[] = [];

  clear(): void {
    this.past = [];
    this.future = [];
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  push(snapshot: EditSnapshot): void {
    this.past.push(snapshot);
    if (this.past.length > MAX_VERSIONS) {
      this.past.shift();
    }
    this.future = [];
  }

  undo(current: EditSnapshot): EditSnapshot | null {
    if (!this.past.length) return null;
    this.future.push(current);
    return this.past.pop()!;
  }

  redo(current: EditSnapshot): EditSnapshot | null {
    if (!this.future.length) return null;
    this.past.push(current);
    return this.future.pop()!;
  }
}
