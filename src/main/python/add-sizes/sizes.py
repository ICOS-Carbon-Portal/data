import os
from datetime import datetime
from subprocess import getoutput

BASE_FOLDER = "/disk/data/dataAppStorage"
OUTPUT_FOLDER = "/disk/volumes/rdflogdb"
PG_FOLDER = "/var/lib/postgresql/data"
CURRENT_PATH = os.path.dirname(os.path.abspath(__file__))

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
	for basename in os.listdir(os.path.join(BASE_FOLDER, folder)):
		filename = os.path.join(BASE_FOLDER, folder, basename)
		size = os.path.getsize(filename)
		extension = os.path.splitext(filename)[1][1:]

		if extension == "":
			file_data.append([basename, size])

	return file_data


def copy_to_table(folder, sizes):
	if len(sizes) > 0:
		table_name = FOLDER_2_TABLE[folder]
		output_file = os.path.join(OUTPUT_FOLDER, table_name + ".csv")

		with open(output_file, "w") as sql_file:
			for size in sizes:
				table_row = [
					datetime.now().isoformat(),
					't',
					'1',
					'https://meta.icos-cp.eu/objects/' + size[0],
					'http://meta.icos-cp.eu/ontologies/cpmeta/hasSizeInBytes', str(size[1]),
					'http://www.w3.org/2001/XMLSchema#long'
				]
				sql_file.write(",".join(table_row) + "\n")

		table_exists_query = getoutput("docker exec -t rdflogdb psql -U postgres -t -c \"SELECT 1 FROM information_schema.tables WHERE table_name = '" + table_name + "';\"")

		if table_exists_query != "":
			result = getoutput("docker exec -t rdflogdb psql -U postgres -c \"COPY " + table_name
				+ "(tstamp, \\\"ASSERTION\\\", \\\"TYPE\\\", \\\"SUBJECT\\\", \\\"PREDICATE\\\", \\\"OBJECT\\\", \\\"LITATTR\\\") "
				+ "FROM '/var/lib/postgresql/data/" + table_name + ".csv' DELIMITER ',' CSV;\"")
			expected_num = len(sizes)
			actual_num = int(result.replace("COPY ", ""))
			print("Expected number of inserts for table " + table_name + ":", str(expected_num), "Actual result:", str(actual_num))
			if expected_num != actual_num:
				print("ERROR - Expected number of inserted rows does not match actual inserted rows!")
		else:
			print("Table " + table_name + " does not exist. Skipping import of " + table_name + ".csv")

		os.remove(output_file)


folders = get_folders(BASE_FOLDER)

for folder in folders:
	copy_to_table(folder, process_folder(folder))
