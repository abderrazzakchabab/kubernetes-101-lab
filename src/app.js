/**
 * app.js — Main UI Orchestrator
 *
 * Wires together: sidebar navigation, lesson rendering,
 * terminal integration, progress tracking, and button handlers.
 */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────
   *  DOM references
   * ────────────────────────────────────────────────────── */
  var $nav = document.getElementById('module-nav');
  var $badge = document.getElementById('lesson-badge');
  var $title = document.getElementById('lesson-title');
  var $body = document.getElementById('lesson-body');
  var $taskDesc = document.getElementById('task-description');
  var $hintBox = document.getElementById('task-hint');
  var $hintText = document.getElementById('hint-text');
  var $result = document.getElementById('task-result');
  var $btnCheck = document.getElementById('btn-check');
  var $btnHint = document.getElementById('btn-hint');
  var $btnReset = document.getElementById('btn-reset');
  var $btnClear = document.getElementById('btn-clear-term');
  var $progressLabel = document.getElementById('progress-label');
  var $progressFill = document.getElementById('progress-fill');
  var $termContainer = document.getElementById('terminal-container');

  var currentLesson = null;
  var allLessons = [];

  /* ──────────────────────────────────────────────────────
   *  Flatten lessons for easy lookup
   * ────────────────────────────────────────────────────── */
  window.CURRICULUM.forEach(function (mod) {
    mod.lessons.forEach(function (lesson) {
      allLessons.push(lesson);
    });
  });

  /* ──────────────────────────────────────────────────────
   *  Build sidebar navigation
   * ────────────────────────────────────────────────────── */
  function buildSidebar() {
    $nav.innerHTML = '';
    window.CURRICULUM.forEach(function (mod) {
      var group = document.createElement('div');
      group.className = 'module-group';

      var header = document.createElement('div');
      header.className = 'module-header';
      header.innerHTML = '<span class="arrow">▼</span> ' + mod.moduleTitle;
      header.addEventListener('click', function () {
        header.classList.toggle('collapsed');
        var list = header.nextElementSibling;
        list.style.display = list.style.display === 'none' ? '' : 'none';
      });

      var list = document.createElement('ul');
      list.className = 'lesson-list';

      mod.lessons.forEach(function (lesson) {
        var li = document.createElement('li');
        li.className = 'lesson-item';
        li.dataset.lessonId = lesson.id;

        var check = document.createElement('span');
        check.className = 'check';
        check.textContent = window.clusterState.completedLessons[lesson.id] ? '✓' : '○';

        var label = document.createElement('span');
        label.textContent = lesson.title;

        li.appendChild(check);
        li.appendChild(label);
        li.addEventListener('click', function () { selectLesson(lesson.id); });
        list.appendChild(li);
      });

      group.appendChild(header);
      group.appendChild(list);
      $nav.appendChild(group);
    });
  }

  /* ──────────────────────────────────────────────────────
   *  Select and render a lesson
   * ────────────────────────────────────────────────────── */
  function selectLesson(lessonId) {
    var lesson = allLessons.find(function (l) { return l.id === lessonId; });
    if (!lesson) return;
    currentLesson = lesson;

    // Load setup files into virtual filesystem
    if (lesson.setupFiles) {
      Object.keys(lesson.setupFiles).forEach(function (path) {
        window.clusterState.fileSystem[path] = lesson.setupFiles[path];
      });
    }

    // Update UI
    $badge.textContent = lesson.badge;
    $title.textContent = lesson.title;
    $body.innerHTML = lesson.body;
    $taskDesc.innerHTML = lesson.task;
    $hintText.innerHTML = lesson.hint || '';
    $hintBox.classList.add('hidden');
    $result.classList.add('hidden');
    $result.className = 'hidden';
    $btnCheck.disabled = false;
    $btnHint.disabled = false;

    // Highlight sidebar
    document.querySelectorAll('.lesson-item').forEach(function (el) {
      el.classList.remove('active');
      if (el.dataset.lessonId === lessonId) el.classList.add('active');
    });

    // Scroll lesson panel to top
    document.getElementById('lesson-panel').scrollTop = 0;
  }

  /* ──────────────────────────────────────────────────────
   *  Update progress display
   * ────────────────────────────────────────────────────── */
  function updateProgress() {
    var completed = Object.keys(window.clusterState.completedLessons).length;
    var total = allLessons.length;
    $progressLabel.textContent = 'Progress: ' + completed + ' / ' + total;
    $progressFill.style.width = (total > 0 ? (completed / total) * 100 : 0) + '%';

    // Update sidebar checkmarks
    document.querySelectorAll('.lesson-item').forEach(function (el) {
      var id = el.dataset.lessonId;
      var check = el.querySelector('.check');
      if (window.clusterState.completedLessons[id]) {
        check.textContent = '✓';
        el.classList.add('completed');
      } else {
        check.textContent = '○';
        el.classList.remove('completed');
      }
    });
  }

  /* ──────────────────────────────────────────────────────
   *  Button handlers
   * ────────────────────────────────────────────────────── */

  // Check My Work
  $btnCheck.addEventListener('click', function () {
    if (!currentLesson) return;
    var result = window.verifyTask(currentLesson.verifyId);
    $result.classList.remove('hidden', 'success', 'failure');
    $result.textContent = result.message;
    if (result.passed) {
      $result.classList.add('success');
      window.clusterState.completedLessons[currentLesson.id] = true;
      updateProgress();

      // Auto-advance after short delay
      setTimeout(function () {
        var idx = allLessons.findIndex(function (l) { return l.id === currentLesson.id; });
        if (idx < allLessons.length - 1) {
          selectLesson(allLessons[idx + 1].id);
        }
      }, 1500);
    } else {
      $result.classList.add('failure');
    }
  });

  // Show Hint
  $btnHint.addEventListener('click', function () {
    $hintBox.classList.toggle('hidden');
  });

  // Reset Cluster
  $btnReset.addEventListener('click', function () {
    window.resetClusterState();
    $result.classList.add('hidden');
    buildSidebar();
    updateProgress();
    window.K8sTerminal.clearTerminal();
    window.K8sTerminal.writeOutput('\r\n\x1b[33m⚠ Cluster state reset to defaults.\x1b[0m\r\n');
    if (currentLesson) selectLesson(currentLesson.id);
  });

  // Clear Terminal
  $btnClear.addEventListener('click', function () {
    window.K8sTerminal.clearTerminal();
  });

  /* ──────────────────────────────────────────────────────
   *  Initialize
   * ────────────────────────────────────────────────────── */
  function init() {
    buildSidebar();
    updateProgress();

    // Initialize terminal
    window.K8sTerminal.init($termContainer);

    // Select first lesson
    if (allLessons.length > 0) {
      selectLesson(allLessons[0].id);
    }

    // Handle terminal resize on layout changes
    var resizeObserver = new ResizeObserver(function () {
      window.K8sTerminal.fit();
    });
    resizeObserver.observe($termContainer);
  }

  // Boot when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
