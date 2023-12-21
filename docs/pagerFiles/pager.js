import { Book } from "./Book.js";

const BLANK_SRC = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
let touchOrigin;

const imageCache = new Map();

function removeWS (node) {
  for (let n = 0; n < node.childNodes.length; n++) {
    var child = node.childNodes[n];
    if (child.nodeType === 3 && !child.nodeValue.trim()) {
      node.removeChild(child);
      n--;
    }
    else if (child.nodeType === 1) {
      removeWS(child);
    }
  }
}

// FIXME: cache things :)
function measureText (text, font) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  return ctx.measureText(text).width;
}

function renderText (container, pageData, styles) {
  container.innerHTML = '';
  if (!pageData || !pageData.text) {
    return;
  }
  const defaultStyles = {
    fontFamily: 'Arial',
    fontFamily: 'sans-serif',
    fontSize: 20
  };
  pageData.text.forEach(item => {
    const style = styles[item.style] ?? defaultStyles;
    const fontName = style.fontName;
    const fontFamily = style.fontFamily;
    const fontSize = style.fontSize;
    const font = fontName + ', ' + fontFamily
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', item.pos[0]);
    text.setAttribute('y', item.pos[1]);
    text.setAttribute('font-size', fontSize + 'px');
    text.setAttribute('font-family', font);
    text.setAttribute('fill', 'none');
    text.style['pointer-events'] = 'all';
    text.textContent = item.text;

    const width = measureText(item.text, `${fontSize}px ${font}`)
    const wordCount = item.text.split(/\s+/).length;
    text.style['word-spacing'] = (item.width - width) / (wordCount - 1);

    container.append(text);
  });
}

function getBlankImg (w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  return canvas.toDataURL('image/png');
}

function renderPage (elm, page, styles) {
  const [ pageWidth, pageHeight ] = page?.size || [ 1, 1 ];

  const thumb = elm.querySelector('img.thumb');
  thumb.src = page?.size ? getBlankImg(pageWidth, pageHeight) : BLANK_SRC;
  const thumbSrc = page ? page.thumbnail || BLANK_SRC : BLANK_SRC;
  thumb.style.setProperty('background-image', `url(${thumbSrc})`);

  const image = elm.querySelector('img.image');
  image.src = BLANK_SRC;
  if (page?.img) {
    image.src = page?.img;
  }

  const svg = elm.querySelector('svg.pageText');
  svg.setAttribute('viewBox', `0 0 ${pageWidth} ${pageHeight}`);

  renderText(svg, page, styles);
}

const uiHandlers = {
  nav_back: {
    onclick: function () {
      console.log('Back button');
    }
  },

  nav_title: {
    render: function (elm) {
      elm.innerText = this.title;
    }
  },

  nav_download: {
    onclick: function () {
      const anchor = document.createElement('a');
      anchor.href = this.download_url;
      anchor.target = '_blank';
      anchor.download = '';
      anchor.click();
    },
    render: function (elm) {
      elm.style.display = this.download_url ? '' : 'none';
    }
  },

  page_number: {
    // TODO: click to edit number!
    render: function (elm) {
      const pair = this.getCurrentPages();
      elm.innerText = pair[1]
        ? `${pair[0].index + 1}-${pair[1].index + 1} / ${this.pages.length}`
        : `${pair[0].index + 1} / ${this.pages.length}`;
    }
  },

  page_progress: {
    render: function (elm) {
      elm.style.width = `${this.progress * 100}%`;
    }
  },

  pager_first: {
    onclick: function () {
      this.gotoFirst();
    }
  },
  pager_last: {
    onclick: function () {
      this.gotoLast();
    }
  },
  pager_next: {
    onclick: function () {
      this.gotoNext();
    }
  },
  pager_prev: {
    onclick: function () {
      this.gotoPrev();
    }
  },

  // current pages
  pages_current_0: {
    render: function (elm) {
      const [ page1, page2 ] = this.getCurrentPages();
      elm.parentNode.classList.toggle('single', !page2);
      renderPage(elm, page1, this.styles);
    }
  },
  pages_current_1: {
    render: function (elm) {
      const [ , page2 ] = this.getCurrentPages();
      renderPage(elm, page2, this.styles);
    }
  },
  // current pages
  pages_next_0: {
    render: function (elm) {
      const [ page1, page2 ] = this.getPagingPages();
      elm.parentNode.classList.toggle('single', !page2);
      renderPage(elm, page1, this.styles);
    }
  },
  pages_next_1: {
    render: function (elm) {
      const [ , page2 ] = this.getPagingPages();
      renderPage(elm, page2, this.styles);
    }
  },

  pages_current: {
    render: function (elm) {
      elm.style.animationDuration = Math.max(0, this.pageDelay + 5) + 'ms';
      elm.classList.toggle('shiftRight', this.isPaging > 0);
      elm.classList.toggle('shiftLeft', this.isPaging < 0);
    }
  },

  pages_next: {
    render: function (elm) {
      elm.style.animationDuration = this.pageDelay + 'ms';
      elm.style.display = (this.isPaging ? '' : 'none');
      elm.classList.toggle('shiftRight', this.isPaging > 0);
      elm.classList.toggle('shiftLeft', this.isPaging < 0);
    }
  },

  page_wrap: {
    init: function (elm) {
      removeWS(elm);
    },
    render: function (elm) {
      elm.classList.toggle('onePage', this.singles);
      elm.classList.toggle('twoPages', !this.singles);
    },
    onmousedown: function () {
      // e.preventDefault();
    },
    ontouchstart: function (e) {
      e.preventDefault();
      touchOrigin = {
        x: e.changedTouches[0].screenX,
        y: e.changedTouches[0].screenY
      };
    },
    ontouchmove: function (e) {
      if (!touchOrigin) { return; }
      const touchX = e.changedTouches[0].screenX;
      const xDist = touchX - touchOrigin.x;
      if (Math.abs(xDist) > 200) {
        e.currentTarget.style.transform = '';
        this.moveStep(-xDist);
        touchOrigin = null;
      }
      else {
        e.currentTarget.style.transform = `translateX(${xDist/10}px)`;
      }
    },
    ontouchend: function (e) {
      if (!touchOrigin) { return; }
      const touchX = e.changedTouches[0].screenX;
      const xDist = touchX - touchOrigin.x;
      e.currentTarget.style.transform = '';
      if (Math.abs(xDist) > 30) {
        this.moveStep(-xDist);
      }
    }
  }
};

