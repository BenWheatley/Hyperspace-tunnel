/**
 * Hyperspace tunnel background effect for game engines
 * Based on Perlin noise in polar coordinates with time animation
 */
class UpgradeBackground {
	constructor() {
		this.time = 0;
		this.MAX_OCTAVE = 8; // Higher = more detail, lower = faster

		// Cache these to avoid recalculation
		this.hWidth = 0;
		this.hHeight = 0;
		this.centerToCorner = 0;
		this.tangentScale = 0;
		this.thetaToPerlinScale = 128 / Math.PI;
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
		// Update cached dimensions if canvas size changed
		if (this.hWidth !== canvasWidth / 2 || this.hHeight !== canvasHeight / 2) {
			this.hWidth = canvasWidth / 2;
			this.hHeight = canvasHeight / 2;
			this.centerToCorner = Math.sqrt((this.hWidth * this.hWidth) + (this.hHeight * this.hHeight));
			this.tangentScale = Math.PI / (2 * this.centerToCorner);
		}

		context.beginPath();

		// Render all pixels
		for (let y = 0; y < canvasHeight; y++) {
			const dy = y - this.hHeight;

			for (let x = 0; x < canvasWidth; x++) {
				const dx = x - this.hWidth;
				let radius = Math.sqrt((dx * dx) + (dy * dy));
				const perlinTheta = 128 + this.thetaToPerlinScale * Math.atan2(dy, dx); // Range 0-255

				// Apply perspective transform
				radius = this.centerToCorner - radius;
				radius = Math.tan(this.tangentScale * radius);

				// Generate Perlin noise value
				let sum = 0;
				for (let octave = 1; octave < this.MAX_OCTAVE; octave++) {
					const sf = Math.pow(2, octave);
					const sf8 = sf * 4;

					// Scale factors for Perlin noise coordinates
					const new_theta_double = sf * perlinTheta / 64;
					const new_r_double = sf * radius / 4 + this.time;

					let new_theta_int = Math.floor(new_theta_double);
					const new_r_int = Math.floor(new_r_double);
					const fraction_r = new_r_double - new_r_int;
					const fraction_theta = new_theta_double - new_theta_int;

					// Get random values at grid corners
					const t1 = this.seededRandom(new_theta_int + sf8 * new_r_int);
					const t2 = this.seededRandom(new_theta_int + sf8 * (new_r_int + 1));

					// Wrap theta to handle 360° boundary
					if (new_theta_int + 1 >= sf8) {
						new_theta_int = new_theta_int - sf8;
					}

					const t3 = this.seededRandom((new_theta_int + 1) + sf8 * new_r_int);
					const t4 = this.seededRandom((new_theta_int + 1) + sf8 * (new_r_int + 1));

					// Bilinear interpolation with cosine smoothing
					const i1 = this.cosineInterpolate(t1, t2, fraction_r);
					const i2 = this.cosineInterpolate(t3, t4, fraction_r);

					sum = sum + this.cosineInterpolate(i1, i2, fraction_theta) * 256 / sf;
				}

				// Convert noise to intensity (0-255)
				const intensity = Math.round(sum / 256.0);

				// Apply color tint based on r, g, b parameters
				const finalR = Math.round((intensity / 255) * r);
				const finalG = Math.round((intensity / 255) * g);
				const finalB = Math.round((intensity / 255) * b);

				context.fillStyle = `rgba(${finalR}, ${finalG}, ${finalB}, ${a})`;
				context.fillRect(x, y, 1, 1);
			}
		}

		context.stroke();
	}

	/**
	 * Cosine interpolation for smooth transitions
	 * @param {number} a - Start value
	 * @param {number} b - End value
	 * @param {number} x - Interpolation factor (0-1)
	 * @returns {number} Interpolated value
	 */
	cosineInterpolate(a, b, x) {
		const ft = x * Math.PI;
		const f = (1 - Math.cos(ft)) * 0.5;
		return a * (1 - f) + b * f;
	}

	/**
	 * Seeded pseudo-random number generator
	 * @param {number} x - Seed value
	 * @returns {number} Pseudo-random value
	 */
	seededRandom(x) {
		// Magic numbers from PRNG tutorial
		let temp = (x << 13) ^ x; // bitwise xor
		temp = (x * (x * x * 15731 + 789221) + 1376312589);
		temp = temp & 0x7fffffff; // bitwise and
		return 128 + (256 * (1.0 - temp / 1073741824.0));
	}
}
