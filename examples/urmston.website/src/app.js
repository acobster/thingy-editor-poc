import { thingyEditable, localStorageBackend } from './vendor/editor.js'

const data = localStorageBackend.get('app')

class SocialNav extends HTMLElement {
  constructor() {
    super()

    const section = document.createElement('section')
    section.setAttribute('class', 'socials')

    const socials = data.nav.items

    socials.forEach((social, idx) => {
      const a     = document.createElement('a')
      a.href      = social.url
      a.innerText = social.text
      a.dataset.thingyPath = `nav items ${idx}`
      section.appendChild(a)
    })

    this.appendChild(section)
  }
}

customElements.define('social-nav', SocialNav)


// Set up our editor
thingyEditable([{
  selector: '.socials',
  disallowDefaultEnter: true,
  nested: ['a'],
}, {
  selector: '.list li',
  disallowDefaultEnter: true,
  nested: ['a', 'a h3', 'div em', 'p'],
  cloneOnCtrlEnter: true,
}], {
  // Set up the backends for our editor
  backends: [localStorageBackend],
  localStorageBackend: {
    topLevelKey: 'app',
  },
})
