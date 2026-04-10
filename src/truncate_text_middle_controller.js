import { Controller } from '@hotwired/stimulus'
import { layout, prepare, prepareWithSegments } from '@chenglou/pretext'

let sharedGraphemeSegmenter = null

export default class extends Controller {
  static values = {
    text: String,
    ellipsis: { type: String, default: '...' },
    minStart: { type: Number, default: 3 },
    minEnd: { type: Number, default: 3 }
  }

  connect () {
    this.originalText = this.hasTextValue ? this.textValue : this.element.textContent.trim()
    this.frameRequest = null
    this.handleResize = this.scheduleRender.bind(this)

    this.warnIfRequiredStylesMissing()

    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(this.handleResize)
      this.resizeObserver.observe(this.element)
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

    if (this.frameRequest) {
      window.cancelAnimationFrame(this.frameRequest)
      this.frameRequest = null
    }
  }

  scheduleRender () {
    if (this.frameRequest) return

    this.frameRequest = window.requestAnimationFrame(() => {
      this.frameRequest = null
      this.render()
    })
  }

  warnIfRequiredStylesMissing () {
    if (!this.isDevelopmentMode()) return

    const style = getComputedStyle(this.element)
    const hasNoWrap = style.whiteSpace === 'nowrap'
    const hasClippedOverflow = style.overflowX === 'hidden' || style.overflowX === 'clip'

    if (hasNoWrap && hasClippedOverflow) return

    console.warn(
      '[truncate-text-middle] expected `white-space: nowrap` and `overflow: hidden` (or `overflow-x: hidden/clip`) for accurate overflow detection.',
      this.element
    )
  }

  isDevelopmentMode () {
    return globalThis.process?.env?.NODE_ENV !== 'production'
  }

  render () {
    if (!this.element.isConnected) return
    if (!this.originalText) return

    const style = getComputedStyle(this.element)
    const lineHeight = this.lineHeight(style)

    this.element.textContent = this.originalText
    this.element.removeAttribute('title')

    if (!this.isOverflowing()) return

    const font = this.fontShorthand(style)
    if (!font) return

    const availableWidth = this.contentWidth(style)
    if (availableWidth <= 0) return

    const truncated = this.middleTruncate(this.originalText, availableWidth, font, lineHeight)

    this.element.textContent = truncated
    this.element.title = this.originalText
  }

  isOverflowing () {
    return this.element.scrollWidth > this.element.clientWidth
  }

  middleTruncate (text, width, font, lineHeight) {
    const widthMetrics = this.buildWidthMetrics(text, font)

    if (widthMetrics) {
      const best = this.middleTruncateWithWidths(widthMetrics, width)
      if (this.fits(best.text, width, font, lineHeight)) return best.text

      const nudge = this.candidateFromKept(widthMetrics, best.kept - 1)
      if (nudge.text !== best.text && this.fits(nudge.text, width, font, lineHeight)) return nudge.text
    }

    return this.middleTruncateWithFits(text, width, font, lineHeight)
  }

  middleTruncateWithFits (text, width, font, lineHeight) {
    let low = this.minStartValue + this.minEndValue
    let high = text.length
    let best = this.ellipsisValue

    while (low <= high) {
      const kept = Math.floor((low + high) / 2)
      const flexible = kept - this.minStartValue - this.minEndValue
      const startCount = this.minStartValue + Math.ceil(flexible / 2)
      const endCount = this.minEndValue + Math.floor(flexible / 2)

      const candidate =
        startCount + endCount >= text.length
          ? text
          : text.slice(0, startCount) + this.ellipsisValue + text.slice(text.length - endCount)

      if (this.fits(candidate, width, font, lineHeight)) {
        best = candidate
        low = kept + 1
      } else {
        high = kept - 1
      }
    }

    return best
  }

  middleTruncateWithWidths (metrics, availableWidth) {
    const totalLength = metrics.graphemes.length
    let low = this.minStartValue + this.minEndValue
    let high = totalLength
    let best = this.candidateFromKept(metrics, 0)

    while (low <= high) {
      const kept = Math.floor((low + high) / 2)
      const candidate = this.candidateFromKept(metrics, kept)

      if (candidate.width <= availableWidth + 0.01) {
        best = candidate
        low = kept + 1
      } else {
        high = kept - 1
      }
    }

    return best
  }

