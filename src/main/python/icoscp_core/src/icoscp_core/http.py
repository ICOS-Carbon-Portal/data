import json
from urllib.request import Request, HTTPError, urlopen
from urllib.parse import urlencode
from typing import TypeAlias, Any


HTTPResponse: TypeAlias = Any

def http_request(
	url: str,
	method: str = "GET",
	headers: dict[str, str] = {},
	data: str | dict[str, Any] | None = None
) -> HTTPResponse:

	if isinstance(data, str):
		d = bytes(data, encoding="utf-8")
	elif isinstance(data, dict):
		if "Content-Type" in headers.keys() and headers["Content-Type"] == "application/x-www-form-urlencoded":
			d = bytes(urlencode(data), encoding="utf-8")
		else:
			d = json.dumps(data).encode("utf-8")
	else:
		d = None

	req = Request(url=url, data=d, headers=headers, method=method)

	try:
		return urlopen(req)
	except HTTPError as err:
			return err.fp
