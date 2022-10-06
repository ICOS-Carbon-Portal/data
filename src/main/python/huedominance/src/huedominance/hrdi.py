from PIL import Image
import numpy as np
import math

def hrdi(image: Image.Image, hue_min_deg: int, hue_max_deg: int, makeIllustration: bool = False) -> tuple[float, Image.Image]:
	"""
	Hue Range Dominance Index (HRDI) algorithm
	
	Computes "dominance index" for a range of hues in an image, taking hue saturation into
	account. The index value ranges between 0 and 1, and gives a natural measure of "how much of a certain color" there is in an image.
	The theoretical maximum of 1 corresponds to all of the pixels having hues withing the specified range, and all the hues being fully saturated.
	The theoretical minimum of 0 corresponds to all pixels either having a hue outside the specified range, or having zero saturation (i.e. being white).

	The algorithm has the following steps:
	 - convert the image to HSV (hue-saturation-value) color model
	 - compute the total sum of the V channel values for the whole image (v_total)
	 - set V of pixels outside the hue range to zero
	 - multiply V channel with S channel, normalized to [0,1] range instead of [0, 255]
	 - compute the total sum of thus obtained V channel (v_hue_range_adjusted)
	 - the ratio v_hue_range_adjusted / v_total gives the HRDI value for the image
	The function optionally produces an illustration: a "masked" image of the pixels within the chosen hue range, with their V set
	to pixel's contribution to the index, H is preserved, and S set to max for illustrative purposes. The illustration shows how
	the index "sees" the original image.

	Parameters
	----------
	image: Image.Image
		an image object as obtained using Pillow (PIL fork) library
	hue_min_deg: int
		minimal hue value (angle) in degrees. Zero corresponds to red, 120 to green, 240 or -120 to blue
	hue_max_deg: int
		maximal hue value, save data type as for hue_min_deg
	makeIllustration: bool, optional
		a flag specifying whether the illustration image needs to be produced

	Returns
	-------
	tuple[float, Image.Image]
		a tuple of HRDI value and the illustration image. If makeIllustration is False, the second element in the tuple is None.
	"""
	hsv = image.convert("HSV")
	hue = np.array(hsv.getchannel("H"))
	sat = np.array(hsv.getchannel("S"))
	val = np.array(hsv.getchannel("V"))

	hue_min, hue_max = [255 * (d % 360) / 360 for d in [hue_min_deg, hue_max_deg]]

	if hue_min < hue_max:
		sat[(hue < hue_min) | (hue > hue_max)] = 0
	elif hue_max < hue_min:
		sat[(hue < hue_min) & (hue > hue_max)] = 0
	else:
		sat[hue != math.round(hue_min)] = 0

	sat = sat / 255
	v_adjusted = val * sat

	hue_v = np.sum(v_adjusted)
	total_v = np.sum(val)
	dominance = hue_v / total_v

	if not makeIllustration:
		return (dominance, None)
	else:
		v_adjusted = np.round(v_adjusted).astype("uint8")
		fullSat = np.full(hue.shape, 255, dtype = "uint8")
		maskedImageArr = np.dstack((hue, fullSat, v_adjusted))
		illustration = Image.fromarray(maskedImageArr, mode = "HSV").convert("RGB")
		return (dominance, illustration)
