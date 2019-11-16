import { thingyEditable } from './vendor/editor.js'
import { get, save } from './vendor/backend.js'

const data = get('app')

class SocialNav extends HTMLElement {
  constructor() {
    super()

    const section = document.createElement('section')
    section.setAttribute('class', 'socials')

    const socials = data.nav.items

    socials.forEach(social => {
      const a     = document.createElement('a')
      a.href      = social.url
      a.innerText = social.text
      section.appendChild(a)
    })

    this.appendChild(section)
  }
}

customElements.define('social-nav', SocialNav)


// Set up our editor
thingyEditable([{
  selector: '.list li',
  disallowDefaultEnter: true,
  nested: ['a', 'a h3', 'div em', 'p'],
  cloneOnCtrlEnter: true,
}])
