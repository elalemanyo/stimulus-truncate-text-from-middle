import { Controller } from '@hotwired/stimulus'

export default class extends Controller {
  static values = {
    min: { type: Number, default: 18 },
    max: { type: Number, default: 120 }
  }

  connect () {
    this.text = this.element.textContent.trim()
    this.handleResize = this.render.bind(this)
    this.element.style.whiteSpace = 'nowrap'

    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(this.handleResize)
      this.resizeObserver.observe(this.element.parentElement || this.element)
    } else {
      window.addEventListener('resize', this.handleResize)
    }

    if (document.fonts?.ready) {
      document.fonts.ready.then(this.handleResize)
    }

    this.render()
  }

  disconnect () {
    this.resizeObserver?.disconnect()
    window.removeEventListener('resize', this.handleResize)
  }

  render () {
    if (!this.text) return

    const width = this.element.clientWidth
    if (width <= 0) return

    const bestSize = this.findBestSize(width)
    this.element.style.fontSize = `${bestSize}px`
  }

  findBestSize (width) {
    let low = this.minValue
    let high = this.maxValue
    let best = this.minValue

    while (high - low > 0.1) {
      const size = (low + high) / 2

      if (this.fits(size, width)) {
        best = size
        low = size
      } else {
        high = size
      }
    }

    return Number(best.toFixed(2))
  }

  fits (fontSize, width) {
    this.element.style.fontSize = `${fontSize}px`
    return this.element.scrollWidth <= width
  }
}
