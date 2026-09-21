// Pan to scroll logic for Kanban Board
  (function() {
    var board = document.getElementById('kanban-board');
    if (!board) return;
    
    var isDown = false;
    var startX;
    var scrollLeft;

    board.addEventListener('mousedown', function(e) {
      // Don't pan if we are dragging a card
      if (e.target.closest('.kanban-card')) return;
      isDown = true;
      board.style.cursor = 'grabbing';
      startX = e.pageX - board.offsetLeft;
      scrollLeft = board.scrollLeft;
    });

    board.addEventListener('mouseleave', function() {
      isDown = false;
      board.style.cursor = '';
    });

    board.addEventListener('mouseup', function() {
      isDown = false;
      board.style.cursor = '';
    });

    board.addEventListener('mousemove', function(e) {
      if (!isDown) return;
      e.preventDefault();
      var x = e.pageX - board.offsetLeft;
      var walk = (x - startX) * 1.5; // Scroll speed multiplier
      // If RTL, we might need to invert the walk, but since browser handles RTL scroll left natively, let's see.
      // Usually, in RTL, scrollLeft goes negative or is handled differently depending on the browser.
      // Easiest is to just apply subtraction and the browser resolves it.
      var dir = document.documentElement.getAttribute('dir') === 'rtl' ? -1 : 1;
      board.scrollLeft = scrollLeft - (walk * dir);
    });
  })();
