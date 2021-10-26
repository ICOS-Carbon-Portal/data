import asyncio
from typing import Awaitable, Coroutine, List
import aiohttp

class Backend:
	def __init__(self):
		self.__session = aiohttp.ClientSession()
	
	async def __aenter__(self):
		return self
		
	async def __aexit__(self, *excinfo):
		await self.__session.close()
	
	async def get_response(self, url: str) -> Awaitable[Coroutine]:
		async with self.__session.get(url) as resp:
			return await resp.json()
	
	async def get_responses(self, urls: List[str]):
		return await asyncio.gather(*[self.get_response(url) for url in urls])
