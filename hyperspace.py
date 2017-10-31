#!/usr/bin/python2.7
# -*- coding: utf-8 -*-

from matplotlib import pyplot as plt
import numpy as np
import math
from matplotlib import animation

width, height = 120, 160
if height % 2 == 0:
	# Even numbers produce a glitch at 12 O'clock — in the JS version, the same error is at 9 O'clock
	height += 1

hWidth, hHeight = width/2.0, height/2.0

centerToCorner = math.sqrt((hWidth*hWidth) + (hHeight*hHeight))
tangentScale = math.pi / (2*centerToCorner)
thetaToPerlinScale = 128 / math.pi

MAX_OCTAVE = 4 # Higher values = 8 more detail, lower values = faster; no point going over 8 because of dynamic range of colour space

# Utility functions, will only use one of {linearInterpolate, cosineInterpolate}, the former is faster, the latter is nicer

def linearInterpolate(a, b, x):
	return a*(1-x) + b*x

def cosineInterpolate(a, b, x):
	ft = x * math.pi
	f = (1 - math.cos(ft)) * 0.5
	
	return a*(1-f) + b*f

interpolate = cosineInterpolate

def seededRandom(x):
	# Magic numbers from tutorial on pseudo-random number generators
	x = int(x & 0x7fffffff)
	temp = x << 13 ^ x
	temp = (x * (x * x * 15731 + 789221) + 1376312589)
	temp = int(temp) & 0x7fffffff # bitwise and
	return 255*( temp/float(0x7fffffff) )

def perlinNoise(perlinTheta, r, time):
	sum = 0
	for octave in range(1, MAX_OCTAVE):
		sf = 2**octave
		sf8 = sf*4 # I can't remember where this variable name came from
		
		# The constants 64 and 4 are essentially arbitary:
		# they define the scale of the largest component of the Perlin noise
		new_theta_double = sf*perlinTheta/64.0
		new_r_double = sf*r/4.0 + time # Add current time to this to get an animated effect
		
		new_theta_int = int(new_theta_double)
		new_r_int = int(new_r_double)
		fraction_r = new_r_double - new_r_int
		fraction_theta = new_theta_double - new_theta_int
		
		t1 = seededRandom( new_theta_int	+ sf8 *  new_r_int   )
		t2 = seededRandom( new_theta_int	+ sf8 * (new_r_int+1))
		if new_theta_int+1 >= sf8:
			# So that interpolation with angle 0-360° doesn't do weird things with angles > 360°
			new_theta_int = new_theta_int - sf8
		
		t3 = seededRandom((new_theta_int+1)	+ sf8 *  new_r_int   )
		t4 = seededRandom((new_theta_int+1)	+ sf8 * (new_r_int+1))
		
		i1 = interpolate(t1, t2, fraction_r)
		i2 = interpolate(t3, t4, fraction_r)
		
		sum += interpolate(i1, i2, fraction_theta)*256/sf
	return sum/256.0

def render(time):
	outputImage = np.empty((width, height), np.uint8)
	for y in range(0, height):
		dy = y - hHeight
		for x in range(0, width):
			dx = x - hWidth
		
			perlinTheta = 128 + thetaToPerlinScale*math.atan2(dy, dx) # Range 0-255, this is a coordinate space 2^n where n is integer, not a colour space
		
			r = math.sqrt((dx*dx) + (dy*dy))
			r = centerToCorner - r
			r = math.tan(tangentScale*r)
		
			sum = perlinNoise(perlinTheta, r, time)
			outputImage[x][y] = sum
	
	return outputImage

images = []
for time in range(0, 20):
	img = render(time/5.0)
	images.append(img)
	
#plt.imshow(images, cmap=plt.cm.gist_gray)
#plt.show()

fig = plt.figure()

im = plt.imshow(images[0], animated=True, cmap=plt.cm.gist_gray)

index = 0
def updatefig(*args):
	global index
	index += 1
	index %= images.__len__()
	im.set_array(images[index])
	return im,

ani = animation.FuncAnimation(fig, updatefig, interval=50, blit=False)
plt.axis('off')
plt.show()
