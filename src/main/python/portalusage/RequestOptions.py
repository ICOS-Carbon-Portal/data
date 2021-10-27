from typing import Dict, List, Optional
from dataclasses import dataclass

def get_request_options():
	request_options = RequestOptions()
	request_options.add_option(
		'portal usage per month combined',
		None,
		'portalUsage',
		None
	)
	request_options.add_option(
		'portal usage: filterChange per month',
		'https://restheart.icos-cp.eu/db/portaluse/_aggrs/getPortalUsagePerMonth?avars={"key":"filterChange"}&np',
		'portalUsage',
		'Filter change'
	)
	request_options.add_option(
		'portal usage: previewTimeserie per month',
		'https://restheart.icos-cp.eu/db/portaluse/_aggrs/getPortalUsagePerMonth?avars={"key":"previewTimeserie"}&np',
		'portalUsage',
		'Preview timeserie'
	)
	request_options.add_option(
		'portal usage: previewMapGraph per month',
		'https://restheart.icos-cp.eu/db/portaluse/_aggrs/getPortalUsagePerMonth?avars={"key":"previewMapGraph"}&np',
		'portalUsage',
		'Preview map-graph'
	)
	request_options.add_option(
		'portal usage: previewNetCDF per month',
		'https://restheart.icos-cp.eu/db/portaluse/_aggrs/getPortalUsagePerMonth?avars={"key":"previewNetCDF"}&np',
		'portalUsage',
		'Preview NetCDF'
	)
	request_options.add_option(
		'portal usage: binary download per month',
		'https://restheart.icos-cp.eu/db/portaluse/_aggrs/getPortalUsagePerMonth?avars={"key":"cpbDownload"}&np',
		'portalUsage',
		'Binary download'
	)
	request_options.add_option(
		'portal usage: BinaryFileDownload per month',
		'https://restheart.icos-cp.eu/db/portaluse/_aggrs/getPortalUsagePerMonth?avars={"key":"BinaryFileDownload"}&np',
		'portalUsage',
		'Python library download'
	)
	request_options.add_option(
		'portal usage: error per month',
		'https://restheart.icos-cp.eu/db/portaluse/_aggrs/getPortalUsagePerMonth?avars={"key":"error"}&np',
		'portalUsage',
		'Error'
	)
	request_options.add_option(
		'portal usage: unique IPs per month',
		'https://restheart.icos-cp.eu/db/portaluse/_aggrs/getMonthlyUniqueIps?np',
		None,
		None
	)
	request_options.add_option(
		'portal filter changes',
		'https://restheart.icos-cp.eu/db/portaluse/_aggrs/getFilterChanges?np',
		None,
		None
	)
	request_options.add_option(
		'downloaded collections per month',
		'https://data.icos-cp.eu/stats/api/downloadedCollections',
		None,
		None
	)
	request_options.add_option('custom statistics', None, None, None)

	return request_options


@dataclass(frozen=True)
class ReqOption:
	title: str
	url: Optional[str] = None
	group: Optional[str] = None
	legend: Optional[str] = None

	def menu_txt(self, num: str) -> str:
		return f'Enter {num} to show {self.title}'


class RequestOptions:
	def __init__(self):
		self.options: List[ReqOption] = []

	def add_option(self, title: str, url: Optional[str], group: Optional[str], legend: Optional[str]):
		self.options.append(ReqOption(title, url, group, legend))
	
	def __num_to_numeric(self, num: str) -> int:
		try:
			return int(num)
		except:
			return 1
	
	def get_option(self, num: str) -> ReqOption:
		return self.options[self.__num_to_numeric(num) - 1]
	
	def get_options(self, num: str) -> List[ReqOption]:
		opt = self.get_option(num)

		if opt.url is None and opt.group is not None:
			return self.get_group(opt.group)
		
		return [opt]
	
	def get_title(self, num: str) -> str:
		return self.get_option(num).title

	def get_menu_txt(self, num: str) -> str:
		return self.get_option(num).menu_txt(num)

	def get_url(self, num: str) -> str:
		return self.get_option(num).url

	def get_group(self, group: str):
		return [opt for opt in self.options if opt.group == group]


class SelectedOptions:
	def __init__(self, opts: List[ReqOption]):
		self.options = opts
	
	def is_valid(self):
		return self.options[0].url is not None or self.is_collection()

	def is_collection(self):
		return self.options[0].url is None and self.options[0].group is not None
	
	def is_custom_request(self):
		return self.options[0].url is None and self.options[0].group is None
	
	def set_custom_request(self, url):
		self.options = [ReqOption('Custom statistics', url, None, None)]
	
	def get_first_url(self):
		return self.options[0].url
	
	def get_request_objects(self) -> Dict[str, str]:
		return {opt.url: opt.legend or opt.title for opt in self.options if opt.url is not None}
	
	def get_title(self):
		return self.options[0].title
	
