/*
 * "Hyperspac" by Ben Wheatley - 2014
 * License ??? plus Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
 * Contact: github.com/BenWheatley
 */

// constants
const int MAX_OCTAVE = 5;
const float PI = 3.14159265359;
const float centerToCorner = sqrt((0.5*0.5) + (0.5*0.5));
const float tangentScale = PI / (2.0*centerToCorner);
const float thetaToPerlinScale = 128.0 / PI;

float cosineInterpolate(float a, float b, float x) {
	float ft = x * PI;
	float f = (1.0 - cos(ft)) * 0.5;
	
	return a*(1.0-f) + b*f;
}

float seededRandom(vec2 co) {
    // https://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl#4275343
    // Licence ??? — see https://stackoverflow.com/questions/12964279/whats-the-origin-of-this-glsl-rand-one-liner
	return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
}

float perlinNoise(float perlinTheta, float r, float time) {
    float sum = 0.0;
    for (int octave=0; octave<MAX_OCTAVE; ++octave) {
        float sf = pow(2.0, float(octave));
        float sf8 = sf*4.0; // I can't remember where this variable name came from
        
        // The constants 64 and 4 are essentially arbitary:
		// they define the scale of the largest component of the Perlin noise
		float new_theta_double = sf*perlinTheta/64.0;
		float new_r_double = sf*r/4.0 + time; // Add current time to this to get an animated effect
		
        float new_theta_int = floor(new_theta_double);
		float new_r_int = floor(new_r_double);
		float fraction_r = new_r_double - new_r_int;
		float fraction_theta = new_theta_double - new_theta_int;
        
        float t1 = seededRandom( vec2(new_theta_int, sf8 *  new_r_int      ));
		float t2 = seededRandom( vec2(new_theta_int, sf8 * (new_r_int+1.0) ));
        if (new_theta_int+1.0 >= sf8) {
            new_theta_int = new_theta_int - sf8;
        }
        
        float t3 = seededRandom( vec2(new_theta_int+1.0, sf8 *  new_r_int      ));
		float t4 = seededRandom( vec2(new_theta_int+1.0, sf8 * (new_r_int+1.0) ));
        
		float i1 = cosineInterpolate(t1, t2, fraction_r);
		float i2 = cosineInterpolate(t3, t4, fraction_r);
        
        sum += cosineInterpolate(i1, i2, fraction_theta);
    }
    return sum;
}

// main
void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    
    float dx = 0.5 - uv.x;
    float dy = 0.5 - uv.y;
    
    float perlinTheta = thetaToPerlinScale*atan(uv.x, uv.y);
    float r = sqrt((dx*dx) + (dy*dy));
    r = centerToCorner - r;
    r = tan(tangentScale*r);
    
    float c = perlinNoise(perlinTheta, r, iTime)/8.0;
    
    fragColor = vec4(c, 0, 0, 0);
}