function bootstrapUI (book) {
  // allow linking to a specific page
  const hash = location.hash.replace(/^#/, '');
  const searchParams = new URLSearchParams(hash);
  const startPage = searchParams.get('page');
  if (isFinite(startPage)) {
    const p = startPage - 1;
    if (p >= 0 && p < book.pages.length) {
      book.currentPage = p;
      book.isPaging = 0;
    }
  }

  // hook events onto UI elements
  for (const elm of document.querySelectorAll('[id]')) {
    const handler = uiHandlers[elm.id];
    if (handler) {
      let m;
      for (const key of Object.keys(handler)) {
        if (m = /^on(.+)$/.exec(key)) {
          const fn = handler[key].bind(book);
          elm.addEventListener(m[1], fn);
        }
        if (handler.init) {
          handler.init.call(book, elm);
        }
      }
    }
  }

  const mm = window.matchMedia("(orientation: portrait)");
  book.singles = mm.matches;
  mm.addEventListener("change", e => {
    book.singles = e.matches;
    render();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') {
      book.gotoNext();
      e.preventDefault();
    }
    else if (e.key === 'ArrowLeft') {
      book.gotoPrev();
      e.preventDefault();
    }
    else if (e.key === 'Home') {
      book.gotoFirst();
      e.preventDefault();
    }
    else if (e.key === 'End') {
      book.gotoLast();
      e.preventDefault();
    }
  });

  function render () {
    Object.keys(uiHandlers).forEach(key => {
      if (uiHandlers[key]?.render) {
        const elm = document.getElementById(key);
        if (elm) {
          uiHandlers[key].render.call(book, elm);
        }
      }
    });
    // preload pages around the place the user is at
    const showing = book.getCurrentPages();
    const indexes = showing.map(d => d.index);
    const minPage = Math.min(...indexes);
    const maxPage = Math.max(...indexes);
    let buffer = 3;
    for (var i = minPage - buffer; i <= maxPage + buffer; i++) {
      if (book.pages[i]) {
        const img = new Image();
        img.src = book.pages[i].img;
        imageCache.set(img.src, img);
      }
    }
    // TODO: run through the map and delete loaded images?

    // update url to reflect current page
    location.hash = 'page=' + (book.currentPage + 1);
  }
  render();
  book.addEventListener('beforepage', render);
  book.addEventListener('page', render);
}

export async function pager (bookurl) {
  const r = await fetch(bookurl);
  if (!r.ok) {
    console.error('No book info found at:', bookurl);
  }
  const data = await r.json();
  const book = new Book(data, bookurl);
  bootstrapUI(book);
}

