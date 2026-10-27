
    (function () {
      const MAXH = 100;
      const STARTER = "# Welcome to Ink\n\n* Clean interface\n* Live preview\n* Undo that never lies\n\n**Bold** text, *italic* text and `code` too.\n\n> Every keystroke is a snapshot on the undo stack.\n\n[W3Schools](https://www.w3schools.com)\n\n```\nundo.push(snapshot);\ntext = undo.top(); undo.pop();\n```\n";
      const $ = id => document.getElementById(id);
      const appCtn = $('appCtn'), editorEl = $('editorEl'), previewEl = $('previewEl'), backdropEl = $('backdropEl'), gutterEl = $('gutterEl');
      const undoStackCtn = $('undoStackCtn'), redoStackCtn = $('redoStackCtn'), toastEl = $('toastEl');
      let undoSt = [], redoSt = [], base = STARTER, toastT = null;
      try {const saved = localStorage.getItem('ink-theme'); if (saved === 'light' || saved === 'dark') appCtn.dataset.theme = saved;} catch (e) { }

      function esc(s) {return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');}
      function toast(msg) {toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2200);}

      let codeStore = [];
      function detectFns(code) {
        const kw = {if: 1, for: 1, while: 1, switch: 1, catch: 1, return: 1, sizeof: 1, typeof: 1, else: 1, do: 1, case: 1, new: 1, delete: 1, class: 1, struct: 1, import: 1, from: 1};
        const seen = []; const re = /(?:^|[^\w:])([A-Za-z_]\w*)\s*\(/gm; let m;
        while ((m = re.exec(code)) && seen.length < 8) {const n = m[1]; if (!kw[n] && seen.indexOf(n) < 0) seen.push(n);}
        return seen;
      }
      function md(src) {
        let t = esc(src), codeBlocks = [];
        t = t.replace(/```([\s\S]*?)(```|$)/g, (m, inner) => {codeBlocks.push(inner.replace(/^\n/, '').replace(/\n$/, '')); return '[[PRE' + (codeBlocks.length - 1) + ']]';});
        function inline(s) {
          s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
          s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
          s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
          s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
          s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
          s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
          s = s.replace(/(^|[^_*])_([^_\n]+)_/g, '$1<em>$2</em>');
          s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
          return s;
        }
        const lines = t.split('\n'); let html = '', inUL = false, inOL = false, para = [];
        function flushPara() {if (para.length) {html += '<p>' + para.map(inline).join('<br>') + '</p>'; para = [];} }
        function closeLists() {if (inUL) {html += '</ul>'; inUL = false;} if (inOL) {html += '</ol>'; inOL = false;} }
        for (const ln of lines) {
          let m; const pm = ln.match(/^\[\[PRE(\d+)\]\]$/);
          if (pm) {flushPara(); closeLists(); const fns = detectFns(codeBlocks[+pm[1]]); const numbered = codeBlocks[+pm[1]].split('\n').map((L, i) => '<span class="cbLn"><span class="cbNo">' + (i + 1) + '</span><span class="cbTx">' + (L || ' ') + '</span></span>').join('\n'); html += '<div class="codeblock"><div class="cbHead"><span class="cbNum">code ' + (+pm[1] + 1) + '</span>' + (fns.length ? '<span class="cbFns">' + esc(fns.join(' · ')) + '</span>' : '<span class="cbFns"></span>') + '<button class="cbCopy" data-i="' + pm[1] + '">Copy</button></div><pre><code>' + numbered + '</code></pre></div>'; continue;}
          if (/^&gt;/.test(ln)) {flushPara(); closeLists(); html += '<blockquote>' + inline(ln.replace(/^&gt;\s?/, '')) + '</blockquote>'; continue;}
          if (/^\s*---+\s*$/.test(ln)) {flushPara(); closeLists(); html += '<hr>'; continue;}
          if ((m = ln.match(/^(#{1,3})\s+(.*)/))) {flushPara(); closeLists(); const lv = m[1].length; html += '<h' + lv + '>' + inline(m[2]) + '</h' + lv + '>'; continue;}
          if ((m = ln.match(/^\s*[-*]\s+(.*)/))) {flushPara(); if (inOL) {html += '</ol>'; inOL = false;} if (!inUL) {html += '<ul>'; inUL = true;} html += '<li>' + inline(m[1]) + '</li>'; continue;}
          if ((m = ln.match(/^\s*\d+[.)]\s+(.*)/))) {flushPara(); if (inUL) {html += '</ul>'; inUL = false;} if (!inOL) {html += '<ol>'; inOL = true;} html += '<li>' + inline(m[1]) + '</li>'; continue;}
          if (/^\s*$/.test(ln)) {flushPara(); closeLists(); continue;}
          para.push(ln);
        }
        flushPara(); closeLists();
        codeStore = codeBlocks;
        return html || '<p style="opacity:.5">Nothing to preview yet — start typing.</p>';
      }

      function hl(src) {
        const lines = esc(src).split('\n'); let inCode = false;
        return lines.map(ln => {
          if (/^```/.test(ln)) {inCode = !inCode; return '<span class="hc">' + ln + '</span>';}
          if (inCode) return '<span class="hc">' + ln + '</span>';
          let m;
          if ((m = ln.match(/^(#{1,6})(\s.*)?$/))) {return '<span class="hh">' + m[1] + '</span><span class="hbt">' + esc(m[2] || '') + '</span>';}
          if (/^&gt;/.test(ln)) {return '<span class="hq">&gt;</span>' + hlInline(ln.replace(/^&gt;\s?/, ''));}
          if ((m = ln.match(/^(\s*(?:[-*]|\d+[.)])\s+)(.*)$/))) {return '<span class="hm">' + m[1] + '</span>' + hlInline(m[2]);}
          return hlInline(ln);
        }).join('\n');
      }
      function hlInline(s) {
        return s.replace(/(`[^`\n]+`)|(\*\*|__)(.+?)\2|(~~)(.+?)\4|(\*|_)([^*\n]+?)\6|(\[)([^\]]+)(\]\([^)\s]+\))/g,
          function (m, code, bb, bt, st1, stx, it, ix, lb, lt, lr) {
            if (code !== undefined) return '<span class="hc">' + code.slice(1, -1) + '</span>';
            if (bb !== undefined) return '<span class="hb">' + bb + '</span><span class="hbt">' + bt + '</span><span class="hb">' + bb + '</span>';
            if (st1 !== undefined) return '<span class="hb">' + st1 + '</span><span class="hi">' + stx + '</span><span class="hb">' + st1 + '</span>';
            if (it !== undefined) return '<span class="hb">' + it + '</span><span class="hi">' + ix + '</span><span class="hb">' + it + '</span>';
            return '<span class="hm">' + lb + '</span><span class="hl">' + lt + '</span><span class="hm">' + lr + '</span>';
          });
      }

      function cellLabel(s, i) {const one = String(s).split('\n').map(x => x.trim()).filter(Boolean)[0] || '(empty)'; const short = one.length > 20 ? one.slice(0, 20) + '…' : one; return '#' + (i + 1) + ' · ' + String(s).length + 'ch · ' + short;}
      function renderStack(ctn, arr, emptyMsg) {
        ctn.innerHTML = '';
        if (!arr.length) {ctn.innerHTML = '<div style="font-size:11px;opacity:.5;padding:4px 2px">' + emptyMsg + '</div>'; return;}
        const show = arr.slice(-8);
        for (let k = show.length - 1; k >= 0; k--) {
          const isTop = (k === show.length - 1);
          const d = document.createElement('div'); d.className = 'cell' + (isTop ? ' top' : '');
          d.textContent = cellLabel(show[k], arr.length - show.length + k);
          if (isTop) {const tag = document.createElement('span'); tag.className = 'topTag'; tag.textContent = 'TOP'; d.prepend(tag);}
          ctn.appendChild(d);
        }
      }

      function render() {
        const v = editorEl.value;
        previewEl.innerHTML = md(v);
        backdropEl.innerHTML = hl(v) + '\n';
        const n = v.split('\n').length; let g = ''; for (let i = 1; i <= n; i++) g += '<div>' + i + '</div>'; gutterEl.innerHTML = g;
        renderStack(undoStackCtn, undoSt, 'empty — type to push snapshots');
        renderStack(redoStackCtn, redoSt, 'empty — undo something first');
        const words = (v.match(/\S+/g) || []).length;
        $('wordsEl').textContent = words; $('charsEl').textContent = v.length;
        $('undoDepthEl').textContent = undoSt.length; $('redoDepthEl').textContent = redoSt.length;
        $('undoBadgeEl').textContent = undoSt.length; $('redoBadgeEl').textContent = redoSt.length;
        $('stackCntEl').textContent = undoSt.length + ' + ' + redoSt.length;
        $('countEl').textContent = 'Markdown Editor · ' + undoSt.length + ' undo + ' + redoSt.length + ' redo';
        $('undoBtn').disabled = !undoSt.length; $('redoBtn').disabled = !redoSt.length;
        const fill = $('loadFillEl'); fill.style.width = Math.round(undoSt.length / MAXH * 100) + '%';
        syncScroll();
      }
      function syncScroll() {backdropEl.scrollTop = editorEl.scrollTop; backdropEl.scrollLeft = editorEl.scrollLeft; gutterEl.scrollTop = editorEl.scrollTop;}
      function pushBase() {undoSt.push(base); if (undoSt.length > MAXH) undoSt.shift(); redoSt = [];}
      function commitNow() {const v = editorEl.value; if (v !== base) {pushBase(); base = v; render();} }
      function doUndo() {
        if (!undoSt.length) {toast('Nothing to undo'); return;}
        redoSt.push(editorEl.value);
        const prev = undoSt.pop();
        editorEl.value = prev; base = prev;
        toast('Undone'); render();
      }
      function doRedo() {
        if (!redoSt.length) {toast('Nothing to redo'); return;}
        undoSt.push(editorEl.value);
        const nxt = redoSt.pop();
        editorEl.value = nxt; base = nxt;
        toast('Redone'); render();
      }
      function wrapOrInsert(before, after, placeholder) {
        const s = editorEl.selectionStart || 0, e = editorEl.selectionEnd || 0, v = editorEl.value;
        const sel = v.slice(s, e) || placeholder;
        pushBase();
        const nv = v.slice(0, s) + before + sel + after + v.slice(e);
        editorEl.value = nv; base = nv;
        const pos = s + before.length + sel.length;
        editorEl.focus(); editorEl.setSelectionRange(pos, pos);
        render();
      }
      function linePrefix(prefix) {
        const s = editorEl.selectionStart || 0, v = editorEl.value;
        const ls = v.lastIndexOf('\n', s - 1) + 1;
        pushBase();
        const nv = v.slice(0, ls) + prefix + v.slice(ls);
        editorEl.value = nv; base = nv;
        editorEl.focus(); editorEl.setSelectionRange(s + prefix.length, s + prefix.length); render();
      }

      editorEl.value = STARTER;
      editorEl.addEventListener('input', commitNow);
      editorEl.addEventListener('scroll', syncScroll);
      editorEl.addEventListener('keydown', e => {
        const mod = e.ctrlKey || e.metaKey;
        if (mod && !e.shiftKey && e.key.toLowerCase() === 'z') {e.preventDefault(); commitNow(); doUndo();}
        else if ((mod && e.key.toLowerCase() === 'y') || (mod && e.shiftKey && e.key.toLowerCase() === 'z')) {e.preventDefault(); doRedo();}
      });

      $('undoBtn').onclick = () => {commitNow(); doUndo();};
      $('redoBtn').onclick = doRedo;
      $('boldBtn').onclick = () => wrapOrInsert('**', '**', 'bold text');
      $('italicBtn').onclick = () => wrapOrInsert('*', '*', 'italic text');
      $('strikeBtn').onclick = () => wrapOrInsert('~~', '~~', 'struck text');
      $('linkBtn').onclick = () => wrapOrInsert('[', '](https://)', 'link text');
      $('headBtn').onclick = () => linePrefix('# ');
      $('head2Btn').onclick = () => linePrefix('## ');
      $('listBtn').onclick = () => linePrefix('- ');
      $('quoteBtn').onclick = () => linePrefix('> ');
      $('codeBtn').onclick = () => {
        const s = editorEl.selectionStart || 0, e = editorEl.selectionEnd || 0, v = editorEl.value;
        const sel = v.slice(s, e);
        pushBase();
        let nv, cs, ce;
        if (!sel) {
          const needNl = s > 0 && v[s - 1] !== '\n' ? '\n' : '';
          nv = v.slice(0, s) + needNl + '```\ncode here\n```\n' + v.slice(e);
          cs = s + needNl.length + 4; ce = cs + 9;
        } else if (sel.indexOf('\n') >= 0) {
          nv = v.slice(0, s) + '```\n' + sel.replace(/\n$/, '') + '\n```' + v.slice(e);
          cs = s + 4; ce = s + 4 + sel.length;
        } else {
          nv = v.slice(0, s) + '`' + sel + '`' + v.slice(e);
          cs = s + 1; ce = s + 1 + sel.length;
        }
        editorEl.value = nv; base = nv;
        editorEl.focus(); editorEl.setSelectionRange(cs, ce); render();
      };

      $('themeBtn').onclick = () => {appCtn.dataset.theme = appCtn.dataset.theme === 'dark' ? 'light' : 'dark'; try {localStorage.setItem('ink-theme', appCtn.dataset.theme);} catch (e) { } toast(appCtn.dataset.theme === 'dark' ? 'Dark mode' : 'Light mode');};

      function download(name, content, type) {const b = new Blob([content], {type}); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);}
      $('saveBtn').onclick = () => {download($('filenameEl').textContent || 'project.md', editorEl.value, 'text/markdown'); toast('Saved');};
      $('openBtn').onclick = () => $('fileInput').click();
      $('fileInput').addEventListener('change', () => {
        const f = $('fileInput').files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => {pushBase(); editorEl.value = String(r.result); base = editorEl.value; $('filenameEl').textContent = f.name; toast('Opened ' + f.name); render();};
        r.readAsText(f); $('fileInput').value = '';
      });
      $('exportBtn').onclick = (e) => {e.stopPropagation(); $('exportMenuCtn').hidden = !$('exportMenuCtn').hidden;};
      document.addEventListener('click', () => {$('exportMenuCtn').hidden = true;});
      function baseName() {return (($('filenameEl').textContent || 'project').replace(/\.[^.]*$/, '')) || 'project';}
      function styledDoc() {
        return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>' + esc($('filenameEl').textContent) + '</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.6;color:#0f172a}pre{background:#0f172a;color:#e2e8f0;padding:14px;border-radius:10px;overflow-x:auto}pre code{background:none;padding:0;color:inherit}code{background:#f1f5f9;padding:1px 6px;border-radius:6px}blockquote{border-left:3px solid #8b5cf6;margin:8px 0;padding:4px 12px;color:#475569}a{color:#7c3aed}.codeblock{border:1px solid #0f172a;border-radius:10px;overflow:hidden;margin:10px 0}.cbHead{display:flex;gap:8px;align-items:center;background:#1e293b;color:#e6edf3;font-size:12px;padding:6px 10px}.cbNum{font-weight:800;color:#c4b5fd;font-family:monospace}.cbFns{opacity:.65;font-family:monospace;flex:1}.cbCopy{display:none}.codeblock pre{line-height:1.45;font-size:13px}</style></head><body>' + md(editorEl.value) + '</body></html>';
      }
      $('expHtmlBtn').onclick = () => {$('exportMenuCtn').hidden = true; download(baseName() + '.html', styledDoc(), 'text/html'); toast('Exported HTML');};
      $('expWordBtn').onclick = () => {
        $('exportMenuCtn').hidden = true;
        const doc = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="UTF-8"><style>body{font-family:Calibri,Arial,sans-serif;line-height:1.5}pre{background:#f1f5f9;padding:10px}code{background:#f1f5f9}blockquote{border-left:3px solid #8b5cf6;margin:8px 0;padding:4px 12px}</style></head><body>' + md(editorEl.value) + '</body></html>';
        download(baseName() + '.doc', doc, 'application/msword'); toast('Exported Word file');
      };
      $('expPdfBtn').onclick = () => {
        $('exportMenuCtn').hidden = true;
        const f = document.createElement('iframe');
        f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
        document.body.appendChild(f);
        const d = f.contentWindow.document; d.open(); d.write(styledDoc()); d.close();
        f.contentWindow.focus(); f.contentWindow.print();
        setTimeout(() => f.remove(), 5000); toast('Opening print dialog for PDF');
      };

      function showPage(which) {
        const pages = {edit: $('pageEditCtn'), prev: $('pagePrevCtn'), stack: $('pageStackCtn')};
        for (const k in pages) pages[k].classList.toggle('active', k === which);
        const tabs = {edit: $('tabEditBtn'), prev: $('tabPrevBtn'), stack: $('tabStackBtn')};
        for (const k in tabs) tabs[k].classList.toggle('active', k === which);
      }
      $('tabEditBtn').onclick = () => showPage('edit');
      $('tabPrevBtn').onclick = () => showPage('prev');
      $('tabStackBtn').onclick = () => showPage('stack');

      async function getCpp() {
        if (typeof EMBEDDED_CPP === 'string' && EMBEDDED_CPP.includes('int main')) return EMBEDDED_CPP;
        for (const u of ['src/stackeditor.cpp', 'stackeditor.cpp']) {try {const r = await fetch(u); if (r.ok) {const t = await r.text(); if (t.includes('int main')) return t;} } catch (e) { } }
        return '';
      }
      function openPdf() {
        (async () => {
          for (const u of ['src/stack-guide.pdf', 'stack-guide.pdf']) {try {const r = await fetch(u, {method: 'HEAD'}); if (r.ok) {window.open(u, '_blank'); return;} } catch (e) { } }
          window.open('src/stack-guide.pdf', '_blank');
        })();
      }
      $('pdfBtn').onclick = openPdf;
      previewEl.addEventListener('click', e => {
        const b = e.target.closest ? e.target.closest('.cbCopy') : null; if (!b) return;
        const tmp = document.createElement('div'); tmp.innerHTML = codeStore[+b.dataset.i] || '';
        const raw = tmp.textContent;
        const done = () => toast('Copied code ' + (+b.dataset.i + 1));
        const fallback = () => {const ta = document.createElement('textarea'); ta.value = raw; document.body.appendChild(ta); ta.select(); try {document.execCommand('copy'); done();} catch (err) {toast('Copy blocked by browser');} ta.remove();};
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(raw).then(done, fallback);
        else fallback();
      });
      $('cppBtn').onclick = async () => {const t = await getCpp(); if (!t) {toast('C++ not loaded'); return;} const b = new Blob([t], {type: 'text/x-c++src'}); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'stackeditor.cpp'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);};
      render();
    })();