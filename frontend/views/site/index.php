<?php
use yii\helpers\Html;
$this->title = 'Записная книга';
?>

<div class="app">
    <!-- Сайдбар: иерархия папок -->
    <aside class="sidebar">
        <div class="sidebar-head">
            <div class="brand">
                <i class="bi bi-journal-richtext"></i>
                <span>NoteBook</span>
            </div>
            <button class="btn btn-primary btn-sm" id="btnNewFolder">
                <i class="bi bi-folder-plus"></i>
            </button>
        </div>
        <div class="sidebar-search">
            <i class="bi bi-search"></i>
            <input id="searchFolders" placeholder="Поиск папок...">
        </div>
        <div id="folderTree" class="folder-tree"></div>
    </aside>

    <!-- Основная область -->
    <main class="board-wrap">
        <header class="board-head">
            <div class="crumb" id="crumb">Выберите папку</div>
            <div class="board-actions">
                <button class="btn btn-outline-primary btn-sm" id="btnNewNote" disabled>
                    <i class="bi bi-plus-lg"></i> Заметка
                </button>
            </div>
        </header>
        <div class="board" id="board">
            <svg class="threads" id="threads"></svg>
            <svg class="att-threads" id="attThreads"></svg>
            <div class="board-inner" id="boardInner"></div>
            <div class="board-empty" id="boardEmpty">
                <i class="bi bi-pin-angle"></i>
                <p>Выберите или создайте папку, а затем добавьте заметки.</p>
            </div>
        </div>
    </main>
</div>

<!-- Модальное окно редактирования заметки -->
<div class="modal fade" id="noteModal" tabindex="-1">
  <div class="modal-dialog modal-lg modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <input class="form-control form-control-lg border-0 shadow-none" id="noteTitle" placeholder="Заголовок...">
        <button class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <textarea class="form-control note-content" id="noteContent" rows="6" placeholder="Текст заметки..."></textarea>
        <div class="d-flex gap-2 mt-3">
            <label class="btn btn-outline-primary btn-sm mb-0">
                <i class="bi bi-image"></i> Прикрепить фото
                <input type="file" id="fileInput" hidden accept="image/*,image/gif">
            </label>
            <input type="color" class="form-control form-control-color" id="noteColor" title="Цвет заметки">
            <button class="btn btn-outline-danger btn-sm ms-auto" id="btnDeleteNote">
                <i class="bi bi-trash"></i> Удалить
            </button>
        </div>
        <div class="attachments-list mt-3" id="attachmentsList"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="btnSaveNote">Сохранить</button>
      </div>
    </div>
  </div>
</div>