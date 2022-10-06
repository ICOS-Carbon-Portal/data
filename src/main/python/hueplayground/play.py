from PIL import Image
from huedominance.hrdi import hrdi
from huedominance.gcc import gcc

#workFolder = "/home/oleg/Documents/CP/images/"
workFolder = "/home/oleg/workspace/Playground/huedominance/"
#imagePath = workFolder + "ES_FI-Let.jpg"
imagePath = workFolder + "green_leaves.jpg"

#hue 54 is spruce in the sun
hue_min,hue_max = [100, 170] # dark green leaves
#hue_min,hue_max = [-30, 10] # red leaves

#idx, illustration = gcc(Image.open(imagePath), True)
#idx, illustration = hrdi(Image.open(imagePath), hue_min, hue_max, True)
#print(idx)
#illustration.save(workFolder + "gcc_green_leaves.jpg", "JPEG")

def compare(fileNames):
	print("File\tGCC\tHRDI")
	for fileName in fileNames:
		image = Image.open(workFolder + fileName)
		gcc_index, _ = gcc(image)
		hrdi_index, _ = hrdi(image, hue_min, hue_max)
		print(f'{fileName}\t{gcc_index}\t{hrdi_index}')

compare(["green_leaves.jpg", "two_color_bush.jpg", "snow_forest.jpg"])