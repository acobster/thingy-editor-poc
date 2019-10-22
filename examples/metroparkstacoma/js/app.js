thingyEditable([{
  selector: '.flexible-pattern--large-image-cards__card',
  nested: ['.card-img img', 'h3.title', 'h6.subtitle', '.snippet'],
  cloneOnCtrlEnter: true,
}], {
  appendToolbarTo: document.querySelector('.site-wrapper'),
})
