# icoscp_core

A foundational ICOS Carbon Portal core products Python library for metadata and data access, designed to work with multiple Environmental Research Infrastructures (ENVRIs) who use ICOS Data Portal stack to host and serve their data.

# Getting started

```Bash
$ pip install icoscp_core
```

To initialize authentication on a local machine, run the following:

```Python
from icoscp_core.icos import auth

auth.init_config_file()
```

For other ENVRIes (SITES or ICOS Cities), in the import directive use `sites` or `cities` instead of `icos`, respectively.

To browse metadata:

```Python
from icoscp_core.icos import meta
from icoscp_core.metaclient import TimeFilter, SizeFilter

datatypes = meta.list_datatypes()

stations = meta.list_stations()

filtered_atc_co2 = meta.list_data_objects(
	datatype = "http://meta.icos-cp.eu/resources/cpmeta/atcCo2Product",
	filters = [TimeFilter("submTime", ">", "2022-05-05T12:00:00Z"), SizeFilter(">", 100000)],
	include_deprecated = False,
	order_by = "size",
	limit = 100
)
```

To fetch data (after having located interesting data in the previous step):

```Python
from icoscp_core.icos import data
import pandas as pd

dobj_uri = 'https://meta.icos-cp.eu/objects/BbEO5i3rDLhS_vR-eNNLjp3Q'

filename = data.save_to_folder(dobj_uri, '/myhome/icosdata/')

csv_stream = data.get_csv_byte_stream(dobj_uri)
df = pd.DataFrame(csv_stream)
```
