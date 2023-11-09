import logging
import threading
from typing import Any
from . import __version__ as icoscp_core_version

from .envri import EnvriConfig
from .http import http_request, HTTPResponse

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
	resp: HTTPResponse = http_request(url=url, method="POST", headers=headers, data=payload)
	if resp.status != 200:
		logging.warning(f"Failed reporting data usage event to {url}: {resp.msg}")
