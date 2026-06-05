import { WizardApp } from './wizard/wizard-app';
import { getCurrentWindow } from '@tauri-apps/api/window';

async function setupCloseGuard(): Promise<void> {
  const win = getCurrentWindow();
  await win.onCloseRequested(async (event) => {
    const dirty = document.body.dataset.dirty === 'true';
    if (dirty && !confirm('未保存の変更があります。終了しますか？')) {
      event.preventDefault();
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app');
  if (!root) return;
  new WizardApp(root);
  void setupCloseGuard();
});
