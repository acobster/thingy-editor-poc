console.log('appp')



// Set up our editor
thingyEditable([{
  selector: '.list li',
  disallowDefaultEnter: true,
  nested: ['a', 'a h3', 'div em', 'p'],
  cloneOnCtrlEnter: true,
}])