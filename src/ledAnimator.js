const Color = require('./color')

class LedAnimator {
	constructor(options) {
		this.options	= options || {}
		this.colors		= []
		this.timeout	= null
		this.buffer		= new Uint32Array(this.numLeds)
		this.reset()
	}

	get numLeds() {
		return this.options.leds
	}

	get startAt() {
		return this.options.startAt || 0
	}

	render(colors) {
		if ( this.options.onRender ) {
			this.options.onRender(this)
		}
	}

	toBuffer(startAt) {
		for ( let i = 0 ; i < this.numLeds ; i++ ) {
			this.buffer[i] = this.getColor(i + ( startAt || this.startAt )).toInt()
		}
		return this.buffer
	}

	toColors(startAt) {
		const colors = []
		for ( let i = 0 ; i < this.numLeds ; i++ ) {
			colors[i] = this.getColor(i + ( startAt || this.startAt )).clone()
		}
		return colors
	}

	createColor(r, g, b, a = 255) {
		return new Color(r, g, b, a)
	}

	// Idle

	reset() {
		this.stopAnimation()
		this.colors = []
		for ( let i = 0 ; i < this.numLeds ; i++ ) {
			this.colors[i] = new Color(0, 0, 0, 0)
		}
		this.render()
	}

	off() {
		this.colors.forEach(color => {
			color.a = 0
		})
		this.render()
	}

	sleep() {
		return this.off()
	}

	// Notifications

	notifyStart() {
		if ( this.options.onStart ) {
			this.options.onStart(this)
		}
	}

	notifyIteration(iteration) {
		if ( this.options.onIteration ) {
			this.options.onIteration(this, iteration)
		}
	}

	notifyHalted() {
		if ( this.options.onHalted ) {
			this.options.onHalted(this)
		}
	}

	notifyEnd(callback) {
		if ( this.options.onEnd ) {
			this.options.onEnd(this)
		}
		if ( callback ) callback(this)
	}

	// Image manipulations

	getColor(position) {
		const pos = position % this.numLeds
		return this.colors[pos]
	}

	setColor(position, color) {
		const pos = position % this.numLeds
		this.colors[pos] = color.clone()
	}

	setFullColor(color) {
		for ( let i = 0 ; i < this.numLeds ; i++ ) {
			this.setColors(i, color)
		}
	}

	setColors(colors) {
		if ( colors instanceof Color ) {
			colors = [colors]
		}
		const ledsPerColor = Math.floor(this.numLeds / colors.length)
		for ( let i = 0 ; i < this.numLeds ; i++ ) {
			const mappedIndex = Math.min( Math.floor(i / ledsPerColor), colors.length - 1 )
			this.setColor(i, colors[mappedIndex])
		}
	}

	setColorTrail(colors, trailSize, direction) {
		direction || (direction = 0)
		if ( colors instanceof Color ) {
			colors = [colors]
		}
		const ledsPerTrail = Math.floor(this.numLeds / colors.length)
		trailSize || (trailSize = ledsPerTrail)
		trailSize = Math.min(trailSize, ledsPerTrail)
		let brightnesses = Array(ledsPerTrail).fill(0)
		for ( let b = 0 ; b < trailSize ; b++ ) {
			brightnesses[b] = Math.round(( 1 - b / trailSize ) * 255)
		}
		if ( direction >= 0 ) {
			brightnesses = brightnesses.reverse()
		}
		for ( let i = 0 ; i < colors.length ; i++ ) {
			for ( let j = 0 ; j < ledsPerTrail ; j++ ) {
				const position = i * ledsPerTrail + j
				const color = colors[i].clone()
				color.setBrightness( brightnesses[j] )
				this.setColor(position, color)
			}
		}
	}

	setGradient(color1, color2, color3, brightness) {
		brightness || (brightness = 255)
		for ( let i = 0 ; i < this.numLeds ; i++ ) {
			const percent = i / this.numLeds
			const color = this.gradient(percent, color1, color2, color3, brightness)
			this.setColor(i, color)
		}
	}

	setGradientLoop(color1, color2, brightness) {
		return this.setGradient(color1, color2, color1, brightness)
	}

	setRainbowColors(brightness) {
		brightness || (brightness = 255)
		const colors = this.rainbow(this.numLeds, brightness)
		this.setColors(colors)
	}

	// Image animations

	fadeIn(maxBrightness, step, speed, callback) {
		// Configuration
		step || (step = 10)
		maxBrightness || (maxBrightness = 255)
		speed || (speed = 60)

		const topBrightness = this.colors.reduce((a, color) => Math.max(a, color.a), 0)

		this.colors.forEach(color => color.setBrightness( color.a - topBrightness ))

		const anim = () => {
			const fading = this.colors.reduce((fading, color, i) => {
				color.setBrightness( Math.min(maxBrightness, color.a + step) )
				if ( color.a < maxBrightness ) {
					fading++
				}
				return fading
			}, 0)
			this.render()
			if ( fading === 0 ) {
				return false
			}
			return true
		}

		return this.startAnimation(anim, speed, callback)
	}

