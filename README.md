# Stimulus Truncate Text from Middle

Middle-truncate long text in one line while preserving both the beginning and the end.

This Stimulus controller observes element size changes and recalculates the best middle truncation for the available width. Internally, it uses [`@chenglou/pretext`](https://github.com/chenglou/pretext) to measure text layout accurately, so truncation adapts to real font metrics (font family, weight, size, etc.), not just character count.

## Controller settings

Use these `data-*` values on the element with `data-controller="truncate-text-middle"`:

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `data-truncate-text-middle-text-value` | `string` | Element text content | Optional explicit source text. If omitted, the controller uses the element's current text content. |
| `data-truncate-text-middle-ellipsis-value` | `string` | `...` | String inserted between start and end segments when truncating. |
| `data-truncate-text-middle-min-start-value` | `number` | `3` | Minimum number of characters always kept at the start. |
| `data-truncate-text-middle-min-end-value` | `number` | `3` | Minimum number of characters always kept at the end. |

Notes:
- The controller only truncates when content overflows.
- When truncation happens, it sets `title` to the full original text.
- For expected behavior, the element should be single-line and hide overflow (for example: `white-space: nowrap; overflow: hidden;`).

> [!NOTE]
> When computed `line-height` is `normal`, the controller approximates it as `font-size * 1.2`.
> This is a practical fallback and may vary by font family/browser.
> For the most accurate truncation, set an explicit CSS `line-height`.

> [!IMPORTANT]
> This controller expects a single-line clipping context (for example `white-space: nowrap` and `overflow: hidden` or `overflow-x: clip`).
> Without these styles, overflow detection may not behave as intended and truncation may not run.
> The controller does not auto-apply styles; it validates this in development and logs a warning when required CSS is missing.

## Example

```js
import { Application } from '@hotwired/stimulus'
import TruncateTextMiddleController from 'stimulus-truncate-text-from-middle'

const application = Application.start()
application.register('truncate-text-middle', TruncateTextMiddleController)
```

```html
<p
  data-controller="truncate-text-middle"
  data-truncate-text-middle-min-start-value="6"
  data-truncate-text-middle-min-end-value="8"
  style="max-width: 280px; white-space: nowrap; overflow: hidden; border: 1px solid #ccc; padding: 6px 8px;"
>
  Quarterly-Financial-Report-Final-Really-Final-v27.pdf
</p>
```

## Inspiration

Inspired by [Wes Bos's](https://wesbos.com/tip/css-truncate-text-from-middle) tip on middle truncation in CSS.

That idea motivated building this Stimulus controller version.

## Contributing

Issues and pull requests are welcome 🙂

## License

This package is available as open source under the terms of the MIT License.
