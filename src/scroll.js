(function (root, factory) {

  if (typeof define === "function" && define.amd) {
    define(factory);
  } else if (typeof exports === "object") {
    module.exports = factory();
  } else {
    root.Scroll = factory();
  }

}(this, function () {

  window.MutationObserver = window.MutationObserver
    || window.WebKitMutationObserver
    || window.MozMutationObserver;

  function getScrollBarSize() {
    var el = document.createElement('div');
    el.style.cssText = [
      'position: absolute !important',
      'top: 0 !important',
      'left: 0 !important',
      'z-index: -9 !important',
      'top: 0 !important',
      'left: 0 !important',
      'visibility: hidden !important',
      'opacity: 0 !important',
      'width: 99px !important',
      'height: 99px !important',
      'padding: 0 !important',
      'border: 0 !important',
      'overflow: scroll !important',
      '-ms-overflow-style; scrollbar !important'
    ].join(';');
    document.body.appendChild(el);
    var value = el.offsetWidth - el.clientWidth;
    document.body.removeChild(el);
    return value;
  }

  function addStylesToHead(cssText) {
    var style = document.createElement('style');
    style.textContent = cssText;
    document.head.appendChild(style);
  }

  var innerTemplate = [
    '<div class="scroll__viewport">',
      '<div class="scroll__content">',
      '</div>',
    '</div>',
    '<div class="scroll__bar scroll__bar_v">',
      '<div class="scroll__track scroll__track_v">',
        '<div class="scroll__drag scroll__drag_v"></div>',
      '</div>',
    '</div>',
    '<div class="scroll__bar scroll__bar_h">',
      '<div class="scroll__track scroll__track_h">',
        '<div class="scroll__drag scroll__drag_h"></div>',
      '</div>',
    '</div>'
  ].join('');

  function Scroll(element, options) {
    var self = this;

    var fragment = document.createDocumentFragment();
    while (element.childNodes.length > 0) {
      fragment.appendChild(element.childNodes[0]);
    };
    element.innerHTML = innerTemplate;
    element.classList.add('scroll');

    this.refs = {
      rootElement: element,
      content: element.querySelector('.scroll__content'),
      scrollBarV: element.querySelector('.scroll__bar_v'),
      scrollBarH: element.querySelector('.scroll__bar_h'),
      trackV: element.querySelector('.scroll__track_v'),
      trackH: element.querySelector('.scroll__track_h'),
      dragV: element.querySelector('.scroll__drag_v'),
      dragH: element.querySelector('.scroll__drag_h')
    };

    this.refs.content.appendChild(fragment);

    var scrollBarSize = getScrollBarSize();
    addStylesToHead([
      '.scroll__content {',
        'margin-right:', -1 * scrollBarSize + 'px;',
        'margin-bottom:', -1 * scrollBarSize + 'px;',
      '}'
    ].join(''));

    [
      'onContentScroll',
      'onStartV',
      'onStartH',
      'onEnd',
      'onPointerMove',
      'update'
    ].forEach(function(method) {
      self[method] = self[method].bind(self);
    });

    this.refs.content.addEventListener('scroll', this.onContentScroll);
    this.refs.dragV.addEventListener('mousedown', this.onStartV);
    this.refs.dragH.addEventListener('mousedown', this.onStartH);
    document.addEventListener('mouseleave', this.onEnd);
    window.addEventListener('resize', this.update);
    this.update();

    if (MutationObserver) {
      var mo = new MutationObserver(function() {
        self.update();
      });
      mo.observe(element, {
        childList: true,
        characterData: true,
        subtree: true,
      });
      this.mo = mo;
    };

    if (ResizeObserver) {
      var ro = new ResizeObserver(function(records) {
        self.update();
      });
      ro.observe(element);
      this.ro = ro;
    }
  }

  Scroll.prototype.update = function() {
    var rootElement = this.refs.rootElement,
      content = this.refs.content,
      trackV = this.refs.trackV,
      trackH = this.refs.trackH,
      dragV = this.refs.dragV,
      dragH = this.refs.dragH;

    var overflowV = content.scrollHeight > content.clientHeight;
    var factorV = content.clientHeight / content.scrollHeight;
    dragV.style.height = factorV * trackV.offsetHeight + 'px';
    var actionV = !!overflowV ? 'add' : 'remove';
    rootElement.classList[actionV]('scroll_overflow_v');

    var overflowH = content.scrollWidth > content.clientWidth;
    var factorH = content.clientWidth / content.scrollWidth;
    dragH.style.width = factorH * trackH.offsetWidth + 'px';
    var actionH = !!overflowH ? 'add' : 'remove';
    rootElement.classList[actionH]('scroll_overflow_h');

    this.vCoef = (trackV.offsetHeight - dragV.offsetHeight) / (content.scrollHeight - content.clientHeight);
    this.hCoef = (trackH.offsetWidth - dragH.offsetWidth) / (content.scrollWidth - content.clientWidth);
  };

  Scroll.prototype.onContentScroll = function() {
    var vCoef = this.vCoef;
    var hCoef = this.hCoef;

    var content = this.refs.content,
      dragV = this.refs.dragV,
      dragH = this.refs.dragH;

    var scrollLeft = content.scrollLeft;
    var scrollTop = content.scrollTop;
    dragV.style.transform = 'translateY(' + (vCoef * scrollTop) + 'px)';
    dragH.style.transform = 'translateX(' + (hCoef * scrollLeft) + 'px)';
  };

  Scroll.prototype.onStartV = function(e) {
    this.dragMode = 'v';
    this.startV = e.clientY;
    document.addEventListener('mousemove', this.onPointerMove);
    document.addEventListener('mouseup', this.onEnd);
    e.preventDefault();
  };

  Scroll.prototype.onStartH = function(e) {
    this.dragMode = 'h';
    this.startH = e.clientX;
    document.addEventListener('mousemove', this.onPointerMove);
    document.addEventListener('mouseup', this.onEnd);
    e.preventDefault();
  };

  Scroll.prototype.onEnd = function() {
    document.removeEventListener('mousemove', this.onPointerMove);
    document.removeEventListener('mouseup', this.onEnd);
    this.draMode = null;
  };

  Scroll.prototype.onPointerMove = function(e) {
    var vCoef = this.vCoef;
    var hCoef = this.hCoef;
    var content = this.refs.content;

    var v = e.deltaY && e.deltaY * e.deltaFactor || e.clientY;
    var h = e.deltaX && e.deltaX * e.deltaFactor || e.clientX;
    var diffV = v - this.startV;
    var diffH = h - this.startH;

    this.startV += diffV;
    this.startH += diffH;

    if (this.dragMode === 'v') {
      content.scrollTop += diffV / vCoef;
    }
    if (this.dragMode === 'h') {
      content.scrollLeft += diffH / hCoef;
    }
  };

  Scroll.prototype.destroy = function() {}

  return Scroll;
}));