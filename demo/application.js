import { Application } from '@hotwired/stimulus'
import TruncateTextMiddleController from '../src/truncate_text_middle_controller.js'
import FitTextController from './fit_text_controller.js'
import WidthSliderController from './width_slider_controller.js'

const application = Application.start()
application.register('truncate-text-middle', TruncateTextMiddleController)
application.register('fit-text', FitTextController)
application.register('width-slider', WidthSliderController)

window.Stimulus = application
