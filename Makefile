.DEFAULT_GOAL := docs

.PHONY: docs
docs: books settings.conf template.njk
	@node ../booksite-maker . docs
	@echo "bustnabyflugan.net" > docs/CNAME
	@cp robots.txt docs/robots.txt

.PHONY: site
site: books settings.conf template.njk
	@node ../booksite-maker --nopdf . docs
	@echo "bustnabyflugan.net" > docs/CNAME
	@cp robots.txt docs/robots.txt

.PHONY: pdfs
pdfs: books settings.conf template.njk
	@node ../booksite-maker --onlypdf . docs
