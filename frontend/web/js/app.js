(() => {
  const state = {
    folders: [],              // [{id, parent_id, name}]
    activeFolder: null,
    notes: [],                // текущие заметки доски
    links: [],                // [{id, from_note_id, to_note_id}]
    editingNote: null,        // объект заметки в модалке
    dragNote: null,
    dragAtt: null,
    linkDrag: null,           // {fromId, tempPath}
  };

  window.state = state;

  const api = {
        async get(url) {
            const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (!r.ok) {
            console.error('[api.get] HTTP', r.status, 'for', url);
            return null;
            }
            try { return await r.json(); }
            catch (e) { console.error('[api.get] bad JSON', e); return null; }
        },

        async send(method, url, data, json = true) {
          const opts = { method, headers: {} };

          // Content-Type и body ставим ТОЛЬКО если есть данные
          if (json && data) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(data);
          } else if (!json && data) {
            opts.body = data;   // FormData — Content-Type выставит браузер
          }

          let r;
          try {
            r = await fetch(url, opts);
          } catch (netErr) {
            console.error('[api.send] network error:', netErr, '→', method, url);
            throw netErr;
          }

          if (!r.ok) {
            console.error('[api.send] HTTP', r.status, method, url);
            const txt = await r.text().catch(() => '');
            console.error('response:', txt);
            return null;
          }

          try { return await r.json(); }
          catch (e) { return {}; }
        }
    };

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const els = {
    tree: $('#folderTree'),
    board: $('#board'),
    boardInner: $('#boardInner'),
    threads: $('#threads'),
    empty: $('#boardEmpty'),
    crumb: $('#crumb'),
    btnNewFolder: $('#btnNewFolder'),
    btnNewNote: $('#btnNewNote'),
    searchFolders: $('#searchFolders'),
    noteModal: null,
    noteTitle: $('#noteTitle'),
    noteContent: $('#noteContent'),
    noteColor: $('#noteColor'),
    fileInput: $('#fileInput'),
    attachmentsList: $('#attachmentsList'),
    btnSaveNote: $('#btnSaveNote'),
    btnDeleteNote: $('#btnDeleteNote'),
  };

  async function loadFolders() {
    try {
        const data = await api.get('/api/folders');
        state.folders = Array.isArray(data) ? data : [];
        renderTree();
        console.log('[notes] loaded folders:', state.folders);
    } catch (e) {
        console.error('[notes] loadFolders failed', e);
        state.folders = [];
    }
}

  function buildTree(list) {
    const byParent = new Map();
    list.forEach(f => {
      const key = f.parent_id === null ? 'root' : f.parent_id;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(f);
    });
    return byParent;
  }

  function renderTree(filter = '') {
    const byParent = buildTree(state.folders);
    const rootItems = (byParent.get('root') || []).filter(matchFilter);
    els.tree.innerHTML = '';

    function matchFilter(f) {
      if (!filter) return true;
      if (f.name.toLowerCase().includes(filter)) return true;
      const kids = byParent.get(f.id) || [];
      return kids.some(matchFilter);
    }

    if (!rootItems.length) {
      els.tree.innerHTML = `<div class="text-center text-muted small py-4">Нет папок</div>`;
      return;
    }

    function renderItem(f, depth) {
      const el = document.createElement('div');

      const row = document.createElement('div');
      row.className = 'folder-item' + (state.activeFolder === f.id ? ' active' : '');
      row.style.paddingLeft = (8 + depth * 8) + 'px';
      row.innerHTML = `
        <span class="caret"><i class="bi bi-chevron-right"></i></span>
        <span class="icon"><i class="bi bi-folder-fill"></i></span>
        <span class="name">${escapeHtml(f.name)}</span>
        <span class="row-actions">
          <button data-act="add"   title="Подпапка"><i class="bi bi-folder-plus"></i></button>
          <button data-act="rename" title="Переименовать"><i class="bi bi-pencil"></i></button>
          <button data-act="del"   title="Удалить"><i class="bi bi-trash"></i></button>
        </span>`;

      const childWrap = document.createElement('div');
      childWrap.className = 'folder-children';
      const kids = byParent.get(f.id) || [];
      if (kids.length) {
        kids.forEach(k => renderItem(k, depth + 1)).forEach(n => childWrap.appendChild(n));
      } else {
        childWrap.style.display = 'none';
      }

      // caret toggle
      row.querySelector('.caret').addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = row.classList.toggle('open');
        childWrap.style.display = isOpen ? '' : 'none';
      });

      // select
      row.addEventListener('click', (e) => {
        if (e.target.closest('.row-actions')) return;
        selectFolder(f.id);
      });

      // actions
      row.querySelectorAll('.row-actions button').forEach(b => {
        b.addEventListener('click', async (e) => {
          e.stopPropagation();
          const act = b.dataset.act;
          if (act === 'add') {
            const name = prompt('Название подпапки:', 'Новая папка');
            if (!name) return;
            await api.send('POST', '/api/folders', { name, parent_id: f.id });
            await loadFolders();
          } else if (act === 'rename') {
            const name = prompt('Новое имя:', f.name);
            if (!name || name === f.name) return;
            await api.send('PUT', '/api/folders/' + f.id, { name });
            await loadFolders();
          } else if (act === 'del') {
            if (!confirm(`Удалить папку "${f.name}" и всё её содержимое?`)) return;
            await api.send('DELETE', '/api/folders/' + f.id);
            if (state.activeFolder === f.id) { state.activeFolder = null; }
            await loadFolders();
          }
        });
      });

      el.appendChild(row);
      el.appendChild(childWrap);
      // по умолчанию открываем ветку если есть активный потомок
      if (containsActive(kids)) {
        row.classList.add('open');
        childWrap.style.display = '';
      }
      return el;
    }

    function containsActive(list) {
      return list.some(k => k.id === state.activeFolder || containsActive(byParent.get(k.id) || []));
    }

    rootItems.forEach(f => els.tree.appendChild(renderItem(f, 0)));

    // открываем все корневые, если фильтр активен — раскрываем ветки где матч
    if (filter) {
      $$('.folder-item').forEach(r => {
        r.classList.add('open');
        const cw = r.nextElementSibling;
        if (cw) cw.style.display = '';
      });
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }

  async function selectFolder(id) {
        if (!id) {
            console.warn('[notes] selectFolder: no id');
            return;
        }
        state.activeFolder = id;
        renderTree($('#searchFolders').value.trim().toLowerCase());
        const f = state.folders.find(x => x.id === id);
        els.crumb.innerHTML = `<i class="bi bi-folder-fill"></i> ${escapeHtml(f ? f.name : '')}`;
        els.btnNewNote.disabled = false;
        await loadBoard();
        if (window.innerWidth <= 900) {
            document.querySelector('.sidebar').classList.remove('open');
            document.querySelector('.app').classList.remove('sidebar-open');
        }
        console.log('[notes] active folder =', state.activeFolder);
    }

  els.btnNewFolder.addEventListener('click', async () => {
    const name = prompt('Название папки:', 'Новая тема');
    if (!name) return;
    await api.send('POST', '/api/folders', { name, parent_id: null });
    await loadFolders();
  });

  els.searchFolders.addEventListener('input', (e) => {
    renderTree(e.target.value.trim().toLowerCase());
  });

  async function loadBoard() {
        if (!state.activeFolder) {
            state.notes = [];
            state.links = [];
            renderBoard();
            return;
        }

        let data = null;
        try {
            data = await api.get('/api/notes?folder_id=' + state.activeFolder);
        } catch (e) {
            console.error('[notes] loadBoard failed:', e);
        }

        state.notes = (data && Array.isArray(data.notes)) ? data.notes : [];
        state.links = (data && Array.isArray(data.links)) ? data.links : [];
        renderBoard();
    }

  function renderBoard() {
    // очищаем доску
    els.boardInner.innerHTML = '';
    els.threads.innerHTML = '';

    els.empty.style.display = state.notes.length ? 'none' : '';
    els.empty.querySelector('p').textContent = state.activeFolder
      ? 'Пока нет заметок. Нажмите «Заметка», чтобы создать.'
      : 'Выберите или создайте папку, а затем добавьте заметки.';

    state.notes.forEach(n => els.boardInner.appendChild(renderNote(n)));
    drawThreads();
    requestAnimationFrame(drawAttThreads);
  }

  function renderNote(n) {
    const el = document.createElement('div');
    el.className = 'note';
    el.dataset.id = n.id;
    el.style.left = n.x + 'px';
    el.style.top = n.y + 'px';
    el.style.width = n.width + 'px';
    el.style.minHeight = n.height + 'px';
    el.style.background = n.color || '#e7f1ff';

    el.innerHTML = `
      <div class="note-head">
        <span class="note-title">${escapeHtml(n.title || 'Без названия')}</span>
        <span class="note-handle" title="Потяните, чтобы соединить"></span>
      </div>
      <div class="note-body">${escapeHtml(n.content || '')}</div>
    `;

    // вложения-картинки
    (n.attachments || []).forEach(a => el.appendChild(renderAtt(a, n.id, el)));

    // перемещение заметки
    const head = el.querySelector('.note-head');
    head.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('note-handle')) return;
      startNoteDrag(e, n, el);
    });

    // открытие редактора
    el.addEventListener('dblclick', (e) => {
      if (e.target.closest('.att') || e.target.classList.contains('note-handle')) return;
      openNoteEditor(n);
    });
    // клик по пустому месту — редактирование тоже, но реже
    el.addEventListener('click', (e) => {
      if (e.target.closest('.att') || e.target.closest('.note-handle')) return;
      // выделяем
      $$('.note.selected').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
    });

    // ручка создания нити
    const handle = el.querySelector('.note-handle');
    handle.addEventListener('mousedown', (e) => startLinkDrag(e, n));

    return el;
  }

  function renderAtt(a, noteId, noteEl) {
        const d = document.createElement('div');
        d.className = 'att';
        d.dataset.id = a.id;
        d.dataset.noteId = noteId;
        d.style.left = a.x + 'px';
        d.style.top = a.y + 'px';
        d.style.width = a.width + 'px';
        d.style.height = a.height + 'px';
        d.innerHTML = `
        <img src="${a.url}" alt="" draggable="false">
        <button class="att-del" title="Удалить">×</button>
        <span class="att-resize" title="Потяните, чтобы изменить размер"></span>`;

        // удаление
        d.querySelector('.att-del').addEventListener('click', async (e) => {
            e.stopPropagation();
            await api.send('DELETE', '/api/attachments/' + a.id);
            d.remove();
            drawAttThreads();
            const note = state.notes.find(n => n.id === noteId);
            if (note) note.attachments = note.attachments.filter(x => x.id !== a.id);
        });

        // перемещение
        d.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('att-del')) return;
            if (e.target.classList.contains('att-resize')) return;
            startAttDrag(e, a, d, noteId);
        });

        // ресайз
        const rz = d.querySelector('.att-resize');
        rz.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            startAttResize(e, a, d);
        });

        return d;
    }

  function startNoteDrag(e, note, el) {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const origX = note.x, origY = note.y;
    el.classList.add('dragging');

    function move(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      note.x = Math.max(0, origX + dx);
      note.y = Math.max(0, origY + dy);
      el.style.left = note.x + 'px';
      el.style.top = note.y + 'px';
      drawThreads();
    }
    function up() {
      el.classList.remove('dragging');
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      api.send('PUT', '/api/notes/' + note.id, { x: note.x, y: note.y });
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  function startAttDrag(e, att, el, noteId) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const origX = att.x, origY = att.y;
    el.classList.add('dragging');

    function move(ev) {
        att.x = origX + (ev.clientX - startX);
        att.y = origY + (ev.clientY - startY);
        el.style.left = att.x + 'px';
        el.style.top = att.y + 'px';
        drawAttThreads();
    }
    function up() {
        el.classList.remove('dragging');
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        api.send('PUT', '/api/attachments/' + att.id, {
            x: att.x, y: att.y, width: att.width, height: att.height
        });
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  function startAttResize(e, att, el) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const origW = att.width, origH = att.height;

    function move(ev) {
        att.width  = Math.max(60, origW + (ev.clientX - startX));
        att.height = Math.max(60, origH + (ev.clientY - startY));
        el.style.width  = att.width + 'px';
        el.style.height = att.height + 'px';
        drawAttThreads();
    }
    function up() {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        api.send('PUT', '/api/attachments/' + att.id, {
            x: att.x, y: att.y, width: att.width, height: att.height
        });
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  function startLinkDrag(e, fromNote) {
    e.preventDefault();
    e.stopPropagation();

    const fromEl = els.boardInner.querySelector(`.note[data-id="${fromNote.id}"]`);
    const rect = els.boardInner.getBoundingClientRect();
    const r = fromEl.getBoundingClientRect();
    const x1 = r.left + r.width - 7 - rect.left + els.boardInner.scrollLeft * 0;
    const y1 = r.top + 22 - rect.top;

    // временный path
    const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tmp.setAttribute('stroke', '#0d6efd');
    tmp.setAttribute('stroke-width', '2.5');
    tmp.setAttribute('fill', 'none');
    tmp.setAttribute('stroke-dasharray', '6 4');
    els.threads.appendChild(tmp);

    let target = null;
    state.linkDrag = { fromId: fromNote.id };

    function move(ev) {
      const bx = els.boardInner.getBoundingClientRect();
      const x2 = ev.clientX - bx.left;
      const y2 = ev.clientY - bx.top;
      tmp.setAttribute('d', curve(x1, y1, x2, y2));

      // проверяем попадание в другую заметку
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const noteEl = el && el.closest && el.closest('.note');
      $$('.note.target').forEach(x => x.classList.remove('target'));
      if (noteEl && +noteEl.dataset.id !== fromNote.id) {
        noteEl.classList.add('target');
        target = +noteEl.dataset.id;
      } else {
        target = null;
      }
    }

    async function up() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      tmp.remove();
      $$('.note.target').forEach(x => x.classList.remove('target'));

      if (target) {
        const exists = state.links.some(l =>
          (l.from_note_id === fromNote.id && l.to_note_id === target) ||
          (l.from_note_id === target && l.to_note_id === fromNote.id)
        );
        if (!exists) {
          const res = await api.send('POST', '/api/links', {
            from_note_id: fromNote.id,
            to_note_id: target
          });
          state.links.push({
            id: res.id || Date.now(),
            from_note_id: fromNote.id,
            to_note_id: target
          });
          drawThreads();
        }
      }
      state.linkDrag = null;
    }

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  /* SVG нити */
  function drawThreads() {
    // сохраняем существующие обработчики? проще перерисовать
    els.threads.innerHTML = '';

    // Клик по нити — удаление
    state.links.forEach(link => {
      const a = els.boardInner.querySelector(`.note[data-id="${link.from_note_id}"]`);
      const b = els.boardInner.querySelector(`.note[data-id="${link.to_note_id}"]`);
      if (!a || !b) return;

      const rA = a.getBoundingClientRect();
      const rB = b.getBoundingClientRect();
      const bx = els.boardInner.getBoundingClientRect();

      const x1 = rA.right - bx.left - 7;
      const y1 = rA.top - bx.top + 22;
      const x2 = rB.left - bx.left + 7;
      const y2 = rB.top - bx.top + 22;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', curve(x1, y1, x2, y2));
      path.setAttribute('stroke', '#3d8bfd');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.style.pointerEvents = 'stroke';
      path.style.cursor = 'pointer';

      path.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Удалить эту нить?')) return;
        await api.send('DELETE', '/api/links/' + link.id);
        state.links = state.links.filter(l => l.id !== link.id);
        drawThreads();
      });
      path.addEventListener('mouseenter', () => path.classList.add('hover'));
      path.addEventListener('mouseleave', () => path.classList.remove('hover'));

      els.threads.appendChild(path);
    });
  }

  function drawAttThreads() {
        const svg = document.getElementById('attThreads');
        if (!svg) return;
        svg.innerHTML = '';

        const bx = els.boardInner.getBoundingClientRect();

        state.notes.forEach(note => {
            const noteEl = els.boardInner.querySelector(`.note[data-id="${note.id}"]`);
            if (!noteEl) return;

            const noteRect = noteEl.getBoundingClientRect();

            (note.attachments || []).forEach(att => {
                const attEl = noteEl.querySelector(`.att[data-id="${att.id}"]`);
                if (!attEl) return;

                const attRect = attEl.getBoundingClientRect();

                // определяем, выходит ли фото за границы заметки
                const inside =
                    attRect.left   >= noteRect.left   - 2 &&
                    attRect.right  <= noteRect.right  + 2 &&
                    attRect.top    >= noteRect.top    - 2 &&
                    attRect.bottom <= noteRect.bottom + 2;

                if (inside) return;   // пока фото внутри заметки — нить не рисуем

                // ближайшие точки: от края заметки до ближайшего края фото
                const noteCx = noteRect.left + noteRect.width  / 2 - bx.left;
                const noteCy = noteRect.top  + noteRect.height / 2 - bx.top;
                const attCx  = attRect.left  + attRect.width   / 2 - bx.left;
                const attCy  = attRect.top   + attRect.height  / 2 - bx.top;

                // старт — точка на границе заметки по направлению к фото
                const angle = Math.atan2(attCy - noteCy, attCx - noteCx);
                const hw = noteRect.width  / 2;
                const hh = noteRect.height / 2;
                // коэффициент для пересечения с прямоугольником заметки
                const t = Math.min(
                    hw / Math.abs(Math.cos(angle) || 1e-6),
                    hh / Math.abs(Math.sin(angle) || 1e-6)
                );
                const x1 = noteCx + Math.cos(angle) * t;
                const y1 = noteCy + Math.sin(angle) * t;
                const x2 = attCx;
                const y2 = attCy;

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', `M ${x1} ${y1} Q ${(x1+x2)/2 + 20} ${(y1+y2)/2}, ${x2} ${y2}`);
                svg.appendChild(path);
            });
        });
    }

  function curve(x1, y1, x2, y2) {
    const dx = Math.max(50, Math.abs(x2 - x1) * 0.5);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }

  els.btnNewNote.addEventListener('click', async () => {
    if (!state.activeFolder) return;
    const res = await api.send('POST', '/api/notes', {
      folder_id: state.activeFolder,
      title: 'Новая заметка',
      content: '',
      x: 80 + Math.random() * 120,
      y: 80 + Math.random() * 120,
      width: 280, height: 180,
      color: '#e7f1ff'
    });
    // перезагрузим доску
    await loadBoard();
    // сразу откроем редактор
    if (res && res.id) {
      const n = state.notes.find(x => x.id === res.id);
      if (n) openNoteEditor(n);
    }
  });

  function openNoteEditor(n) {
    state.editingNote = n;
    els.noteTitle.value = n.title || '';
    els.noteContent.value = n.content || '';
    els.noteColor.value = n.color || '#e7f1ff';
    renderAttachmentsInModal(n);
    els.noteModal = new bootstrap.Modal(document.getElementById('noteModal'));
    els.noteModal.show();
  }

  function renderAttachmentsInModal(n) {
    els.attachmentsList.innerHTML = '';
    (n.attachments || []).forEach(a => {
      const chip = document.createElement('div');
      chip.className = 'att-chip';
      chip.innerHTML = `
        <img src="${a.url}" alt="">
        <button title="Удалить">×</button>`;
      chip.querySelector('button').addEventListener('click', async () => {
        await api.send('DELETE', '/api/attachments/' + a.id);
        n.attachments = n.attachments.filter(x => x.id !== a.id);
        renderAttachmentsInModal(n);
        reloadNoteOnBoard(n);
      });
      els.attachmentsList.appendChild(chip);
    });
  }

  els.fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !state.editingNote) return;
    const fd = new FormData();
    fd.append('note_id', state.editingNote.id);
    fd.append('file', file);
    const res = await api.send('POST', '/api/attachments', fd, false);
    if (res && res.id) {
      state.editingNote.attachments = state.editingNote.attachments || [];
      state.editingNote.attachments.push({
        id: res.id, type: res.type, filename: res.filename, url: res.url,
        x: res.x, y: res.y, width: res.width, height: res.height
      });
      renderAttachmentsInModal(state.editingNote);
      reloadNoteOnBoard(state.editingNote);
    }
    e.target.value = '';
  });

  els.btnSaveNote.addEventListener('click', async () => {
    const n = state.editingNote;
    if (!n) return;
    n.title = els.noteTitle.value.trim();
    n.content = els.noteContent.value;
    n.color = els.noteColor.value;
    await api.send('PUT', '/api/notes/' + n.id, {
      title: n.title, content: n.content, color: n.color
    });
    // обновляем карточку на доске
    const el = els.boardInner.querySelector(`.note[data-id="${n.id}"]`);
    if (el) {
      el.style.background = n.color;
      el.querySelector('.note-title').textContent = n.title || 'Без названия';
      el.querySelector('.note-body').textContent = n.content || '';
    }
    els.noteModal && els.noteModal.hide();
  });

  els.btnDeleteNote.addEventListener('click', async () => {
    if (!state.editingNote) return;
    if (!confirm('Удалить заметку?')) return;
    await api.send('DELETE', '/api/notes/' + state.editingNote.id);
    state.notes = state.notes.filter(x => x.id !== state.editingNote.id);
    state.links = state.links.filter(l =>
      l.from_note_id !== state.editingNote.id && l.to_note_id !== state.editingNote.id);
    els.noteModal && els.noteModal.hide();
    renderBoard();
  });

  function reloadNoteOnBoard(n) {
    const el = els.boardInner.querySelector(`.note[data-id="${n.id}"]`);
    if (!el) return;
    // перерисуем все вложения заново
    el.querySelectorAll('.att').forEach(a => a.remove());
    (n.attachments || []).forEach(a => el.appendChild(renderAtt(a, n.id, el)));
  }

  els.board.addEventListener('mousedown', (e) => {
    if (e.target !== els.board && e.target !== els.boardInner && e.target !== els.threads) return;
    const startX = e.clientX, startY = e.clientY;
    const sx = els.board.scrollLeft, sy = els.board.scrollTop;

    function move(ev) {
      els.board.scrollLeft = sx - (ev.clientX - startX);
      els.board.scrollTop  = sy - (ev.clientY - startY);
    }
    function up() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  window.addEventListener('resize', () => {
    drawThreads();
    drawAttThreads();
  });

  // мобильное меню-кнопка
  const menuBtn = document.createElement('button');
  menuBtn.className = 'btn btn-primary d-lg-none position-fixed';
  menuBtn.style.cssText = 'bottom:20px;right:20px;z-index:20;border-radius:50%;width:52px;height:52px;box-shadow:0 6px 20px rgba(13,110,253,.4)';
  menuBtn.innerHTML = '<i class="bi bi-list"></i>';
  menuBtn.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
    document.querySelector('.app').classList.toggle('sidebar-open');
  });
  document.body.appendChild(menuBtn);

  (async function init() {
        await loadFolders();
        if (state.folders.length) {
            await selectFolder(state.folders[0].id);
        } else {
            console.warn('[notes] no folders found, create one first');
        }
    })();
})();