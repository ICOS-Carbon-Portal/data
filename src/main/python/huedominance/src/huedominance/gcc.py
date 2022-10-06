from PIL import Image
import numpy as np

def gcc(image: Image.Image, makeIllustration: bool = False) -> tuple[float, Image.Image]:
	"""
	Green Chromatic Coordinate (GCC) algorithm to assess "greenness" of an image.

	The function optionally produces an illustration: an image of green pixels with their green value set
	to its GCC value. The illustration shows how the index "sees" the original image.

	Parameters
	----------
	image: Image.Image
		an image object as obtained using Pillow (PIL fork) library
	makeIllustration: bool, optional
		a flag specifying whether the illustration image needs to be produced

	Returns
	-------
	tuple[float, Image.Image]
		a tuple of GCC value and the illustration image. If makeIllustration is False, the second element in the tuple is None.
	"""
	red   = np.array(image.getchannel("R"))
	green = np.array(image.getchannel("G"))
	blue  = np.array(image.getchannel("B"))

	red_sum   = np.sum(red)
	green_sum = np.sum(green)
	blue_sum  = np.sum(blue)

	gcc_index = green_sum / (red_sum + green_sum + blue_sum)

	if not makeIllustration:
		return (gcc_index, None)
	else:
		red = np.zeros(red.shape)
		blue = np.zeros(blue.shape)
		greenImageArr = np.dstack((red, green, blue))
		illustration = Image.fromarray(greenImageArr, mode = "RGB")
		return (gcc_index, illustration)
