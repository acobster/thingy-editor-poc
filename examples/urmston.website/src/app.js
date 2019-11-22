import { thingyEditable, localStorageBackend } from './vendor/editor.js'
import defaultData from './default-data'

// bootstrap default data
const data = localStorageBackend.get('app', defaultData)
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
      // tell localStorage to consider innerText a sub-field
      a.dataset.thingySeparateInnerText = 1
      section.appendChild(a)
    })

    this.appendChild(section)
  }
}

class ListComponent extends HTMLElement {
  constructor() {
    super()

    const ul = document.createElement('ul')
    ul.setAttribute('class', 'list')


    const items = data[this.dataset.thingyPath].map((item, idx) => {
      const li = document.createElement('li')

      const a = document.createElement('a')
      a.setAttribute('target', '_blank')
      if (item.link) a.href = item.link.href || ''
      a.dataset.thingyPath = `${this.dataset.thingyPath} ${idx} link`
      const h3 = document.createElement('h3')
      h3.dataset.thingyPath = `${this.dataset.thingyPath} ${idx} heading`
      h3.innerText = item.heading || ''
      a.appendChild(h3)

      const em = document.createElement('em')
      em.innerText = item.subheading || ''
      em.dataset.thingyPath = `${this.dataset.thingyPath} ${idx} subheading`
      const div = document.createElement('div')
      div.appendChild(em)

      const p = document.createElement('p')
      p.dataset.thingyPath = `${this.dataset.thingyPath} ${idx} description`
      p.innerText = item.description || ''

      li.appendChild(a)
      li.appendChild(div)
      li.appendChild(p)

      return li
    })

    items.forEach(li => {
      ul.appendChild(li)
    })
    this.appendChild(ul)
  }
}


customElements.define('text-component', TextComponent)
customElements.define('social-nav', SocialNav)
customElements.define('list-component', ListComponent)


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
