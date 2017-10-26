import os
from datetime import datetime
from subprocess import check_output

IS_PRODUCTION = True
IS_SIMULATION = True

RDF_CONTAINER = "rdflogdb-v9.6" if IS_PRODUCTION else "rdflogdb"
OUTPUT_FOLDER = "/disk/data/volumes/rdflogdb-9.6/add-sizes" if IS_PRODUCTION else "/disk/volumes/rdflogdb/pgdata/add-sizes"
DATA_FOLDER = "/disk/data/dataAppStorage"
PG_FOLDER = "/var/lib/postgresql/data/pgdata/add-sizes"

# Only folders mentioned here will be processed
FOLDER_2_TABLE = {
	'asciiWdcggTimeSer': 'wdcgg',
	'asciiAtcTimeSer': 'atmcsv',
	'atcZipMulti': 'atcmulti',
	'asciiEtcRawTimeSer': 'etccsv',
	'binEtcRawTimeSer': 'etcbin',
	'asciiEtcTimeSer': 'ecocsv',
	'asciiOtcSocatTimeSer': 'socat',
	'netcdf': 'netcdf',
	'ingosRar': 'ingosrar'
}


def get_folders(dirname):
	folder_names = []

	for basename in os.listdir(dirname):
		if basename in FOLDER_2_TABLE:
			filename = os.path.join(dirname, basename)

			if os.path.isdir(filename):
				folder_names.append(basename)

	return folder_names


def process_folder(folder):
	file_data = []
	for basename in os.listdir(os.path.join(DATA_FOLDER, folder)):
		filename = os.path.join(DATA_FOLDER, folder, basename)
		size = os.path.getsize(filename)
		extension = os.path.splitext(filename)[1][1:]

		if extension == "":
			file_data.append([basename, size])

	return file_data


def copy_to_table(folder, sizes):
	if len(sizes) > 0:
		table_name = FOLDER_2_TABLE[folder]
		output_file = os.path.join(OUTPUT_FOLDER, table_name + ".csv")

		with open(output_file, "w") as csv_file:
			for size in sizes:
				table_row = [
					datetime.now().isoformat(),
					't',
					'1',
					'https://meta.icos-cp.eu/objects/' + size[0],
					'http://meta.icos-cp.eu/ontologies/cpmeta/hasSizeInBytes', str(size[1]),
					'http://www.w3.org/2001/XMLSchema#long'
				]
				csv_file.write(",".join(table_row) + "\n")

		table_exists_query = check_output(
			"docker exec -t " + RDF_CONTAINER + " psql -U postgres -t -c \"SELECT 1 FROM information_schema.tables WHERE table_name = '" + table_name + "';\"",
			shell=True)

		if table_exists_query != "":
			if IS_SIMULATION:
				print "Simulating adding data to table " + table_name + " (" + str(len(sizes)) + " records)"
			else:
				result = check_output("docker exec -t " + RDF_CONTAINER + " psql -U postgres -c \"COPY " + table_name
					+ "(tstamp, \\\"ASSERTION\\\", \\\"TYPE\\\", \\\"SUBJECT\\\", \\\"PREDICATE\\\", \\\"OBJECT\\\", \\\"LITATTR\\\") "
					+ "FROM '" + os.path.join(PG_FOLDER, table_name + ".csv") + "' DELIMITER ',' CSV;\"", shell=True)
				expected_num = len(sizes)
				actual_num = int(result.replace("COPY ", ""))
				print "Expected number of inserts for table " + table_name + ":", str(expected_num), "Actual result:", str(actual_num)
				if expected_num != actual_num:
					print "ERROR - Expected number of inserted rows does not match actual inserted rows!"
		else:
			print "Table " + table_name + " does not exist. Skipping import of " + table_name + ".csv"


if not os.path.exists(OUTPUT_FOLDER):
	os.makedirs(OUTPUT_FOLDER)

folders = get_folders(DATA_FOLDER)

for folder in folders:
	copy_to_table(folder, process_folder(folder))
