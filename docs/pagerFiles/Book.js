const DEFAULT_DELAY = 600;

function clamp (min, val, max) {
  return Math.max(min, Math.min(val, max));
}

export class Book {
  constructor (data, baseURL) {
    this.baseURL = baseURL;
    this.title = data.title;
    this.download_url = data.download_url;
    this.pages = data.pages.map((page, i) => {
      return {
        ...page,
        index: i,
        img: String(new URL(page.img, baseURL))
      };
    });
    this.currentPage = 0;
    this._eventHandlers = [];
    this.styles = data.styles || [];
    this.singles = false; // change to getter/setter so we can adj. current page?
    this.pagePairs = [];
    this.pageDelay = DEFAULT_DELAY;
    this.isPaging = 0;
    let i = 0;
    while (i < this.pages.length) {
      const page = this.pages[i++];
      // this is a "single" (cover) or there are no more pages
      if (page.single || !this.pages[i] || this.pages[i].single) {
        this.pagePairs.push([ page ]);
      }
      else {
        this.pagePairs.push([ page, this.pages[i++] ]);
      }
    }
  }

  get progress () {
    const len = this.pages.length - 1;
    let cp = this.isPaging
      ? this.pagingData.newPage
      : this.currentPage;
    if (!this.singles) {
      const s = this.getPagesIndex(cp);
      const pair = this.pagePairs[s];
      cp = pair[1] ? pair[1].index : cp;
    }
    return cp / len;
  }

  getPagesIndex (findPage) {
    return this.pagePairs.findIndex(pair => (
      pair[0].index === findPage ||
      pair[1]?.index === findPage
    ));
  }

  getPagesAt (index) {
    const cp = clamp(0, index, this.pages.length - 1);
    if (this.singles) {
      return [ this.pages[cp] ];
    }
    const pairIndex = this.getPagesIndex(cp);
    return this.pagePairs[pairIndex];
  }

  getCurrentPages () {
    return this.getPagesAt(this.currentPage);
  }

  getPagingPages () {
    if (this.isPaging) {
      return this.getPagesAt(this.pagingData.newPage);
    }
    return [ { img: null } ];
  }

  addEventListener (type, handler) {
    this._eventHandlers.push({ type, handler });
  }

  emit (type, eventData) {
    this._eventHandlers
      .filter(d => d.type === type)
      .forEach(d => {
        d.handler.call(this, { type, ...eventData });
      });
  }

  gotoFirst () {
    this.setPage(0);
  }
  gotoLast () {
    this.setPage(Infinity);
  }
  gotoNext () {
    this.moveStep(1);
  }
  gotoPrev () {
    this.moveStep(-1);
  }

  moveStep (direction) {
    const currentPage = this.isPaging
      ? this.pagingData.newPage
      : this.currentPage;
    const delta = Math.sign(direction);
    if (this.singles) {
      // we don't need to think about pairs
      this.setPage(currentPage + delta);
    }
    else {
      // we're moving by an opening
      const pairIndex = this.getPagesIndex(currentPage)
      const newPairIndex = clamp(0, pairIndex + delta, this.pagePairs.length - 1);
      const pair = this.pagePairs[newPairIndex];
      this.setPage(pair[0].index);
    }
  }

  setPage (pageNumber) {
    const newPage = clamp(0, pageNumber, this.pages.length - 1);
    const currentPage = this.isPaging
      ? this.pagingData.newPage
      : this.currentPage;
    if (newPage !== currentPage) {
      const data = {
        oldPage: currentPage,
        newPage: newPage,
      };
      this.isPaging = Math.sign(newPage - currentPage);
      this.pagingData = data;
      this.emit('beforepage', data);
      clearTimeout(this._pageTimer);
      this._pageTimer = setTimeout(() => {
        this.currentPage = newPage;
        this.isPaging = 0;
        this.emit('page', data);
        this.emit('afterpage', data);
      }, this.pageDelay);
    }
  }
}
