thingyEditable([{
  selector: '.flexible-pattern--large-image-cards__card',
  nested: ['.card-img img', 'h3.title', 'h6.subtitle', '.snippet'],
  cloneOnCtrlEnter: true,
}], {
  appendToolbarTo: document.querySelector('.site-wrapper'),
  imageLibrary: [{
    src    : 'https://placehold.it/445x270/880000?text=IMAGE+ONE',
    srcset : 'https://placehold.it/445x270/880000?text=IMAGE+ONE, https://placehold.it/980x540/880000?text=IMAGE+ONE 2x',
    title  : 'Image 1',
    alt    : 'Image 1 alt text',
  }, {
    src    : 'https://placehold.it/445x270/008800?text=IMAGE+TWO',
    srcset : 'https://placehold.it/445x270/008800?text=IMAGE+TWO, https://placehold.it/980x540/008800?text=IMAGE+TWO 2x',
    title  : 'Image 2',
    alt    : 'Image 2 alt text',
  }]
})