  candidateFromKept (metrics, kept) {
    const totalLength = metrics.graphemes.length
    const safeKept = Math.max(0, Math.min(kept, totalLength))
    const minKept = this.minStartValue + this.minEndValue
    const effectiveKept = Math.max(safeKept, minKept)
    const flexible = effectiveKept - minKept
    const startCount = this.minStartValue + Math.ceil(flexible / 2)
    const endCount = this.minEndValue + Math.floor(flexible / 2)
    const keepEverything = startCount + endCount >= totalLength

    if (keepEverything) {
      return { text: metrics.original, width: metrics.totalWidth, kept: totalLength }
    }

    const prefixWidth = metrics.prefixWidths[startCount]
    const suffixStart = totalLength - endCount
    const suffixWidth = metrics.totalWidth - metrics.prefixWidths[suffixStart]

    return {
      text: metrics.graphemes.slice(0, startCount).join('') + this.ellipsisValue + metrics.graphemes.slice(suffixStart).join(''),
      width: prefixWidth + metrics.ellipsisWidth + suffixWidth,
      kept: startCount + endCount
    }
  }

  buildWidthMetrics (text, font) {
    try {
      const prepared = prepareWithSegments(text, font)
      const segments = prepared.segments || []
      const graphemes = []
      const graphemeWidths = []

      for (let i = 0; i < segments.length; i++) {
        const segmentText = segments[i] || ''
        if (segmentText.length === 0) continue

        const segmentGraphemes = Array.from(this.graphemeSegmenter().segment(segmentText), part => part.segment)
        const widths = this.segmentWidths(prepared, i, segmentGraphemes.length)
        if (!widths) return null

        graphemes.push(...segmentGraphemes)
        graphemeWidths.push(...widths)
      }

      if (graphemes.length === 0) return null

      const prefixWidths = [0]
      for (const segmentWidth of graphemeWidths) {
        prefixWidths.push(prefixWidths[prefixWidths.length - 1] + segmentWidth)
      }

      const ellipsisPrepared = prepareWithSegments(this.ellipsisValue, font)
      const ellipsisWidth = this.totalPreparedWidth(ellipsisPrepared)

      return {
        original: text,
        graphemes,
        prefixWidths,
        totalWidth: prefixWidths[prefixWidths.length - 1],
        ellipsisWidth
      }
    } catch {
      return null
    }
  }

  segmentWidths (prepared, segmentIndex, graphemeCount) {
    if (graphemeCount === 0) return []

    const segmentWidth = prepared.widths?.[segmentIndex] || 0
    if (graphemeCount === 1) return [segmentWidth]

    const breakableFitAdvances = prepared.breakableFitAdvances?.[segmentIndex]
    if (Array.isArray(breakableFitAdvances) && breakableFitAdvances.length === graphemeCount) {
      return breakableFitAdvances.slice()
    }

    const breakablePrefixWidths = prepared.breakablePrefixWidths?.[segmentIndex]
    if (Array.isArray(breakablePrefixWidths) && breakablePrefixWidths.length === graphemeCount) {
      const widths = []
      let previous = 0

      for (const prefixWidth of breakablePrefixWidths) {
        widths.push(prefixWidth - previous)
        previous = prefixWidth
      }

      return widths
    }

    const breakableWidths = prepared.breakableWidths?.[segmentIndex]
    if (Array.isArray(breakableWidths) && breakableWidths.length === graphemeCount) {
      return breakableWidths.slice()
    }

    return null
  }

  totalPreparedWidth (prepared) {
    return (prepared.widths || []).reduce((sum, width) => sum + width, 0)
  }

  graphemeSegmenter () {
    if (!sharedGraphemeSegmenter) {
      sharedGraphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    }

    return sharedGraphemeSegmenter
  }

  fits (text, width, font, lineHeight) {
    const prepared = prepare(text, font)
    const result = layout(prepared, width, lineHeight)
    return result.lineCount <= 1
  }

  contentWidth (style) {
    const width = this.element.clientWidth
    const paddingLeft = parseFloat(style.paddingLeft) || 0
    const paddingRight = parseFloat(style.paddingRight) || 0
    return width - paddingLeft - paddingRight
  }

  lineHeight (style) {
    const raw = style.lineHeight

    if (raw === 'normal') {
      const fontSize = parseFloat(style.fontSize) || 16
      return Math.round(fontSize * 1.2)
    }

    return parseFloat(raw) || 20
  }

  fontShorthand (style) {
    const fontSize = style.fontSize
    const fontFamily = style.fontFamily

    if (!fontSize || !fontFamily) return null

    const fontStyle = style.fontStyle || 'normal'
    const fontVariant = style.fontVariant || 'normal'
    const fontWeight = style.fontWeight || '400'

    return `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize} ${fontFamily}`
  }
}
