import { Controller } from '@hotwired/stimulus'

export default class extends Controller {
  static targets = ['slider', 'value', 'list']

  connect () {
    this.sync()
  }

  sync () {
    if (!this.hasSliderTarget || !this.hasValueTarget || !this.hasListTarget) return

    const percent = this.sliderTarget.value
    this.listTarget.style.width = `${percent}%`
    this.valueTarget.textContent = percent
  }
}
