import { thingyEditable, localStorageBackend } from './vendor/editor.js'

// bootstrap default data
const data = localStorageBackend.get('app', {
  settings: {
    heading: 'Will Urmston',
    subheading: 'web design + build',
    education: 'Education: BFA Graphic Design 2016, Rhode Island School of Design',
    previously: 'Previously: Facebook, Universe, DVTK, IFTTT',
    interests: ' Current interests: peer-to-peer web, social equity, DJing, privacy, public transportation + urban planning, libraries...',
  },
  nav: {
    items: [{
      href: 'https://twitter.com/willurmston',
      innerText: 'twitter',
    }, {
      href: 'https://www.are.na/will-urmston-1525122915',
      innerText: 'are.na',
    }],
  },
  projects: [{

  }],
  websites: [{

  }],
})
localStorageBackend.save('app', data)

class TextComponent extends HTMLElement {
  constructor() {
    super()
    if (this.dataset.thingyPath) {
      let text = this.dataset.thingyPath.split(' ').reduce((val, step) => {
        if (val[step]) {
          val = val[step]
        } else {
          val = ''
        }

        return val
      }, data)

      if (typeof text === 'object' && typeof text.innerText !== 'undefined') {
        text = text.innerText
      }

      this.innerText = text
    }
  }
}

class SocialNav extends HTMLElement {
  constructor() {
    super()

    const section = document.createElement('section')
    section.setAttribute('class', 'socials')

    const socials = data.nav.items

    socials.forEach((social, idx) => {
      const a     = document.createElement('a')
      a.href      = social.href
      a.innerText = social.innerText
      a.dataset.thingyPath = `nav items ${idx}`
      section.appendChild(a)
    })

    this.appendChild(section)
  }
}


customElements.define('text-component', TextComponent)
customElements.define('social-nav', SocialNav)


// Set up our editor
thingyEditable([{
  selector: 'text-component',
  toolset: 'text',
}, {
  selector: '.socials',
  disallowDefaultEnter: true,
  nested: ['a'],
}, {
  selector: '.list li',
  disallowDefaultEnter: true,
  nested: ['a', 'a h3', 'div em', 'p'],
  repeatable: true,
}], {
  // Set up the backends for our editor
  backends: [localStorageBackend],
  localStorageBackend: {
    topLevelKey: 'app',
  },
})
