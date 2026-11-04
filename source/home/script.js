(() => {
  ['.build-grid', '.capability-grid', '.faq-list'].forEach(selector => {
    const group = document.querySelector(selector);
    if (!group) return;
    const disclosures = [...group.querySelectorAll('details')];
    disclosures.forEach(disclosure => {
      disclosure.addEventListener('toggle', () => {
        if (disclosure.open) disclosures.forEach(other => { if (other !== disclosure) other.open = false; });
      });
    });
  });
})();