	fadeOut(minBrightness, step, speed, callback) {
		// Configuration
		step || (step = 10)
		minBrightness || (minBrightness = 0)
		speed || (speed = 60)

		const anim = () => {
			const fading = this.colors.reduce((fading, color, i) => {
				const brightness = Math.max(minBrightness, color.a - step)
				color.setBrightness(brightness)
				if ( color.a > minBrightness ) {
					fading++
				}
				return fading
			}, 0)
			this.render()
			if ( fading === 0 ) {
				return false
			}
			return true
		}

		return this.startAnimation(anim, speed, callback)
	}

	breath(minBrightness, maxBrightness, step, speed, iterations, callback) {
		// Configuration
		step || (step = 10)
		minBrightness || (minBrightness = 0)
		maxBrightness || (maxBrightness = 255)
		iterations || (iterations = 0)
		speed || (speed = 60)

		const brightnesses = this._getBrightnesses()
		let currentStep = step
		let brightness = minBrightness, count = 0
		const anim = () => {
			this.colors.forEach(color => color.setBrightness(brightness))
			this.render()
			brightness += currentStep
			if ( brightness > maxBrightness ) {
				brightness = maxBrightness
				currentStep = -1 * currentStep
				count++
				this.notifyIteration(count)
			} else if ( brightness < minBrightness ) {
				brightness = minBrightness
				currentStep = -1 * currentStep
				if ( iterations > 0 && count >= iterations ) {
					return false
				}
			}
			return true
		}

		return this.startAnimation(anim, speed, callback)
	}

	blink(speed, iterations, callback) {
		return this.breath(0, 255, 255, speed, iterations, callback)
	}

	rotate(step, speed, iterations, callback) {
		step || (step = 1)
		iterations || (iterations = 0)
		speed || (speed = 60)
		let count = 0, shift = 0
		const anim = () => {
			this.colors = this._rotateArray(this.colors, step)
			this.render()
			shift++
			if ( shift % Math.round(this.numLeds / Math.abs(step)) === 0 ) {
				count++
				this.notifyIteration(count)
				if ( iterations > 0 && count >= iterations ) {
					return false
				}
			}
			return true
		}

		return this.startAnimation(anim, speed, callback)
	}

	rotateByAngle(degree, speed, iterations, callback) {
		const step = Math.round(360 / degree)
		return this.rotate(step, speed, iterations, callback)
	}

	chaos(speed) {
		speed || (speed = 60)

		const anim = () => {
			this.colors.forEach((color, i) => {
				const brightness = Math.round(Math.random() * 255)
				color.setBrightness(brightness)
			})
			this.render()
			return true
		}

		return this.startAnimation(anim, speed)
	}

	lavalamp(step, speed) {
		speed || (speed = 60)
		step || (step = 30)

		const actions = []
		for ( let i = 0 ; i < this.numLeds ; i++ ) {
			actions[i] = {
				brightness: Math.round(Math.random() * 255),
				speed: Math.random() * 2 - 1
			}
		}

		const anim = () => {
			this.colors.forEach((color, i) => {
				const action = actions[i]
				action.brightness = Math.round(action.brightness + step * action.speed)
				if ( action.brightness < 0 ) {
					action.brightness = 0
					action.speed = Math.random() * 2 - 1
				} else if ( action.brightness > 255 ) {
					action.brightness = 255
					action.speed = Math.random() * 2 - 1
				}
				color.setBrightness(action.brightness)
			})
			this.render()
			return true
		}

		return this.startAnimation(anim, speed)
	}

	pingpong(size, trailSize, direction, step, speed, iterations, callback) {
		size || (size = 1)
		trailSize || (trailSize = 0)
		direction || (direction = 1)
		step || (step = 1)
		speed || (speed = 60)
		iterations || (iterations = 0)

		const maxSlide = Math.floor( ( this.numLeds - size ) / step ) * step

		let brightnessRatios = Array(this.numLeds).fill(0).fill(1, 0, size)
		if ( direction < 0 ) {
			brightnessRatios = brightnessRatios.reverse()
		}

		const brightnesses = this.colors.map((color, i) => {
			const a = color.a
			color.setBrightness(a * brightnessRatios[i])
			return a
		})
		this.render()

		let count = 0, slide = 0, travel = 0
		const anim = () => {
			brightnessRatios = this._rotateArray(brightnessRatios, step * direction)
			this.colors.forEach((color, i) => color.setBrightness( brightnesses[i] * brightnessRatios[i] ))
			this.render()
			slide += step
			if ( slide >= maxSlide ) {
				direction *= -1
				slide = 0
				travel++
				if ( travel % 2 === 0 ) {
					count++
					this.notifyIteration(count)
					if ( iterations > 0 && count >= iterations ) {
						return false
					}
				}
			}
			return true
		}

		return this.startAnimation(anim, speed, callback)
	}

