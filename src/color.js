class Color {
	constructor(r, g, b, a) {
		this.r = Math.max(0, Math.min(255, r || 0))
		this.g = Math.max(0, Math.min(255, g || 0))
		this.b = Math.max(0, Math.min(255, b || 0))
		this.a = Math.max(0, Math.min(255, a || 255))
	}

	setBrightness(brightness) {
		this.a = brightness
	}

	toInt(a) {
		return ((( a || this.a ) & 0xff) << 24) + ((this.b & 0xff) << 16) + ((this.g & 0xff) << 8) + (this.r & 0xff)
	}

	clone() {
		return new Color(this.r, this.g, this.b, this.a)
	}
}

module.exports = Color