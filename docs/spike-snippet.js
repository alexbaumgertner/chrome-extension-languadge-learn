(() => {
  const MIN = 80;
  const BAD = 'nav,header,footer,aside,script,style,code,pre,form,button';
  const saved = [];

  const blocks = [...document.querySelectorAll('p, article div, li')]
    .filter(el => el.innerText && el.innerText.trim().length > MIN)
    .filter(el => !el.closest(BAD))
    .filter(el => ![...el.children].some(c => c.innerText?.length > MIN)) // самый глубокий блок
    .filter(el => el.getClientRects().length);

  blocks.forEach((el, i) => {
    saved.push({ el, html: el.innerHTML });
    el.style.outline = '2px solid #c67139';
    el.innerHTML = `<span data-spike>[[DE ${i}]] ` + el.innerHTML + '</span>';
  });

  window.__spikeRestore = () => {
    saved.forEach(s => { s.el.innerHTML = s.html; s.el.style.outline = ''; });
    console.log('restored');
  };

  console.log('blocks:', blocks.length, '— проверьте страницу, потом __spikeRestore()');
})();
