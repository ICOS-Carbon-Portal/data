import logging
import threading
from typing import Any
from . import __version__ as icoscp_core_version

from .envri import EnvriConfig
from .http import http_request

def report_cpb_file_read(conf: EnvriConfig, hashes: list[str], columns: list[str] | None) -> None:
	access_info: dict[str, Any] = {
		"objects": hashes,
		"client": 'icoscp_core',
		"version": icoscp_core_version
	}
	if columns is not None:
		access_info["columns"] = columns

	payload = {"cpbFileAccess": access_info}

	return threading.Thread(target=_report_sync, args=(conf, payload)).start()

def _report_sync(conf: EnvriConfig, payload: dict[str, Any]) -> None:
	url = conf.auth_service_base_url + 'logs/portaluse'
	headers = {"Content-Type": "application/json"}
	try:
		http_request(url, f"Reporting data usage event to {url}", "POST", headers, payload)
	except Exception as err:
		logging.warning(str(err))
