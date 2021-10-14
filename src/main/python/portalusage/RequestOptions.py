class RequestOptions:
	def __init__(self):
		self.options = []

	def add_option(self, title, url):
		self.options.append(Option(title, url))
	
	def __num_to_numeric(self, num):
		try:
			return int(num)
		except:
			return 1
	
	def get_option(self, num):
		return self.options[self.__num_to_numeric(num) - 1]
	
	def get_title(self, num):
		return self.get_option(num).title
	
	def get_menu_txt(self, num):
		return self.get_option(num).menu_txt(num)
	
	def get_url(self, num):
		return self.get_option(num).url


class Option:
	def __init__(self, title, url):
		self.title = title
		self.url = url
	
	def menu_txt(self, num):
		return f'Enter {num} to show {self.title}'
