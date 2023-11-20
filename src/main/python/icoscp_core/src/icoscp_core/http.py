import json
from urllib.request import Request, HTTPError, urlopen
from urllib.parse import urlencode
from http.client import HTTPResponse
from typing import Any, Literal

Method = Literal["GET", "POST"]

def http_request(
	url: str,
	error_hint: str,
	method: Method = "GET",
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
		resp_text = err.read().decode()
		msg = f"{error_hint} problem, HTTP response code: {err.status}, response: {resp_text}"
		raise Exception(msg) from None
