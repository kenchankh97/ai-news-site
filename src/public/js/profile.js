'use strict';

(function () {
  const form = document.querySelector('form[action="/profile"]');
  if (!form) return;

  // Prevent unchecking the last selected category
  const catCheckboxes = form.querySelectorAll('input[name="categories"]');
  catCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = form.querySelectorAll('input[name="categories"]:checked');
      if (checked.length === 0) {
        cb.checked = true; // immediately re-check
        showToast('At least one news category must be selected.', 'warning');
      }
    });
  });

  // Block form submission if somehow zero languages or categories are checked
  form.addEventListener('submit', (e) => {
    const langChecked = form.querySelectorAll('input[name="languages"]:checked');
    if (langChecked.length === 0) {
      e.preventDefault();
      showToast('Please select at least one news language.', 'warning');
      return;
    }
    const catChecked = form.querySelectorAll('input[name="categories"]:checked');
    if (catChecked.length === 0) {
      e.preventDefault();
      showToast('Please select at least one news category.', 'warning');
    }
  });
})();
