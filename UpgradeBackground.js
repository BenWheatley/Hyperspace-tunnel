/**
 * Optimized hyperspace tunnel background effect for game engines
 * Based on Perlin noise in polar coordinates with precomputed lookup tables
 */
class UpgradeBackground {
	constructor() {
		this.time = 0;
		this.MAX_OCTAVE = 8;

		// Cached dimensions
		this.cachedWidth = 0;
		this.cachedHeight = 0;

		// Precomputed arrays (allocated on first draw)
		this.pixel_r = null;
		this.pixel_theta = null;
		this.noiseTable = null;
		this.imageData = null;

		this.thetaToPerlinScale = 128 / Math.PI;

		// Precompute noise lookup table
		this._initNoiseTable();
	}

	/**
	 * Initialize the noise lookup table (only needs to be done once)
	 * @private
	 */
	_initNoiseTable() {
		const MAX_TABLE = 1 << (this.MAX_OCTAVE + 2); // 4×2^octave
		this.noiseTable = new Float32Array(MAX_TABLE * MAX_TABLE);

		for (let i = 0; i < this.noiseTable.length; i++) {
			this.noiseTable[i] = this._seededRandom(i);
		}
	}

	/**
	 * Precompute pixel geometry for the given canvas dimensions
	 * @private
	 */
	_precomputeGeometry(canvasWidth, canvasHeight) {
		this.cachedWidth = canvasWidth;
		this.cachedHeight = canvasHeight;

		const hWidth = canvasWidth / 2;
		const hHeight = canvasHeight / 2;
		const centerToCorner = Math.sqrt(hWidth * hWidth + hHeight * hHeight);
		const tangentScale = Math.PI / (2 * centerToCorner);

		const pixelCount = canvasWidth * canvasHeight;
		this.pixel_r = new Float32Array(pixelCount);
		this.pixel_theta = new Float32Array(pixelCount);

		let idx = 0;
		for (let y = 0; y < canvasHeight; y++) {
			const dy = y - hHeight;
			for (let x = 0; x < canvasWidth; x++, idx++) {
				const dx = x - hWidth;
				const r = centerToCorner - Math.sqrt(dx * dx + dy * dy);
				this.pixel_r[idx] = Math.tan(tangentScale * r);
				this.pixel_theta[idx] = 128 + this.thetaToPerlinScale * Math.atan2(dy, dx);
			}
		}
	}

	/**
	 * Seeded pseudo-random number generator
	 * @private
	 */
	_seededRandom(x) {
		let t = (x << 13) ^ x;
		t = (x * (x * x * 15731 + 789221) + 1376312589) & 0x7fffffff;
		return 128 + 256 * (1 - t / 1073741824.0);
	}

	/**
	 * Cosine interpolation for smooth transitions
	 * @private
	 */
	_cosInterp(a, b, x) {
		const f = (1 - Math.cos(x * Math.PI)) * 0.5;
		return a * (1 - f) + b * f;
	}

	/**
	 * Update animation state
	 * @param {number} deltaTime - Time elapsed since last update in seconds
	 */
	update(deltaTime) {
		this.time += deltaTime;
	}

	/**
	 * Draw the hyperspace background
	 * @param {CanvasRenderingContext2D} context - Canvas 2D context
	 * @param {number} canvasWidth - Width of canvas
	 * @param {number} canvasHeight - Height of canvas
	 * @param {number} r - Red color component (0-255)
	 * @param {number} g - Green color component (0-255)
	 * @param {number} b - Blue color component (0-255)
	 * @param {number} a - Alpha component (0-255)
	 */
	draw(context, canvasWidth, canvasHeight, r, g, b, a) {
		// Recompute geometry if canvas size changed
		if (this.cachedWidth !== canvasWidth || this.cachedHeight !== canvasHeight) {
			this._precomputeGeometry(canvasWidth, canvasHeight);
			this.imageData = context.createImageData(canvasWidth, canvasHeight);
		}

		const data = this.imageData.data;
		const MAX_TABLE = 1 << (this.MAX_OCTAVE + 2);

		let index = 0;
		for (let p = 0; p < this.pixel_r.length; p++) {
			const radius = this.pixel_r[p];
			const theta = this.pixel_theta[p];
			let sum = 0;

			// Accumulate noise across octaves
			for (let octave = 1; octave < this.MAX_OCTAVE; octave++) {
				const sf = 1 << octave; // 2^octave (bitwise shift for speed)
				const w = sf * 4;       // angular wrap width
				const h = MAX_TABLE;    // radial size

				const t0 = sf * theta / 64;
				const r0 = sf * radius / 4 + this.time;

				let ti = t0 | 0; // Fast floor for positive numbers
				let ri = r0 | 0;

				const ft = t0 - ti;
				const fr = r0 - ri;

				// Correct angular wrap-around (cylindrical topology)
				ti = ((ti % w) + w) % w;
				const ti1 = (ti + 1) % w;

				// Precompute indices into the 2D noise table
				const idx00 = ti + h * ri;
				const idx01 = ti + h * (ri + 1);
				const idx10 = ti1 + h * ri;
				const idx11 = ti1 + h * (ri + 1);

				const i00 = this.noiseTable[idx00];
				const i01 = this.noiseTable[idx01];
				const i10 = this.noiseTable[idx10];
				const i11 = this.noiseTable[idx11];

				const i_r0 = this._cosInterp(i00, i01, fr);
				const i_r1 = this._cosInterp(i10, i11, fr);

				sum += this._cosInterp(i_r0, i_r1, ft) * (256 / sf);
			}

			// Convert noise to intensity (0-255)
			const intensity = Math.round(sum / 256);

			// Apply color tint based on r, g, b parameters
			data[index++] = Math.round((intensity / 255) * r);
			data[index++] = Math.round((intensity / 255) * g);
			data[index++] = Math.round((intensity / 255) * b);
			data[index++] = a;
		}

		context.putImageData(this.imageData, 0, 0);
	}
}
