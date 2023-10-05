# icoscp_core

A foundational ICOS Carbon Portal core products Python library for metadata and data access, designed to work with multiple data repositories who use ICOS Data Portal stack to host and serve their data.

# Getting started

```Bash
$ pip install icoscp_core
```

To initialize authentication on a local machine, run the following:

```Python
from icoscp_core.icos import auth

auth.init_config_file()
```

(The authentication initialization step may not be required when using the library on the [Jupyter notebook service hosted by the ICOS Carbon Portal](https://jupyter.icos-cp.eu/))

**For other Repositories (SITES or ICOS Cities), in the import directives, use `sites` or `cities` instead of `icos`, respectively.**

To browse metadata:

```Python
from icoscp_core.icos import meta, ATMO_STATION
from icoscp_core.metaclient import TimeFilter, SizeFilter, SamplingHeightFilter

# fetches the list of known data types, including metadata associated with them
all_datatypes = meta.list_datatypes()

# data types with structured data access
previewable_datatypes = [dt for dt in all_datatypes if dt.has_data_access]

# fetch lists of stations
icos_stations = meta.list_stations()
atmo_stations = meta.list_stations(ATMO_STATION)
all_known_stations = meta.list_stations(False)

# list data objects; a contrived, complicated example to demonstrate the possibilities
filtered_atc_co2 = meta.list_data_objects(
	datatype = [
		"http://meta.icos-cp.eu/resources/cpmeta/atcCo2L2DataObject",
		"http://meta.icos-cp.eu/resources/cpmeta/atcCo2NrtGrowingDataObject"
	],
	station = "http://meta.icos-cp.eu/resources/stations/AS_GAT",
	filters = [
		TimeFilter("submTime", ">", "2023-07-01T12:00:00Z"),
		TimeFilter("submTime", "<", "2023-07-10T12:00:00Z"),
		SizeFilter(">", 50000),
		SamplingHeightFilter("=", 216)
	],
	include_deprecated = True,
	order_by = "fileName",
	limit = 50
)

# get detailed metadata for a data object
dobj_uri = 'https://meta.icos-cp.eu/objects/BbEO5i3rDLhS_vR-eNNLjp3Q'
dobj_detailed_meta = meta.get_dobj_meta(dobj_uri)
```

Detailed help on the available metadata access methods can be obtained from `help(meta)` call.

To fetch data (after having located interesting data objects in the previous step):

```Python
from icoscp_core.icos import data
import pandas as pd

# save the original data object contents to a folder on your machine
filename = data.save_to_folder(dobj_uri, '/myhome/icosdata/')

# get CSV representation of all previewable columns, parse it with pandas
csv_stream = data.get_csv_byte_stream(dobj_uri)
df = pd.read_csv(csv_stream)

# get dataset columns as typed arrays, ready to be imported into pandas
dobj_arrays = data.get_columns_as_arrays(dobj_detailed_meta)
df = pd.DataFrame(dobj_arrays)

# efficiently batch-fetch multiple data objects
multi_dobjs = data.batch_get_columns_as_arrays(filtered_atc_co2)
multi_df = ( (dobj, pd.DataFrame(arrs)) for dobj, arrs in multi_dobjs)
```


Downloading the original object is possible for all data objects. Structured data access, however, is limited to data objects whose data types' `has_data_access` property equals `True`.
