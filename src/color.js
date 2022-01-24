class Color {
	constructor(r, g, b, a = 255) {
		this.r = Math.max(0, Math.min(255, r || 0))
		this.g = Math.max(0, Math.min(255, g || 0))
		this.b = Math.max(0, Math.min(255, b || 0))
		this.a = this._a = Math.max(0, Math.min(255, a))
	}

	setBrightness(brightness) {
		this.a = Math.round(this._a * brightness / 255)
	}

	toInt(a) {
		const a2 = Math.round(this._a * a / 255)
		return ((( a || this.a ) & 0xff) << 24) + ((this.b & 0xff) << 16) + ((this.g & 0xff) << 8) + (this.r & 0xff)
	}

	clone() {
		return new Color(this.r, this.g, this.b, this.a)
	}
}

module.exports = Color