#!/usr/bin/env python3
"""icd10-definitions.json を minify して icd10.html の </main> 直後に埋め込む。"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "icd10.html"
JSON_PATH = ROOT / "icd10-definitions.json"

MARKER_START = "<!-- ICD10_DEFINITIONS_EMBED_START -->"
MARKER_END = "<!-- ICD10_DEFINITIONS_EMBED_END -->"

INJECT_SCRIPT = """
<script type="application/json" id="icd10-definitions-data">__JSON__</script>
<script>
(function () {
  function injectIcdDefinitionColumn() {
    var el = document.getElementById('icd10-definitions-data');
    if (!el) return;
    var defs = {};
    try { defs = JSON.parse(el.textContent); } catch (e) { return; }
    function expandDefRowStackLayout(tr) {
      if (tr.dataset.defStackLayout === '1') return;
      var tds = Array.prototype.slice.call(tr.querySelectorAll(':scope > td'));
      if (tds.length !== 5) return;
      var icdTd = tds[0];
      var jaTd = tds[1];
      var enTd = tds[2];
      var defTd = tds[3];
      var dsmTd = tds[4];
      if (!enTd.classList.contains('en-col') || !defTd.classList.contains('def-col')) return;
      tr._layoutStackCells = tds;
      tds.forEach(function (td) {
        td.remove();
      });
      var table = tr.closest('table');
      var headRow = table && table.querySelector('thead tr');
      var nCol = headRow ? headRow.cells.length : 5;
      var wrap = document.createElement('td');
      wrap.className = 'def-expanded-stack-cell';
      wrap.colSpan = nCol;
      var stack = document.createElement('div');
      stack.className = 'row-def-stack';
      function addBlock(labelText, bodyClass, innerHtmlOrText, asText, blockExtraClass) {
        var block = document.createElement('div');
        block.className = 'row-def-stack__block' + (blockExtraClass ? ' ' + blockExtraClass : '');
        var lab = document.createElement('div');
        lab.className = 'row-def-stack__label';
        lab.textContent = labelText;
        block.appendChild(lab);
        var body = document.createElement('div');
        body.className = 'row-def-stack__body ' + bodyClass;
        if (asText) body.textContent = innerHtmlOrText;
        else body.innerHTML = innerHtmlOrText;
        block.appendChild(body);
        stack.appendChild(block);
      }
      addBlock('ICDコード', '', icdTd.innerHTML, false, 'row-def-stack__block--inline');
      addBlock('日本語名', 'row-def-stack__body--ja', jaTd.innerHTML, false, 'row-def-stack__block--inline');
      addBlock('定義', 'row-def-stack__body--def text-gray-700', defTd.textContent, true);
      wrap.appendChild(stack);
      tr.appendChild(wrap);
      tr.dataset.defStackLayout = '1';
    }
    function collapseDefRowStackLayout(tr) {
      if (tr.dataset.defStackLayout !== '1') return;
      var wrap = tr.querySelector('td.def-expanded-stack-cell');
      if (wrap) wrap.remove();
      var saved = tr._layoutStackCells;
      if (saved && saved.length === 5) {
        saved.forEach(function (cell) {
          tr.appendChild(cell);
        });
      }
      tr._layoutStackCells = null;
      delete tr.dataset.defStackLayout;
    }
    document.querySelectorAll('table.code-table').forEach(function (table) {
      var thRow = table.querySelector('thead tr');
      var enTh = thRow && thRow.querySelector('th.en-col');
      if (!enTh || thRow.querySelector('th.def-col')) return;
      var dth = document.createElement('th');
      dth.className = 'def-col';
      dth.textContent = '定義';
      enTh.insertAdjacentElement('afterend', dth);
      table.querySelectorAll('tbody tr').forEach(function (tr) {
        var codeEl = tr.querySelector('.icd-code');
        var enTd = tr.querySelector('td.en-col');
        if (!codeEl || !enTd || tr.querySelector('td.def-col')) return;
        var code = codeEl.textContent.trim();
        var td = document.createElement('td');
        td.className = 'def-col text-gray-700';
        td.textContent = defs[code] || '—';
        enTd.insertAdjacentElement('afterend', td);
        tr.classList.add('code-row-expandable');
        tr.setAttribute('tabindex', '0');
        tr.setAttribute('title', '行をクリックで定義を読みやすく展開／折りたたみ');
        tr.setAttribute('aria-expanded', 'false');
      });
      table.addEventListener('click', function (ev) {
        var tr = ev.target.closest && ev.target.closest('tbody tr.code-row-expandable');
        if (!tr || !table.contains(tr)) return;
        var interactive = ev.target.closest && ev.target.closest('a[href], button, input, select, textarea');
        if (interactive && tr.contains(interactive)) return;
        ev.preventDefault();
        var wasOpen = tr.classList.contains('row-def-expanded');
        table.querySelectorAll('tbody tr.row-def-expanded').forEach(function (r) {
          collapseDefRowStackLayout(r);
          r.classList.remove('row-def-expanded');
          r.setAttribute('aria-expanded', 'false');
        });
        if (!wasOpen) {
          expandDefRowStackLayout(tr);
          if (tr.dataset.defStackLayout === '1') {
            tr.classList.add('row-def-expanded');
            tr.setAttribute('aria-expanded', 'true');
          }
        }
      });
      table.addEventListener('keydown', function (ev) {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        var tr = ev.target.closest && ev.target.closest('tr.code-row-expandable');
        if (!tr || !table.contains(tr)) return;
        ev.preventDefault();
        tr.click();
      });
    });
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', injectIcdDefinitionColumn);
  else injectIcdDefinitionColumn();
})();
</script>
""".strip()


def main():
    html = HTML_PATH.read_text(encoding="utf-8")
    defs = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    payload = json.dumps(defs, ensure_ascii=False, separators=(",", ":"))
    block = MARKER_START + "\n" + INJECT_SCRIPT.replace("__JSON__", payload) + "\n" + MARKER_END

    if MARKER_START in html and MARKER_END in html:
        pre, rest = html.split(MARKER_START, 1)
        _, post = rest.split(MARKER_END, 1)
        html = pre + block + post
    else:
        needle = "</main>\n\n<script>"
        if needle not in html:
            raise SystemExit("insert point not found")
        html = html.replace(needle, "</main>\n\n" + block + "\n\n<script>", 1)

    HTML_PATH.write_text(html, encoding="utf-8")
    print("injected definitions into", HTML_PATH)


if __name__ == "__main__":
    main()
