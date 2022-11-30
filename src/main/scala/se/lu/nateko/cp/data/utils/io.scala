package se.lu.nateko.cp.data.utils

import java.nio.file.Path

object io:

	extension(path: Path)
		def withSuffix(suff: String) = path.resolveSibling(path.getFileName().toString + suff)
