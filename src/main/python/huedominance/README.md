# huedominance

Provides **Hue Range Dominance Index (HRDI)** algorithm &mdash; a new vegetation index proposed for PhenoCam plant phenology image analysis.

For comparison with Green Chromatic Coordinate (GCC), a `gcc` function is available, too.

To install:

`pip3 install huedominance`

To use from command line (example):

```bash
python3 -m huedominance 100 170 green_leaves.jpg
```

To use in your Python code:

```python
from huedominance.hrdi import hrdi
from huedominance.gcc import gcc
from PIL import Image

image = Image.open('/path/to/your/image')

green_leaves_hrdi, hrdi_image = hrdi(image, 100, 170, make_illustration = True)
green_leaves_gcc, gcc_image = gcc(image, make_illustration = True)

hrdi_image.save('/path/to/hrdi/illustrative/signal/image', 'JPEG')
gcc_image.save('/path/to/gcc/illustrative/signal/image', 'JPEG')

red_leaves_hrdi, _ = hrdi(image, -30, 10)
```

Please refer to Python help on function `hrdi` for details about the algorithm.