	progress(progress, gradient, speed, callback) {
		progress || (progress = 0)
		gradient || (gradient = false)
		speed || (speed = 60)

		const brightnesses = this._getBrightnesses()
		this.off()

		const leadingLed = Math.ceil(progress * this.numLeds)
		const brightnessAdjustments = Array(this.numLeds).fill(0)
		for ( let g = 0 ; g <= leadingLed ; g++ ) {
			brightnessAdjustments[g] = !!gradient ? ( g ) / ( leadingLed + 1 ) : 1
		}

		let led = 0
		const anim = () => {
			const brightness = brightnesses[led] * brightnessAdjustments[led]
			this
				.getColor(led)
				.setBrightness(brightness)
			this.render()
			led++
			if ( led > leadingLed ) {
				this.notifyIteration(1)
				return false
			}
			return true
		}

		return this.startAnimation(anim, speed, callback)
	}

	wipe(step, speed, iterations, callback) {
		step || (step = 1)
		iterations || (iterations = 0)
		speed || (speed = 60)
		let count = 0, wipe = 0

		const brightnesses = this._getBrightnesses()
		this.off()

		const anim = () => {
			let brightness = 0
			if ( wipe < this.numLeds ) {
				brightness = brightnesses[wipe]
			}
			for ( let i = 0 ; i < step ; i++ ) {
				const position = wipe % this.numLeds + i
				this
					.getColor(position)
					.setBrightness(brightness)
			}
			wipe += step
			this.render()
			if ( wipe > this.numLeds * 2 ) {
				wipe = 0
				count++
				this.notifyIteration(count)
				if ( iterations > 0 && count >= iterations ) {
					return false
				}
			}
			return true
		}

		return this.startAnimation(anim, speed, callback)
	}

	// TODO:
	expand(step, speed, iterations, callback) {
		step || (step = 1)
		iterations || (iterations = 0)
		speed || (speed = 60)
		let count = 0, wipe = 0

		const brightnesses = this.colors.map(color => {
			const a = color.a
			color.setBrightness(0)
			return a
		})

		const anim = () => {
			let brightness = 0
			if ( wipe < this.numLeds ) {
				brightness = brightnesses[wipe]
			}
			for ( let i = 0 ; i < step ; i++ ) {
				const position = wipe % this.numLeds + i
				this
					.getColor(position)
					.setBrightness(brightness)
			}
			wipe += step
			this.render()
			if ( wipe > this.numLeds * 2 ) {
				wipe = 0
				count++
				this.notifyIteration(count)
				if ( iterations > 0 && count >= iterations ) {
					return false
				}
			}
			return true
		}

		return this.startAnimation(anim, speed, callback)
	}

	// Animation management

	startAnimation(func, speed, callback) {
		this.stopAnimation()
		this.endCallback = callback
		const animate = () => {
			if ( func() ) {
				this._timeout = setTimeout(animate, speed)
			} else {
				this.stopAnimation()
			}
		}
		const animation = {
			stop: () => {
				this.notifyHalted()
				this.stopAnimation()
			}
		}
		this.notifyStart()
		animate()
		return animation
	}

	stopAnimation() {
		if ( this.timeout ) {
			clearTimeout(this.timeout)
			this.notifyEnd(this.endCallback)
			this.timeout = null
			this.endCallback = null
		}
	}

	// Utils

	wheel(position, brightness) {
		if ( position < 85 ) {
			return new Color(position * 3, 255 - position * 3, 0, brightness)
		} else if(position < 170) {
			position -= 85
			return new Color(255 - position * 3, 0, position * 3, brightness)
		} else {
			position -= 170
			return new Color(0, position * 3, 255 - position * 3, brightness)
		}
	}

	rainbow(num, brightness) {
		const colors = []
		for ( let i = 0 ; i < num ; i++ ) {
			const position = Math.round( i / num * 255 )
			colors[i] = this.wheel(position, brightness)
		}
		return colors
	}

	gradient(position, color1, color2, color3, brightness) {
		// Do we have 3 colors for the gradient? Need to adjust the params.
		if ( color3 ) {
			position = position * 2

			// Find which interval to use and adjust the position percentage
			if (position >= 1) {
				position -= 1
				color1 = color2
				color2 = color3
			}
		}

		const diffRed = color2.r - color1.r
		const diffGreen = color2.g - color1.g
		const diffBlue = color2.b - color1.b

		return new Color(
			parseInt(Math.floor(color1.r + (diffRed * position)), 10),
			parseInt(Math.floor(color1.g + (diffGreen * position)), 10),
			parseInt(Math.floor(color1.b + (diffBlue * position)), 10),
			brightness
		)
	}

	_rotateArray(arr, step) {
		for ( let s = 0 ; s < Math.abs(step) ; s++ ) {
			if ( step >= 0 ) {
				arr.unshift(arr.pop())
			} else {
				arr.push(arr.shift())
			}
		}
		return arr
	}

	_getBrightnesses() {
		return this.colors.map(color => color.a)
	}
}

module.exports = LedAnimator