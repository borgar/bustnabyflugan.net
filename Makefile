.DEFAULT_GOAL := docs
.PHONY: docs

docs: books settings.conf template.njk
	node ../booksite-maker . docs

