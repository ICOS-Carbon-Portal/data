from PIL import Image
from huedominance.hrdi import hrdi
import sys

def main() -> int:
	args = sys.argv
	if(len(args) < 3):
		print("Usage: huedominance <min hue (degrees)> <max hue (degrees)> <path to image>")
		return 1
	try:
		hue_min = int(args[1])
		hue_max = int(args[2])
		fileName = args[3]
		image = Image.open(fileName)
		hrdi_index, _ = hrdi(image, hue_min, hue_max)
		print(hrdi_index)
		return 0
	except BaseException as err:
		print("Error: ", err)
		return 1

if __name__ == "__main__":
	sys.exit(main())
