'use strict';

// Ensure at least one category is selected before submitting
(function () {
  const form = document.querySelector('form[action="/profile"]');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    const checkboxes = form.querySelectorAll('input[name="categories"]:checked');
    if (checkboxes.length === 0) {
      e.preventDefault();
      showToast('Please select at least one news category.', 'warning');
    }
  });
})();
