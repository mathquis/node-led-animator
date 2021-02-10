# Led Animator

## Installation

`npm i @mathquis/node-led-animator`

## Usage

```javascript
const Leds = require('@mathquis/node-led-animator')

const NUM_LEDS = 16

const render = leds => {
	const buffer = leds.toBuffer()
	console.log(buffer)
}

const leds = new Leds({
	leds: NUM_LEDS,
	startAt: 0,
	onRender: render
})

// Create some colors
const orange	= leds.createColor(255, 128, 0, 255)
const red		= leds.createColor(255, 0, 0)
const green		= leds.createColor(0, 255, 0)
const blue		= leds.createColor(49, 196, 243)
const darkblue	= leds.createColor(35, 61, 83)

// Use these colors
leds.setColors([orange, blue, green, orange, red])

// Animate them
const step = 1
const speed = 60 // ms per frame
const iterations = 3
const cb = () => {
	console.log('finished')
}
leds.rotate(step, speed, iterations, cb)

```

## Animations

- fadeIn(maxBrightness, step, speed, callback)
- fadeOut(minBrightness, step, speed, callback)
- breath(minBrightness, maxBrightness, step, speed, iterations, callback)
- blink(speed, iterations, callback)
- rotate(step, speed, iterations, callback)
- rotateByAngle(degree, speed, iterations, callback)
- chaos(speed)
- lavalamp(step, speed)
- pingpong(size, trailSize, direction, step, speed, iterations, callback)
- wipe(step, speed, iterations, callback)
- progress(progress, gradient, speed, callback)
- expand(step, speed, iterations, callback)