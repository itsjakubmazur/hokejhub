function _extends() {
  return (_extends =
    Object.assign ||
    function (d) {
      for (var b = 1; b < arguments.length; b++) {
        var a,
          c = arguments[b];
        for (a in c) Object.prototype.hasOwnProperty.call(c, a) && (d[a] = c[a]);
      }
      return d;
    }).apply(this, arguments);
}
function _typeof(a) {
  return (_typeof =
    'function' == typeof Symbol && 'symbol' == typeof Symbol.iterator
      ? function (a) {
          return typeof a;
        }
      : function (a) {
          return a &&
            'function' == typeof Symbol &&
            a.constructor === Symbol &&
            a !== Symbol.prototype
            ? 'symbol'
            : typeof a;
        })(a);
}
!(function (b, a) {
  'object' === ('undefined' == typeof exports ? 'undefined' : _typeof(exports)) &&
  'undefined' != typeof module
    ? (module.exports = a())
    : 'function' == typeof define && define.amd
    ? define(a)
    : ((b = b || self).LazyLoad = a());
})(this, function () {
  'use strict';
  function d(a, d) {
    var b,
      c = 'LazyLoad::Initialized',
      a = new a(d);
    try {
      b = new CustomEvent(c, { detail: { instance: a } });
    } catch (e) {
      (b = document.createEvent('CustomEvent')).initCustomEvent(c, !1, !1, { instance: a });
    }
    window.dispatchEvent(b);
  }
  var a = 'undefined' != typeof window,
    h =
      (a && !('onscroll' in window)) ||
      ('undefined' != typeof navigator &&
        /(gle|ing|ro)bot|crawl|spider/i.test(navigator.userAgent)),
    i = a && 'IntersectionObserver' in window,
    j = a && 'classList' in document.createElement('p'),
    k = {
      elements_selector: 'img',
      container: h || a ? document : null,
      threshold: 300,
      thresholds: null,
      data_src: 'src',
      data_srcset: 'srcset',
      data_sizes: 'sizes',
      data_bg: 'bg',
      data_poster: 'poster',
      class_loading: 'loading',
      class_loaded: 'loaded',
      class_error: 'error',
      load_delay: 0,
      auto_unobserve: !0,
      callback_enter: null,
      callback_exit: null,
      callback_reveal: null,
      callback_loaded: null,
      callback_error: null,
      callback_finish: null,
      use_native: !1,
    };
  function l(b, a, c) {
    (a = x + a), null !== c ? b.setAttribute(a, c) : b.removeAttribute(a);
  }
  function m(a, b) {
    (a.loadingCount += b),
      0 === a._elements.length && 0 === a.loadingCount && F(a._settings.callback_finish, a);
  }
  function n(d) {
    for (var a, b = [], c = 0; (a = d.children[c]); c += 1) 'SOURCE' === a.tagName && b.push(a);
    return b;
  }
  function o(a, b) {
    G(a, 'sizes', B(a, b.data_sizes)),
      G(a, 'srcset', B(a, b.data_srcset)),
      G(a, 'src', B(a, b.data_src));
  }
  function p(a, b) {
    j
      ? a.classList.remove(b)
      : (a.className = a.className
          .replace(new RegExp('(^|\\s+)' + b + '(\\s+|$)'), ' ')
          .replace(/^\s+/, '')
          .replace(/\s+$/, ''));
  }
  function q(a, b, c) {
    a.addEventListener(b, c);
  }
  function r(a, b, c) {
    a.removeEventListener(b, c);
  }
  function s(a, b, c) {
    r(a, K, b), r(a, _, b), r(a, L, c);
  }
  function t(a, c, d) {
    var b = d._settings,
      e = c ? b.class_loaded : b.class_error,
      c = c ? b.callback_loaded : b.callback_error,
      a = a.target;
    p(a, b.class_loading), J(a, e), F(c, a, d), m(d, -1);
  }
  function u(b, c) {
    var a = c._settings.load_delay;
    E(b) ||
      ((a = setTimeout(function () {
        P(b, c), R(b);
      }, a)),
      D(b, a));
  }
  function v(a, b, d) {
    var c = b._settings;
    (!d && C(a)) ||
      (-1 < N.indexOf(a.tagName) && (M(a, b), J(a, c.class_loading)),
      I(a, b),
      $(a),
      F(c.callback_reveal, a, b),
      F(c.callback_set, a, b));
  }
  function w(a, b) {
    return (
      (a = a || b.container.querySelectorAll(b.elements_selector)),
      Array.prototype.slice.call(a).filter(function (a) {
        return !C(a);
      })
    );
  }
  function c(c, d) {
    var b, e;
    (this._settings = _extends({}, k, c)),
      (this.loadingCount = 0),
      (b = this),
      i &&
        (b._observer = new IntersectionObserver(function (a) {
          a.forEach(function (a) {
            return (S(a) ? O : Q)(a.target, a, b);
          });
        }, T(b._settings))),
      this.update(d),
      (e = this),
      a &&
        window.addEventListener('online', function (a) {
          V(e);
        });
  }
  var x = 'data-',
    y = 'was-processed',
    z = 'll-timeout',
    A = 'true',
    B = function (a, b) {
      return a.getAttribute(x + b);
    },
    $ = function (a) {
      return l(a, y, A);
    },
    C = function (a) {
      return B(a, y) === A;
    },
    D = function (a, b) {
      return l(a, z, b);
    },
    E = function (a) {
      return B(a, z);
    },
    F = function (a, b, c, d) {
      a && (void 0 === d ? (void 0 === c ? a(b) : a(b, c)) : a(b, c, d));
    },
    G = function (b, c, a) {
      a && b.setAttribute(c, a);
    },
    H = {
      IMG: function (b, c) {
        var a = b.parentNode;
        a &&
          'PICTURE' === a.tagName &&
          n(a).forEach(function (a) {
            o(a, c);
          }),
          o(b, c);
      },
      IFRAME: function (a, b) {
        G(a, 'src', B(a, b.data_src));
      },
      VIDEO: function (a, b) {
        n(a).forEach(function (a) {
          G(a, 'src', B(a, b.data_src));
        }),
          G(a, 'poster', B(a, b.data_poster)),
          G(a, 'src', B(a, b.data_src)),
          a.load();
      },
    },
    I = function (c, b) {
      var e,
        d = b._settings,
        a = c.tagName,
        a = H[a];
      if (a)
        return (
          a(c, d),
          m(b, 1),
          void (b._elements =
            ((a = b._elements),
            (e = c),
            a.filter(function (a) {
              return a !== e;
            })))
        );
      (c = B((b = c), (a = d).data_src)),
        (a = B(b, a.data_bg)),
        c && (b.style.backgroundImage = 'url("'.concat(c, '")')),
        a && (b.style.backgroundImage = a);
    },
    J = function (a, b) {
      j ? a.classList.add(b) : (a.className += (a.className ? ' ' : '') + b);
    },
    K = 'load',
    _ = 'loadeddata',
    L = 'error',
    M = function (d, g) {
      function e(a) {
        t(a, !1, g), s(d, f, e);
      }
      var a,
        b,
        c,
        f = function a(b) {
          t(b, !0, g), s(d, a, e);
        };
      (c = e), q((a = d), K, (b = f)), q(a, _, b), q(a, L, c);
    },
    N = ['IMG', 'IFRAME', 'VIDEO'],
    O = function (b, d, a) {
      var c = a._settings;
      F(c.callback_enter, b, d, a), (c.load_delay ? u : P)(b, a);
    },
    P = function (b, a) {
      var c = a._observer;
      v(b, a), c && a._settings.auto_unobserve && c.unobserve(b);
    },
    Q = function (a, d, b) {
      var c = b._settings;
      F(c.callback_exit, a, d, b), c.load_delay && R(a);
    },
    R = function (a) {
      var b = E(a);
      b && (clearTimeout(b), D(a, null));
    },
    S = function (a) {
      return a.isIntersecting || 0 < a.intersectionRatio;
    },
    T = function (a) {
      return {
        root: a.container === document ? null : a.container,
        rootMargin: a.thresholds || a.threshold + 'px',
      };
    },
    U = ['IMG', 'IFRAME'],
    V = function (a) {
      var b = a._settings;
      b.container.querySelectorAll('.' + b.class_error).forEach(function (a) {
        p(a, b.class_error), l(a, y, null);
      }),
        a.update();
    };
  if (
    ((c.prototype = {
      update: function (b) {
        var c,
          d = this,
          a = this._settings;
        (this._elements = w(b, a)),
          !h && this._observer
            ? (a.use_native &&
                'loading' in HTMLImageElement.prototype &&
                ((c = this)._elements.forEach(function (a) {
                  -1 !== U.indexOf(a.tagName) && (a.setAttribute('loading', 'lazy'), v(a, c));
                }),
                (this._elements = w(b, a))),
              this._elements.forEach(function (a) {
                d._observer.observe(a);
              }))
            : this.loadAll();
      },
      destroy: function () {
        var a = this;
        this._observer &&
          (this._elements.forEach(function (b) {
            a._observer.unobserve(b);
          }),
          (this._observer = null)),
          (this._elements = null),
          (this._settings = null);
      },
      load: function (a, b) {
        v(a, this, b);
      },
      loadAll: function () {
        var a = this;
        this._elements.forEach(function (b) {
          P(b, a);
        });
      },
    }),
    a)
  ) {
    var e = c,
      b = window.lazyLoadOptions;
    if (b) {
      if (b.length) for (var f, g = 0; (f = b[g]); g += 1) d(e, f);
      else d(e, b);
    }
  }
  return c;
}),
  window.Element &&
    !Element.prototype.closest &&
    (Element.prototype.closest = function (d) {
      var a,
        c = (this.document || this.ownerDocument).querySelectorAll(d),
        b = this;
      do for (a = c.length; 0 <= --a && c.item(a) !== b; );
      while (a < 0 && (b = b.parentElement));
      return b;
    }),
  (function () {
    function a(c, a) {
      a = a || { bubbles: !1, cancelable: !1, detail: void 0 };
      var b = document.createEvent('CustomEvent');
      return b.initCustomEvent(c, a.bubbles, a.cancelable, a.detail), b;
    }
    'function' != typeof window.CustomEvent &&
      ((a.prototype = window.Event.prototype), (window.CustomEvent = a));
  })(),
  (function () {
    for (
      var c = 0, b = ['ms', 'moz', 'webkit', 'o'], a = 0;
      a < b.length && !window.requestAnimationFrame;
      ++a
    )
      (window.requestAnimationFrame = window[b[a] + 'RequestAnimationFrame']),
        (window.cancelAnimationFrame =
          window[b[a] + 'CancelAnimationFrame'] || window[b[a] + 'CancelRequestAnimationFrame']);
    window.requestAnimationFrame ||
      (window.requestAnimationFrame = function (e, f) {
        var a = new Date().getTime(),
          b = Math.max(0, 16 - (a - c)),
          d = window.setTimeout(function () {
            e(a + b);
          }, b);
        return (c = a + b), d;
      }),
      window.cancelAnimationFrame ||
        (window.cancelAnimationFrame = function (a) {
          clearTimeout(a);
        });
  })(),
  (function (a, b) {
    'function' == typeof define && define.amd
      ? define([], function () {
          return b(a);
        })
      : 'object' == typeof exports
      ? (module.exports = b(a))
      : (a.SmoothScroll = b(a));
  })(
    'undefined' != typeof global ? global : 'undefined' != typeof window ? window : this,
    function (a) {
      'use strict';
      function b() {
        var a = {};
        return (
          Array.prototype.forEach.call(arguments, function (b) {
            for (var c in b) {
              if (!b.hasOwnProperty(c)) return;
              a[c] = b[c];
            }
          }),
          a
        );
      }
      function c(d) {
        '#' === d.charAt(0) && (d = d.substr(1));
        for (var a, c = String(d), f = c.length, b = -1, e = '', g = c.charCodeAt(0); ++b < f; ) {
          if (0 === (a = c.charCodeAt(b)))
            throw new InvalidCharacterError('Invalid character: the input contains U+0000.');
          e +=
            (1 <= a && a <= 31) ||
            127 == a ||
            (0 === b && 48 <= a && a <= 57) ||
            (1 === b && 48 <= a && a <= 57 && 45 === g)
              ? '\\' + a.toString(16) + ' '
              : 128 <= a ||
                45 === a ||
                95 === a ||
                (48 <= a && a <= 57) ||
                (65 <= a && a <= 90) ||
                (97 <= a && a <= 122)
              ? c.charAt(b)
              : '\\' + c.charAt(b);
        }
        return '#' + e;
      }
      function d() {
        return Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.offsetHeight,
          document.body.clientHeight,
          document.documentElement.clientHeight,
        );
      }
      function e(b, c, d) {
        0 === b && document.body.focus(),
          d ||
            (b.focus(),
            document.activeElement !== b &&
              (b.setAttribute('tabindex', '-1'), b.focus(), (b.style.outline = 'none')),
            a.scrollTo(0, c));
      }
      function f(c, b, d, e) {
        b.emitEvents &&
          'function' == typeof a.CustomEvent &&
          ((b = new CustomEvent(c, { bubbles: !0, detail: { anchor: d, toggle: e } })),
          document.dispatchEvent(b));
      }
      var g = {
        ignore: '[data-scroll-ignore]',
        header: null,
        topOnEmptyHash: !0,
        speed: 500,
        speedAsDuration: !1,
        durationMax: null,
        durationMin: null,
        clip: !0,
        offset: 0,
        easing: 'easeInOutCubic',
        customEasing: null,
        updateURL: !0,
        popstate: !0,
        emitEvents: !0,
      };
      return function (n, j) {
        function k(b) {
          var e, d, f;
          if (
            !b.defaultPrevented &&
            !(0 !== b.button || b.metaKey || b.ctrlKey || b.shiftKey) &&
            'closest' in b.target &&
            (o = b.target.closest(n)) &&
            'a' === o.tagName.toLowerCase() &&
            !b.target.closest(h.ignore) &&
            o.hostname === a.location.hostname &&
            o.pathname === a.location.pathname &&
            /#/.test(o.href)
          ) {
            try {
              d = c(decodeURIComponent(o.hash));
            } catch (g) {
              d = c(o.hash);
            }
            if ('#' === d) {
              if (!h.topOnEmptyHash) return;
              e = document.documentElement;
            } else e = document.querySelector(d);
            (e = e || '#top' !== d ? e : document.documentElement) &&
              (b.preventDefault(),
              (d = h),
              history.replaceState &&
                d.updateURL &&
                !history.state &&
                ((f = (f = a.location.hash) || ''),
                history.replaceState(
                  { smoothScroll: JSON.stringify(d), anchor: f || a.pageYOffset },
                  document.title,
                  f || a.location.href,
                )),
              i.animateScroll(e, o));
          }
        }
        function l(b) {
          var a;
          null === history.state ||
            !history.state.smoothScroll ||
            history.state.smoothScroll !== JSON.stringify(h) ||
            (('string' != typeof (a = history.state.anchor) ||
              !a ||
              (a = document.querySelector(c(history.state.anchor)))) &&
              i.animateScroll(a, null, { updateURL: !1 }));
        }
        var h,
          o,
          m,
          p,
          i = {
            cancelScroll: function (a) {
              cancelAnimationFrame(p), (p = null), a || f('scrollCancel', h);
            },
          };
        if (
          ((i.animateScroll = function (l, o, c) {
            i.cancelScroll();
            var q,
              x,
              y,
              r,
              s,
              u,
              v,
              w,
              t,
              k,
              j = b(h || g, c || {}),
              n = '[object Number]' === Object.prototype.toString.call(l),
              c = n || !l.tagName ? null : l;
            (n || c) &&
              ((q = a.pageYOffset),
              j.header && !m && (m = document.querySelector(j.header)),
              (k = (k = m) ? parseInt(a.getComputedStyle(k).height, 10) + k.offsetTop : 0),
              (s =
                (r = n
                  ? l
                  : (function (c, e, f, g) {
                      var b = 0;
                      if (c.offsetParent) for (; (b += c.offsetTop), (c = c.offsetParent); );
                      return (
                        (b = Math.max(b - e - f, 0)), (b = g ? Math.min(b, d() - a.innerHeight) : b)
                      );
                    })(
                      c,
                      k,
                      parseInt('function' == typeof j.offset ? j.offset(l, o) : j.offset, 10),
                      j.clip,
                    )) - q),
              (u = d()),
              (v = 0),
              (k = (c = j).speedAsDuration ? c.speed : Math.abs((s / 1e3) * c.speed)),
              (w =
                c.durationMax && k > c.durationMax
                  ? c.durationMax
                  : c.durationMin && k < c.durationMin
                  ? c.durationMin
                  : parseInt(k, 10)),
              (t = function (d) {
                var c, b;
                (v += d - (x = x || d)),
                  (y =
                    q +
                    s *
                      ((b = y = 1 < (y = 0 === w ? 0 : v / w) ? 1 : y),
                      'easeInQuad' === j.easing && (c = b * b),
                      'easeOutQuad' === j.easing && (c = b * (2 - b)),
                      'easeInOutQuad' === j.easing &&
                        (c = b < 0.5 ? 2 * b * b : (4 - 2 * b) * b - 1),
                      'easeInCubic' === j.easing && (c = b * b * b),
                      'easeOutCubic' === j.easing && (c = --b * b * b + 1),
                      'easeInOutCubic' === j.easing &&
                        (c = b < 0.5 ? 4 * b * b * b : (b - 1) * (2 * b - 2) * (2 * b - 2) + 1),
                      'easeInQuart' === j.easing && (c = b * b * b * b),
                      'easeOutQuart' === j.easing && (c = 1 - --b * b * b * b),
                      'easeInOutQuart' === j.easing &&
                        (c = b < 0.5 ? 8 * b * b * b * b : 1 - 8 * --b * b * b * b),
                      'easeInQuint' === j.easing && (c = b * b * b * b * b),
                      'easeOutQuint' === j.easing && (c = 1 + --b * b * b * b * b),
                      'easeInOutQuint' === j.easing &&
                        (c = b < 0.5 ? 16 * b * b * b * b * b : 1 + 16 * --b * b * b * b * b),
                      (c = j.customEasing ? j.customEasing(b) : c) || b)),
                  a.scrollTo(0, Math.floor(y)),
                  (c = r),
                  (b = a.pageYOffset),
                  ((y == c || b == c || (q < c && a.innerHeight + b) >= u) &&
                    (i.cancelScroll(!0),
                    e(l, c, n),
                    f('scrollStop', j, l, o),
                    (p = x = null),
                    1)) ||
                    ((p = a.requestAnimationFrame(t)), (x = d));
              }),
              0 === a.pageYOffset && a.scrollTo(0, 0),
              (c = l),
              n ||
                (history.pushState &&
                  j.updateURL &&
                  history.pushState(
                    { smoothScroll: JSON.stringify(j), anchor: c.id },
                    document.title,
                    c === document.documentElement ? '#top' : '#' + c.id,
                  )),
              'matchMedia' in a && a.matchMedia('(prefers-reduced-motion)').matches
                ? e(l, Math.floor(r), !1)
                : (f('scrollStart', j, l, o), i.cancelScroll(!0), a.requestAnimationFrame(t)));
          }),
          (i.destroy = function () {
            h &&
              (document.removeEventListener('click', k, !1),
              a.removeEventListener('popstate', l, !1),
              i.cancelScroll(),
              (p = m = o = h = null));
          }),
          !(
            'querySelector' in document &&
            'addEventListener' in a &&
            'requestAnimationFrame' in a &&
            'closest' in a.Element.prototype
          ))
        )
          throw 'Smooth Scroll: This browser does not support the required JavaScript methods and browser APIs.';
        return (
          i.destroy(),
          (m = (h = b(g, j || {})).header ? document.querySelector(h.header) : null),
          document.addEventListener('click', k, !1),
          h.updateURL && h.popstate && a.addEventListener('popstate', l, !1),
          i
        );
      };
    },
  ),
  (function (b, a) {
    'object' == typeof exports && 'undefined' != typeof module
      ? (module.exports = a())
      : 'function' == typeof define && define.amd
      ? define(a)
      : ((b = 'undefined' != typeof globalThis ? globalThis : b || self).Swiper = a());
  })(this, function () {
    'use strict';
    function g(a) {
      return null !== a && 'object' == typeof a && 'constructor' in a && a.constructor === Object;
    }
    function h(b, a) {
      void 0 === b && (b = {}),
        void 0 === a && (a = {}),
        Object.keys(a).forEach((c) => {
          void 0 === b[c]
            ? (b[c] = a[c])
            : g(a[c]) && g(b[c]) && 0 < Object.keys(a[c]).length && h(b[c], a[c]);
        });
    }
    let b = {
      body: {},
      addEventListener() {},
      removeEventListener() {},
      activeElement: { blur() {}, nodeName: '' },
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      createEvent: () => ({ initEvent() {} }),
      createElement: () => ({
        children: [],
        childNodes: [],
        style: {},
        setAttribute() {},
        getElementsByTagName: () => [],
      }),
      createElementNS: () => ({}),
      importNode: () => null,
      location: {
        hash: '',
        host: '',
        hostname: '',
        href: '',
        origin: '',
        pathname: '',
        protocol: '',
        search: '',
      },
    };
    function i() {
      var a = 'undefined' != typeof document ? document : {};
      return h(a, b), a;
    }
    let j = {
      document: b,
      navigator: { userAgent: '' },
      location: {
        hash: '',
        host: '',
        hostname: '',
        href: '',
        origin: '',
        pathname: '',
        protocol: '',
        search: '',
      },
      history: { replaceState() {}, pushState() {}, go() {}, back() {} },
      CustomEvent: function () {
        return this;
      },
      addEventListener() {},
      removeEventListener() {},
      getComputedStyle: () => ({ getPropertyValue: () => '' }),
      Image() {},
      Date() {},
      screen: {},
      setTimeout() {},
      clearTimeout() {},
      matchMedia: () => ({}),
      requestAnimationFrame: (a) =>
        'undefined' == typeof setTimeout ? (a(), null) : setTimeout(a, 0),
      cancelAnimationFrame(a) {
        'undefined' != typeof setTimeout && clearTimeout(a);
      },
    };
    function k() {
      var a = 'undefined' != typeof window ? window : {};
      return h(a, j), a;
    }
    class c extends Array {
      constructor(a) {
        if ('number' == typeof a) super(a);
        else {
          super(...(a || []));
          {
            a = this;
            let b = a.__proto__;
            Object.defineProperty(a, '__proto__', {
              get: () => b,
              set(a) {
                b.__proto__ = a;
              },
            });
          }
        }
      }
    }
    function l(a) {
      let b = [];
      return (
        (a = void 0 === a ? [] : a).forEach((a) => {
          Array.isArray(a) ? b.push(...l(a)) : b.push(a);
        }),
        b
      );
    }
    function m(a, b) {
      return Array.prototype.filter.call(a, b);
    }
    function d(a, j) {
      let l = k(),
        f = i(),
        d = [];
      if (!j && a instanceof c) return a;
      if (!a) return new c(d);
      if ('string' == typeof a) {
        let b = a.trim();
        if (0 <= b.indexOf('<') && 0 <= b.indexOf('>')) {
          let e = 'div';
          0 === b.indexOf('<li') && (e = 'ul'),
            0 === b.indexOf('<tr') && (e = 'tbody'),
            (0 !== b.indexOf('<td') && 0 !== b.indexOf('<th')) || (e = 'tr'),
            0 === b.indexOf('<tbody') && (e = 'table'),
            0 === b.indexOf('<option') && (e = 'select');
          let g = f.createElement(e);
          g.innerHTML = b;
          for (let h = 0; h < g.childNodes.length; h += 1) d.push(g.childNodes[h]);
        } else
          d = (function (a, e) {
            if ('string' != typeof a) return [a];
            let c = [],
              d = e.querySelectorAll(a);
            for (let b = 0; b < d.length; b += 1) c.push(d[b]);
            return c;
          })(a.trim(), j || f);
      } else if (a.nodeType || a === l || a === f) d.push(a);
      else if (Array.isArray(a)) {
        if (a instanceof c) return a;
        d = a;
      }
      return new c(
        (function (b) {
          let c = [];
          for (let a = 0; a < b.length; a += 1) -1 === c.indexOf(b[a]) && c.push(b[a]);
          return c;
        })(d),
      );
    }
    d.fn = c.prototype;
    let e = {
      addClass: function () {
        for (var b = arguments.length, c = new Array(b), a = 0; a < b; a++) c[a] = arguments[a];
        let d = l(c.map((a) => a.split(' ')));
        return (
          this.forEach((a) => {
            a.classList.add(...d);
          }),
          this
        );
      },
      removeClass: function () {
        for (var b = arguments.length, c = new Array(b), a = 0; a < b; a++) c[a] = arguments[a];
        let d = l(c.map((a) => a.split(' ')));
        return (
          this.forEach((a) => {
            a.classList.remove(...d);
          }),
          this
        );
      },
      hasClass: function () {
        for (var b = arguments.length, c = new Array(b), a = 0; a < b; a++) c[a] = arguments[a];
        let d = l(c.map((a) => a.split(' ')));
        return 0 < m(this, (a) => 0 < d.filter((b) => a.classList.contains(b)).length).length;
      },
      toggleClass: function () {
        for (var b = arguments.length, c = new Array(b), a = 0; a < b; a++) c[a] = arguments[a];
        let d = l(c.map((a) => a.split(' ')));
        this.forEach((a) => {
          d.forEach((b) => {
            a.classList.toggle(b);
          });
        });
      },
      attr: function (a, d) {
        if (1 === arguments.length && 'string' == typeof a)
          return this[0] ? this[0].getAttribute(a) : void 0;
        for (let b = 0; b < this.length; b += 1)
          if (2 === arguments.length) this[b].setAttribute(a, d);
          else for (let c in a) (this[b][c] = a[c]), this[b].setAttribute(c, a[c]);
        return this;
      },
      removeAttr: function (b) {
        for (let a = 0; a < this.length; a += 1) this[a].removeAttribute(b);
        return this;
      },
      transform: function (b) {
        for (let a = 0; a < this.length; a += 1) this[a].style.transform = b;
        return this;
      },
      transition: function (a) {
        for (let b = 0; b < this.length; b += 1)
          this[b].style.transitionDuration = 'string' != typeof a ? a + 'ms' : a;
        return this;
      },
      on: function () {
        for (var l = arguments.length, e = new Array(l), f = 0; f < l; f++) e[f] = arguments[f];
        let [m, n, j, c] = e;
        function o(a) {
          var b = a.target;
          if (b) {
            let c = a.target.dom7EventData || [];
            if ((0 > c.indexOf(a) && c.unshift(a), d(b).is(n))) j.apply(b, c);
            else {
              let f = d(b).parents();
              for (let e = 0; e < f.length; e += 1) d(f[e]).is(n) && j.apply(f[e], c);
            }
          }
        }
        function p(a) {
          let b = (a && a.target && a.target.dom7EventData) || [];
          0 > b.indexOf(a) && b.unshift(a), j.apply(this, b);
        }
        'function' == typeof e[1] && (([m, j, c] = e), (n = void 0)), (c = c || !1);
        var g = m.split(' ');
        let b;
        for (let k = 0; k < this.length; k += 1) {
          let a = this[k];
          if (n)
            for (b = 0; b < g.length; b += 1) {
              let h = g[b];
              a.dom7LiveListeners || (a.dom7LiveListeners = {}),
                a.dom7LiveListeners[h] || (a.dom7LiveListeners[h] = []),
                a.dom7LiveListeners[h].push({ listener: j, proxyListener: o }),
                a.addEventListener(h, o, c);
            }
          else
            for (b = 0; b < g.length; b += 1) {
              let i = g[b];
              a.dom7Listeners || (a.dom7Listeners = {}),
                a.dom7Listeners[i] || (a.dom7Listeners[i] = []),
                a.dom7Listeners[i].push({ listener: j, proxyListener: p }),
                a.addEventListener(i, p, c);
            }
        }
        return this;
      },
      off: function () {
        for (var m = arguments.length, e = new Array(m), f = 0; f < m; f++) e[f] = arguments[f];
        let [n, i, b, g] = e;
        'function' == typeof e[1] && (([n, b, g] = e), (i = void 0)), (g = g || !1);
        var o = n.split(' ');
        for (let j = 0; j < o.length; j += 1) {
          let k = o[j];
          for (let l = 0; l < this.length; l += 1) {
            let c = this[l],
              a;
            if (
              (!i && c.dom7Listeners
                ? (a = c.dom7Listeners[k])
                : i && c.dom7LiveListeners && (a = c.dom7LiveListeners[k]),
              a && a.length)
            )
              for (let h = a.length - 1; 0 <= h; --h) {
                let d = a[h];
                (!(
                  (b && d.listener === b) ||
                  (b && d.listener && d.listener.dom7proxy && d.listener.dom7proxy === b)
                ) &&
                  b) ||
                  (c.removeEventListener(k, d.proxyListener, g), a.splice(h, 1));
              }
          }
        }
        return this;
      },
      trigger: function () {
        let f = k();
        for (var g = arguments.length, a = new Array(g), b = 0; b < g; b++) a[b] = arguments[b];
        let h = a[0].split(' '),
          i = a[1];
        for (let d = 0; d < h.length; d += 1) {
          let j = h[d];
          for (let e = 0; e < this.length; e += 1) {
            let c = this[e];
            if (f.CustomEvent) {
              let l = new f.CustomEvent(j, { detail: i, bubbles: !0, cancelable: !0 });
              (c.dom7EventData = a.filter((b, a) => 0 < a)),
                c.dispatchEvent(l),
                (c.dom7EventData = []),
                delete c.dom7EventData;
            }
          }
        }
        return this;
      },
      transitionEnd: function (a) {
        let b = this;
        return (
          a &&
            b.on('transitionend', function d(c) {
              c.target === this && (a.call(this, c), b.off('transitionend', d));
            }),
          this
        );
      },
      outerWidth: function (b) {
        if (0 < this.length) {
          if (b) {
            let a = this.styles();
            return (
              this[0].offsetWidth +
              parseFloat(a.getPropertyValue('margin-right')) +
              parseFloat(a.getPropertyValue('margin-left'))
            );
          }
          return this[0].offsetWidth;
        }
        return null;
      },
      outerHeight: function (b) {
        if (0 < this.length) {
          if (b) {
            let a = this.styles();
            return (
              this[0].offsetHeight +
              parseFloat(a.getPropertyValue('margin-top')) +
              parseFloat(a.getPropertyValue('margin-bottom'))
            );
          }
          return this[0].offsetHeight;
        }
        return null;
      },
      styles: function () {
        let a = k();
        return this[0] ? a.getComputedStyle(this[0], null) : {};
      },
      offset: function () {
        if (0 < this.length) {
          let b = k(),
            e = i(),
            a = this[0],
            c = a.getBoundingClientRect(),
            d = e.body,
            f = a.clientTop || d.clientTop || 0,
            g = a.clientLeft || d.clientLeft || 0,
            h = a === b ? b.scrollY : a.scrollTop,
            j = a === b ? b.scrollX : a.scrollLeft;
          return { top: c.top + h - f, left: c.left + j - g };
        }
        return null;
      },
      css: function (b, d) {
        let e = k(),
          a;
        if (1 === arguments.length) {
          if ('string' != typeof b) {
            for (a = 0; a < this.length; a += 1) for (let c in b) this[a].style[c] = b[c];
            return this;
          }
          if (this[0]) return e.getComputedStyle(this[0], null).getPropertyValue(b);
        }
        if (2 !== arguments.length || 'string' != typeof b) return this;
        for (a = 0; a < this.length; a += 1) this[a].style[b] = d;
        return this;
      },
      each: function (a) {
        return (
          a &&
            this.forEach((b, c) => {
              a.apply(b, [b, c]);
            }),
          this
        );
      },
      html: function (b) {
        if (void 0 === b) return this[0] ? this[0].innerHTML : null;
        for (let a = 0; a < this.length; a += 1) this[a].innerHTML = b;
        return this;
      },
      text: function (b) {
        if (void 0 === b) return this[0] ? this[0].textContent.trim() : null;
        for (let a = 0; a < this.length; a += 1) this[a].textContent = b;
        return this;
      },
      is: function (a) {
        let g = k(),
          h = i(),
          b = this[0],
          f,
          e;
        if (!b || void 0 === a) return !1;
        if ('string' == typeof a) {
          if (b.matches) return b.matches(a);
          if (b.webkitMatchesSelector) return b.webkitMatchesSelector(a);
          if (b.msMatchesSelector) return b.msMatchesSelector(a);
          for (f = d(a), e = 0; e < f.length; e += 1) if (f[e] === b) return !0;
          return !1;
        }
        if (a === h) return b === h;
        if (a === g) return b === g;
        if (a.nodeType || a instanceof c) {
          for (f = a.nodeType ? [a] : a, e = 0; e < f.length; e += 1) if (f[e] === b) return !0;
        }
        return !1;
      },
      index: function () {
        let b,
          a = this[0];
        if (a) {
          for (b = 0; null !== (a = a.previousSibling); ) 1 === a.nodeType && (b += 1);
          return b;
        }
      },
      eq: function (a) {
        if (void 0 === a) return this;
        var b = this.length;
        return d(b - 1 < a ? [] : a < 0 ? ((b += a) < 0 ? [] : [this[b]]) : [this[a]]);
      },
      append: function () {
        var a;
        let g = i();
        for (let b = 0; b < arguments.length; b += 1) {
          a = b < 0 || arguments.length <= b ? void 0 : arguments[b];
          for (let d = 0; d < this.length; d += 1)
            if ('string' == typeof a) {
              let e = g.createElement('div');
              for (e.innerHTML = a; e.firstChild; ) this[d].appendChild(e.firstChild);
            } else if (a instanceof c)
              for (let f = 0; f < a.length; f += 1) this[d].appendChild(a[f]);
            else this[d].appendChild(a);
        }
        return this;
      },
      prepend: function (d) {
        let f = i(),
          a,
          b;
        for (a = 0; a < this.length; a += 1)
          if ('string' == typeof d) {
            let e = f.createElement('div');
            for (e.innerHTML = d, b = e.childNodes.length - 1; 0 <= b; --b)
              this[a].insertBefore(e.childNodes[b], this[a].childNodes[0]);
          } else if (d instanceof c)
            for (b = 0; b < d.length; b += 1) this[a].insertBefore(d[b], this[a].childNodes[0]);
          else this[a].insertBefore(d, this[a].childNodes[0]);
        return this;
      },
      next: function (a) {
        return 0 < this.length
          ? a
            ? this[0].nextElementSibling && d(this[0].nextElementSibling).is(a)
              ? d([this[0].nextElementSibling])
              : d([])
            : this[0].nextElementSibling
            ? d([this[0].nextElementSibling])
            : d([])
          : d([]);
      },
      nextAll: function (c) {
        let e = [],
          a = this[0];
        if (!a) return d([]);
        for (; a.nextElementSibling; ) {
          var b = a.nextElementSibling;
          (c && !d(b).is(c)) || e.push(b), (a = b);
        }
        return d(e);
      },
      prev: function (b) {
        var a;
        return 0 < this.length
          ? ((a = this[0]),
            b
              ? a.previousElementSibling && d(a.previousElementSibling).is(b)
                ? d([a.previousElementSibling])
                : d([])
              : a.previousElementSibling
              ? d([a.previousElementSibling])
              : d([]))
          : d([]);
      },
      prevAll: function (c) {
        let e = [],
          a = this[0];
        if (!a) return d([]);
        for (; a.previousElementSibling; ) {
          var b = a.previousElementSibling;
          (c && !d(b).is(c)) || e.push(b), (a = b);
        }
        return d(e);
      },
      parent: function (b) {
        let c = [];
        for (let a = 0; a < this.length; a += 1)
          null === this[a].parentNode ||
            (b && !d(this[a].parentNode).is(b)) ||
            c.push(this[a].parentNode);
        return d(c);
      },
      parents: function (c) {
        let e = [];
        for (let b = 0; b < this.length; b += 1) {
          let a = this[b].parentNode;
          for (; a; ) (c && !d(a).is(c)) || e.push(a), (a = a.parentNode);
        }
        return d(e);
      },
      closest: function (b) {
        let a = this;
        return void 0 === b ? d([]) : (a = a.is(b) ? a : a.parents(b).eq(0));
      },
      find: function (f) {
        let c = [];
        for (let a = 0; a < this.length; a += 1) {
          var e = this[a].querySelectorAll(f);
          for (let b = 0; b < e.length; b += 1) c.push(e[b]);
        }
        return d(c);
      },
      children: function (e) {
        let f = [];
        for (let b = 0; b < this.length; b += 1) {
          var c = this[b].children;
          for (let a = 0; a < c.length; a += 1) (e && !d(c[a]).is(e)) || f.push(c[a]);
        }
        return d(f);
      },
      filter: function (a) {
        return d(m(this, a));
      },
      remove: function () {
        for (let a = 0; a < this.length; a += 1)
          this[a].parentNode && this[a].parentNode.removeChild(this[a]);
        return this;
      },
    };
    function n(b, a) {
      return void 0 === a && (a = 0), setTimeout(b, a);
    }
    function o() {
      return Date.now();
    }
    function p(g, d) {
      void 0 === d && (d = 'x');
      let e = k(),
        c,
        a,
        f,
        b = (function (a) {
          let c = k(),
            b;
          return (
            (b =
              (b = c.getComputedStyle ? c.getComputedStyle(a, null) : b) || !a.currentStyle
                ? b
                : a.currentStyle) || a.style
          );
        })(g);
      return (
        e.WebKitCSSMatrix
          ? (6 < (a = b.transform || b.webkitTransform).split(',').length &&
              (a = a
                .split(', ')
                .map((a) => a.replace(',', '.'))
                .join(', ')),
            (f = new e.WebKitCSSMatrix('none' === a ? '' : a)))
          : (c = (f =
              b.MozTransform ||
              b.OTransform ||
              b.MsTransform ||
              b.msTransform ||
              b.transform ||
              b.getPropertyValue('transform').replace('translate(', 'matrix(1, 0, 0, 1,'))
              .toString()
              .split(',')),
        'x' === d &&
          (a = e.WebKitCSSMatrix ? f.m41 : 16 === c.length ? parseFloat(c[12]) : parseFloat(c[4])),
        (a =
          'y' === d
            ? e.WebKitCSSMatrix
              ? f.m42
              : 16 === c.length
              ? parseFloat(c[13])
              : parseFloat(c[5])
            : a) || 0
      );
    }
    function q(a) {
      return (
        'object' == typeof a &&
        null !== a &&
        a.constructor &&
        'Object' === Object.prototype.toString.call(a).slice(8, -1)
      );
    }
    function r(i) {
      let c = Object(arguments.length <= 0 ? void 0 : i),
        k = ['__proto__', 'constructor', 'prototype'];
      for (let d = 1; d < arguments.length; d += 1) {
        var e,
          b = d < 0 || arguments.length <= d ? void 0 : arguments[d];
        if (
          null != b &&
          ((e = b),
          !('undefined' != typeof window && void 0 !== window.HTMLElement
            ? e instanceof HTMLElement
            : e && (1 === e.nodeType || 11 === e.nodeType)))
        ) {
          var g = Object.keys(Object(b)).filter((a) => 0 > k.indexOf(a));
          for (let f = 0, j = g.length; f < j; f += 1) {
            var a = g[f],
              h = Object.getOwnPropertyDescriptor(b, a);
            void 0 !== h &&
              h.enumerable &&
              (q(c[a]) && q(b[a])
                ? b[a].__swiper__
                  ? (c[a] = b[a])
                  : r(c[a], b[a])
                : !q(c[a]) && q(b[a])
                ? ((c[a] = {}), b[a].__swiper__ ? (c[a] = b[a]) : r(c[a], b[a]))
                : (c[a] = b[a]));
          }
        }
      }
      return c;
    }
    function s(a, b, c) {
      a.style.setProperty(b, c);
    }
    function t(b) {
      let { swiper: a, targetPosition: c, side: g } = b,
        d = k(),
        e = -a.translate,
        h,
        i = null,
        j = a.params.speed,
        l =
          ((a.wrapperEl.style.scrollSnapType = 'none'),
          d.cancelAnimationFrame(a.cssModeFrameID),
          c > e ? 'next' : 'prev'),
        m = (a, b) => ('next' === l && b <= a) || ('prev' === l && a <= b),
        f = () => {
          (h = new Date().getTime()), null === i && (i = h);
          var k = Math.max(Math.min((h - i) / j, 1), 0),
            k = 0.5 - Math.cos(k * Math.PI) / 2;
          let b = e + k * (c - e);
          if ((m(b, c) && (b = c), a.wrapperEl.scrollTo({ [g]: b }), m(b, c)))
            return (
              (a.wrapperEl.style.overflow = 'hidden'),
              (a.wrapperEl.style.scrollSnapType = ''),
              setTimeout(() => {
                (a.wrapperEl.style.overflow = ''), a.wrapperEl.scrollTo({ [g]: b });
              }),
              void d.cancelAnimationFrame(a.cssModeFrameID)
            );
          a.cssModeFrameID = d.requestAnimationFrame(f);
        };
      f();
    }
    let u, v, w;
    function x() {
      return (u =
        u ||
        (function () {
          let a = k(),
            b = i();
          return {
            smoothScroll: b.documentElement && 'scrollBehavior' in b.documentElement.style,
            touch: !!('ontouchstart' in a || (a.DocumentTouch && b instanceof a.DocumentTouch)),
            passiveListener: (function () {
              let b = !1;
              try {
                var c = Object.defineProperty({}, 'passive', {
                  get() {
                    b = !0;
                  },
                });
                a.addEventListener('testPassiveListener', null, c);
              } catch (d) {}
              return b;
            })(),
            gestures: 'ongesturestart' in a,
          };
        })());
    }
    function y(b) {
      let { swiper: a, runCallbacks: f, direction: g, step: c } = b;
      var { activeIndex: b, previousIndex: e } = a;
      let d = g;
      if (
        ((d = d || (e < b ? 'next' : b < e ? 'prev' : 'reset')),
        a.emit('transition' + c),
        f && b !== e)
      ) {
        if ('reset' === d) return a.emit('slideResetTransition' + c), 0;
        a.emit('slideChangeTransition' + c),
          'next' === d ? a.emit('slideNextTransition' + c) : a.emit('slidePrevTransition' + c);
      }
    }
    function z() {
      var d,
        e,
        a = this,
        { params: c, el: b } = a;
      (b && 0 === b.offsetWidth) ||
        (c.breakpoints && a.setBreakpoint(),
        ({ allowSlideNext: b, allowSlidePrev: d, snapGrid: e } = a),
        (a.allowSlideNext = !0),
        (a.allowSlidePrev = !0),
        a.updateSize(),
        a.updateSlides(),
        a.updateSlidesClasses(),
        ('auto' === c.slidesPerView || 1 < c.slidesPerView) &&
        a.isEnd &&
        !a.isBeginning &&
        !a.params.centeredSlides
          ? a.slideTo(a.slides.length - 1, 0, !1, !0)
          : a.slideTo(a.activeIndex, 0, !1, !0),
        a.autoplay && a.autoplay.running && a.autoplay.paused && a.autoplay.run(),
        (a.allowSlidePrev = d),
        (a.allowSlideNext = b),
        a.params.watchOverflow && e !== a.snapGrid && a.checkOverflow());
    }
    Object.keys(e).forEach((a) => {
      Object.defineProperty(d.fn, a, { value: e[a], writable: !0 });
    });
    let A = !1;
    function B() {}
    let C = (a, j) => {
        let k = i(),
          { params: d, touchEvents: b, el: e, wrapperEl: n, device: l, support: f } = a,
          g = !!d.nested,
          c = 'on' === j ? 'addEventListener' : 'removeEventListener',
          m = j;
        if (f.touch) {
          let h = !('touchstart' !== b.start || !f.passiveListener || !d.passiveListeners) && {
            passive: !0,
            capture: !1,
          };
          e[c](b.start, a.onTouchStart, h),
            e[c](b.move, a.onTouchMove, f.passiveListener ? { passive: !1, capture: g } : g),
            e[c](b.end, a.onTouchEnd, h),
            b.cancel && e[c](b.cancel, a.onTouchEnd, h);
        } else
          e[c](b.start, a.onTouchStart, !1),
            k[c](b.move, a.onTouchMove, g),
            k[c](b.end, a.onTouchEnd, !1);
        (d.preventClicks || d.preventClicksPropagation) && e[c]('click', a.onClick, !0),
          d.cssMode && n[c]('scroll', a.onScroll),
          d.updateOnWindowResize
            ? a[m](
                l.ios || l.android
                  ? 'resize orientationchange observerUpdate'
                  : 'resize observerUpdate',
                z,
                !0,
              )
            : a[m]('observerUpdate', z, !0);
      },
      $ = (b, a) => b.grid && a.grid && 1 < a.grid.rows;
    var D = {
      init: !0,
      direction: 'horizontal',
      touchEventsTarget: 'wrapper',
      initialSlide: 0,
      speed: 300,
      cssMode: !1,
      updateOnWindowResize: !0,
      resizeObserver: !0,
      nested: !1,
      createElements: !1,
      enabled: !0,
      focusableElements: 'input, select, option, textarea, button, video, label',
      width: null,
      height: null,
      preventInteractionOnTransition: !1,
      userAgent: null,
      url: null,
      edgeSwipeDetection: !1,
      edgeSwipeThreshold: 20,
      autoHeight: !1,
      setWrapperSize: !1,
      virtualTranslate: !1,
      effect: 'slide',
      breakpoints: void 0,
      breakpointsBase: 'window',
      spaceBetween: 0,
      slidesPerView: 1,
      slidesPerGroup: 1,
      slidesPerGroupSkip: 0,
      slidesPerGroupAuto: !1,
      centeredSlides: !1,
      centeredSlidesBounds: !1,
      slidesOffsetBefore: 0,
      slidesOffsetAfter: 0,
      normalizeSlideIndex: !0,
      centerInsufficientSlides: !1,
      watchOverflow: !0,
      roundLengths: !1,
      touchRatio: 1,
      touchAngle: 45,
      simulateTouch: !0,
      shortSwipes: !0,
      longSwipes: !0,
      longSwipesRatio: 0.5,
      longSwipesMs: 300,
      followFinger: !0,
      allowTouchMove: !0,
      threshold: 0,
      touchMoveStopPropagation: !1,
      touchStartPreventDefault: !0,
      touchStartForcePreventDefault: !1,
      touchReleaseOnEdges: !1,
      uniqueNavElements: !0,
      resistance: !0,
      resistanceRatio: 0.85,
      watchSlidesProgress: !1,
      grabCursor: !1,
      preventClicks: !0,
      preventClicksPropagation: !0,
      slideToClickedSlide: !1,
      preloadImages: !0,
      updateOnImagesReady: !0,
      loop: !1,
      loopAdditionalSlides: 0,
      loopedSlides: null,
      loopFillGroupWithBlank: !1,
      loopPreventsSlide: !0,
      rewind: !1,
      allowSlidePrev: !0,
      allowSlideNext: !0,
      swipeHandler: null,
      noSwiping: !0,
      noSwipingClass: 'swiper-no-swiping',
      noSwipingSelector: null,
      passiveListeners: !0,
      maxBackfaceHiddenSlides: 10,
      containerModifierClass: 'swiper-',
      slideClass: 'swiper-slide',
      slideBlankClass: 'swiper-slide-invisible-blank',
      slideActiveClass: 'swiper-slide-active',
      slideDuplicateActiveClass: 'swiper-slide-duplicate-active',
      slideVisibleClass: 'swiper-slide-visible',
      slideDuplicateClass: 'swiper-slide-duplicate',
      slideNextClass: 'swiper-slide-next',
      slideDuplicateNextClass: 'swiper-slide-duplicate-next',
      slidePrevClass: 'swiper-slide-prev',
      slideDuplicatePrevClass: 'swiper-slide-duplicate-prev',
      wrapperClass: 'swiper-wrapper',
      runCallbacksOnInit: !0,
      _emitClasses: !1,
    };
    let f = {
        eventsEmitter: {
          on(b, c, d) {
            let a = this;
            if ('function' != typeof c) return a;
            let e = d ? 'unshift' : 'push';
            return (
              b.split(' ').forEach((b) => {
                a.eventsListeners[b] || (a.eventsListeners[b] = []), a.eventsListeners[b][e](c);
              }),
              a
            );
          },
          once(c, a, d) {
            let b = this;
            return 'function' != typeof a ? b : ((e.__emitterProxy = a), b.on(c, e, d));
            function e() {
              b.off(c, e), e.__emitterProxy && delete e.__emitterProxy;
              for (var f = arguments.length, g = new Array(f), d = 0; d < f; d++)
                g[d] = arguments[d];
              a.apply(b, g);
            }
          },
          onAny(a, b) {
            return (
              'function' != typeof a ||
                ((b = b ? 'unshift' : 'push'),
                0 > this.eventsAnyListeners.indexOf(a) && this.eventsAnyListeners[b](a)),
              this
            );
          },
          offAny(a) {
            return (
              this.eventsAnyListeners &&
                0 <= (a = this.eventsAnyListeners.indexOf(a)) &&
                this.eventsAnyListeners.splice(a, 1),
              this
            );
          },
          off(b, c) {
            let a = this;
            return (
              a.eventsListeners &&
                b.split(' ').forEach((b) => {
                  void 0 === c
                    ? (a.eventsListeners[b] = [])
                    : a.eventsListeners[b] &&
                      a.eventsListeners[b].forEach((d, e) => {
                        (d === c || (d.__emitterProxy && d.__emitterProxy === c)) &&
                          a.eventsListeners[b].splice(e, 1);
                      });
                }),
              a
            );
          },
          emit() {
            let b = this;
            if (!b.eventsListeners) return b;
            let c, e, f;
            for (var g = arguments.length, a = new Array(g), d = 0; d < g; d++) a[d] = arguments[d];
            return (
              (f =
                'string' == typeof a[0] || Array.isArray(a[0])
                  ? ((c = a[0]), (e = a.slice(1, a.length)), b)
                  : ((c = a[0].events), (e = a[0].data), a[0].context || b)),
              e.unshift(f),
              (Array.isArray(c) ? c : c.split(' ')).forEach((a) => {
                b.eventsAnyListeners &&
                  b.eventsAnyListeners.length &&
                  b.eventsAnyListeners.forEach((b) => {
                    b.apply(f, [a, ...e]);
                  }),
                  b.eventsListeners &&
                    b.eventsListeners[a] &&
                    b.eventsListeners[a].forEach((a) => {
                      a.apply(f, e);
                    });
              }),
              b
            );
          },
        },
        update: {
          updateSize: function () {
            let a,
              b,
              c = this.$el;
            (a =
              void 0 !== this.params.width && null !== this.params.width
                ? this.params.width
                : c[0].clientWidth),
              (b =
                void 0 !== this.params.height && null !== this.params.height
                  ? this.params.height
                  : c[0].clientHeight),
              (0 === a && this.isHorizontal()) ||
                (0 === b && this.isVertical()) ||
                ((a =
                  a -
                  parseInt(c.css('padding-left') || 0, 10) -
                  parseInt(c.css('padding-right') || 0, 10)),
                (b =
                  b -
                  parseInt(c.css('padding-top') || 0, 10) -
                  parseInt(c.css('padding-bottom') || 0, 10)),
                Number.isNaN(a) && (a = 0),
                Number.isNaN(b) && (b = 0),
                Object.assign(this, { width: a, height: b, size: this.isHorizontal() ? a : b }));
          },
          updateSlides: function () {
            let a = this;
            function k(b) {
              return a.isHorizontal()
                ? b
                : {
                    width: 'height',
                    'margin-top': 'margin-left',
                    'margin-bottom ': 'margin-right',
                    'margin-left': 'margin-top',
                    'margin-right': 'margin-bottom',
                    'padding-left': 'padding-top',
                    'padding-right': 'padding-bottom',
                    marginRight: 'marginBottom',
                  }[b];
            }
            function n(a, b) {
              return parseFloat(a.getPropertyValue(k(b)) || 0);
            }
            let b = a.params,
              { $wrapperEl: t, size: f, rtlTranslate: u, wrongRTL: L } = a,
              v = a.virtual && b.virtual.enabled,
              M = (v ? a.virtual : a).slides.length,
              i = t.children('.' + a.params.slideClass),
              o = (v ? a.virtual.slides : i).length,
              c = [],
              p = [],
              l = [],
              w = b.slidesOffsetBefore,
              x =
                ('function' == typeof w && (w = b.slidesOffsetBefore.call(a)), b.slidesOffsetAfter);
            'function' == typeof x && (x = b.slidesOffsetAfter.call(a));
            var N = a.snapGrid.length,
              O = a.slidesGrid.length;
            let g = b.spaceBetween,
              d = -w,
              y = 0,
              q = 0;
            if (void 0 !== f) {
              'string' == typeof g &&
                0 <= g.indexOf('%') &&
                (g = (parseFloat(g.replace('%', '')) / 100) * f),
                (a.virtualSize = -g),
                u
                  ? i.css({ marginLeft: '', marginBottom: '', marginTop: '' })
                  : i.css({ marginRight: '', marginBottom: '', marginTop: '' }),
                b.centeredSlides &&
                  b.cssMode &&
                  (s(a.wrapperEl, '--swiper-centered-offset-before', ''),
                  s(a.wrapperEl, '--swiper-centered-offset-after', ''));
              var z = b.grid && 1 < b.grid.rows && a.grid;
              let e;
              z && a.grid.initSlides(o);
              var P =
                'auto' === b.slidesPerView &&
                b.breakpoints &&
                0 <
                  Object.keys(b.breakpoints).filter(
                    (a) => void 0 !== b.breakpoints[a].slidesPerView,
                  ).length;
              for (let j = 0; j < o; j += 1) {
                e = 0;
                let h = i.eq(j);
                if ((z && a.grid.updateSlide(j, h, o, k), 'none' !== h.css('display'))) {
                  if ('auto' === b.slidesPerView) {
                    P && (i[j].style[k('width')] = '');
                    let m = getComputedStyle(h[0]),
                      A = h[0].style.transform,
                      B = h[0].style.webkitTransform;
                    if (
                      (A && (h[0].style.transform = 'none'),
                      B && (h[0].style.webkitTransform = 'none'),
                      b.roundLengths)
                    )
                      e = a.isHorizontal() ? h.outerWidth(!0) : h.outerHeight(!0);
                    else {
                      let E = n(m, 'width'),
                        Q = n(m, 'padding-left'),
                        R = n(m, 'padding-right'),
                        F = n(m, 'margin-left'),
                        G = n(m, 'margin-right'),
                        H = m.getPropertyValue('box-sizing');
                      if (H && 'border-box' === H) e = E + F + G;
                      else {
                        let { clientWidth: S, offsetWidth: T } = h[0];
                        e = E + Q + R + F + G + (T - S);
                      }
                    }
                    A && (h[0].style.transform = A),
                      B && (h[0].style.webkitTransform = B),
                      b.roundLengths && (e = Math.floor(e));
                  } else
                    (e = (f - (b.slidesPerView - 1) * g) / b.slidesPerView),
                      b.roundLengths && (e = Math.floor(e)),
                      i[j] && (i[j].style[k('width')] = e + 'px');
                  i[j] && (i[j].swiperSlideSize = e),
                    l.push(e),
                    b.centeredSlides
                      ? ((d = d + e / 2 + y / 2 + g),
                        0 === y && 0 !== j && (d = d - f / 2 - g),
                        0 === j && (d = d - f / 2 - g),
                        0.001 > Math.abs(d) && (d = 0),
                        b.roundLengths && (d = Math.floor(d)),
                        q % b.slidesPerGroup == 0 && c.push(d),
                        p.push(d))
                      : (b.roundLengths && (d = Math.floor(d)),
                        (q - Math.min(a.params.slidesPerGroupSkip, q)) % a.params.slidesPerGroup ==
                          0 && c.push(d),
                        p.push(d),
                        (d = d + e + g)),
                    (a.virtualSize += e + g),
                    (y = e),
                    (q += 1);
                }
              }
              if (
                ((a.virtualSize = Math.max(a.virtualSize, f) + x),
                u &&
                  L &&
                  ('slide' === b.effect || 'coverflow' === b.effect) &&
                  t.css({ width: a.virtualSize + b.spaceBetween + 'px' }),
                b.setWrapperSize && t.css({ [k('width')]: a.virtualSize + b.spaceBetween + 'px' }),
                z && a.grid.updateWrapperSize(e, c, k),
                !b.centeredSlides)
              ) {
                let I = [];
                for (let r = 0; r < c.length; r += 1) {
                  let C = c[r];
                  b.roundLengths && (C = Math.floor(C)), c[r] <= a.virtualSize - f && I.push(C);
                }
                (c = I),
                  1 < Math.floor(a.virtualSize - f) - Math.floor(c[c.length - 1]) &&
                    c.push(a.virtualSize - f);
              }
              if ((0 === c.length && (c = [0]), 0 !== b.spaceBetween)) {
                let U = a.isHorizontal() && u ? 'marginLeft' : k('marginRight');
                i.filter((c, a) => !b.cssMode || a !== i.length - 1).css({ [U]: g + 'px' });
              }
              if (b.centeredSlides && b.centeredSlidesBounds) {
                let V = 0;
                l.forEach((a) => {
                  V += a + (b.spaceBetween || 0);
                });
                let W = (V -= b.spaceBetween) - f;
                c = c.map((a) => (a < 0 ? -w : a > W ? W + x : a));
              }
              if (b.centerInsufficientSlides) {
                let J = 0;
                if (
                  (l.forEach((a) => {
                    J += a + (b.spaceBetween || 0);
                  }),
                  (J -= b.spaceBetween) < f)
                ) {
                  let X = (f - J) / 2;
                  c.forEach((a, b) => {
                    c[b] = a - X;
                  }),
                    p.forEach((a, b) => {
                      p[b] = a + X;
                    });
                }
              }
              if (
                (Object.assign(a, { slides: i, snapGrid: c, slidesGrid: p, slidesSizesGrid: l }),
                b.centeredSlides && b.cssMode && !b.centeredSlidesBounds)
              ) {
                s(a.wrapperEl, '--swiper-centered-offset-before', -c[0] + 'px'),
                  s(
                    a.wrapperEl,
                    '--swiper-centered-offset-after',
                    a.size / 2 - l[l.length - 1] / 2 + 'px',
                  );
                let Y = -a.snapGrid[0],
                  Z = -a.slidesGrid[0];
                (a.snapGrid = a.snapGrid.map((a) => a + Y)),
                  (a.slidesGrid = a.slidesGrid.map((a) => a + Z));
              }
              if (
                (o !== M && a.emit('slidesLengthChange'),
                c.length !== N &&
                  (a.params.watchOverflow && a.checkOverflow(), a.emit('snapGridLengthChange')),
                p.length !== O && a.emit('slidesGridLengthChange'),
                b.watchSlidesProgress && a.updateSlidesOffset(),
                !(v || b.cssMode || ('slide' !== b.effect && 'fade' !== b.effect)))
              ) {
                let D = b.containerModifierClass + 'backface-hidden',
                  K = a.$el.hasClass(D);
                o <= b.maxBackfaceHiddenSlides ? K || a.$el.addClass(D) : K && a.$el.removeClass(D);
              }
            }
          },
          updateAutoHeight: function (e) {
            let a = this,
              d = [],
              i = a.virtual && a.params.virtual.enabled,
              b,
              c = 0;
            'number' == typeof e ? a.setTransition(e) : !0 === e && a.setTransition(a.params.speed);
            var f = (b) =>
              (i
                ? a.slides.filter(
                    (a) => parseInt(a.getAttribute('data-swiper-slide-index'), 10) === b,
                  )
                : a.slides.eq(b))[0];
            if ('auto' !== a.params.slidesPerView && 1 < a.params.slidesPerView) {
              if (a.params.centeredSlides)
                a.visibleSlides.each((a) => {
                  d.push(a);
                });
              else
                for (b = 0; b < Math.ceil(a.params.slidesPerView); b += 1) {
                  let g = a.activeIndex + b;
                  if (g > a.slides.length && !i) break;
                  d.push(f(g));
                }
            } else d.push(f(a.activeIndex));
            for (b = 0; b < d.length; b += 1)
              if (void 0 !== d[b]) {
                let h = d[b].offsetHeight;
                c = h > c ? h : c;
              }
            (c || 0 === c) && a.$wrapperEl.css('height', c + 'px');
          },
          updateSlidesOffset: function () {
            let b = this.slides;
            for (let a = 0; a < b.length; a += 1)
              b[a].swiperSlideOffset = this.isHorizontal() ? b[a].offsetLeft : b[a].offsetTop;
          },
          updateSlidesProgress: function (g) {
            void 0 === g && (g = (this && this.translate) || 0);
            let a = this,
              b = a.params,
              { slides: c, rtlTranslate: j, snapGrid: o } = a;
            if (0 !== c.length) {
              void 0 === c[0].swiperSlideOffset && a.updateSlidesOffset();
              let k = j ? g : -g;
              c.removeClass(b.slideVisibleClass),
                (a.visibleSlidesIndexes = []),
                (a.visibleSlides = []);
              for (let e = 0; e < c.length; e += 1) {
                let f = c[e],
                  h = f.swiperSlideOffset;
                b.cssMode && b.centeredSlides && (h -= c[0].swiperSlideOffset);
                let m =
                    (k + (b.centeredSlides ? a.minTranslate() : 0) - h) /
                    (f.swiperSlideSize + b.spaceBetween),
                  n =
                    (k - o[0] + (b.centeredSlides ? a.minTranslate() : 0) - h) /
                    (f.swiperSlideSize + b.spaceBetween),
                  i = -(k - h),
                  l = i + a.slidesSizesGrid[e];
                ((0 <= i && i < a.size - 1) || (1 < l && l <= a.size) || (i <= 0 && l >= a.size)) &&
                  (a.visibleSlides.push(f),
                  a.visibleSlidesIndexes.push(e),
                  c.eq(e).addClass(b.slideVisibleClass)),
                  (f.progress = j ? -m : m),
                  (f.originalProgress = j ? -n : n);
              }
              a.visibleSlides = d(a.visibleSlides);
            }
          },
          updateProgress: function (d) {
            if (void 0 === d) {
              let i = this.rtlTranslate ? -1 : 1;
              d = (this && this.translate && this.translate * i) || 0;
            }
            let e = this.params,
              f = this.maxTranslate() - this.minTranslate(),
              { progress: b, isBeginning: a, isEnd: c } = this;
            var g = a,
              h = c;
            (c =
              0 == f
                ? ((b = 0), (a = !0))
                : ((a = (b = (d - this.minTranslate()) / f) <= 0), 1 <= b)),
              Object.assign(this, { progress: b, isBeginning: a, isEnd: c }),
              (e.watchSlidesProgress || (e.centeredSlides && e.autoHeight)) &&
                this.updateSlidesProgress(d),
              a && !g && this.emit('reachBeginning toEdge'),
              c && !h && this.emit('reachEnd toEdge'),
              ((g && !a) || (h && !c)) && this.emit('fromEdge'),
              this.emit('progress', b);
          },
          updateSlidesClasses: function () {
            let { slides: e, params: a, $wrapperEl: b, activeIndex: g, realIndex: h } = this,
              i = this.virtual && a.virtual.enabled,
              f,
              c =
                (e.removeClass(
                  `${a.slideActiveClass} ${a.slideNextClass} ${a.slidePrevClass} ${a.slideDuplicateActiveClass} ${a.slideDuplicateNextClass} ` +
                    a.slideDuplicatePrevClass,
                ),
                (f = i
                  ? this.$wrapperEl.find(`.${a.slideClass}[data-swiper-slide-index="${g}"]`)
                  : e.eq(g)).addClass(a.slideActiveClass),
                a.loop &&
                  (f.hasClass(a.slideDuplicateClass)
                    ? b.children(
                        `.${a.slideClass}:not(.${a.slideDuplicateClass})[data-swiper-slide-index="${h}"]`,
                      )
                    : b.children(
                        `.${a.slideClass}.${a.slideDuplicateClass}[data-swiper-slide-index="${h}"]`,
                      )
                  ).addClass(a.slideDuplicateActiveClass),
                f
                  .nextAll('.' + a.slideClass)
                  .eq(0)
                  .addClass(a.slideNextClass)),
              d =
                (a.loop && 0 === c.length && (c = e.eq(0)).addClass(a.slideNextClass),
                f
                  .prevAll('.' + a.slideClass)
                  .eq(0)
                  .addClass(a.slidePrevClass));
            a.loop && 0 === d.length && (d = e.eq(-1)).addClass(a.slidePrevClass),
              a.loop &&
                ((c.hasClass(a.slideDuplicateClass)
                  ? b.children(
                      `.${a.slideClass}:not(.${
                        a.slideDuplicateClass
                      })[data-swiper-slide-index="${c.attr('data-swiper-slide-index')}"]`,
                    )
                  : b.children(
                      `.${a.slideClass}.${a.slideDuplicateClass}[data-swiper-slide-index="${c.attr(
                        'data-swiper-slide-index',
                      )}"]`,
                    )
                ).addClass(a.slideDuplicateNextClass),
                (d.hasClass(a.slideDuplicateClass)
                  ? b.children(
                      `.${a.slideClass}:not(.${
                        a.slideDuplicateClass
                      })[data-swiper-slide-index="${d.attr('data-swiper-slide-index')}"]`,
                    )
                  : b.children(
                      `.${a.slideClass}.${a.slideDuplicateClass}[data-swiper-slide-index="${d.attr(
                        'data-swiper-slide-index',
                      )}"]`,
                    )
                ).addClass(a.slideDuplicatePrevClass)),
              this.emitSlidesClasses();
          },
          updateActiveIndex: function (g) {
            let a = this,
              e = a.rtlTranslate ? a.translate : -a.translate,
              {
                slidesGrid: d,
                snapGrid: h,
                params: i,
                activeIndex: j,
                realIndex: l,
                snapIndex: m,
              } = a,
              f,
              b = g;
            if (void 0 === b) {
              for (let c = 0; c < d.length; c += 1)
                void 0 !== d[c + 1]
                  ? e >= d[c] && e < d[c + 1] - (d[c + 1] - d[c]) / 2
                    ? (b = c)
                    : e >= d[c] && e < d[c + 1] && (b = c + 1)
                  : e >= d[c] && (b = c);
              i.normalizeSlideIndex && (b < 0 || void 0 === b) && (b = 0);
            }
            if (0 <= h.indexOf(e)) f = h.indexOf(e);
            else {
              let k = Math.min(i.slidesPerGroupSkip, b);
              f = k + Math.floor((b - k) / i.slidesPerGroup);
            }
            f >= h.length && (f = h.length - 1),
              b !== j
                ? ((g = parseInt(a.slides.eq(b).attr('data-swiper-slide-index') || b, 10)),
                  Object.assign(a, {
                    snapIndex: f,
                    realIndex: g,
                    previousIndex: j,
                    activeIndex: b,
                  }),
                  a.emit('activeIndexChange'),
                  a.emit('snapIndexChange'),
                  l !== g && a.emit('realIndexChange'),
                  (a.initialized || a.params.runCallbacksOnInit) && a.emit('slideChange'))
                : f !== m && ((a.snapIndex = f), a.emit('snapIndexChange'));
          },
          updateClickedSlide: function (h) {
            var a = this,
              e = a.params,
              b = d(h).closest('.' + e.slideClass)[0];
            let f,
              g = !1;
            if (b) {
              for (let c = 0; c < a.slides.length; c += 1)
                if (a.slides[c] === b) {
                  (g = !0), (f = c);
                  break;
                }
            }
            if (!b || !g) return (a.clickedSlide = void 0), void (a.clickedIndex = void 0);
            (a.clickedSlide = b),
              a.virtual && a.params.virtual.enabled
                ? (a.clickedIndex = parseInt(d(b).attr('data-swiper-slide-index'), 10))
                : (a.clickedIndex = f),
              e.slideToClickedSlide &&
                void 0 !== a.clickedIndex &&
                a.clickedIndex !== a.activeIndex &&
                a.slideToClickedSlide();
          },
        },
        translate: {
          getTranslate: function (a) {
            void 0 === a && (a = this.isHorizontal() ? 'x' : 'y');
            var { params: d, rtlTranslate: e, translate: b, $wrapperEl: f } = this;
            if (d.virtualTranslate) return e ? -b : b;
            if (d.cssMode) return b;
            let c = p(f[0], a);
            return (c = e ? -c : c) || 0;
          },
          setTranslate: function (d, g) {
            let a = this,
              { rtlTranslate: h, params: e, $wrapperEl: i, wrapperEl: j, progress: k } = a,
              b = 0,
              c = 0;
            a.isHorizontal() ? (b = h ? -d : d) : (c = d),
              e.roundLengths && ((b = Math.floor(b)), (c = Math.floor(c))),
              e.cssMode
                ? (j[a.isHorizontal() ? 'scrollLeft' : 'scrollTop'] = a.isHorizontal() ? -b : -c)
                : e.virtualTranslate || i.transform(`translate3d(${b}px, ${c}px, 0px)`),
              (a.previousTranslate = a.translate),
              (a.translate = a.isHorizontal() ? b : c);
            var f = a.maxTranslate() - a.minTranslate();
            (0 == f ? 0 : (d - a.minTranslate()) / f) !== k && a.updateProgress(d),
              a.emit('setTranslate', a.translate, g);
          },
          minTranslate: function () {
            return -this.snapGrid[0];
          },
          maxTranslate: function () {
            return -this.snapGrid[this.snapGrid.length - 1];
          },
          translateTo: function (d, c, e, f, h) {
            void 0 === d && (d = 0),
              void 0 === c && (c = this.params.speed),
              void 0 === e && (e = !0),
              void 0 === f && (f = !0);
            let a = this,
              { params: i, wrapperEl: j } = a;
            if (a.animating && i.preventInteractionOnTransition) return !1;
            var b = a.minTranslate(),
              k = a.maxTranslate(),
              b = f && b < d ? b : f && d < k ? k : d;
            if ((a.updateProgress(b), i.cssMode)) {
              let g = a.isHorizontal();
              if (0 === c) j[g ? 'scrollLeft' : 'scrollTop'] = -b;
              else {
                if (!a.support.smoothScroll)
                  return t({ swiper: a, targetPosition: -b, side: g ? 'left' : 'top' }), !0;
                j.scrollTo({ [g ? 'left' : 'top']: -b, behavior: 'smooth' });
              }
              return !0;
            }
            return (
              0 === c
                ? (a.setTransition(0),
                  a.setTranslate(b),
                  e && (a.emit('beforeTransitionStart', c, h), a.emit('transitionEnd')))
                : (a.setTransition(c),
                  a.setTranslate(b),
                  e && (a.emit('beforeTransitionStart', c, h), a.emit('transitionStart')),
                  a.animating ||
                    ((a.animating = !0),
                    a.onTranslateToWrapperTransitionEnd ||
                      (a.onTranslateToWrapperTransitionEnd = function (b) {
                        a &&
                          !a.destroyed &&
                          b.target === this &&
                          (a.$wrapperEl[0].removeEventListener(
                            'transitionend',
                            a.onTranslateToWrapperTransitionEnd,
                          ),
                          a.$wrapperEl[0].removeEventListener(
                            'webkitTransitionEnd',
                            a.onTranslateToWrapperTransitionEnd,
                          ),
                          (a.onTranslateToWrapperTransitionEnd = null),
                          delete a.onTranslateToWrapperTransitionEnd,
                          e && a.emit('transitionEnd'));
                      }),
                    a.$wrapperEl[0].addEventListener(
                      'transitionend',
                      a.onTranslateToWrapperTransitionEnd,
                    ),
                    a.$wrapperEl[0].addEventListener(
                      'webkitTransitionEnd',
                      a.onTranslateToWrapperTransitionEnd,
                    ))),
              !0
            );
          },
        },
        transition: {
          setTransition: function (a, b) {
            this.params.cssMode || this.$wrapperEl.transition(a), this.emit('setTransition', a, b);
          },
          transitionStart: function (a, c) {
            void 0 === a && (a = !0);
            var b = this.params;
            b.cssMode ||
              (b.autoHeight && this.updateAutoHeight(),
              y({ swiper: this, runCallbacks: a, direction: c, step: 'Start' }));
          },
          transitionEnd: function (a, b) {
            void 0 === a && (a = !0);
            var c = this.params;
            (this.animating = !1),
              c.cssMode ||
                (this.setTransition(0),
                y({ swiper: this, runCallbacks: a, direction: b, step: 'End' }));
          },
        },
        slide: {
          slideTo: function (c, g, f, u, y) {
            if (
              (void 0 === g && (g = this.params.speed),
              void 0 === f && (f = !0),
              'number' != typeof (c = void 0 === c ? 0 : c) && 'string' != typeof c)
            )
              throw new Error(
                `The 'index' argument cannot have type other than 'number' or 'string'. [${typeof c}] given.`,
              );
            if ('string' == typeof c) {
              let v = parseInt(c, 10);
              if (!isFinite(v))
                throw new Error(
                  `The passed-in 'index' (string) couldn't be converted to 'number'. [${c}] given.`,
                );
              c = v;
            }
            let a = this,
              b = c;
            b < 0 && (b = 0);
            let {
              params: h,
              snapGrid: n,
              slidesGrid: l,
              previousIndex: z,
              activeIndex: j,
              rtlTranslate: o,
              wrapperEl: w,
              enabled: A,
            } = a;
            if ((a.animating && h.preventInteractionOnTransition) || (!A && !u && !y)) return !1;
            let p =
              (c = Math.min(a.params.slidesPerGroupSkip, b)) +
              Math.floor((b - c) / a.params.slidesPerGroup);
            p >= n.length && (p = n.length - 1),
              (j || h.initialSlide || 0) === (z || 0) && f && a.emit('beforeSlideChangeStart');
            var d = -n[p];
            if ((a.updateProgress(d), h.normalizeSlideIndex))
              for (let e = 0; e < l.length; e += 1) {
                let k = -Math.floor(100 * d),
                  m = Math.floor(100 * l[e]),
                  q = Math.floor(100 * l[e + 1]);
                void 0 !== l[e + 1]
                  ? k >= m && k < q - (q - m) / 2
                    ? (b = e)
                    : k >= m && k < q && (b = e + 1)
                  : k >= m && (b = e);
              }
            if (
              a.initialized &&
              b !== j &&
              ((!a.allowSlideNext && d < a.translate && d < a.minTranslate()) ||
                (!a.allowSlidePrev && d > a.translate && d > a.maxTranslate() && (j || 0) !== b))
            )
              return !1;
            let i;
            if (
              ((i = b > j ? 'next' : b < j ? 'prev' : 'reset'),
              (o && -d === a.translate) || (!o && d === a.translate))
            )
              return (
                a.updateActiveIndex(b),
                h.autoHeight && a.updateAutoHeight(),
                a.updateSlidesClasses(),
                'slide' !== h.effect && a.setTranslate(d),
                'reset' != i && (a.transitionStart(f, i), a.transitionEnd(f, i)),
                !1
              );
            if (h.cssMode) {
              let r = a.isHorizontal(),
                s = o ? d : -d;
              if (0 === g) {
                let x = a.virtual && a.params.virtual.enabled;
                x && ((a.wrapperEl.style.scrollSnapType = 'none'), (a._immediateVirtual = !0)),
                  (w[r ? 'scrollLeft' : 'scrollTop'] = s),
                  x &&
                    requestAnimationFrame(() => {
                      (a.wrapperEl.style.scrollSnapType = ''), (a._swiperImmediateVirtual = !1);
                    });
              } else {
                if (!a.support.smoothScroll)
                  return t({ swiper: a, targetPosition: s, side: r ? 'left' : 'top' }), !0;
                w.scrollTo({ [r ? 'left' : 'top']: s, behavior: 'smooth' });
              }
              return !0;
            }
            return (
              a.setTransition(g),
              a.setTranslate(d),
              a.updateActiveIndex(b),
              a.updateSlidesClasses(),
              a.emit('beforeTransitionStart', g, u),
              a.transitionStart(f, i),
              0 === g
                ? a.transitionEnd(f, i)
                : a.animating ||
                  ((a.animating = !0),
                  a.onSlideToWrapperTransitionEnd ||
                    (a.onSlideToWrapperTransitionEnd = function (b) {
                      a &&
                        !a.destroyed &&
                        b.target === this &&
                        (a.$wrapperEl[0].removeEventListener(
                          'transitionend',
                          a.onSlideToWrapperTransitionEnd,
                        ),
                        a.$wrapperEl[0].removeEventListener(
                          'webkitTransitionEnd',
                          a.onSlideToWrapperTransitionEnd,
                        ),
                        (a.onSlideToWrapperTransitionEnd = null),
                        delete a.onSlideToWrapperTransitionEnd,
                        a.transitionEnd(f, i));
                    }),
                  a.$wrapperEl[0].addEventListener(
                    'transitionend',
                    a.onSlideToWrapperTransitionEnd,
                  ),
                  a.$wrapperEl[0].addEventListener(
                    'webkitTransitionEnd',
                    a.onSlideToWrapperTransitionEnd,
                  )),
              !0
            );
          },
          slideToLoop: function (a, b, c, e) {
            void 0 === b && (b = this.params.speed), void 0 === c && (c = !0);
            let d = (a = void 0 === a ? 0 : a);
            return this.params.loop && (d += this.loopedSlides), this.slideTo(d, b, c, e);
          },
          slideNext: function (c, d, f) {
            void 0 === c && (c = this.params.speed), void 0 === d && (d = !0);
            var a = this,
              { animating: h, enabled: e, params: b } = a;
            if (!e) return a;
            let g = b.slidesPerGroup;
            if (
              ('auto' === b.slidesPerView &&
                1 === b.slidesPerGroup &&
                b.slidesPerGroupAuto &&
                (g = Math.max(a.slidesPerViewDynamic('current', !0), 1)),
              (e = a.activeIndex < b.slidesPerGroupSkip ? 1 : g),
              b.loop)
            ) {
              if (h && b.loopPreventsSlide) return !1;
              a.loopFix(), (a._clientLeft = a.$wrapperEl[0].clientLeft);
            }
            return b.rewind && a.isEnd
              ? a.slideTo(0, c, d, f)
              : a.slideTo(a.activeIndex + e, c, d, f);
          },
          slidePrev: function (d, e, i) {
            void 0 === d && (d = this.params.speed), void 0 === e && (e = !0);
            let a = this,
              {
                params: b,
                animating: j,
                snapGrid: f,
                slidesGrid: k,
                rtlTranslate: l,
                enabled: m,
              } = a;
            if (!m) return a;
            if (b.loop) {
              if (j && b.loopPreventsSlide) return !1;
              a.loopFix(), (a._clientLeft = a.$wrapperEl[0].clientLeft);
            }
            function n(a) {
              return a < 0 ? -Math.floor(Math.abs(a)) : Math.floor(a);
            }
            let o = n(l ? a.translate : -a.translate),
              p = f.map((a) => n(a)),
              g = f[p.indexOf(o) - 1];
            if (void 0 === g && b.cssMode) {
              let h;
              f.forEach((a, b) => {
                o >= a && (h = b);
              }),
                void 0 !== h && (g = f[0 < h ? h - 1 : h]);
            }
            let c = 0;
            if (
              (void 0 !== g &&
                ((c = k.indexOf(g)) < 0 && (c = a.activeIndex - 1),
                'auto' === b.slidesPerView &&
                  1 === b.slidesPerGroup &&
                  b.slidesPerGroupAuto &&
                  (c = Math.max((c = c - a.slidesPerViewDynamic('previous', !0) + 1), 0))),
              b.rewind && a.isBeginning)
            ) {
              let q =
                a.params.virtual && a.params.virtual.enabled && a.virtual
                  ? a.virtual.slides.length - 1
                  : a.slides.length - 1;
              return a.slideTo(q, d, e, i);
            }
            return a.slideTo(c, d, e, i);
          },
          slideReset: function (a, b, c) {
            return (
              void 0 === a && (a = this.params.speed),
              this.slideTo(this.activeIndex, a, (b = void 0 === b || b), c)
            );
          },
          slideToClosest: function (e, f, j, d) {
            void 0 === e && (e = this.params.speed),
              void 0 === f && (f = !0),
              void 0 === d && (d = 0.5);
            var a = this;
            let b = a.activeIndex;
            var c = Math.min(a.params.slidesPerGroupSkip, b),
              c = c + Math.floor((b - c) / a.params.slidesPerGroup),
              g = a.rtlTranslate ? a.translate : -a.translate;
            if (g >= a.snapGrid[c]) {
              let h = a.snapGrid[c];
              g - h > (a.snapGrid[c + 1] - h) * d && (b += a.params.slidesPerGroup);
            } else {
              let i = a.snapGrid[c - 1];
              g - i <= (a.snapGrid[c] - i) * d && (b -= a.params.slidesPerGroup);
            }
            return (
              (b = Math.max(b, 0)),
              (b = Math.min(b, a.slidesGrid.length - 1)),
              a.slideTo(b, e, f, j)
            );
          },
          slideToClickedSlide: function () {
            let a = this,
              { params: b, $wrapperEl: g } = a,
              e = 'auto' === b.slidesPerView ? a.slidesPerViewDynamic() : b.slidesPerView,
              f,
              c = a.clickedIndex;
            b.loop
              ? a.animating ||
                ((f = parseInt(d(a.clickedSlide).attr('data-swiper-slide-index'), 10)),
                b.centeredSlides
                  ? c < a.loopedSlides - e / 2 || c > a.slides.length - a.loopedSlides + e / 2
                    ? (a.loopFix(),
                      (c = g
                        .children(
                          `.${b.slideClass}[data-swiper-slide-index="${f}"]:not(.${b.slideDuplicateClass})`,
                        )
                        .eq(0)
                        .index()),
                      n(() => {
                        a.slideTo(c);
                      }))
                    : a.slideTo(c)
                  : c > a.slides.length - e
                  ? (a.loopFix(),
                    (c = g
                      .children(
                        `.${b.slideClass}[data-swiper-slide-index="${f}"]:not(.${b.slideDuplicateClass})`,
                      )
                      .eq(0)
                      .index()),
                    n(() => {
                      a.slideTo(c);
                    }))
                  : a.slideTo(c))
              : a.slideTo(c);
          },
        },
        loop: {
          loopCreate: function () {
            let e = this,
              n = i(),
              { params: a, $wrapperEl: f } = e,
              b = 0 < f.children().length ? d(f.children()[0].parentNode) : f;
            b.children(`.${a.slideClass}.` + a.slideDuplicateClass).remove();
            let c = b.children('.' + a.slideClass);
            if (a.loopFillGroupWithBlank) {
              let j = a.slidesPerGroup - (c.length % a.slidesPerGroup);
              if (j !== a.slidesPerGroup) {
                for (let k = 0; k < j; k += 1) {
                  let o = d(n.createElement('div')).addClass(
                    a.slideClass + ' ' + a.slideBlankClass,
                  );
                  b.append(o);
                }
                c = b.children('.' + a.slideClass);
              }
            }
            'auto' !== a.slidesPerView || a.loopedSlides || (a.loopedSlides = c.length),
              (e.loopedSlides = Math.ceil(parseFloat(a.loopedSlides || a.slidesPerView, 10))),
              (e.loopedSlides += a.loopAdditionalSlides),
              e.loopedSlides > c.length && (e.loopedSlides = c.length);
            let l = [],
              m = [];
            c.each((b, a) => {
              let f = d(b);
              a < e.loopedSlides && m.push(b),
                a < c.length && a >= c.length - e.loopedSlides && l.push(b),
                f.attr('data-swiper-slide-index', a);
            });
            for (let g = 0; g < m.length; g += 1)
              b.append(d(m[g].cloneNode(!0)).addClass(a.slideDuplicateClass));
            for (let h = l.length - 1; 0 <= h; --h)
              b.prepend(d(l[h].cloneNode(!0)).addClass(a.slideDuplicateClass));
          },
          loopFix: function () {
            var a = this,
              {
                activeIndex: e,
                slides: f,
                loopedSlides: b,
                allowSlidePrev: h,
                allowSlideNext: i,
                snapGrid: c,
                rtlTranslate: g,
              } = (a.emit('beforeLoopFix'), a);
            let d;
            (a.allowSlidePrev = !0),
              (a.allowSlideNext = !0),
              (c = -c[e] - a.getTranslate()),
              e < b
                ? ((d = f.length - 3 * b + e),
                  (d += b),
                  a.slideTo(d, 0, !1, !0) &&
                    0 != c &&
                    a.setTranslate((g ? -a.translate : a.translate) - c))
                : e >= f.length - b &&
                  ((d = -f.length + e + b),
                  (d += b),
                  a.slideTo(d, 0, !1, !0) &&
                    0 != c &&
                    a.setTranslate((g ? -a.translate : a.translate) - c)),
              (a.allowSlidePrev = h),
              (a.allowSlideNext = i),
              a.emit('loopFix');
          },
          loopDestroy: function () {
            let { $wrapperEl: b, params: a, slides: c } = this;
            b
              .children(
                `.${a.slideClass}.${a.slideDuplicateClass},.${a.slideClass}.` + a.slideBlankClass,
              )
              .remove(),
              c.removeAttr('data-swiper-slide-index');
          },
        },
        grabCursor: {
          setGrabCursor: function (b) {
            if (
              !(
                this.support.touch ||
                !this.params.simulateTouch ||
                (this.params.watchOverflow && this.isLocked) ||
                this.params.cssMode
              )
            ) {
              let a = 'container' === this.params.touchEventsTarget ? this.el : this.wrapperEl;
              (a.style.cursor = 'move'),
                (a.style.cursor = b ? '-webkit-grabbing' : '-webkit-grab'),
                (a.style.cursor = b ? '-moz-grabbin' : '-moz-grab'),
                (a.style.cursor = b ? 'grabbing' : 'grab');
            }
          },
          unsetGrabCursor: function () {
            var a = this;
            a.support.touch ||
              (a.params.watchOverflow && a.isLocked) ||
              a.params.cssMode ||
              (a['container' === a.params.touchEventsTarget ? 'el' : 'wrapperEl'].style.cursor =
                '');
          },
        },
        events: {
          attachEvents: function () {
            let a = this,
              b = i(),
              { params: c, support: e } = a;
            (a.onTouchStart = function (h) {
              let c = this,
                l = i(),
                r = k(),
                e = c.touchEventsData,
                { params: b, touches: g, enabled: s } = c;
              if (s && (!c.animating || !b.preventInteractionOnTransition)) {
                !c.animating && b.cssMode && b.loop && c.loopFix();
                let a = h,
                  f = d((a = a.originalEvent ? a.originalEvent : a).target);
                if (
                  ('wrapper' !== b.touchEventsTarget || f.closest(c.wrapperEl).length) &&
                  ((e.isTouchEvent = 'touchstart' === a.type),
                  (e.isTouchEvent || !('which' in a) || 3 !== a.which) &&
                    !(
                      (!e.isTouchEvent && 'button' in a && 0 < a.button) ||
                      (e.isTouched && e.isMoved)
                    ))
                ) {
                  b.noSwipingClass &&
                    '' !== b.noSwipingClass &&
                    a.target &&
                    a.target.shadowRoot &&
                    h.path &&
                    h.path[0] &&
                    (f = d(h.path[0]));
                  var m = b.noSwipingSelector || '.' + b.noSwipingClass,
                    j = !(!a.target || !a.target.shadowRoot);
                  if (
                    b.noSwiping &&
                    (j
                      ? (function (b, a) {
                          return (function c(a) {
                            return a && a !== i() && a !== k()
                              ? (a = a.assignedSlot ? a.assignedSlot : a).closest(b) ||
                                  c(a.getRootNode().host)
                              : null;
                          })((a = void 0 === a ? this : a));
                        })(m, a.target)
                      : f.closest(m)[0])
                  )
                    c.allowClick = !0;
                  else if (!b.swipeHandler || f.closest(b.swipeHandler)[0]) {
                    (g.currentX = ('touchstart' === a.type ? a.targetTouches[0] : a).pageX),
                      (g.currentY = ('touchstart' === a.type ? a.targetTouches[0] : a).pageY);
                    var j = g.currentX,
                      m = g.currentY,
                      n = b.edgeSwipeDetection || b.iOSEdgeSwipeDetection,
                      p = b.edgeSwipeThreshold || b.iOSEdgeSwipeThreshold;
                    if (n && (j <= p || j >= r.innerWidth - p)) {
                      if ('prevent' !== n) return;
                      h.preventDefault();
                    }
                    if (
                      (Object.assign(e, {
                        isTouched: !0,
                        isMoved: !1,
                        allowTouchCallbacks: !0,
                        isScrolling: void 0,
                        startMoving: void 0,
                      }),
                      (g.startX = j),
                      (g.startY = m),
                      (e.touchStartTime = o()),
                      (c.allowClick = !0),
                      c.updateSize(),
                      (c.swipeDirection = void 0),
                      0 < b.threshold && (e.allowThresholdMove = !1),
                      'touchstart' !== a.type)
                    ) {
                      let q = !0;
                      f.is(e.focusableElements) &&
                        ((q = !1), 'SELECT' === f[0].nodeName && (e.isTouched = !1)),
                        l.activeElement &&
                          d(l.activeElement).is(e.focusableElements) &&
                          l.activeElement !== f[0] &&
                          l.activeElement.blur();
                      let t = q && c.allowTouchMove && b.touchStartPreventDefault;
                      (b.touchStartForcePreventDefault || t) &&
                        !f[0].isContentEditable &&
                        a.preventDefault();
                    }
                    c.params.freeMode &&
                      c.params.freeMode.enabled &&
                      c.freeMode &&
                      c.animating &&
                      !b.cssMode &&
                      c.freeMode.onTouchStart(),
                      c.emit('touchStart', a);
                  }
                }
              }
            }.bind(a)),
              (a.onTouchMove = function (g) {
                let n = i(),
                  a = this,
                  b = a.touchEventsData,
                  { params: f, touches: c, rtlTranslate: p, enabled: q } = a;
                if (q) {
                  let e = g;
                  if ((e.originalEvent && (e = e.originalEvent), b.isTouched)) {
                    if (!b.isTouchEvent || 'touchmove' === e.type) {
                      var g =
                          'touchmove' === e.type &&
                          e.targetTouches &&
                          (e.targetTouches[0] || e.changedTouches[0]),
                        h = ('touchmove' === e.type ? g : e).pageX,
                        g = ('touchmove' === e.type ? g : e).pageY;
                      if (e.preventedByNestedSwiper) return (c.startX = h), void (c.startY = g);
                      if (!a.allowTouchMove)
                        return (
                          d(e.target).is(b.focusableElements) || (a.allowClick = !1),
                          void (
                            b.isTouched &&
                            (Object.assign(c, { startX: h, startY: g, currentX: h, currentY: g }),
                            (b.touchStartTime = o()))
                          )
                        );
                      if (b.isTouchEvent && f.touchReleaseOnEdges && !f.loop) {
                        if (a.isVertical()) {
                          if (
                            (g < c.startY && a.translate <= a.maxTranslate()) ||
                            (g > c.startY && a.translate >= a.minTranslate())
                          )
                            return (b.isTouched = !1), void (b.isMoved = !1);
                        } else if (
                          (h < c.startX && a.translate <= a.maxTranslate()) ||
                          (h > c.startX && a.translate >= a.minTranslate())
                        )
                          return;
                      }
                      if (
                        b.isTouchEvent &&
                        n.activeElement &&
                        e.target === n.activeElement &&
                        d(e.target).is(b.focusableElements)
                      )
                        return (b.isMoved = !0), void (a.allowClick = !1);
                      if (
                        (b.allowTouchCallbacks && a.emit('touchMove', e),
                        !(e.targetTouches && 1 < e.targetTouches.length))
                      ) {
                        (c.currentX = h), (c.currentY = g);
                        var k,
                          h = c.currentX - c.startX,
                          g = c.currentY - c.startY;
                        if (
                          !(a.params.threshold && Math.sqrt(h ** 2 + g ** 2) < a.params.threshold)
                        ) {
                          if (
                            (void 0 === b.isScrolling &&
                              ((a.isHorizontal() && c.currentY === c.startY) ||
                              (a.isVertical() && c.currentX === c.startX)
                                ? (b.isScrolling = !1)
                                : 25 <= h * h + g * g &&
                                  ((k = (180 * Math.atan2(Math.abs(g), Math.abs(h))) / Math.PI),
                                  (b.isScrolling = a.isHorizontal()
                                    ? k > f.touchAngle
                                    : 90 - k > f.touchAngle))),
                            b.isScrolling && a.emit('touchMoveOpposite', e),
                            void 0 === b.startMoving &&
                              ((c.currentX === c.startX && c.currentY === c.startY) ||
                                (b.startMoving = !0)),
                            b.isScrolling)
                          )
                            b.isTouched = !1;
                          else if (b.startMoving) {
                            (a.allowClick = !1),
                              !f.cssMode && e.cancelable && e.preventDefault(),
                              f.touchMoveStopPropagation && !f.nested && e.stopPropagation(),
                              b.isMoved ||
                                (f.loop && !f.cssMode && a.loopFix(),
                                (b.startTranslate = a.getTranslate()),
                                a.setTransition(0),
                                a.animating &&
                                  a.$wrapperEl.trigger('webkitTransitionEnd transitionend'),
                                (b.allowMomentumBounce = !1),
                                f.grabCursor &&
                                  (!0 === a.allowSlideNext || !0 === a.allowSlidePrev) &&
                                  a.setGrabCursor(!0),
                                a.emit('sliderFirstMove', e)),
                              a.emit('sliderMove', e),
                              (b.isMoved = !0);
                            let j = a.isHorizontal() ? h : g,
                              l =
                                ((c.diff = j),
                                (j *= f.touchRatio),
                                p && (j = -j),
                                (a.swipeDirection = 0 < j ? 'prev' : 'next'),
                                (b.currentTranslate = j + b.startTranslate),
                                !0),
                              m = f.resistanceRatio;
                            if (
                              (f.touchReleaseOnEdges && (m = 0),
                              0 < j && b.currentTranslate > a.minTranslate()
                                ? ((l = !1),
                                  f.resistance &&
                                    (b.currentTranslate =
                                      a.minTranslate() -
                                      1 +
                                      (-a.minTranslate() + b.startTranslate + j) ** m))
                                : j < 0 &&
                                  b.currentTranslate < a.maxTranslate() &&
                                  ((l = !1),
                                  f.resistance &&
                                    (b.currentTranslate =
                                      a.maxTranslate() +
                                      1 -
                                      (a.maxTranslate() - b.startTranslate - j) ** m)),
                              l && (e.preventedByNestedSwiper = !0),
                              !a.allowSlideNext &&
                                'next' === a.swipeDirection &&
                                b.currentTranslate < b.startTranslate &&
                                (b.currentTranslate = b.startTranslate),
                              !a.allowSlidePrev &&
                                'prev' === a.swipeDirection &&
                                b.currentTranslate > b.startTranslate &&
                                (b.currentTranslate = b.startTranslate),
                              a.allowSlidePrev ||
                                a.allowSlideNext ||
                                (b.currentTranslate = b.startTranslate),
                              0 < f.threshold)
                            ) {
                              if (!(Math.abs(j) > f.threshold || b.allowThresholdMove))
                                return void (b.currentTranslate = b.startTranslate);
                              if (!b.allowThresholdMove)
                                return (
                                  (b.allowThresholdMove = !0),
                                  (c.startX = c.currentX),
                                  (c.startY = c.currentY),
                                  (b.currentTranslate = b.startTranslate),
                                  void (c.diff = a.isHorizontal()
                                    ? c.currentX - c.startX
                                    : c.currentY - c.startY)
                                );
                            }
                            f.followFinger &&
                              !f.cssMode &&
                              (((f.freeMode && f.freeMode.enabled && a.freeMode) ||
                                f.watchSlidesProgress) &&
                                (a.updateActiveIndex(), a.updateSlidesClasses()),
                              a.params.freeMode &&
                                f.freeMode.enabled &&
                                a.freeMode &&
                                a.freeMode.onTouchMove(),
                              a.updateProgress(b.currentTranslate),
                              a.setTranslate(b.currentTranslate));
                          }
                        }
                      }
                    }
                  } else b.startMoving && b.isScrolling && a.emit('touchMoveOpposite', e);
                }
              }.bind(a)),
              (a.onTouchEnd = function (i) {
                let a = this,
                  b = a.touchEventsData,
                  { params: c, touches: s, rtlTranslate: t, slidesGrid: e, enabled: u } = a;
                if (u) {
                  let d = i;
                  if (
                    (d.originalEvent && (d = d.originalEvent),
                    b.allowTouchCallbacks && a.emit('touchEnd', d),
                    (b.allowTouchCallbacks = !1),
                    !b.isTouched)
                  )
                    return (
                      b.isMoved && c.grabCursor && a.setGrabCursor(!1),
                      (b.isMoved = !1),
                      void (b.startMoving = !1)
                    );
                  c.grabCursor &&
                    b.isMoved &&
                    b.isTouched &&
                    (!0 === a.allowSlideNext || !0 === a.allowSlidePrev) &&
                    a.setGrabCursor(!1);
                  var j,
                    h = o(),
                    q = h - b.touchStartTime;
                  if (a.allowClick) {
                    let r = d.path || (d.composedPath && d.composedPath());
                    a.updateClickedSlide((r && r[0]) || d.target),
                      a.emit('tap click', d),
                      q < 300 && h - b.lastClickTime < 300 && a.emit('doubleTap doubleClick', d);
                  }
                  if (
                    ((b.lastClickTime = o()),
                    n(() => {
                      a.destroyed || (a.allowClick = !0);
                    }),
                    !b.isTouched ||
                      !b.isMoved ||
                      !a.swipeDirection ||
                      0 === s.diff ||
                      b.currentTranslate === b.startTranslate)
                  )
                    return (b.isTouched = !1), (b.isMoved = !1), void (b.startMoving = !1);
                  if (
                    ((b.isTouched = !1),
                    (b.isMoved = !1),
                    (b.startMoving = !1),
                    (j = c.followFinger ? (t ? a.translate : -a.translate) : -b.currentTranslate),
                    !c.cssMode)
                  ) {
                    if (a.params.freeMode && c.freeMode.enabled)
                      a.freeMode.onTouchEnd({ currentPos: j });
                    else {
                      let f = 0,
                        m = a.slidesSizesGrid[0];
                      for (
                        let g = 0;
                        g < e.length;
                        g += g < c.slidesPerGroupSkip ? 1 : c.slidesPerGroup
                      ) {
                        let p = g < c.slidesPerGroupSkip - 1 ? 1 : c.slidesPerGroup;
                        void 0 !== e[g + p]
                          ? j >= e[g] && j < e[g + p] && ((f = g), (m = e[g + p] - e[g]))
                          : j >= e[g] && ((f = g), (m = e[e.length - 1] - e[e.length - 2]));
                      }
                      let l = null,
                        k = null;
                      c.rewind &&
                        (a.isBeginning
                          ? (k =
                              a.params.virtual && a.params.virtual.enabled && a.virtual
                                ? a.virtual.slides.length - 1
                                : a.slides.length - 1)
                          : a.isEnd && (l = 0)),
                        (i = (j - e[f]) / m),
                        (h = f < c.slidesPerGroupSkip - 1 ? 1 : c.slidesPerGroup),
                        q > c.longSwipesMs
                          ? c.longSwipes
                            ? ('next' === a.swipeDirection &&
                                (i >= c.longSwipesRatio
                                  ? a.slideTo(c.rewind && a.isEnd ? l : f + h)
                                  : a.slideTo(f)),
                              'prev' === a.swipeDirection &&
                                (i > 1 - c.longSwipesRatio
                                  ? a.slideTo(f + h)
                                  : null !== k && i < 0 && Math.abs(i) > c.longSwipesRatio
                                  ? a.slideTo(k)
                                  : a.slideTo(f)))
                            : a.slideTo(a.activeIndex)
                          : c.shortSwipes
                          ? a.navigation &&
                            (d.target === a.navigation.nextEl || d.target === a.navigation.prevEl)
                            ? d.target === a.navigation.nextEl
                              ? a.slideTo(f + h)
                              : a.slideTo(f)
                            : ('next' === a.swipeDirection && a.slideTo(null !== l ? l : f + h),
                              'prev' === a.swipeDirection && a.slideTo(null !== k ? k : f))
                          : a.slideTo(a.activeIndex);
                    }
                  }
                }
              }.bind(a)),
              c.cssMode &&
                (a.onScroll = function () {
                  var a = this,
                    { wrapperEl: c, rtlTranslate: d, enabled: b } = a;
                  b &&
                    ((a.previousTranslate = a.translate),
                    a.isHorizontal() ? (a.translate = -c.scrollLeft) : (a.translate = -c.scrollTop),
                    -0 === a.translate && (a.translate = 0),
                    a.updateActiveIndex(),
                    a.updateSlidesClasses(),
                    (0 == (b = a.maxTranslate() - a.minTranslate())
                      ? 0
                      : (a.translate - a.minTranslate()) / b) !== a.progress &&
                      a.updateProgress(d ? -a.translate : a.translate),
                    a.emit('setTranslate', a.translate, !1));
                }.bind(a)),
              (a.onClick = function (a) {
                this.enabled &&
                  (this.allowClick ||
                    (this.params.preventClicks && a.preventDefault(),
                    this.params.preventClicksPropagation &&
                      this.animating &&
                      (a.stopPropagation(), a.stopImmediatePropagation())));
              }.bind(a)),
              e.touch && !A && (b.addEventListener('touchstart', B), (A = !0)),
              C(a, 'on');
          },
          detachEvents: function () {
            C(this, 'off');
          },
        },
        breakpoints: {
          setBreakpoint: function () {
            var e, b, h, f, d;
            let a = this,
              { activeIndex: k, initialized: j, loopedSlides: l = 0, params: c, $el: i } = a,
              g = c.breakpoints;
            !g ||
              0 === Object.keys(g).length ||
              ((e = a.getBreakpoint(g, a.params.breakpointsBase, a.el)) &&
                a.currentBreakpoint !== e &&
                ((b = (e in g ? g[e] : void 0) || a.originalParams),
                (d = $(a, c)),
                (f = $(a, b)),
                (h = c.enabled),
                d && !f
                  ? (i.removeClass(
                      `${c.containerModifierClass}grid ${c.containerModifierClass}grid-column`,
                    ),
                    a.emitContainerClasses())
                  : !d &&
                    f &&
                    (i.addClass(c.containerModifierClass + 'grid'),
                    ((b.grid.fill && 'column' === b.grid.fill) ||
                      (!b.grid.fill && 'column' === c.grid.fill)) &&
                      i.addClass(c.containerModifierClass + 'grid-column'),
                    a.emitContainerClasses()),
                (d = b.direction && b.direction !== c.direction),
                (f = c.loop && (b.slidesPerView !== c.slidesPerView || d)),
                d && j && a.changeDirection(),
                r(a.params, b),
                (d = a.params.enabled),
                Object.assign(a, {
                  allowTouchMove: a.params.allowTouchMove,
                  allowSlideNext: a.params.allowSlideNext,
                  allowSlidePrev: a.params.allowSlidePrev,
                }),
                h && !d ? a.disable() : !h && d && a.enable(),
                (a.currentBreakpoint = e),
                a.emit('_beforeBreakpoint', b),
                f &&
                  j &&
                  (a.loopDestroy(),
                  a.loopCreate(),
                  a.updateSlides(),
                  a.slideTo(k - l + a.loopedSlides, 0, !1)),
                a.emit('breakpoint', b)));
          },
          getBreakpoint: function (f, a, b) {
            if ((void 0 === a && (a = 'window'), f && ('container' !== a || b))) {
              let c = !1,
                g = k(),
                j = 'window' === a ? g.innerHeight : b.clientHeight,
                d = Object.keys(f).map((a) => {
                  var b;
                  return 'string' == typeof a && 0 === a.indexOf('@')
                    ? ((b = parseFloat(a.substr(1))), { value: j * b, point: a })
                    : { value: a, point: a };
                });
              d.sort((a, b) => parseInt(a.value, 10) - parseInt(b.value, 10));
              for (let e = 0; e < d.length; e += 1) {
                let { point: h, value: i } = d[e];
                'window' === a
                  ? g.matchMedia(`(min-width: ${i}px)`).matches && (c = h)
                  : i <= b.clientWidth && (c = h);
              }
              return c || 'max';
            }
          },
        },
        checkOverflow: {
          checkOverflow: function () {
            let a = this,
              { isLocked: b, params: c } = a,
              d = c.slidesOffsetBefore;
            if (d) {
              let e = a.slides.length - 1,
                f = a.slidesGrid[e] + a.slidesSizesGrid[e] + 2 * d;
              a.isLocked = a.size > f;
            } else a.isLocked = 1 === a.snapGrid.length;
            !0 === c.allowSlideNext && (a.allowSlideNext = !a.isLocked),
              !0 === c.allowSlidePrev && (a.allowSlidePrev = !a.isLocked),
              b && b !== a.isLocked && (a.isEnd = !1),
              b !== a.isLocked && a.emit(a.isLocked ? 'lock' : 'unlock');
          },
        },
        classes: {
          addClasses: function () {
            let { classNames: b, params: a, rtl: d, $el: e, device: c, support: f } = this,
              g = (function (a, c) {
                let b = [];
                return (
                  a.forEach((a) => {
                    'object' == typeof a
                      ? Object.keys(a).forEach((d) => {
                          a[d] && b.push(c + d);
                        })
                      : 'string' == typeof a && b.push(c + a);
                  }),
                  b
                );
              })(
                [
                  'initialized',
                  a.direction,
                  { 'pointer-events': !f.touch },
                  { 'free-mode': this.params.freeMode && a.freeMode.enabled },
                  { autoheight: a.autoHeight },
                  { rtl: d },
                  { grid: a.grid && 1 < a.grid.rows },
                  { 'grid-column': a.grid && 1 < a.grid.rows && 'column' === a.grid.fill },
                  { android: c.android },
                  { ios: c.ios },
                  { 'css-mode': a.cssMode },
                  { centered: a.cssMode && a.centeredSlides },
                ],
                a.containerModifierClass,
              );
            b.push(...g), e.addClass([...b].join(' ')), this.emitContainerClasses();
          },
          removeClasses: function () {
            let { $el: a, classNames: b } = this;
            a.removeClass(b.join(' ')), this.emitContainerClasses();
          },
        },
        images: {
          loadImage: function (e, b, f, g, h, j) {
            let i = k(),
              a;
            function c() {
              j && j();
            }
            !(d(e).parent('picture')[0] || (e.complete && h)) && b
              ? (((a = new i.Image()).onload = c),
                (a.onerror = c),
                g && (a.sizes = g),
                f && (a.srcset = f),
                b && (a.src = b))
              : c();
          },
          preloadImages: function () {
            let b = this;
            function d() {
              null != b &&
                b &&
                !b.destroyed &&
                (void 0 !== b.imagesLoaded && (b.imagesLoaded += 1),
                b.imagesLoaded === b.imagesToLoad.length &&
                  (b.params.updateOnImagesReady && b.update(), b.emit('imagesReady')));
            }
            b.imagesToLoad = b.$el.find('img');
            for (let c = 0; c < b.imagesToLoad.length; c += 1) {
              let a = b.imagesToLoad[c];
              b.loadImage(
                a,
                a.currentSrc || a.getAttribute('src'),
                a.srcset || a.getAttribute('srcset'),
                a.sizes || a.getAttribute('sizes'),
                !0,
                d,
              );
            }
          },
        },
      },
      E = {};
    class a {
      constructor() {
        let g, c;
        for (var l, j = arguments.length, e = new Array(j), h = 0; h < j; h++) e[h] = arguments[h];
        if (
          (1 === e.length &&
          e[0].constructor &&
          'Object' === Object.prototype.toString.call(e[0]).slice(8, -1)
            ? (c = e[0])
            : ([g, c] = e),
          (c = r({}, (c = c || {}))),
          g && !c.el && (c.el = g),
          c.el && 1 < d(c.el).length)
        ) {
          let m = [];
          return (
            d(c.el).each((b) => {
              (b = r({}, c, { el: b })), m.push(new a(b));
            }),
            m
          );
        }
        let b = this,
          n =
            ((b.__swiper__ = !0),
            (b.support = x()),
            (b.device =
              ((l = { userAgent: c.userAgent }),
              (v =
                v ||
                (function () {
                  var e = (void 0 === l ? {} : l).userAgent;
                  let h = x(),
                    d = k(),
                    f = d.navigator.platform,
                    a = e || d.navigator.userAgent,
                    b = { ios: !1, android: !1 },
                    i = d.screen.width,
                    j = d.screen.height,
                    m = a.match(/(Android);?[\s\/]+([\d.]+)?/),
                    c = a.match(/(iPad).*OS\s([\d_]+)/);
                  var e = a.match(/(iPod)(.*OS\s([\d_]+))?/),
                    n = !c && a.match(/(iPhone\sOS|iOS)\s([\d_]+)/),
                    o = 'Win32' === f;
                  let g = 'MacIntel' === f;
                  return (
                    !c &&
                      g &&
                      h.touch &&
                      0 <=
                        [
                          '1024x1366',
                          '1366x1024',
                          '834x1194',
                          '1194x834',
                          '834x1112',
                          '1112x834',
                          '768x1024',
                          '1024x768',
                          '820x1180',
                          '1180x820',
                          '810x1080',
                          '1080x810',
                        ].indexOf(i + 'x' + j) &&
                      ((c = (c = a.match(/(Version)\/([\d.]+)/)) || [0, 1, '13_0_0']), (g = !1)),
                    m && !o && ((b.os = 'android'), (b.android = !0)),
                    (c || n || e) && ((b.os = 'ios'), (b.ios = !0)),
                    b
                  );
                })()))),
            (b.browser = w =
              w ||
              (function () {
                let a = k();
                return {
                  isSafari: (function () {
                    let b = a.navigator.userAgent.toLowerCase();
                    return (
                      0 <= b.indexOf('safari') &&
                      0 > b.indexOf('chrome') &&
                      0 > b.indexOf('android')
                    );
                  })(),
                  isWebView: /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(
                    a.navigator.userAgent,
                  ),
                };
              })()),
            (b.eventsListeners = {}),
            (b.eventsAnyListeners = []),
            (b.modules = [...b.__modules__]),
            c.modules && Array.isArray(c.modules) && b.modules.push(...c.modules),
            {});
        b.modules.forEach((a) => {
          var d, e;
          a({
            swiper: b,
            extendParams:
              ((d = c),
              (e = n),
              function (b) {
                void 0 === b && (b = {});
                var a = Object.keys(b)[0],
                  c = b[a];
                'object' == typeof c &&
                  null !== c &&
                  (0 <= ['navigation', 'pagination', 'scrollbar'].indexOf(a) &&
                    !0 === d[a] &&
                    (d[a] = { auto: !0 }),
                  a in d &&
                    'enabled' in c &&
                    (!0 === d[a] && (d[a] = { enabled: !0 }),
                    'object' != typeof d[a] || 'enabled' in d[a] || (d[a].enabled = !0),
                    d[a] || (d[a] = { enabled: !1 }))),
                  r(e, b);
              }),
            on: b.on.bind(b),
            once: b.once.bind(b),
            off: b.off.bind(b),
            emit: b.emit.bind(b),
          });
        });
        var i,
          f = r({}, D, n);
        return (
          (b.params = r({}, f, E, c)),
          (b.originalParams = r({}, b.params)),
          (b.passedParams = r({}, c)),
          b.params &&
            b.params.on &&
            Object.keys(b.params.on).forEach((a) => {
              b.on(a, b.params.on[a]);
            }),
          b.params && b.params.onAny && b.onAny(b.params.onAny),
          (b.$ = d),
          Object.assign(b, {
            enabled: b.params.enabled,
            el: g,
            classNames: [],
            slides: d(),
            slidesGrid: [],
            snapGrid: [],
            slidesSizesGrid: [],
            isHorizontal: () => 'horizontal' === b.params.direction,
            isVertical: () => 'vertical' === b.params.direction,
            activeIndex: 0,
            realIndex: 0,
            isBeginning: !0,
            isEnd: !1,
            translate: 0,
            previousTranslate: 0,
            progress: 0,
            velocity: 0,
            animating: !1,
            allowSlideNext: b.params.allowSlideNext,
            allowSlidePrev: b.params.allowSlidePrev,
            touchEvents:
              ((f = ['touchstart', 'touchmove', 'touchend', 'touchcancel']),
              (i = ['pointerdown', 'pointermove', 'pointerup']),
              (b.touchEventsTouch = { start: f[0], move: f[1], end: f[2], cancel: f[3] }),
              (b.touchEventsDesktop = { start: i[0], move: i[1], end: i[2] }),
              b.support.touch || !b.params.simulateTouch
                ? b.touchEventsTouch
                : b.touchEventsDesktop),
            touchEventsData: {
              isTouched: void 0,
              isMoved: void 0,
              allowTouchCallbacks: void 0,
              touchStartTime: void 0,
              isScrolling: void 0,
              currentTranslate: void 0,
              startTranslate: void 0,
              allowThresholdMove: void 0,
              focusableElements: b.params.focusableElements,
              lastClickTime: o(),
              clickTimeout: void 0,
              velocities: [],
              allowMomentumBounce: void 0,
              isTouchEvent: void 0,
              startMoving: void 0,
            },
            allowClick: !0,
            allowTouchMove: b.params.allowTouchMove,
            touches: { startX: 0, startY: 0, currentX: 0, currentY: 0, diff: 0 },
            imagesToLoad: [],
            imagesLoaded: 0,
          }),
          b.emit('_swiper'),
          b.params.init && b.init(),
          b
        );
      }
      enable() {
        var a = this;
        a.enabled || ((a.enabled = !0), a.params.grabCursor && a.setGrabCursor(), a.emit('enable'));
      }
      disable() {
        var a = this;
        a.enabled &&
          ((a.enabled = !1), a.params.grabCursor && a.unsetGrabCursor(), a.emit('disable'));
      }
      setProgress(a, b) {
        var c = ((a = Math.min(Math.max(a, 0), 1)), this.minTranslate()),
          a = (this.maxTranslate() - c) * a + c;
        this.translateTo(a, void 0 === b ? 0 : b),
          this.updateActiveIndex(),
          this.updateSlidesClasses();
      }
      emitContainerClasses() {
        let a = this;
        if (a.params._emitClasses && a.el) {
          let b = a.el.className
            .split(' ')
            .filter(
              (b) => 0 === b.indexOf('swiper') || 0 === b.indexOf(a.params.containerModifierClass),
            );
          a.emit('_containerClasses', b.join(' '));
        }
      }
      getSlideClasses(a) {
        let b = this;
        return a.className
          .split(' ')
          .filter((a) => 0 === a.indexOf('swiper-slide') || 0 === a.indexOf(b.params.slideClass))
          .join(' ');
      }
      emitSlidesClasses() {
        let a = this;
        if (a.params._emitClasses && a.el) {
          let b = [];
          a.slides.each((c) => {
            var d = a.getSlideClasses(c);
            b.push({ slideEl: c, classNames: d }), a.emit('_slideClass', c, d);
          }),
            a.emit('_slideClasses', b);
        }
      }
      slidesPerViewDynamic(k, l) {
        void 0 === k && (k = 'current'), void 0 === l && (l = !1);
        var {
          params: n,
          slides: b,
          slidesGrid: c,
          slidesSizesGrid: o,
          size: d,
          activeIndex: a,
        } = this;
        let e = 1;
        if (n.centeredSlides) {
          let g,
            h = b[a].swiperSlideSize;
          for (let i = a + 1; i < b.length; i += 1)
            b[i] && !g && ((h += b[i].swiperSlideSize), (e += 1), h > d && (g = !0));
          for (let j = a - 1; 0 <= j; --j)
            b[j] && !g && ((h += b[j].swiperSlideSize), (e += 1), h > d && (g = !0));
        } else if ('current' === k)
          for (let f = a + 1; f < b.length; f += 1)
            (l ? c[f] + o[f] - c[a] < d : c[f] - c[a] < d) && (e += 1);
        else for (let m = a - 1; 0 <= m; --m) c[a] - c[m] < d && (e += 1);
        return e;
      }
      update() {
        var c, b;
        let a = this;
        function d() {
          var b = a.rtlTranslate ? -1 * a.translate : a.translate,
            b = Math.min(Math.max(b, a.maxTranslate()), a.minTranslate());
          a.setTranslate(b), a.updateActiveIndex(), a.updateSlidesClasses();
        }
        a &&
          !a.destroyed &&
          (({ snapGrid: c, params: b } = a),
          b.breakpoints && a.setBreakpoint(),
          a.updateSize(),
          a.updateSlides(),
          a.updateProgress(),
          a.updateSlidesClasses(),
          a.params.freeMode && a.params.freeMode.enabled
            ? (d(), a.params.autoHeight && a.updateAutoHeight())
            : (('auto' === a.params.slidesPerView || 1 < a.params.slidesPerView) &&
              a.isEnd &&
              !a.params.centeredSlides
                ? a.slideTo(a.slides.length - 1, 0, !1, !0)
                : a.slideTo(a.activeIndex, 0, !1, !0)) || d(),
          b.watchOverflow && c !== a.snapGrid && a.checkOverflow(),
          a.emit('update'));
      }
      changeDirection(b, c) {
        void 0 === c && (c = !0);
        var a = this,
          d = a.params.direction;
        return (
          (b = b || ('horizontal' === d ? 'vertical' : 'horizontal')) === d ||
            ('horizontal' !== b && 'vertical' !== b) ||
            (a.$el
              .removeClass('' + a.params.containerModifierClass + d)
              .addClass('' + a.params.containerModifierClass + b),
            a.emitContainerClasses(),
            (a.params.direction = b),
            a.slides.each((a) => {
              'vertical' === b ? (a.style.width = '') : (a.style.height = '');
            }),
            a.emit('changeDirection'),
            c && a.update()),
          a
        );
      }
      mount(b) {
        let a = this;
        if (a.mounted) return !0;
        let c = d(b || a.params.el);
        if (!(b = c[0])) return !1;
        b.swiper = a;
        let g = () => '.' + (a.params.wrapperClass || '').trim().split(' ').join('.'),
          e = (() => {
            if (b && b.shadowRoot && b.shadowRoot.querySelector) {
              let a = d(b.shadowRoot.querySelector(g()));
              return (a.children = (a) => c.children(a)), a;
            }
            return c.children(g());
          })();
        if (0 === e.length && a.params.createElements) {
          let f = i().createElement('div');
          (e = d(f)),
            (f.className = a.params.wrapperClass),
            c.append(f),
            c.children('.' + a.params.slideClass).each((a) => {
              e.append(a);
            });
        }
        return (
          Object.assign(a, {
            $el: c,
            el: b,
            $wrapperEl: e,
            wrapperEl: e[0],
            mounted: !0,
            rtl: 'rtl' === b.dir.toLowerCase() || 'rtl' === c.css('direction'),
            rtlTranslate:
              'horizontal' === a.params.direction &&
              ('rtl' === b.dir.toLowerCase() || 'rtl' === c.css('direction')),
            wrongRTL: '-webkit-box' === e.css('display'),
          }),
          !0
        );
      }
      init(b) {
        var a = this;
        return (
          a.initialized ||
            !1 === a.mount(b) ||
            (a.emit('beforeInit'),
            a.params.breakpoints && a.setBreakpoint(),
            a.addClasses(),
            a.params.loop && a.loopCreate(),
            a.updateSize(),
            a.updateSlides(),
            a.params.watchOverflow && a.checkOverflow(),
            a.params.grabCursor && a.enabled && a.setGrabCursor(),
            a.params.preloadImages && a.preloadImages(),
            a.params.loop
              ? a.slideTo(
                  a.params.initialSlide + a.loopedSlides,
                  0,
                  a.params.runCallbacksOnInit,
                  !1,
                  !0,
                )
              : a.slideTo(a.params.initialSlide, 0, a.params.runCallbacksOnInit, !1, !0),
            a.attachEvents(),
            (a.initialized = !0),
            a.emit('init'),
            a.emit('afterInit')),
          a
        );
      }
      destroy(c, d) {
        void 0 === c && (c = !0), void 0 === d && (d = !0);
        let a = this,
          { params: b, $el: f, $wrapperEl: g, slides: e } = a;
        if (void 0 !== a.params && !a.destroyed) {
          if (
            (a.emit('beforeDestroy'),
            (a.initialized = !1),
            a.detachEvents(),
            b.loop && a.loopDestroy(),
            d &&
              (a.removeClasses(),
              f.removeAttr('style'),
              g.removeAttr('style'),
              e &&
                e.length &&
                e
                  .removeClass(
                    [
                      b.slideVisibleClass,
                      b.slideActiveClass,
                      b.slideNextClass,
                      b.slidePrevClass,
                    ].join(' '),
                  )
                  .removeAttr('style')
                  .removeAttr('data-swiper-slide-index')),
            a.emit('destroy'),
            Object.keys(a.eventsListeners).forEach((b) => {
              a.off(b);
            }),
            !1 !== c)
          ) {
            a.$el[0].swiper = null;
            {
              let h = a;
              Object.keys(h).forEach((a) => {
                try {
                  h[a] = null;
                } catch (b) {}
                try {
                  delete h[a];
                } catch (c) {}
              });
            }
          }
          a.destroyed = !0;
        }
        return null;
      }
      static extendDefaults(a) {
        r(E, a);
      }
      static get extendedDefaults() {
        return E;
      }
      static get defaults() {
        return D;
      }
      static installModule(b) {
        a.prototype.__modules__ || (a.prototype.__modules__ = []);
        let c = a.prototype.__modules__;
        'function' == typeof b && 0 > c.indexOf(b) && c.push(b);
      }
      static use(b) {
        return Array.isArray(b) ? b.forEach((b) => a.installModule(b)) : a.installModule(b), a;
      }
    }
    function F(a, d, b, c) {
      let e = i();
      return (
        a.params.createElements &&
          Object.keys(c).forEach((f) => {
            if (!b[f] && !0 === b.auto) {
              let g = a.$el.children('.' + c[f])[0];
              g || (((g = e.createElement('div')).className = c[f]), a.$el.append(g)),
                (b[f] = g),
                (d[f] = g);
            }
          }),
        b
      );
    }
    function G(a) {
      return (
        '.' +
        (a = void 0 === a ? '' : a)
          .trim()
          .replace(/([\.:!\/])/g, '\\$1')
          .replace(/ /g, '.')
      );
    }
    function H(b) {
      let {
        effect: c,
        swiper: d,
        on: a,
        setTranslate: e,
        setTransition: f,
        overwriteParams: g,
        perspective: h,
      } = b;
      a('beforeInit', () => {
        var a;
        d.params.effect === c &&
          (d.classNames.push('' + d.params.containerModifierClass + c),
          h && h() && d.classNames.push(d.params.containerModifierClass + '3d'),
          (a = g ? g() : {}),
          Object.assign(d.params, a),
          Object.assign(d.originalParams, a));
      }),
        a('setTranslate', () => {
          d.params.effect === c && e();
        }),
        a('setTransition', (b, a) => {
          d.params.effect === c && f(a);
        });
    }
    function _(a, b) {
      return a.transformEl
        ? b
            .find(a.transformEl)
            .css({ 'backface-visibility': 'hidden', '-webkit-backface-visibility': 'hidden' })
        : b;
    }
    function I(e) {
      let { swiper: c, duration: f, transformEl: a, allSlides: g } = e,
        { slides: b, activeIndex: d, $wrapperEl: h } = c;
      if (c.params.virtualTranslate && 0 !== f) {
        let i = !1;
        (g ? (a ? b.find(a) : b) : a ? b.eq(d).find(a) : b.eq(d)).transitionEnd(() => {
          if (!i && c && !c.destroyed) {
            (i = !0), (c.animating = !1);
            var b = ['webkitTransitionEnd', 'transitionend'];
            for (let a = 0; a < b.length; a += 1) h.trigger(b[a]);
          }
        });
      }
    }
    function J(c, e, a) {
      let g = 'swiper-slide-shadow' + (a ? '-' + a : ''),
        f = c.transformEl ? e.find(c.transformEl) : e,
        b = f.children('.' + g);
      return (
        b.length ||
          ((b = d(`<div class="swiper-slide-shadow${a ? '-' + a : ''}"></div>`)), f.append(b)),
        b
      );
    }
    return (
      Object.keys(f).forEach((b) => {
        Object.keys(f[b]).forEach((c) => {
          a.prototype[c] = f[b][c];
        });
      }),
      a.use([
        function (b) {
          let { swiper: c, on: a, emit: d } = b,
            e = k(),
            f = null,
            g = null,
            h = () => {
              c && !c.destroyed && c.initialized && (d('beforeResize'), d('resize'));
            },
            i = () => {
              c && !c.destroyed && c.initialized && d('orientationchange');
            };
          a('init', () => {
            c.params.resizeObserver && void 0 !== e.ResizeObserver
              ? c &&
                !c.destroyed &&
                c.initialized &&
                (f = new ResizeObserver((a) => {
                  g = e.requestAnimationFrame(() => {
                    var { width: b, height: d } = c;
                    let e = b,
                      f = d;
                    a.forEach((a) => {
                      var { contentBoxSize: a, contentRect: b, target: d } = a;
                      (d && d !== c.el) ||
                        ((e = b ? b.width : (a[0] || a).inlineSize),
                        (f = b ? b.height : (a[0] || a).blockSize));
                    }),
                      (e === b && f === d) || h();
                  });
                })).observe(c.el)
              : (e.addEventListener('resize', h), e.addEventListener('orientationchange', i));
          }),
            a('destroy', () => {
              g && e.cancelAnimationFrame(g),
                f && f.unobserve && c.el && (f.unobserve(c.el), (f = null)),
                e.removeEventListener('resize', h),
                e.removeEventListener('orientationchange', i);
            });
        },
        function (b) {
          let { swiper: d, extendParams: c, on: a, emit: e } = b;
          function f(c, a) {
            void 0 === a && (a = {});
            let b = new (h.MutationObserver || h.WebkitMutationObserver)((b) => {
              var a;
              1 !== b.length
                ? ((a = function () {
                    e('observerUpdate', b[0]);
                  }),
                  h.requestAnimationFrame ? h.requestAnimationFrame(a) : h.setTimeout(a, 0))
                : e('observerUpdate', b[0]);
            });
            b.observe(c, {
              attributes: void 0 === a.attributes || a.attributes,
              childList: void 0 === a.childList || a.childList,
              characterData: void 0 === a.characterData || a.characterData,
            }),
              g.push(b);
          }
          let g = [],
            h = k();
          c({ observer: !1, observeParents: !1, observeSlideChildren: !1 }),
            a('init', () => {
              if (d.params.observer) {
                if (d.params.observeParents) {
                  var b = d.$el.parents();
                  for (let a = 0; a < b.length; a += 1) f(b[a]);
                }
                f(d.$el[0], { childList: d.params.observeSlideChildren }),
                  f(d.$wrapperEl[0], { attributes: !1 });
              }
            }),
            a('destroy', () => {
              g.forEach((a) => {
                a.disconnect();
              }),
                g.splice(0, g.length);
            });
        },
      ]),
      a.use([
        function (c) {
          let g,
            { swiper: b, extendParams: e, on: a } = c;
          function h(f, a) {
            let c = b.params.virtual;
            if (c.cache && b.virtual.cache[a]) return b.virtual.cache[a];
            let e = c.renderSlide
              ? d(c.renderSlide.call(b, f, a))
              : d(`<div class="${b.params.slideClass}" data-swiper-slide-index="${a}">${f}</div>`);
            return (
              e.attr('data-swiper-slide-index') || e.attr('data-swiper-slide-index', a),
              c.cache && (b.virtual.cache[a] = e),
              e
            );
          }
          function f(j) {
            let { slidesPerView: k, slidesPerGroup: g, centeredSlides: w } = b.params,
              { addSlidesBefore: p, addSlidesAfter: q } = b.params.virtual,
              { from: l, to: i, slides: r, slidesGrid: x, offset: y } = b.virtual;
            b.params.cssMode || b.updateActiveIndex();
            var s = b.activeIndex || 0;
            let m, n, t;
            (m = b.rtlTranslate ? 'right' : b.isHorizontal() ? 'left' : 'top'),
              (t = w
                ? ((n = Math.floor(k / 2) + g + q), Math.floor(k / 2) + g + p)
                : ((n = k + (g - 1) + q), g + p));
            let c = Math.max((s || 0) - t, 0),
              d = Math.min((s || 0) + n, r.length - 1),
              e = (b.slidesGrid[c] || 0) - (b.slidesGrid[0] || 0);
            function u() {
              b.updateSlides(),
                b.updateProgress(),
                b.updateSlidesClasses(),
                b.lazy && b.params.lazy.enabled && b.lazy.load();
            }
            if (
              (Object.assign(b.virtual, { from: c, to: d, offset: e, slidesGrid: b.slidesGrid }),
              l === c && i === d && !j)
            )
              return (
                b.slidesGrid !== x && e !== y && b.slides.css(m, e + 'px'), void b.updateProgress()
              );
            if (b.params.virtual.renderExternal)
              return (
                b.params.virtual.renderExternal.call(b, {
                  offset: e,
                  from: c,
                  to: d,
                  slides: (function () {
                    let b = [];
                    for (let a = c; a <= d; a += 1) b.push(r[a]);
                    return b;
                  })(),
                }),
                void (b.params.virtual.renderExternalUpdate && u())
              );
            let v = [],
              o = [];
            if (j) b.$wrapperEl.find('.' + b.params.slideClass).remove();
            else
              for (let f = l; f <= i; f += 1)
                (f < c || f > d) &&
                  b.$wrapperEl
                    .find(`.${b.params.slideClass}[data-swiper-slide-index="${f}"]`)
                    .remove();
            for (let a = 0; a < r.length; a += 1)
              a >= c &&
                a <= d &&
                (void 0 === i || j ? o.push(a) : (a > i && o.push(a), a < l && v.push(a)));
            o.forEach((a) => {
              b.$wrapperEl.append(h(r[a], a));
            }),
              v
                .sort((a, b) => b - a)
                .forEach((a) => {
                  b.$wrapperEl.prepend(h(r[a], a));
                }),
              b.$wrapperEl.children('.swiper-slide').css(m, e + 'px'),
              u();
          }
          e({
            virtual: {
              enabled: !1,
              slides: [],
              cache: !0,
              renderSlide: null,
              renderExternal: null,
              renderExternalUpdate: !0,
              addSlidesBefore: 0,
              addSlidesAfter: 0,
            },
          }),
            (b.virtual = {
              cache: {},
              from: void 0,
              to: void 0,
              slides: [],
              offset: 0,
              slidesGrid: [],
            }),
            a('beforeInit', () => {
              b.params.virtual.enabled &&
                ((b.virtual.slides = b.params.virtual.slides),
                b.classNames.push(b.params.containerModifierClass + 'virtual'),
                (b.params.watchSlidesProgress = !0),
                (b.originalParams.watchSlidesProgress = !0),
                b.params.initialSlide || f());
            }),
            a('setTranslate', () => {
              b.params.virtual.enabled &&
                (b.params.cssMode && !b._immediateVirtual
                  ? (clearTimeout(g),
                    (g = setTimeout(() => {
                      f();
                    }, 100)))
                  : f());
            }),
            a('init update resize', () => {
              b.params.virtual.enabled &&
                b.params.cssMode &&
                s(b.wrapperEl, '--swiper-virtual-size', b.virtualSize + 'px');
            }),
            Object.assign(b.virtual, {
              appendSlide: function (a) {
                if ('object' == typeof a && 'length' in a)
                  for (let c = 0; c < a.length; c += 1) a[c] && b.virtual.slides.push(a[c]);
                else b.virtual.slides.push(a);
                f(!0);
              },
              prependSlide: function (a) {
                let d = b.activeIndex,
                  e = d + 1,
                  g = 1;
                if (Array.isArray(a)) {
                  for (let c = 0; c < a.length; c += 1) a[c] && b.virtual.slides.unshift(a[c]);
                  (e = d + a.length), (g = a.length);
                } else b.virtual.slides.unshift(a);
                if (b.params.virtual.cache) {
                  let h = b.virtual.cache,
                    i = {};
                  Object.keys(h).forEach((b) => {
                    let a = h[b],
                      c = a.attr('data-swiper-slide-index');
                    c && a.attr('data-swiper-slide-index', parseInt(c, 10) + g),
                      (i[parseInt(b, 10) + g] = a);
                  }),
                    (b.virtual.cache = i);
                }
                f(!0), b.slideTo(e, 0);
              },
              removeSlide: function (a) {
                if (null != a) {
                  let c = b.activeIndex;
                  if (Array.isArray(a))
                    for (let d = a.length - 1; 0 <= d; --d)
                      b.virtual.slides.splice(a[d], 1),
                        b.params.virtual.cache && delete b.virtual.cache[a[d]],
                        a[d] < c && --c,
                        (c = Math.max(c, 0));
                  else
                    b.virtual.slides.splice(a, 1),
                      b.params.virtual.cache && delete b.virtual.cache[a],
                      a < c && --c,
                      (c = Math.max(c, 0));
                  f(!0), b.slideTo(c, 0);
                }
              },
              removeAllSlides: function () {
                (b.virtual.slides = []),
                  b.params.virtual.cache && (b.virtual.cache = {}),
                  f(!0),
                  b.slideTo(0, 0);
              },
              update: f,
            });
        },
        function (c) {
          let { swiper: a, extendParams: e, on: b, emit: h } = c,
            j = i(),
            l = k();
          function m(w) {
            if (a.enabled) {
              let i = a.rtlTranslate,
                b = w,
                d = (b = b.originalEvent ? b.originalEvent : b).keyCode || b.charCode,
                q = a.params.keyboard.pageUpDown,
                e = q && 33 === d,
                f = q && 34 === d,
                k = 37 === d,
                m = 39 === d,
                n = 38 === d,
                o = 40 === d;
              if (
                (!a.allowSlideNext && ((a.isHorizontal() && m) || (a.isVertical() && o) || f)) ||
                (!a.allowSlidePrev && ((a.isHorizontal() && k) || (a.isVertical() && n) || e))
              )
                return !1;
              if (
                !(
                  b.shiftKey ||
                  b.altKey ||
                  b.ctrlKey ||
                  b.metaKey ||
                  (j.activeElement &&
                    j.activeElement.nodeName &&
                    ('input' === j.activeElement.nodeName.toLowerCase() ||
                      'textarea' === j.activeElement.nodeName.toLowerCase()))
                )
              ) {
                if (a.params.keyboard.onlyInViewport && (e || f || k || m || n || o)) {
                  let r = !1;
                  if (
                    0 < a.$el.parents('.' + a.params.slideClass).length &&
                    0 === a.$el.parents('.' + a.params.slideActiveClass).length
                  )
                    return;
                  let s = a.$el,
                    t = s[0].clientWidth,
                    u = s[0].clientHeight,
                    x = l.innerWidth,
                    y = l.innerHeight,
                    c = a.$el.offset(),
                    v =
                      (i && (c.left -= a.$el[0].scrollLeft),
                      [
                        [c.left, c.top],
                        [c.left + t, c.top],
                        [c.left, c.top + u],
                        [c.left + t, c.top + u],
                      ]);
                  for (let p = 0; p < v.length; p += 1) {
                    let g = v[p];
                    0 <= g[0] &&
                      g[0] <= x &&
                      0 <= g[1] &&
                      g[1] <= y &&
                      ((0 === g[0] && 0 === g[1]) || (r = !0));
                  }
                  if (!r) return;
                }
                a.isHorizontal()
                  ? ((e || f || k || m) &&
                      (b.preventDefault ? b.preventDefault() : (b.returnValue = !1)),
                    (((f || m) && !i) || ((e || k) && i)) && a.slideNext(),
                    (((e || k) && !i) || ((f || m) && i)) && a.slidePrev())
                  : ((e || f || n || o) &&
                      (b.preventDefault ? b.preventDefault() : (b.returnValue = !1)),
                    (f || o) && a.slideNext(),
                    (e || n) && a.slidePrev()),
                  h('keyPress', d);
              }
            }
          }
          function f() {
            a.keyboard.enabled || (d(j).on('keydown', m), (a.keyboard.enabled = !0));
          }
          function g() {
            a.keyboard.enabled && (d(j).off('keydown', m), (a.keyboard.enabled = !1));
          }
          (a.keyboard = { enabled: !1 }),
            e({ keyboard: { enabled: !1, onlyInViewport: !0, pageUpDown: !0 } }),
            b('init', () => {
              a.params.keyboard.enabled && f();
            }),
            b('destroy', () => {
              a.keyboard.enabled && g();
            }),
            Object.assign(a.keyboard, { enable: f, disable: g });
        },
        function (c) {
          let { swiper: a, extendParams: e, on: b, emit: h } = c,
            i = k(),
            j;
          e({
            mousewheel: {
              enabled: !1,
              releaseOnEdges: !1,
              invert: !1,
              forceToAxis: !1,
              sensitivity: 1,
              eventsTarget: 'container',
              thresholdDelta: null,
              thresholdTime: null,
            },
          }),
            (a.mousewheel = { enabled: !1 });
          let l,
            m = o(),
            p = [];
          function q() {
            a.enabled && (a.mouseEntered = !0);
          }
          function r() {
            a.enabled && (a.mouseEntered = !1);
          }
          function s(A) {
            let e = A;
            if (a.enabled) {
              var b,
                u,
                x = a.params.mousewheel;
              a.params.cssMode && e.preventDefault();
              let B = a.$el;
              if (
                ('container' !== a.params.mousewheel.eventsTarget &&
                  (B = d(a.params.mousewheel.eventsTarget)),
                !a.mouseEntered && !B[0].contains(e.target) && !x.releaseOnEdges)
              )
                return !0;
              e.originalEvent && (e = e.originalEvent);
              let c = 0,
                s,
                k,
                f,
                g;
              var C = a.rtlTranslate ? -1 : 1,
                q =
                  ((s = 0),
                  (k = 0),
                  (f = 0),
                  (g = 0),
                  'detail' in (b = e) && (k = b.detail),
                  'wheelDelta' in b && (k = -b.wheelDelta / 120),
                  'wheelDeltaY' in b && (k = -b.wheelDeltaY / 120),
                  'wheelDeltaX' in b && (s = -b.wheelDeltaX / 120),
                  'axis' in b && b.axis === b.HORIZONTAL_AXIS && ((s = k), (k = 0)),
                  (f = 10 * s),
                  (g = 10 * k),
                  'deltaY' in b && (g = b.deltaY),
                  'deltaX' in b && (f = b.deltaX),
                  b.shiftKey && !f && ((f = g), (g = 0)),
                  (f || g) &&
                    b.deltaMode &&
                    (1 === b.deltaMode ? ((f *= 40), (g *= 40)) : ((f *= 800), (g *= 800))),
                  f && !s && (s = f < 1 ? -1 : 1),
                  g && !k && (k = g < 1 ? -1 : 1),
                  { spinX: s, spinY: k, pixelX: f, pixelY: g });
              if (x.forceToAxis) {
                if (a.isHorizontal()) {
                  if (!(Math.abs(q.pixelX) > Math.abs(q.pixelY))) return !0;
                  c = -q.pixelX * C;
                } else {
                  if (!(Math.abs(q.pixelY) > Math.abs(q.pixelX))) return !0;
                  c = -q.pixelY;
                }
              } else c = Math.abs(q.pixelX) > Math.abs(q.pixelY) ? -q.pixelX * C : -q.pixelY;
              if (0 === c) return !0;
              x.invert && (c = -c);
              let v = a.getTranslate() + c * x.sensitivity;
              if (
                ((v = v >= a.minTranslate() ? a.minTranslate() : v) <= a.maxTranslate() &&
                  (v = a.maxTranslate()),
                (a.params.loop || (v !== a.minTranslate() && v !== a.maxTranslate())) &&
                  a.params.nested &&
                  e.stopPropagation(),
                a.params.freeMode && a.params.freeMode.enabled)
              ) {
                let r = { time: o(), delta: Math.abs(c), direction: Math.sign(c) },
                  D =
                    l && r.time < l.time + 500 && r.delta <= l.delta && r.direction === l.direction;
                if (!D) {
                  (l = void 0), a.params.loop && a.loopFix();
                  let t = a.getTranslate() + c * x.sensitivity,
                    F = a.isBeginning,
                    G = a.isEnd;
                  if (
                    ((t = t >= a.minTranslate() ? a.minTranslate() : t) <= a.maxTranslate() &&
                      (t = a.maxTranslate()),
                    a.setTransition(0),
                    a.setTranslate(t),
                    a.updateProgress(),
                    a.updateActiveIndex(),
                    a.updateSlidesClasses(),
                    ((!F && a.isBeginning) || (!G && a.isEnd)) && a.updateSlidesClasses(),
                    a.params.freeMode.sticky)
                  ) {
                    clearTimeout(j), (j = void 0), 15 <= p.length && p.shift();
                    let z = p.length ? p[p.length - 1] : void 0,
                      E = p[0];
                    if ((p.push(r), z && (r.delta > z.delta || r.direction !== z.direction)))
                      p.splice(0);
                    else if (
                      15 <= p.length &&
                      r.time - E.time < 500 &&
                      1 <= E.delta - r.delta &&
                      r.delta <= 6
                    ) {
                      let H = 0 < c ? 0.8 : 0.2;
                      (l = r),
                        p.splice(0),
                        (j = n(() => {
                          a.slideToClosest(a.params.speed, !0, void 0, H);
                        }, 0));
                    }
                    j =
                      j ||
                      n(() => {
                        (l = r), p.splice(0), a.slideToClosest(a.params.speed, !0, void 0, 0.5);
                      }, 500);
                  }
                  if (
                    (D || h('scroll', e),
                    a.params.autoplay && a.params.autoplayDisableOnInteraction && a.autoplay.stop(),
                    t === a.minTranslate() || t === a.maxTranslate())
                  )
                    return !0;
                }
              } else {
                let w = { time: o(), delta: Math.abs(c), direction: Math.sign(c), raw: A },
                  y = (2 <= p.length && p.shift(), p.length ? p[p.length - 1] : void 0);
                if (
                  (p.push(w),
                  (!y ||
                    w.direction !== y.direction ||
                    w.delta > y.delta ||
                    w.time > y.time + 150) &&
                    ((u = w),
                    !(
                      a.params.mousewheel.thresholdDelta &&
                      u.delta < a.params.mousewheel.thresholdDelta
                    ) &&
                      !(
                        a.params.mousewheel.thresholdTime &&
                        o() - m < a.params.mousewheel.thresholdTime
                      ) &&
                      ((6 <= u.delta && o() - m < 60) ||
                        (u.direction < 0
                          ? (a.isEnd && !a.params.loop) ||
                            a.animating ||
                            (a.slideNext(), h('scroll', u.raw))
                          : (a.isBeginning && !a.params.loop) ||
                            a.animating ||
                            (a.slidePrev(), h('scroll', u.raw)),
                        (m = new i.Date().getTime())))),
                  (function (c) {
                    var b = a.params.mousewheel;
                    if (c.direction < 0) {
                      if (a.isEnd && !a.params.loop && b.releaseOnEdges) return 1;
                    } else if (a.isBeginning && !a.params.loop && b.releaseOnEdges) return 1;
                  })(w))
                )
                  return !0;
              }
              return e.preventDefault ? e.preventDefault() : (e.returnValue = !1), !1;
            }
          }
          function t(c) {
            let b = a.$el;
            (b =
              'container' !== a.params.mousewheel.eventsTarget
                ? d(a.params.mousewheel.eventsTarget)
                : b)[c]('mouseenter', q),
              b[c]('mouseleave', r),
              b[c]('wheel', s);
          }
          function f() {
            return a.params.cssMode
              ? (a.wrapperEl.removeEventListener('wheel', s), !0)
              : !a.mousewheel.enabled && (t('on'), (a.mousewheel.enabled = !0));
          }
          function g() {
            return a.params.cssMode
              ? (a.wrapperEl.addEventListener(event, s), !0)
              : !!a.mousewheel.enabled && (t('off'), (a.mousewheel.enabled = !1), !0);
          }
          b('init', () => {
            !a.params.mousewheel.enabled && a.params.cssMode && g(),
              a.params.mousewheel.enabled && f();
          }),
            b('destroy', () => {
              a.params.cssMode && f(), a.mousewheel.enabled && g();
            }),
            Object.assign(a.mousewheel, { enable: f, disable: g });
        },
        function (c) {
          let { swiper: b, extendParams: e, on: a, emit: i } = c;
          function j(a) {
            let c;
            return (
              a &&
                ((c = d(a)),
                b.params.uniqueNavElements &&
                  'string' == typeof a &&
                  1 < c.length &&
                  1 === b.$el.find(a).length &&
                  (c = b.$el.find(a))),
              c
            );
          }
          function k(a, c) {
            var d = b.params.navigation;
            a &&
              0 < a.length &&
              (a[c ? 'addClass' : 'removeClass'](d.disabledClass),
              a[0] && 'BUTTON' === a[0].tagName && (a[0].disabled = c),
              b.params.watchOverflow &&
                b.enabled &&
                a[b.isLocked ? 'addClass' : 'removeClass'](d.lockClass));
          }
          function f() {
            var a, c;
            b.params.loop ||
              (({ $nextEl: a, $prevEl: c } = b.navigation),
              k(c, b.isBeginning && !b.params.rewind),
              k(a, b.isEnd && !b.params.rewind));
          }
          function l(a) {
            a.preventDefault(),
              (!b.isBeginning || b.params.loop || b.params.rewind) && b.slidePrev();
          }
          function m(a) {
            a.preventDefault(), (!b.isEnd || b.params.loop || b.params.rewind) && b.slideNext();
          }
          function g() {
            var d = b.params.navigation;
            if (
              ((b.params.navigation = F(b, b.originalParams.navigation, b.params.navigation, {
                nextEl: 'swiper-button-next',
                prevEl: 'swiper-button-prev',
              })),
              d.nextEl || d.prevEl)
            ) {
              let a = j(d.nextEl),
                c = j(d.prevEl);
              a && 0 < a.length && a.on('click', m),
                c && 0 < c.length && c.on('click', l),
                Object.assign(b.navigation, {
                  $nextEl: a,
                  nextEl: a && a[0],
                  $prevEl: c,
                  prevEl: c && c[0],
                }),
                b.enabled || (a && a.addClass(d.lockClass), c && c.addClass(d.lockClass));
            }
          }
          function h() {
            let { $nextEl: a, $prevEl: c } = b.navigation;
            a && a.length && (a.off('click', m), a.removeClass(b.params.navigation.disabledClass)),
              c &&
                c.length &&
                (c.off('click', l), c.removeClass(b.params.navigation.disabledClass));
          }
          e({
            navigation: {
              nextEl: null,
              prevEl: null,
              hideOnClick: !1,
              disabledClass: 'swiper-button-disabled',
              hiddenClass: 'swiper-button-hidden',
              lockClass: 'swiper-button-lock',
            },
          }),
            (b.navigation = { nextEl: null, $nextEl: null, prevEl: null, $prevEl: null }),
            a('init', () => {
              g(), f();
            }),
            a('toEdge fromEdge lock unlock', () => {
              f();
            }),
            a('destroy', () => {
              h();
            }),
            a('enable disable', () => {
              let { $nextEl: a, $prevEl: c } = b.navigation;
              a && a[b.enabled ? 'removeClass' : 'addClass'](b.params.navigation.lockClass),
                c && c[b.enabled ? 'removeClass' : 'addClass'](b.params.navigation.lockClass);
            }),
            a('click', (h, g) => {
              let { $nextEl: a, $prevEl: c } = b.navigation,
                e = g.target;
              if (
                b.params.navigation.hideOnClick &&
                !d(e).is(c) &&
                !d(e).is(a) &&
                (!(b.pagination && b.params.pagination && b.params.pagination.clickable) ||
                  (b.pagination.el !== e && !b.pagination.el.contains(e)))
              ) {
                let f;
                a
                  ? (f = a.hasClass(b.params.navigation.hiddenClass))
                  : c && (f = c.hasClass(b.params.navigation.hiddenClass)),
                  i(!0 === f ? 'navigationShow' : 'navigationHide'),
                  a && a.toggleClass(b.params.navigation.hiddenClass),
                  c && c.toggleClass(b.params.navigation.hiddenClass);
              }
            }),
            Object.assign(b.navigation, { update: f, init: g, destroy: h });
        },
        function (a) {
          let { swiper: c, extendParams: e, on: b, emit: j } = a,
            k,
            l =
              (e({
                pagination: {
                  el: null,
                  bulletElement: 'span',
                  clickable: !1,
                  hideOnClick: !1,
                  renderBullet: null,
                  renderProgressbar: null,
                  renderFraction: null,
                  renderCustom: null,
                  progressbarOpposite: !1,
                  type: 'bullets',
                  dynamicBullets: !1,
                  dynamicMainBullets: 1,
                  formatFractionCurrent: (a) => a,
                  formatFractionTotal: (a) => a,
                  bulletClass: (a = 'swiper-pagination') + '-bullet',
                  bulletActiveClass: a + '-bullet-active',
                  modifierClass: a + '-',
                  currentClass: a + '-current',
                  totalClass: a + '-total',
                  hiddenClass: a + '-hidden',
                  progressbarFillClass: a + '-progressbar-fill',
                  progressbarOppositeClass: a + '-progressbar-opposite',
                  clickableClass: a + '-clickable',
                  lockClass: a + '-lock',
                  horizontalClass: a + '-horizontal',
                  verticalClass: a + '-vertical',
                },
              }),
              (c.pagination = { el: null, $el: null, bullets: [] }),
              0);
          function m() {
            return (
              !c.params.pagination.el ||
              !c.pagination.el ||
              !c.pagination.$el ||
              0 === c.pagination.$el.length
            );
          }
          function n(d, a) {
            var b = c.params.pagination.bulletActiveClass;
            d[a]()
              .addClass(b + '-' + a)
              [a]()
              .addClass(b + `-${a}-` + a);
          }
          function f() {
            let y = c.rtl,
              a = c.params.pagination;
            if (!m()) {
              let i = (c.virtual && c.params.virtual.enabled ? c.virtual : c).slides.length,
                f = c.pagination.$el,
                e;
              var g = c.params.loop
                ? Math.ceil((i - 2 * c.loopedSlides) / c.params.slidesPerGroup)
                : c.snapGrid.length;
              if (
                (c.params.loop
                  ? ((e = Math.ceil((c.activeIndex - c.loopedSlides) / c.params.slidesPerGroup)) >
                      i - 1 - 2 * c.loopedSlides && (e -= i - 2 * c.loopedSlides),
                    e > g - 1 && (e -= g),
                    e < 0 && 'bullets' !== c.params.paginationType && (e = g + e))
                  : (e = void 0 !== c.snapIndex ? c.snapIndex : c.activeIndex || 0),
                'bullets' === a.type && c.pagination.bullets && 0 < c.pagination.bullets.length)
              ) {
                let b = c.pagination.bullets,
                  h,
                  o,
                  r;
                if (
                  (a.dynamicBullets &&
                    ((k = b.eq(0)[c.isHorizontal() ? 'outerWidth' : 'outerHeight'](!0)),
                    f.css(
                      c.isHorizontal() ? 'width' : 'height',
                      k * (a.dynamicMainBullets + 4) + 'px',
                    ),
                    1 < a.dynamicMainBullets &&
                      void 0 !== c.previousIndex &&
                      ((l += e - (c.previousIndex - c.loopedSlides || 0)) > a.dynamicMainBullets - 1
                        ? (l = a.dynamicMainBullets - 1)
                        : l < 0 && (l = 0)),
                    (r =
                      ((o =
                        (h = Math.max(e - l, 0)) + (Math.min(b.length, a.dynamicMainBullets) - 1)) +
                        h) /
                      2)),
                  b.removeClass(
                    ['', '-next', '-next-next', '-prev', '-prev-prev', '-main']
                      .map((b) => '' + a.bulletActiveClass + b)
                      .join(' '),
                  ),
                  1 < f.length)
                )
                  b.each((f) => {
                    let b = d(f),
                      c = b.index();
                    c === e && b.addClass(a.bulletActiveClass),
                      a.dynamicBullets &&
                        (c >= h && c <= o && b.addClass(a.bulletActiveClass + '-main'),
                        c === h && n(b, 'prev'),
                        c === o && n(b, 'next'));
                  });
                else {
                  let s = b.eq(e),
                    z = s.index();
                  if ((s.addClass(a.bulletActiveClass), a.dynamicBullets)) {
                    let t = b.eq(h),
                      u = b.eq(o);
                    for (let p = h; p <= o; p += 1) b.eq(p).addClass(a.bulletActiveClass + '-main');
                    if (c.params.loop) {
                      if (z >= b.length) {
                        for (let q = a.dynamicMainBullets; 0 <= q; --q)
                          b.eq(b.length - q).addClass(a.bulletActiveClass + '-main');
                        b.eq(b.length - a.dynamicMainBullets - 1).addClass(
                          a.bulletActiveClass + '-prev',
                        );
                      } else n(t, 'prev'), n(u, 'next');
                    } else n(t, 'prev'), n(u, 'next');
                  }
                }
                if (a.dynamicBullets) {
                  let A = Math.min(b.length, a.dynamicMainBullets + 4),
                    B = (k * A - k) / 2 - r * k,
                    C = y ? 'right' : 'left';
                  b.css(c.isHorizontal() ? C : 'top', B + 'px');
                }
              }
              if (
                ('fraction' === a.type &&
                  (f.find(G(a.currentClass)).text(a.formatFractionCurrent(e + 1)),
                  f.find(G(a.totalClass)).text(a.formatFractionTotal(g))),
                'progressbar' === a.type)
              ) {
                var D = a.progressbarOpposite
                  ? c.isHorizontal()
                    ? 'vertical'
                    : 'horizontal'
                  : c.isHorizontal()
                  ? 'horizontal'
                  : 'vertical';
                let v = (e + 1) / g,
                  w = 1,
                  x = 1;
                'horizontal' == D ? (w = v) : (x = v),
                  f
                    .find(G(a.progressbarFillClass))
                    .transform(`translate3d(0,0,0) scaleX(${w}) scaleY(${x})`)
                    .transition(c.params.speed);
              }
              'custom' === a.type && a.renderCustom
                ? (f.html(a.renderCustom(c, e + 1, g)), j('paginationRender', f[0]))
                : j('paginationUpdate', f[0]),
                c.params.watchOverflow &&
                  c.enabled &&
                  f[c.isLocked ? 'addClass' : 'removeClass'](a.lockClass);
            }
          }
          function g() {
            let a = c.params.pagination;
            if (!m()) {
              let e = (c.virtual && c.params.virtual.enabled ? c.virtual : c).slides.length,
                d = c.pagination.$el,
                b = '';
              if ('bullets' === a.type) {
                let f = c.params.loop
                  ? Math.ceil((e - 2 * c.loopedSlides) / c.params.slidesPerGroup)
                  : c.snapGrid.length;
                c.params.freeMode &&
                  c.params.freeMode.enabled &&
                  !c.params.loop &&
                  f > e &&
                  (f = e);
                for (let g = 0; g < f; g += 1)
                  a.renderBullet
                    ? (b += a.renderBullet.call(c, g, a.bulletClass))
                    : (b += `<${a.bulletElement} class="${a.bulletClass}"></${a.bulletElement}>`);
                d.html(b), (c.pagination.bullets = d.find(G(a.bulletClass)));
              }
              'fraction' === a.type &&
                ((b = a.renderFraction
                  ? a.renderFraction.call(c, a.currentClass, a.totalClass)
                  : `<span class="${a.currentClass}"></span> / <span class="${a.totalClass}"></span>`),
                d.html(b)),
                'progressbar' === a.type &&
                  ((b = a.renderProgressbar
                    ? a.renderProgressbar.call(c, a.progressbarFillClass)
                    : `<span class="${a.progressbarFillClass}"></span>`),
                  d.html(b)),
                'custom' !== a.type && j('paginationRender', c.pagination.$el[0]);
            }
          }
          function h() {
            c.params.pagination = F(c, c.originalParams.pagination, c.params.pagination, {
              el: 'swiper-pagination',
            });
            let a = c.params.pagination;
            if (a.el) {
              let b = d(a.el);
              0 !== b.length &&
                (c.params.uniqueNavElements &&
                  'string' == typeof a.el &&
                  1 < b.length &&
                  1 < (b = c.$el.find(a.el)).length &&
                  (b = b.filter((a) => d(a).parents('.swiper')[0] === c.el)),
                'bullets' === a.type && a.clickable && b.addClass(a.clickableClass),
                b.addClass(a.modifierClass + a.type),
                b.addClass(a.modifierClass + c.params.direction),
                'bullets' === a.type &&
                  a.dynamicBullets &&
                  (b.addClass('' + a.modifierClass + a.type + '-dynamic'),
                  (l = 0),
                  a.dynamicMainBullets < 1 && (a.dynamicMainBullets = 1)),
                'progressbar' === a.type &&
                  a.progressbarOpposite &&
                  b.addClass(a.progressbarOppositeClass),
                a.clickable &&
                  b.on('click', G(a.bulletClass), function (b) {
                    b.preventDefault();
                    let a = d(this).index() * c.params.slidesPerGroup;
                    c.params.loop && (a += c.loopedSlides), c.slideTo(a);
                  }),
                Object.assign(c.pagination, { $el: b, el: b[0] }),
                c.enabled || b.addClass(a.lockClass));
            }
          }
          function i() {
            var a = c.params.pagination;
            if (!m()) {
              let b = c.pagination.$el;
              b.removeClass(a.hiddenClass),
                b.removeClass(a.modifierClass + a.type),
                b.removeClass(a.modifierClass + c.params.direction),
                c.pagination.bullets &&
                  c.pagination.bullets.removeClass &&
                  c.pagination.bullets.removeClass(a.bulletActiveClass),
                a.clickable && b.off('click', G(a.bulletClass));
            }
          }
          b('init', () => {
            h(), g(), f();
          }),
            b('activeIndexChange', () => {
              (c.params.loop || void 0 === c.snapIndex) && f();
            }),
            b('snapIndexChange', () => {
              c.params.loop || f();
            }),
            b('slidesLengthChange', () => {
              c.params.loop && (g(), f());
            }),
            b('snapGridLengthChange', () => {
              c.params.loop || (g(), f());
            }),
            b('destroy', () => {
              i();
            }),
            b('enable disable', () => {
              let a = c.pagination.$el;
              a && a[c.enabled ? 'removeClass' : 'addClass'](c.params.pagination.lockClass);
            }),
            b('lock unlock', () => {
              f();
            }),
            b('click', (g, e) => {
              let a = e.target,
                b = c.pagination.$el;
              if (
                c.params.pagination.el &&
                c.params.pagination.hideOnClick &&
                0 < b.length &&
                !d(a).hasClass(c.params.pagination.bulletClass) &&
                (!c.navigation ||
                  !(
                    (c.navigation.nextEl && a === c.navigation.nextEl) ||
                    (c.navigation.prevEl && a === c.navigation.prevEl)
                  ))
              ) {
                let f = b.hasClass(c.params.pagination.hiddenClass);
                j(!0 === f ? 'paginationShow' : 'paginationHide'),
                  b.toggleClass(c.params.pagination.hiddenClass);
              }
            }),
            Object.assign(c.pagination, { render: g, update: f, init: h, destroy: i });
        },
        function (c) {
          let { swiper: b, extendParams: e, on: a, emit: k } = c,
            l = i(),
            m,
            o,
            p,
            q,
            r = !1,
            s = null,
            t = null;
          function f() {
            if (b.params.scrollbar.el && b.scrollbar.el) {
              let { scrollbar: e, rtlTranslate: f, progress: g } = b,
                { $dragEl: d, $el: h } = e,
                i = b.params.scrollbar,
                c = o,
                a = (p - o) * g;
              f
                ? 0 < (a = -a)
                  ? ((c = o - a), (a = 0))
                  : -a + o > p && (c = p + a)
                : a < 0
                ? ((c = o + a), (a = 0))
                : a + o > p && (c = p - a),
                b.isHorizontal()
                  ? (d.transform(`translate3d(${a}px, 0, 0)`), (d[0].style.width = c + 'px'))
                  : (d.transform(`translate3d(0px, ${a}px, 0)`), (d[0].style.height = c + 'px')),
                i.hide &&
                  (clearTimeout(s),
                  (h[0].style.opacity = 1),
                  (s = setTimeout(() => {
                    (h[0].style.opacity = 0), h.transition(400);
                  }, 1e3)));
            }
          }
          function g() {
            if (b.params.scrollbar.el && b.scrollbar.el) {
              let d = b.scrollbar,
                { $dragEl: a, $el: c } = d;
              (a[0].style.width = ''),
                (a[0].style.height = ''),
                (p = b.isHorizontal() ? c[0].offsetWidth : c[0].offsetHeight),
                (q =
                  b.size /
                  (b.virtualSize +
                    b.params.slidesOffsetBefore -
                    (b.params.centeredSlides ? b.snapGrid[0] : 0))),
                (o =
                  'auto' === b.params.scrollbar.dragSize
                    ? p * q
                    : parseInt(b.params.scrollbar.dragSize, 10)),
                b.isHorizontal() ? (a[0].style.width = o + 'px') : (a[0].style.height = o + 'px'),
                (c[0].style.display = 1 <= q ? 'none' : ''),
                b.params.scrollbar.hide && (c[0].style.opacity = 0),
                b.params.watchOverflow &&
                  b.enabled &&
                  d.$el[b.isLocked ? 'addClass' : 'removeClass'](b.params.scrollbar.lockClass);
            }
          }
          function u(a) {
            return b.isHorizontal()
              ? ('touchstart' === a.type || 'touchmove' === a.type ? a.targetTouches[0] : a).clientX
              : ('touchstart' === a.type || 'touchmove' === a.type ? a.targetTouches[0] : a)
                  .clientY;
          }
          function v(c) {
            let { scrollbar: d, rtlTranslate: e } = b,
              f = d.$el,
              a;
            (a = Math.max(
              Math.min(
                (a =
                  (u(c) -
                    f.offset()[b.isHorizontal() ? 'left' : 'top'] -
                    (null !== m ? m : o / 2)) /
                  (p - o)),
                1,
              ),
              0,
            )),
              e && (a = 1 - a),
              (c = b.minTranslate() + (b.maxTranslate() - b.minTranslate()) * a),
              b.updateProgress(c),
              b.setTranslate(c),
              b.updateActiveIndex(),
              b.updateSlidesClasses();
          }
          function w(a) {
            let e = b.params.scrollbar,
              { scrollbar: f, $wrapperEl: g } = b,
              { $el: d, $dragEl: c } = f;
            (r = !0),
              (m =
                a.target === c[0] || a.target === c
                  ? u(a) - a.target.getBoundingClientRect()[b.isHorizontal() ? 'left' : 'top']
                  : null),
              a.preventDefault(),
              a.stopPropagation(),
              g.transition(100),
              c.transition(100),
              v(a),
              clearTimeout(t),
              d.transition(0),
              e.hide && d.css('opacity', 1),
              b.params.cssMode && b.$wrapperEl.css('scroll-snap-type', 'none'),
              k('scrollbarDragStart', a);
          }
          function x(a) {
            let { scrollbar: c, $wrapperEl: d } = b,
              { $el: e, $dragEl: f } = c;
            r &&
              (a.preventDefault ? a.preventDefault() : (a.returnValue = !1),
              v(a),
              d.transition(0),
              e.transition(0),
              f.transition(0),
              k('scrollbarDragMove', a));
          }
          function y(c) {
            let a = b.params.scrollbar,
              { scrollbar: d, $wrapperEl: e } = b,
              f = d.$el;
            r &&
              ((r = !1),
              b.params.cssMode && (b.$wrapperEl.css('scroll-snap-type', ''), e.transition('')),
              a.hide &&
                (clearTimeout(t),
                (t = n(() => {
                  f.css('opacity', 0), f.transition(400);
                }, 1e3))),
              k('scrollbarDragEnd', c),
              a.snapOnRelease && b.slideToClosest());
          }
          function z(a) {
            let {
                scrollbar: j,
                touchEventsTouch: e,
                touchEventsDesktop: f,
                params: h,
                support: g,
              } = b,
              c = j.$el[0],
              d = !(!g.passiveListener || !h.passiveListeners) && { passive: !1, capture: !1 },
              i = !(!g.passiveListener || !h.passiveListeners) && { passive: !0, capture: !1 };
            c &&
              ((a = 'on' === a ? 'addEventListener' : 'removeEventListener'),
              g.touch
                ? (c[a](e.start, w, d), c[a](e.move, x, d), c[a](e.end, y, i))
                : (c[a](f.start, w, d), l[a](f.move, x, d), l[a](f.end, y, i)));
          }
          function h() {
            let { scrollbar: g, $el: f } = b;
            b.params.scrollbar = F(b, b.originalParams.scrollbar, b.params.scrollbar, {
              el: 'swiper-scrollbar',
            });
            var c = b.params.scrollbar;
            if (c.el) {
              let a = d(c.el),
                e = (a =
                  b.params.uniqueNavElements &&
                  'string' == typeof c.el &&
                  1 < a.length &&
                  1 === f.find(c.el).length
                    ? f.find(c.el)
                    : a).find('.' + b.params.scrollbar.dragClass);
              0 === e.length &&
                ((e = d(`<div class="${b.params.scrollbar.dragClass}"></div>`)), a.append(e)),
                Object.assign(g, { $el: a, el: a[0], $dragEl: e, dragEl: e[0] }),
                c.draggable && b.params.scrollbar.el && z('on'),
                a && a[b.enabled ? 'removeClass' : 'addClass'](b.params.scrollbar.lockClass);
            }
          }
          function j() {
            b.params.scrollbar.el && z('off');
          }
          e({
            scrollbar: {
              el: null,
              dragSize: 'auto',
              hide: !1,
              draggable: !1,
              snapOnRelease: !0,
              lockClass: 'swiper-scrollbar-lock',
              dragClass: 'swiper-scrollbar-drag',
            },
          }),
            (b.scrollbar = { el: null, dragEl: null, $el: null, $dragEl: null }),
            a('init', () => {
              h(), g(), f();
            }),
            a('update resize observerUpdate lock unlock', () => {
              g();
            }),
            a('setTranslate', () => {
              f();
            }),
            a('setTransition', (c, a) => {
              b.params.scrollbar.el && b.scrollbar.el && b.scrollbar.$dragEl.transition(a);
            }),
            a('enable disable', () => {
              let a = b.scrollbar.$el;
              a && a[b.enabled ? 'removeClass' : 'addClass'](b.params.scrollbar.lockClass);
            }),
            a('destroy', () => {
              j();
            }),
            Object.assign(b.scrollbar, { updateSize: g, setTranslate: f, init: h, destroy: j });
        },
        function (b) {
          let { swiper: e, extendParams: c, on: a } = b;
          c({ parallax: { enabled: !1 } });
          let f = (k, f) => {
              let l = e.rtl,
                c = d(k),
                i = l ? -1 : 1,
                j = c.attr('data-swiper-parallax') || '0',
                a = c.attr('data-swiper-parallax-x'),
                b = c.attr('data-swiper-parallax-y');
              var g = c.attr('data-swiper-parallax-scale'),
                h = c.attr('data-swiper-parallax-opacity');
              if (
                (a || b
                  ? ((a = a || '0'), (b = b || '0'))
                  : e.isHorizontal()
                  ? ((a = j), (b = '0'))
                  : ((b = j), (a = '0')),
                (a = 0 <= a.indexOf('%') ? parseInt(a, 10) * f * i + '%' : a * f * i + 'px'),
                (b = 0 <= b.indexOf('%') ? parseInt(b, 10) * f + '%' : b * f + 'px'),
                null != h)
              ) {
                let m = h - (h - 1) * (1 - Math.abs(f));
                c[0].style.opacity = m;
              }
              if (null == g) c.transform(`translate3d(${a}, ${b}, 0px)`);
              else {
                let n = g - (g - 1) * (1 - Math.abs(f));
                c.transform(`translate3d(${a}, ${b}, 0px) scale(${n})`);
              }
            },
            g = () => {
              let { $el: a, slides: b, progress: c, snapGrid: g } = e;
              a
                .children(
                  '[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y], [data-swiper-parallax-opacity], [data-swiper-parallax-scale]',
                )
                .each((a) => {
                  f(a, c);
                }),
                b.each((b, h) => {
                  let a = b.progress;
                  1 < e.params.slidesPerGroup &&
                    'auto' !== e.params.slidesPerView &&
                    (a += Math.ceil(h / 2) - c * (g.length - 1)),
                    (a = Math.min(Math.max(a, -1), 1)),
                    d(b)
                      .find(
                        '[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y], [data-swiper-parallax-opacity], [data-swiper-parallax-scale]',
                      )
                      .each((b) => {
                        f(b, a);
                      });
                });
            };
          a('beforeInit', () => {
            e.params.parallax.enabled &&
              ((e.params.watchSlidesProgress = !0), (e.originalParams.watchSlidesProgress = !0));
          }),
            a('init', () => {
              e.params.parallax.enabled && g();
            }),
            a('setTranslate', () => {
              e.params.parallax.enabled && g();
            }),
            a('setTransition', (f, b) => {
              if (e.params.parallax.enabled) {
                var a = b;
                void 0 === a && (a = e.params.speed);
                let c = e.$el;
                c.find(
                  '[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y], [data-swiper-parallax-opacity], [data-swiper-parallax-scale]',
                ).each((e) => {
                  let b = d(e),
                    c = parseInt(b.attr('data-swiper-parallax-duration'), 10) || a;
                  0 === a && (c = 0), b.transition(c);
                });
              }
            });
        },
        function (c) {
          let { swiper: b, extendParams: e, on: a, emit: l } = c,
            m = k();
          e({
            zoom: {
              enabled: !1,
              maxRatio: 3,
              minRatio: 1,
              toggle: !0,
              containerClass: 'swiper-zoom-container',
              zoomedSlideClass: 'swiper-slide-zoomed',
            },
          }),
            (b.zoom = { enabled: !1 });
          let n,
            o,
            q,
            r = 1,
            s = !1,
            t = {
              $slideEl: void 0,
              slideWidth: void 0,
              slideHeight: void 0,
              $imageEl: void 0,
              $imageWrapEl: void 0,
              maxRatio: 3,
            },
            u = {
              isTouched: void 0,
              isMoved: void 0,
              currentX: void 0,
              currentY: void 0,
              minX: void 0,
              minY: void 0,
              maxX: void 0,
              maxY: void 0,
              width: void 0,
              height: void 0,
              startX: void 0,
              startY: void 0,
              touchesStart: {},
              touchesCurrent: {},
            },
            v = {
              x: void 0,
              y: void 0,
              prevPositionX: void 0,
              prevPositionY: void 0,
              prevTime: void 0,
            },
            w = 1;
          function x(a) {
            if (a.targetTouches.length < 2) return 1;
            var b = a.targetTouches[0].pageX,
              c = a.targetTouches[0].pageY,
              d = a.targetTouches[1].pageX,
              a = a.targetTouches[1].pageY;
            return Math.sqrt((d - b) ** 2 + (a - c) ** 2);
          }
          function y(a) {
            var e = b.support,
              c = b.params.zoom;
            if (((o = !1), (q = !1), !e.gestures)) {
              if (
                'touchstart' !== a.type ||
                ('touchstart' === a.type && a.targetTouches.length < 2)
              )
                return;
              (o = !0), (t.scaleStart = x(a));
            }
            (t.$slideEl && t.$slideEl.length) ||
            ((t.$slideEl = d(a.target).closest('.' + b.params.slideClass)),
            0 === t.$slideEl.length && (t.$slideEl = b.slides.eq(b.activeIndex)),
            (t.$imageEl = t.$slideEl
              .find('.' + c.containerClass)
              .eq(0)
              .find('picture, img, svg, canvas, .swiper-zoom-target')
              .eq(0)),
            (t.$imageWrapEl = t.$imageEl.parent('.' + c.containerClass)),
            (t.maxRatio = t.$imageWrapEl.attr('data-swiper-zoom') || c.maxRatio),
            0 !== t.$imageWrapEl.length)
              ? (t.$imageEl && t.$imageEl.transition(0), (s = !0))
              : (t.$imageEl = void 0);
          }
          function z(c) {
            let e = b.support,
              d = b.params.zoom,
              a = b.zoom;
            if (!e.gestures) {
              if ('touchmove' !== c.type || ('touchmove' === c.type && c.targetTouches.length < 2))
                return;
              (q = !0), (t.scaleMove = x(c));
            }
            t.$imageEl && 0 !== t.$imageEl.length
              ? (e.gestures
                  ? (a.scale = c.scale * r)
                  : (a.scale = (t.scaleMove / t.scaleStart) * r),
                a.scale > t.maxRatio &&
                  (a.scale = t.maxRatio - 1 + (a.scale - t.maxRatio + 1) ** 0.5),
                a.scale < d.minRatio &&
                  (a.scale = d.minRatio + 1 - (d.minRatio - a.scale + 1) ** 0.5),
                t.$imageEl.transform(`translate3d(0,0,0) scale(${a.scale})`))
              : 'gesturechange' === c.type && y(c);
          }
          function A(c) {
            let d = b.device,
              e = b.support,
              f = b.params.zoom,
              a = b.zoom;
            if (!e.gestures) {
              if (
                !o ||
                !q ||
                'touchend' !== c.type ||
                ('touchend' === c.type && c.changedTouches.length < 2 && !d.android)
              )
                return;
              (o = !1), (q = !1);
            }
            t.$imageEl &&
              0 !== t.$imageEl.length &&
              ((a.scale = Math.max(Math.min(a.scale, t.maxRatio), f.minRatio)),
              t.$imageEl
                .transition(b.params.speed)
                .transform(`translate3d(0,0,0) scale(${a.scale})`),
              (r = a.scale),
              (s = !1),
              1 === a.scale && (t.$slideEl = void 0));
          }
          function B(a) {
            var c = b.zoom;
            if (
              t.$imageEl &&
              0 !== t.$imageEl.length &&
              ((b.allowClick = !1), u.isTouched && t.$slideEl)
            ) {
              u.isMoved ||
                ((u.width = t.$imageEl[0].offsetWidth),
                (u.height = t.$imageEl[0].offsetHeight),
                (u.startX = p(t.$imageWrapEl[0], 'x') || 0),
                (u.startY = p(t.$imageWrapEl[0], 'y') || 0),
                (t.slideWidth = t.$slideEl[0].offsetWidth),
                (t.slideHeight = t.$slideEl[0].offsetHeight),
                t.$imageWrapEl.transition(0));
              var d = u.width * c.scale,
                c = u.height * c.scale;
              if (!(d < t.slideWidth && c < t.slideHeight)) {
                if (
                  ((u.minX = Math.min(t.slideWidth / 2 - d / 2, 0)),
                  (u.maxX = -u.minX),
                  (u.minY = Math.min(t.slideHeight / 2 - c / 2, 0)),
                  (u.maxY = -u.minY),
                  (u.touchesCurrent.x = ('touchmove' === a.type ? a.targetTouches[0] : a).pageX),
                  (u.touchesCurrent.y = ('touchmove' === a.type ? a.targetTouches[0] : a).pageY),
                  !u.isMoved &&
                    !s &&
                    ((b.isHorizontal() &&
                      ((Math.floor(u.minX) === Math.floor(u.startX) &&
                        u.touchesCurrent.x < u.touchesStart.x) ||
                        (Math.floor(u.maxX) === Math.floor(u.startX) &&
                          u.touchesCurrent.x > u.touchesStart.x))) ||
                      (!b.isHorizontal() &&
                        ((Math.floor(u.minY) === Math.floor(u.startY) &&
                          u.touchesCurrent.y < u.touchesStart.y) ||
                          (Math.floor(u.maxY) === Math.floor(u.startY) &&
                            u.touchesCurrent.y > u.touchesStart.y)))))
                )
                  return void (u.isTouched = !1);
                a.cancelable && a.preventDefault(),
                  a.stopPropagation(),
                  (u.isMoved = !0),
                  (u.currentX = u.touchesCurrent.x - u.touchesStart.x + u.startX),
                  (u.currentY = u.touchesCurrent.y - u.touchesStart.y + u.startY),
                  u.currentX < u.minX &&
                    (u.currentX = u.minX + 1 - (u.minX - u.currentX + 1) ** 0.8),
                  u.currentX > u.maxX &&
                    (u.currentX = u.maxX - 1 + (u.currentX - u.maxX + 1) ** 0.8),
                  u.currentY < u.minY &&
                    (u.currentY = u.minY + 1 - (u.minY - u.currentY + 1) ** 0.8),
                  u.currentY > u.maxY &&
                    (u.currentY = u.maxY - 1 + (u.currentY - u.maxY + 1) ** 0.8),
                  v.prevPositionX || (v.prevPositionX = u.touchesCurrent.x),
                  v.prevPositionY || (v.prevPositionY = u.touchesCurrent.y),
                  v.prevTime || (v.prevTime = Date.now()),
                  (v.x = (u.touchesCurrent.x - v.prevPositionX) / (Date.now() - v.prevTime) / 2),
                  (v.y = (u.touchesCurrent.y - v.prevPositionY) / (Date.now() - v.prevTime) / 2),
                  2 > Math.abs(u.touchesCurrent.x - v.prevPositionX) && (v.x = 0),
                  2 > Math.abs(u.touchesCurrent.y - v.prevPositionY) && (v.y = 0),
                  (v.prevPositionX = u.touchesCurrent.x),
                  (v.prevPositionY = u.touchesCurrent.y),
                  (v.prevTime = Date.now()),
                  t.$imageWrapEl.transform(`translate3d(${u.currentX}px, ${u.currentY}px,0)`);
              }
            }
          }
          function C() {
            let a = b.zoom;
            t.$slideEl &&
              b.previousIndex !== b.activeIndex &&
              (t.$imageEl && t.$imageEl.transform('translate3d(0,0,0) scale(1)'),
              t.$imageWrapEl && t.$imageWrapEl.transform('translate3d(0,0,0)'),
              (a.scale = 1),
              (r = 1),
              (t.$slideEl = void 0),
              (t.$imageEl = void 0),
              (t.$imageWrapEl = void 0));
          }
          function f(a) {
            let f = b.zoom,
              g = b.params.zoom;
            if (
              (t.$slideEl ||
                (a && a.target && (t.$slideEl = d(a.target).closest('.' + b.params.slideClass)),
                t.$slideEl ||
                  (b.params.virtual && b.params.virtual.enabled && b.virtual
                    ? (t.$slideEl = b.$wrapperEl.children('.' + b.params.slideActiveClass))
                    : (t.$slideEl = b.slides.eq(b.activeIndex))),
                (t.$imageEl = t.$slideEl
                  .find('.' + g.containerClass)
                  .eq(0)
                  .find('picture, img, svg, canvas, .swiper-zoom-target')
                  .eq(0)),
                (t.$imageWrapEl = t.$imageEl.parent('.' + g.containerClass))),
              t.$imageEl &&
                0 !== t.$imageEl.length &&
                t.$imageWrapEl &&
                0 !== t.$imageWrapEl.length)
            ) {
              let h, p, q, s, v, w, c, e, x, y, z, A, i, j, k, l, n, o;
              b.params.cssMode &&
                ((b.wrapperEl.style.overflow = 'hidden'), (b.wrapperEl.style.touchAction = 'none')),
                t.$slideEl.addClass('' + g.zoomedSlideClass),
                (p =
                  void 0 === u.touchesStart.x && a
                    ? ((h = ('touchend' === a.type ? a.changedTouches[0] : a).pageX),
                      ('touchend' === a.type ? a.changedTouches[0] : a).pageY)
                    : ((h = u.touchesStart.x), u.touchesStart.y)),
                (f.scale = t.$imageWrapEl.attr('data-swiper-zoom') || g.maxRatio),
                (r = t.$imageWrapEl.attr('data-swiper-zoom') || g.maxRatio),
                a
                  ? ((n = t.$slideEl[0].offsetWidth),
                    (o = t.$slideEl[0].offsetHeight),
                    (q = t.$slideEl.offset().left + m.scrollX),
                    (s = t.$slideEl.offset().top + m.scrollY),
                    (v = q + n / 2 - h),
                    (w = s + o / 2 - p),
                    (x = t.$imageEl[0].offsetWidth),
                    (y = t.$imageEl[0].offsetHeight),
                    (z = x * f.scale),
                    (A = y * f.scale),
                    (k = -(i = Math.min(n / 2 - z / 2, 0))),
                    (l = -(j = Math.min(o / 2 - A / 2, 0))),
                    (c = v * f.scale),
                    (e = w * f.scale),
                    (c = c < i ? i : c) > k && (c = k),
                    (e = e < j ? j : e) > l && (e = l))
                  : ((c = 0), (e = 0)),
                t.$imageWrapEl.transition(300).transform(`translate3d(${c}px, ${e}px,0)`),
                t.$imageEl.transition(300).transform(`translate3d(0,0,0) scale(${f.scale})`);
            }
          }
          function g() {
            let c = b.zoom,
              a = b.params.zoom;
            t.$slideEl ||
              (b.params.virtual && b.params.virtual.enabled && b.virtual
                ? (t.$slideEl = b.$wrapperEl.children('.' + b.params.slideActiveClass))
                : (t.$slideEl = b.slides.eq(b.activeIndex)),
              (t.$imageEl = t.$slideEl
                .find('.' + a.containerClass)
                .eq(0)
                .find('picture, img, svg, canvas, .swiper-zoom-target')
                .eq(0)),
              (t.$imageWrapEl = t.$imageEl.parent('.' + a.containerClass))),
              t.$imageEl &&
                0 !== t.$imageEl.length &&
                t.$imageWrapEl &&
                0 !== t.$imageWrapEl.length &&
                (b.params.cssMode &&
                  ((b.wrapperEl.style.overflow = ''), (b.wrapperEl.style.touchAction = '')),
                (c.scale = 1),
                (r = 1),
                t.$imageWrapEl.transition(300).transform('translate3d(0,0,0)'),
                t.$imageEl.transition(300).transform('translate3d(0,0,0) scale(1)'),
                t.$slideEl.removeClass('' + a.zoomedSlideClass),
                (t.$slideEl = void 0));
          }
          function h(c) {
            var a = b.zoom;
            a.scale && 1 !== a.scale ? g() : f(c);
          }
          function D() {
            var a = b.support;
            return {
              passiveListener: !(
                'touchstart' !== b.touchEvents.start ||
                !a.passiveListener ||
                !b.params.passiveListeners
              ) && { passive: !0, capture: !1 },
              activeListenerWithCapture: !a.passiveListener || { passive: !1, capture: !0 },
            };
          }
          function E() {
            return '.' + b.params.slideClass;
          }
          function F(a) {
            var c = D().passiveListener,
              d = E();
            b.$wrapperEl[a]('gesturestart', d, y, c),
              b.$wrapperEl[a]('gesturechange', d, z, c),
              b.$wrapperEl[a]('gestureend', d, A, c);
          }
          function $() {
            n || ((n = !0), F('on'));
          }
          function G() {
            n && ((n = !1), F('off'));
          }
          function i() {
            var e, a, d, c;
            let f = b.zoom;
            f.enabled ||
              ((f.enabled = !0),
              (e = b.support),
              ({ passiveListener: a, activeListenerWithCapture: d } = D()),
              (c = E()),
              e.gestures
                ? (b.$wrapperEl.on(b.touchEvents.start, $, a),
                  b.$wrapperEl.on(b.touchEvents.end, G, a))
                : 'touchstart' === b.touchEvents.start &&
                  (b.$wrapperEl.on(b.touchEvents.start, c, y, a),
                  b.$wrapperEl.on(b.touchEvents.move, c, z, d),
                  b.$wrapperEl.on(b.touchEvents.end, c, A, a),
                  b.touchEvents.cancel && b.$wrapperEl.on(b.touchEvents.cancel, c, A, a)),
              b.$wrapperEl.on(b.touchEvents.move, '.' + b.params.zoom.containerClass, B, d));
          }
          function j() {
            var e, a, d, c;
            let f = b.zoom;
            f.enabled &&
              ((e = b.support),
              ({ passiveListener: a, activeListenerWithCapture: d } = ((f.enabled = !1), D())),
              (c = E()),
              e.gestures
                ? (b.$wrapperEl.off(b.touchEvents.start, $, a),
                  b.$wrapperEl.off(b.touchEvents.end, G, a))
                : 'touchstart' === b.touchEvents.start &&
                  (b.$wrapperEl.off(b.touchEvents.start, c, y, a),
                  b.$wrapperEl.off(b.touchEvents.move, c, z, d),
                  b.$wrapperEl.off(b.touchEvents.end, c, A, a),
                  b.touchEvents.cancel && b.$wrapperEl.off(b.touchEvents.cancel, c, A, a)),
              b.$wrapperEl.off(b.touchEvents.move, '.' + b.params.zoom.containerClass, B, d));
          }
          Object.defineProperty(b.zoom, 'scale', {
            get: () => w,
            set(a) {
              var b, c;
              w !== a &&
                ((b = t.$imageEl ? t.$imageEl[0] : void 0),
                (c = t.$slideEl ? t.$slideEl[0] : void 0),
                l('zoomChange', a, b, c)),
                (w = a);
            },
          }),
            a('init', () => {
              b.params.zoom.enabled && i();
            }),
            a('destroy', () => {
              j();
            }),
            a('touchStart', (d, a) => {
              var c;
              b.zoom.enabled &&
                ((c = b.device),
                t.$imageEl &&
                  0 !== t.$imageEl.length &&
                  (u.isTouched ||
                    (c.android && a.cancelable && a.preventDefault(),
                    (u.isTouched = !0),
                    (u.touchesStart.x = ('touchstart' === a.type ? a.targetTouches[0] : a).pageX),
                    (u.touchesStart.y = (
                      'touchstart' === a.type ? a.targetTouches[0] : a
                    ).pageY))));
            }),
            a('touchEnd', (h, i) => {
              if (b.zoom.enabled) {
                var f = b.zoom;
                if (t.$imageEl && 0 !== t.$imageEl.length) {
                  if (!u.isTouched || !u.isMoved)
                    return void ((u.isTouched = !1), (u.isMoved = !1));
                  (u.isTouched = !1), (u.isMoved = !1);
                  let d = 300,
                    e = 300;
                  var a = v.x * d,
                    a = u.currentX + a,
                    c = v.y * e,
                    c = u.currentY + c,
                    g =
                      (0 !== v.x && (d = Math.abs((a - u.currentX) / v.x)),
                      0 !== v.y && (e = Math.abs((c - u.currentY) / v.y)),
                      Math.max(d, e)),
                    a = ((u.currentX = a), (u.currentY = c), u.width * f.scale),
                    c = u.height * f.scale;
                  (u.minX = Math.min(t.slideWidth / 2 - a / 2, 0)),
                    (u.maxX = -u.minX),
                    (u.minY = Math.min(t.slideHeight / 2 - c / 2, 0)),
                    (u.maxY = -u.minY),
                    (u.currentX = Math.max(Math.min(u.currentX, u.maxX), u.minX)),
                    (u.currentY = Math.max(Math.min(u.currentY, u.maxY), u.minY)),
                    t.$imageWrapEl
                      .transition(g)
                      .transform(`translate3d(${u.currentX}px, ${u.currentY}px,0)`);
                }
              }
            }),
            a('doubleTap', (c, a) => {
              !b.animating &&
                b.params.zoom.enabled &&
                b.zoom.enabled &&
                b.params.zoom.toggle &&
                h(a);
            }),
            a('transitionEnd', () => {
              b.zoom.enabled && b.params.zoom.enabled && C();
            }),
            a('slideChange', () => {
              b.zoom.enabled && b.params.zoom.enabled && b.params.cssMode && C();
            }),
            Object.assign(b.zoom, { enable: i, disable: j, in: f, out: g, toggle: h });
        },
        function (c) {
          let { swiper: b, extendParams: e, on: a, emit: h } = c,
            i =
              (e({
                lazy: {
                  checkInView: !1,
                  enabled: !1,
                  loadPrevNext: !1,
                  loadPrevNextAmount: 1,
                  loadOnTransitionStart: !1,
                  scrollingElement: '',
                  elementClass: 'swiper-lazy',
                  loadingClass: 'swiper-lazy-loading',
                  loadedClass: 'swiper-lazy-loaded',
                  preloaderClass: 'swiper-lazy-preloader',
                },
              }),
              (b.lazy = {}),
              !1),
            j = !1;
          function f(e, i) {
            void 0 === i && (i = !0);
            let a = b.params.lazy;
            if (void 0 !== e && 0 !== b.slides.length) {
              let c =
                  b.virtual && b.params.virtual.enabled
                    ? b.$wrapperEl.children(
                        `.${b.params.slideClass}[data-swiper-slide-index="${e}"]`,
                      )
                    : b.slides.eq(e),
                g = c.find(`.${a.elementClass}:not(.${a.loadedClass}):not(.${a.loadingClass})`);
              !c.hasClass(a.elementClass) ||
                c.hasClass(a.loadedClass) ||
                c.hasClass(a.loadingClass) ||
                g.push(c[0]),
                0 !== g.length &&
                  g.each((g) => {
                    let e = d(g),
                      j = (e.addClass(a.loadingClass), e.attr('data-background')),
                      k = e.attr('data-src'),
                      l = e.attr('data-srcset'),
                      m = e.attr('data-sizes'),
                      n = e.parent('picture');
                    b.loadImage(e[0], k || j, l, m, !1, () => {
                      var g;
                      null == b ||
                        !b ||
                        (b && !b.params) ||
                        b.destroyed ||
                        (j
                          ? (e.css('background-image', `url("${j}")`),
                            e.removeAttr('data-background'))
                          : (l && (e.attr('srcset', l), e.removeAttr('data-srcset')),
                            m && (e.attr('sizes', m), e.removeAttr('data-sizes')),
                            n.length &&
                              n.children('source').each((b) => {
                                let a = d(b);
                                a.attr('data-srcset') &&
                                  (a.attr('srcset', a.attr('data-srcset')),
                                  a.removeAttr('data-srcset'));
                              }),
                            k && (e.attr('src', k), e.removeAttr('data-src'))),
                        e.addClass(a.loadedClass).removeClass(a.loadingClass),
                        c.find('.' + a.preloaderClass).remove(),
                        b.params.loop &&
                          i &&
                          ((g = c.attr('data-swiper-slide-index')),
                          c.hasClass(b.params.slideDuplicateClass)
                            ? f(
                                b.$wrapperEl
                                  .children(
                                    `[data-swiper-slide-index="${g}"]:not(.${b.params.slideDuplicateClass})`,
                                  )
                                  .index(),
                                !1,
                              )
                            : f(
                                b.$wrapperEl
                                  .children(
                                    `.${b.params.slideDuplicateClass}[data-swiper-slide-index="${g}"]`,
                                  )
                                  .index(),
                                !1,
                              )),
                        h('lazyImageReady', c[0], e[0]),
                        b.params.autoHeight && b.updateAutoHeight());
                    }),
                      h('lazyImageLoad', c[0], e[0]);
                  });
            }
          }
          function g() {
            let { $wrapperEl: l, params: e, slides: s, activeIndex: a } = b,
              v = b.virtual && e.virtual.enabled,
              g = e.lazy,
              c = e.slidesPerView;
            function m(a) {
              if (v) {
                if (l.children(`.${e.slideClass}[data-swiper-slide-index="${a}"]`).length) return 1;
              } else if (s[a]) return 1;
            }
            function o(a) {
              return v ? d(a).attr('data-swiper-slide-index') : d(a).index();
            }
            if (('auto' === c && (c = 0), (j = j || !0), b.params.watchSlidesProgress))
              l.children('.' + e.slideVisibleClass).each((a) => {
                f(v ? d(a).attr('data-swiper-slide-index') : d(a).index());
              });
            else if (1 < c) for (let h = a; h < a + c; h += 1) m(h) && f(h);
            else f(a);
            if (g.loadPrevNext) {
              if (1 < c || (g.loadPrevNextAmount && 1 < g.loadPrevNextAmount)) {
                let p = g.loadPrevNextAmount,
                  n = c,
                  t = Math.min(a + n + Math.max(p, n), s.length),
                  u = Math.max(a - Math.max(n, p), 0);
                for (let i = a + c; i < t; i += 1) m(i) && f(i);
                for (let k = u; k < a; k += 1) m(k) && f(k);
              } else {
                let q = l.children('.' + e.slideNextClass),
                  r = (0 < q.length && f(o(q)), l.children('.' + e.slidePrevClass));
                0 < r.length && f(o(r));
              }
            }
          }
          function l() {
            var c = k();
            if (b && !b.destroyed) {
              let f = b.params.lazy.scrollingElement ? d(b.params.lazy.scrollingElement) : d(c),
                j = f[0] === c,
                o = j ? c.innerWidth : f[0].offsetWidth,
                p = j ? c.innerHeight : f[0].offsetHeight,
                a = b.$el.offset(),
                q = b.rtlTranslate,
                m = !1;
              q && (a.left -= b.$el[0].scrollLeft);
              var n = [
                [a.left, a.top],
                [a.left + b.width, a.top],
                [a.left, a.top + b.height],
                [a.left + b.width, a.top + b.height],
              ];
              for (let h = 0; h < n.length; h += 1) {
                let e = n[h];
                0 <= e[0] &&
                  e[0] <= o &&
                  0 <= e[1] &&
                  e[1] <= p &&
                  ((0 === e[0] && 0 === e[1]) || (m = !0));
              }
              (c = !(
                'touchstart' !== b.touchEvents.start ||
                !b.support.passiveListener ||
                !b.params.passiveListeners
              ) && { passive: !0, capture: !1 }),
                m ? (g(), f.off('scroll', l, c)) : i || ((i = !0), f.on('scroll', l, c));
            }
          }
          a('beforeInit', () => {
            b.params.lazy.enabled && b.params.preloadImages && (b.params.preloadImages = !1);
          }),
            a('init', () => {
              b.params.lazy.enabled && (b.params.lazy.checkInView ? l : g)();
            }),
            a('scroll', () => {
              b.params.freeMode && b.params.freeMode.enabled && !b.params.freeMode.sticky && g();
            }),
            a('scrollbarDragMove resize _freeModeNoMomentumRelease', () => {
              b.params.lazy.enabled && (b.params.lazy.checkInView ? l : g)();
            }),
            a('transitionStart', () => {
              b.params.lazy.enabled &&
                (b.params.lazy.loadOnTransitionStart ||
                  (!b.params.lazy.loadOnTransitionStart && !j)) &&
                (b.params.lazy.checkInView ? l : g)();
            }),
            a('transitionEnd', () => {
              b.params.lazy.enabled &&
                !b.params.lazy.loadOnTransitionStart &&
                (b.params.lazy.checkInView ? l : g)();
            }),
            a('slideChange', () => {
              var {
                lazy: a,
                cssMode: c,
                watchSlidesProgress: d,
                touchReleaseOnEdges: e,
                resistanceRatio: f,
              } = b.params;
              a.enabled && (c || (d && (e || 0 === f))) && g();
            }),
            Object.assign(b.lazy, { load: g, loadInSlide: f });
        },
        function (c) {
          let { swiper: b, extendParams: d, on: a } = c;
          function e(a, b) {
            let c,
              d,
              e,
              f = (a, b) => {
                for (d = -1, c = a.length; 1 < c - d; )
                  a[(e = (c + d) >> 1)] <= b ? (d = e) : (c = e);
                return c;
              },
              g,
              h;
            return (
              (this.x = a),
              (this.y = b),
              (this.lastIndex = a.length - 1),
              (this.interpolate = function (a) {
                return a
                  ? ((g = (h = f(this.x, a)) - 1),
                    ((a - this.x[g]) * (this.y[h] - this.y[g])) / (this.x[h] - this.x[g]) +
                      this.y[g])
                  : 0;
              }),
              this
            );
          }
          function f() {
            b.controller.control &&
              b.controller.spline &&
              ((b.controller.spline = void 0), delete b.controller.spline);
          }
          d({ controller: { control: void 0, inverse: !1, by: 'slide' } }),
            (b.controller = { control: void 0 }),
            a('beforeInit', () => {
              b.controller.control = b.params.controller.control;
            }),
            a('update', () => {
              f();
            }),
            a('resize', () => {
              f();
            }),
            a('observerUpdate', () => {
              f();
            }),
            a('setTranslate', (d, a, c) => {
              b.controller.control && b.controller.setTranslate(a, c);
            }),
            a('setTransition', (d, a, c) => {
              b.controller.control && b.controller.setTransition(a, c);
            }),
            Object.assign(b.controller, {
              setTranslate: function (h, d) {
                var a = b.controller.control;
                let i, j;
                var f = b.constructor;
                function g(a) {
                  var c,
                    d = b.rtlTranslate ? -b.translate : b.translate;
                  'slide' === b.params.controller.by &&
                    ((c = a),
                    b.controller.spline ||
                      (b.controller.spline = b.params.loop
                        ? new e(b.slidesGrid, c.slidesGrid)
                        : new e(b.snapGrid, c.snapGrid)),
                    (j = -b.controller.spline.interpolate(-d))),
                    (j && 'container' !== b.params.controller.by) ||
                      ((i =
                        (a.maxTranslate() - a.minTranslate()) /
                        (b.maxTranslate() - b.minTranslate())),
                      (j = (d - b.minTranslate()) * i + a.minTranslate())),
                    b.params.controller.inverse && (j = a.maxTranslate() - j),
                    a.updateProgress(j),
                    a.setTranslate(j, b),
                    a.updateActiveIndex(),
                    a.updateSlidesClasses();
                }
                if (Array.isArray(a))
                  for (let c = 0; c < a.length; c += 1) a[c] !== d && a[c] instanceof f && g(a[c]);
                else a instanceof f && d !== a && g(a);
              },
              setTransition: function (g, d) {
                let e = b.constructor,
                  a = b.controller.control,
                  c;
                function f(c) {
                  c.setTransition(g, b),
                    0 !== g &&
                      (c.transitionStart(),
                      c.params.autoHeight &&
                        n(() => {
                          c.updateAutoHeight();
                        }),
                      c.$wrapperEl.transitionEnd(() => {
                        a &&
                          (c.params.loop && 'slide' === b.params.controller.by && c.loopFix(),
                          c.transitionEnd());
                      }));
                }
                if (Array.isArray(a))
                  for (c = 0; c < a.length; c += 1) a[c] !== d && a[c] instanceof e && f(a[c]);
                else a instanceof e && d !== a && f(a);
              },
            });
        },
        function (b) {
          let { swiper: e, extendParams: c, on: a } = b,
            f =
              (c({
                a11y: {
                  enabled: !0,
                  notificationClass: 'swiper-notification',
                  prevSlideMessage: 'Previous slide',
                  nextSlideMessage: 'Next slide',
                  firstSlideMessage: 'This is the first slide',
                  lastSlideMessage: 'This is the last slide',
                  paginationBulletMessage: 'Go to slide {{index}}',
                  slideLabelMessage: '{{index}} / {{slidesLength}}',
                  containerMessage: null,
                  containerRoleDescriptionMessage: null,
                  itemRoleDescriptionMessage: null,
                  slideRole: 'group',
                },
              }),
              null);
          function g(b) {
            let a = f;
            0 !== a.length && (a.html(''), a.html(b));
          }
          function h(a) {
            a.attr('tabIndex', '0');
          }
          function i(a) {
            a.attr('tabIndex', '-1');
          }
          function j(a, b) {
            a.attr('role', b);
          }
          function k(a, b) {
            a.attr('aria-roledescription', b);
          }
          function l(a, b) {
            a.attr('aria-label', b);
          }
          function m(a) {
            a.attr('aria-disabled', !0);
          }
          function n(a) {
            a.attr('aria-disabled', !1);
          }
          function o(c) {
            if (13 === c.keyCode || 32 === c.keyCode) {
              let a = e.params.a11y,
                b = d(c.target);
              e.navigation &&
                e.navigation.$nextEl &&
                b.is(e.navigation.$nextEl) &&
                ((e.isEnd && !e.params.loop) || e.slideNext(),
                e.isEnd ? g(a.lastSlideMessage) : g(a.nextSlideMessage)),
                e.navigation &&
                  e.navigation.$prevEl &&
                  b.is(e.navigation.$prevEl) &&
                  ((e.isBeginning && !e.params.loop) || e.slidePrev(),
                  e.isBeginning ? g(a.firstSlideMessage) : g(a.prevSlideMessage)),
                e.pagination && b.is(G(e.params.pagination.bulletClass)) && b[0].click();
            }
          }
          function p() {
            return e.pagination && e.pagination.bullets && e.pagination.bullets.length;
          }
          function q() {
            return p() && e.params.pagination.clickable;
          }
          let r = (a, b, c) => {
              h(a),
                'BUTTON' !== a[0].tagName && (j(a, 'button'), a.on('keydown', o)),
                l(a, c),
                a.attr('aria-controls', b);
            },
            s = (a) => {
              var b,
                c,
                a = a.target.closest('.' + e.params.slideClass);
              a &&
                e.slides.includes(a) &&
                ((b = e.slides.indexOf(a) === e.activeIndex),
                (c =
                  e.params.watchSlidesProgress && e.visibleSlides && e.visibleSlides.includes(a)),
                b || c || e.slideTo(e.slides.indexOf(a), 0));
            };
          a('beforeInit', () => {
            f = d(
              `<span class="${e.params.a11y.notificationClass}" aria-live="assertive" aria-atomic="true"></span>`,
            );
          }),
            a('afterInit', () => {
              if (e.params.a11y.enabled) {
                let a = e.params.a11y;
                e.$el.append(f);
                var b = e.$el;
                a.containerRoleDescriptionMessage && k(b, a.containerRoleDescriptionMessage),
                  a.containerMessage && l(b, a.containerMessage);
                let h = e.$wrapperEl,
                  i =
                    h.attr('id') ||
                    'swiper-wrapper-' +
                      'x'
                        .repeat((b = b = 16))
                        .replace(/x/g, () => Math.round(16 * Math.random()).toString(16)),
                  m =
                    ((b = e.params.autoplay && e.params.autoplay.enabled ? 'off' : 'polite'),
                    h.attr('id', i),
                    h.attr('aria-live', b),
                    a.itemRoleDescriptionMessage && k(d(e.slides), a.itemRoleDescriptionMessage),
                    j(d(e.slides), a.slideRole),
                    (e.params.loop
                      ? e.slides.filter((a) => !a.classList.contains(e.params.slideDuplicateClass))
                      : e.slides
                    ).length),
                  c,
                  g;
                e.slides.each((c, f) => {
                  let b = d(c),
                    g = e.params.loop ? parseInt(b.attr('data-swiper-slide-index'), 10) : f;
                  l(
                    b,
                    a.slideLabelMessage
                      .replace(/\{\{index\}\}/, g + 1)
                      .replace(/\{\{slidesLength\}\}/, m),
                  );
                }),
                  e.navigation && e.navigation.$nextEl && (c = e.navigation.$nextEl),
                  e.navigation && e.navigation.$prevEl && (g = e.navigation.$prevEl),
                  c && c.length && r(c, i, a.nextSlideMessage),
                  g && g.length && r(g, i, a.prevSlideMessage),
                  q() && e.pagination.$el.on('keydown', G(e.params.pagination.bulletClass), o),
                  e.$el.on('focus', s, !0);
              }
            }),
            a('fromEdge toEdge afterInit lock unlock', () => {
              var a, b;
              e.params.a11y.enabled &&
                (e.params.loop ||
                  e.params.rewind ||
                  !e.navigation ||
                  (({ $nextEl: a, $prevEl: b } = e.navigation),
                  b && 0 < b.length && (e.isBeginning ? (m(b), i(b)) : (n(b), h(b))),
                  a && 0 < a.length && (e.isEnd ? (m(a), i(a)) : (n(a), h(a)))));
            }),
            a('paginationUpdate', () => {
              if (e.params.a11y.enabled) {
                let a = e.params.a11y;
                p() &&
                  e.pagination.bullets.each((c) => {
                    let b = d(c);
                    e.params.pagination.clickable &&
                      (h(b),
                      e.params.pagination.renderBullet ||
                        (j(b, 'button'),
                        l(b, a.paginationBulletMessage.replace(/\{\{index\}\}/, b.index() + 1)))),
                      b.is('.' + e.params.pagination.bulletActiveClass)
                        ? b.attr('aria-current', 'true')
                        : b.removeAttr('aria-current');
                  });
              }
            }),
            a('destroy', () => {
              if (e.params.a11y.enabled) {
                let a, b;
                f && 0 < f.length && f.remove(),
                  e.navigation && e.navigation.$nextEl && (a = e.navigation.$nextEl),
                  e.navigation && e.navigation.$prevEl && (b = e.navigation.$prevEl),
                  a && a.off('keydown', o),
                  b && b.off('keydown', o),
                  q() && e.pagination.$el.off('keydown', G(e.params.pagination.bulletClass), o),
                  e.$el.off('focus', s, !0);
              }
            });
        },
        function (b) {
          let { swiper: d, extendParams: c, on: a } = b,
            e = (c({ history: { enabled: !1, root: '', replaceState: !1, key: 'slides' } }), !1),
            f = {},
            g = (a) =>
              a
                .toString()
                .replace(/\s+/g, '-')
                .replace(/[^\w-]+/g, '')
                .replace(/--+/g, '-')
                .replace(/^-+/, '')
                .replace(/-+$/, ''),
            h = (a) => {
              var b = k();
              return (
                (b = (a = (a ? new URL(a) : b.location).pathname
                  .slice(1)
                  .split('/')
                  .filter((a) => '' !== a)).length),
                { key: a[b - 2], value: a[b - 1] }
              );
            },
            i = (f, h) => {
              let c = k();
              if (e && d.params.history.enabled) {
                let i;
                i = d.params.url ? new URL(d.params.url) : c.location;
                let j = d.slides.eq(h),
                  a = g(j.attr('data-history'));
                if (0 < d.params.history.root.length) {
                  let b = d.params.history.root;
                  '/' === b[b.length - 1] && (b = b.slice(0, b.length - 1)), (a = b + `/${f}/` + a);
                } else i.pathname.includes(f) || (a = f + '/' + a);
                ((h = c.history.state) && h.value === a) ||
                  (d.params.history.replaceState
                    ? c.history.replaceState({ value: a }, null, a)
                    : c.history.pushState({ value: a }, null, a));
              }
            },
            j = (c, e, f) => {
              if (e)
                for (let a = 0, h = d.slides.length; a < h; a += 1) {
                  let b = d.slides.eq(a);
                  if (
                    g(b.attr('data-history')) === e &&
                    !b.hasClass(d.params.slideDuplicateClass)
                  ) {
                    let i = b.index();
                    d.slideTo(i, c, f);
                  }
                }
              else d.slideTo(0, c, f);
            },
            l = () => {
              (f = h(d.params.url)), j(d.params.speed, d.paths.value, !1);
            };
          a('init', () => {
            if (d.params.history.enabled) {
              let a = k();
              if (d.params.history) {
                if (!a.history || !a.history.pushState)
                  return void ((d.params.history.enabled = !1),
                  (d.params.hashNavigation.enabled = !0));
                (e = !0),
                  ((f = h(d.params.url)).key || f.value) &&
                    (j(0, f.value, d.params.runCallbacksOnInit),
                    d.params.history.replaceState || a.addEventListener('popstate', l));
              }
            }
          }),
            a('destroy', () => {
              if (d.params.history.enabled) {
                let a = k();
                d.params.history.replaceState || a.removeEventListener('popstate', l);
              }
            }),
            a('transitionEnd _freeModeNoMomentumRelease', () => {
              e && i(d.params.history.key, d.activeIndex);
            }),
            a('slideChange', () => {
              e && d.params.cssMode && i(d.params.history.key, d.activeIndex);
            });
        },
        function (b) {
          let { swiper: e, extendParams: c, emit: f, on: a } = b,
            g = !1,
            h = i(),
            j = k(),
            l =
              (c({ hashNavigation: { enabled: !1, replaceState: !1, watchState: !1 } }),
              () => {
                f('hashChange');
                var a = h.location.hash.replace('#', '');
                a === e.slides.eq(e.activeIndex).attr('data-hash') ||
                  (void 0 !==
                    (a = e.$wrapperEl
                      .children(`.${e.params.slideClass}[data-hash="${a}"]`)
                      .index()) &&
                    e.slideTo(a));
              }),
            m = () => {
              if (g && e.params.hashNavigation.enabled) {
                if (e.params.hashNavigation.replaceState && j.history && j.history.replaceState)
                  j.history.replaceState(
                    null,
                    null,
                    '#' + e.slides.eq(e.activeIndex).attr('data-hash'),
                  ),
                    f('hashSet');
                else {
                  let a = e.slides.eq(e.activeIndex),
                    b = a.attr('data-hash') || a.attr('data-history');
                  (h.location.hash = b || ''), f('hashSet');
                }
              }
            };
          a('init', () => {
            if (
              e.params.hashNavigation.enabled &&
              !(!e.params.hashNavigation.enabled || (e.params.history && e.params.history.enabled))
            ) {
              g = !0;
              let c = h.location.hash.replace('#', '');
              if (c)
                for (let b = 0, f = e.slides.length; b < f; b += 1) {
                  let a = e.slides.eq(b);
                  if (
                    (a.attr('data-hash') || a.attr('data-history')) === c &&
                    !a.hasClass(e.params.slideDuplicateClass)
                  ) {
                    let i = a.index();
                    e.slideTo(i, 0, e.params.runCallbacksOnInit, !0);
                  }
                }
              e.params.hashNavigation.watchState && d(j).on('hashchange', l);
            }
          }),
            a('destroy', () => {
              e.params.hashNavigation.enabled &&
                e.params.hashNavigation.watchState &&
                d(j).off('hashchange', l);
            }),
            a('transitionEnd _freeModeNoMomentumRelease', () => {
              g && m();
            }),
            a('slideChange', () => {
              g && e.params.cssMode && m();
            });
        },
        function (c) {
          let j,
            { swiper: b, extendParams: d, on: a, emit: k } = c;
          function e() {
            let a = b.slides.eq(b.activeIndex),
              c = b.params.autoplay.delay;
            a.attr('data-swiper-autoplay') &&
              (c = a.attr('data-swiper-autoplay') || b.params.autoplay.delay),
              clearTimeout(j),
              (j = n(() => {
                let a;
                b.params.autoplay.reverseDirection
                  ? b.params.loop
                    ? (b.loopFix(), (a = b.slidePrev(b.params.speed, !0, !0)), k('autoplay'))
                    : b.isBeginning
                    ? b.params.autoplay.stopOnLastSlide
                      ? g()
                      : ((a = b.slideTo(b.slides.length - 1, b.params.speed, !0, !0)),
                        k('autoplay'))
                    : ((a = b.slidePrev(b.params.speed, !0, !0)), k('autoplay'))
                  : b.params.loop
                  ? (b.loopFix(), (a = b.slideNext(b.params.speed, !0, !0)), k('autoplay'))
                  : b.isEnd
                  ? b.params.autoplay.stopOnLastSlide
                    ? g()
                    : ((a = b.slideTo(0, b.params.speed, !0, !0)), k('autoplay'))
                  : ((a = b.slideNext(b.params.speed, !0, !0)), k('autoplay')),
                  ((b.params.cssMode && b.autoplay.running) || !1 === a) && e();
              }, c));
          }
          function f() {
            return (
              void 0 === j &&
              !b.autoplay.running &&
              ((b.autoplay.running = !0), k('autoplayStart'), e(), !0)
            );
          }
          function g() {
            return (
              !!b.autoplay.running &&
              void 0 !== j &&
              (j && (clearTimeout(j), (j = void 0)),
              (b.autoplay.running = !1),
              k('autoplayStop'),
              !0)
            );
          }
          function h(a) {
            b.autoplay.running &&
              (b.autoplay.paused ||
                (j && clearTimeout(j),
                (b.autoplay.paused = !0),
                0 !== a && b.params.autoplay.waitForTransition
                  ? ['transitionend', 'webkitTransitionEnd'].forEach((a) => {
                      b.$wrapperEl[0].addEventListener(a, m);
                    })
                  : ((b.autoplay.paused = !1), e())));
          }
          function l() {
            var a = i();
            'hidden' === a.visibilityState && b.autoplay.running && h(),
              'visible' === a.visibilityState &&
                b.autoplay.paused &&
                (e(), (b.autoplay.paused = !1));
          }
          function m(a) {
            b &&
              !b.destroyed &&
              b.$wrapperEl &&
              a.target === b.$wrapperEl[0] &&
              (['transitionend', 'webkitTransitionEnd'].forEach((a) => {
                b.$wrapperEl[0].removeEventListener(a, m);
              }),
              (b.autoplay.paused = !1),
              (b.autoplay.running ? e : g)());
          }
          function o() {
            b.params.autoplay.disableOnInteraction ? g() : (k('autoplayPause'), h()),
              ['transitionend', 'webkitTransitionEnd'].forEach((a) => {
                b.$wrapperEl[0].removeEventListener(a, m);
              });
          }
          function p() {
            b.params.autoplay.disableOnInteraction ||
              ((b.autoplay.paused = !1), k('autoplayResume'), e());
          }
          (b.autoplay = { running: !1, paused: !1 }),
            d({
              autoplay: {
                enabled: !1,
                delay: 3e3,
                waitForTransition: !0,
                disableOnInteraction: !0,
                stopOnLastSlide: !1,
                reverseDirection: !1,
                pauseOnMouseEnter: !1,
              },
            }),
            a('init', () => {
              b.params.autoplay.enabled &&
                (f(),
                i().addEventListener('visibilitychange', l),
                b.params.autoplay.pauseOnMouseEnter &&
                  (b.$el.on('mouseenter', o), b.$el.on('mouseleave', p)));
            }),
            a('beforeTransitionStart', (d, a, c) => {
              b.autoplay.running &&
                (c || !b.params.autoplay.disableOnInteraction ? b.autoplay.pause(a) : g());
            }),
            a('sliderFirstMove', () => {
              b.autoplay.running && (b.params.autoplay.disableOnInteraction ? g : h)();
            }),
            a('touchEnd', () => {
              b.params.cssMode &&
                b.autoplay.paused &&
                !b.params.autoplay.disableOnInteraction &&
                e();
            }),
            a('destroy', () => {
              b.$el.off('mouseenter', o),
                b.$el.off('mouseleave', p),
                b.autoplay.running && g(),
                i().removeEventListener('visibilitychange', l);
            }),
            Object.assign(b.autoplay, { pause: h, run: e, start: f, stop: g });
        },
        function (c) {
          let { swiper: b, extendParams: e, on: a } = c,
            h =
              (e({
                thumbs: {
                  swiper: null,
                  multipleActiveThumbs: !0,
                  autoScrollOffset: 0,
                  slideThumbActiveClass: 'swiper-slide-thumb-active',
                  thumbsContainerClass: 'swiper-thumbs',
                },
              }),
              !1),
            i = !1;
          function j() {
            var c = b.thumbs.swiper;
            if (c) {
              let h = c.clickedIndex,
                i = c.clickedSlide;
              if (!((i && d(i).hasClass(b.params.thumbs.slideThumbActiveClass)) || null == h)) {
                let e;
                if (
                  ((e = c.params.loop
                    ? parseInt(d(c.clickedSlide).attr('data-swiper-slide-index'), 10)
                    : h),
                  b.params.loop)
                ) {
                  let a = b.activeIndex;
                  b.slides.eq(a).hasClass(b.params.slideDuplicateClass) &&
                    (b.loopFix(),
                    (b._clientLeft = b.$wrapperEl[0].clientLeft),
                    (a = b.activeIndex));
                  let f = b.slides.eq(a).prevAll(`[data-swiper-slide-index="${e}"]`).eq(0).index(),
                    g = b.slides.eq(a).nextAll(`[data-swiper-slide-index="${e}"]`).eq(0).index();
                  e = void 0 === f || (void 0 !== g && g - a < a - f) ? g : f;
                }
                b.slideTo(e);
              }
            }
          }
          function f() {
            var a = b.params.thumbs;
            if (h) return !1;
            h = !0;
            let c = b.constructor;
            return (
              a.swiper instanceof c
                ? ((b.thumbs.swiper = a.swiper),
                  Object.assign(b.thumbs.swiper.originalParams, {
                    watchSlidesProgress: !0,
                    slideToClickedSlide: !1,
                  }),
                  Object.assign(b.thumbs.swiper.params, {
                    watchSlidesProgress: !0,
                    slideToClickedSlide: !1,
                  }))
                : q(a.swiper) &&
                  ((a = Object.assign({}, a.swiper)),
                  Object.assign(a, { watchSlidesProgress: !0, slideToClickedSlide: !1 }),
                  (b.thumbs.swiper = new c(a)),
                  (i = !0)),
              b.thumbs.swiper.$el.addClass(b.params.thumbs.thumbsContainerClass),
              b.thumbs.swiper.on('tap', j),
              !0
            );
          }
          function g(o) {
            let a = b.thumbs.swiper;
            if (a) {
              let m =
                  'auto' === a.params.slidesPerView
                    ? a.slidesPerViewDynamic()
                    : a.params.slidesPerView,
                h = b.params.thumbs.autoScrollOffset,
                n = h && !a.params.loop;
              if (b.realIndex !== a.realIndex || n) {
                let d,
                  i,
                  c = a.activeIndex;
                if (a.params.loop) {
                  a.slides.eq(c).hasClass(a.params.slideDuplicateClass) &&
                    (a.loopFix(),
                    (a._clientLeft = a.$wrapperEl[0].clientLeft),
                    (c = a.activeIndex));
                  let g = a.slides
                      .eq(c)
                      .prevAll(`[data-swiper-slide-index="${b.realIndex}"]`)
                      .eq(0)
                      .index(),
                    e = a.slides
                      .eq(c)
                      .nextAll(`[data-swiper-slide-index="${b.realIndex}"]`)
                      .eq(0)
                      .index();
                  (d =
                    void 0 === g
                      ? e
                      : void 0 === e
                      ? g
                      : e - c == c - g
                      ? 1 < a.params.slidesPerGroup
                        ? e
                        : c
                      : e - c < c - g
                      ? e
                      : g),
                    (i = b.activeIndex > b.previousIndex ? 'next' : 'prev');
                } else i = (d = b.realIndex) > b.previousIndex ? 'next' : 'prev';
                n && (d += 'next' === i ? h : -1 * h),
                  a.visibleSlidesIndexes &&
                    0 > a.visibleSlidesIndexes.indexOf(d) &&
                    (a.params.centeredSlides
                      ? (d = d > c ? d - Math.floor(m / 2) + 1 : d + Math.floor(m / 2) - 1)
                      : d > c && a.params.slidesPerGroup,
                    a.slideTo(d, o ? 0 : void 0));
              }
              let f = 1;
              var j = b.params.thumbs.slideThumbActiveClass;
              if (
                (1 < b.params.slidesPerView &&
                  !b.params.centeredSlides &&
                  (f = b.params.slidesPerView),
                b.params.thumbs.multipleActiveThumbs || (f = 1),
                (f = Math.floor(f)),
                a.slides.removeClass(j),
                a.params.loop || (a.params.virtual && a.params.virtual.enabled))
              )
                for (let k = 0; k < f; k += 1)
                  a.$wrapperEl
                    .children(`[data-swiper-slide-index="${b.realIndex + k}"]`)
                    .addClass(j);
              else for (let l = 0; l < f; l += 1) a.slides.eq(b.realIndex + l).addClass(j);
            }
          }
          (b.thumbs = { swiper: null }),
            a('beforeInit', () => {
              var a = b.params.thumbs;
              a && a.swiper && (f(), g(!0));
            }),
            a('slideChange update resize observerUpdate', () => {
              b.thumbs.swiper && g();
            }),
            a('setTransition', (d, c) => {
              let a = b.thumbs.swiper;
              a && a.setTransition(c);
            }),
            a('beforeDestroy', () => {
              let a = b.thumbs.swiper;
              a && i && a && a.destroy();
            }),
            Object.assign(b.thumbs, { init: f, update: g });
        },
        function (a) {
          let { swiper: b, extendParams: c, emit: d, once: e } = a;
          c({
            freeMode: {
              enabled: !1,
              momentum: !0,
              momentumRatio: 1,
              momentumBounce: !0,
              momentumBounceRatio: 1,
              momentumVelocityRatio: 1,
              sticky: !1,
              minimumVelocity: 0.02,
            },
          }),
            Object.assign(b, {
              freeMode: {
                onTouchStart: function () {
                  var a = b.getTranslate();
                  b.setTranslate(a),
                    b.setTransition(0),
                    (b.touchEventsData.velocities.length = 0),
                    b.freeMode.onTouchEnd({ currentPos: b.rtl ? b.translate : -b.translate });
                },
                onTouchMove: function () {
                  let { touchEventsData: a, touches: c } = b;
                  0 === a.velocities.length &&
                    a.velocities.push({
                      position: c[b.isHorizontal() ? 'startX' : 'startY'],
                      time: a.touchStartTime,
                    }),
                    a.velocities.push({
                      position: c[b.isHorizontal() ? 'currentX' : 'currentY'],
                      time: o(),
                    });
                },
                onTouchEnd: function (h) {
                  let r = h.currentPos,
                    {
                      params: c,
                      $wrapperEl: s,
                      rtlTranslate: l,
                      snapGrid: f,
                      touchEventsData: g,
                    } = b,
                    x = o() - g.touchStartTime;
                  if (r < -b.minTranslate()) b.slideTo(b.activeIndex);
                  else if (r > -b.maxTranslate())
                    b.slides.length < f.length
                      ? b.slideTo(f.length - 1)
                      : b.slideTo(b.slides.length - 1);
                  else {
                    if (c.freeMode.momentum) {
                      if (1 < g.velocities.length) {
                        let m = g.velocities.pop(),
                          t = g.velocities.pop(),
                          y = m.position - t.position,
                          u = m.time - t.time;
                        (b.velocity = y / u),
                          (b.velocity /= 2),
                          Math.abs(b.velocity) < c.freeMode.minimumVelocity && (b.velocity = 0),
                          (150 < u || 300 < o() - m.time) && (b.velocity = 0);
                      } else b.velocity = 0;
                      (b.velocity *= c.freeMode.momentumVelocityRatio), (g.velocities.length = 0);
                      let i = 1e3 * c.freeMode.momentumRatio,
                        z = b.velocity * i,
                        a = b.translate + z;
                      l && (a = -a);
                      let n,
                        p = !1;
                      h = 20 * Math.abs(b.velocity) * c.freeMode.momentumBounceRatio;
                      let q;
                      if (a < b.maxTranslate())
                        c.freeMode.momentumBounce
                          ? (a + b.maxTranslate() < -h && (a = b.maxTranslate() - h),
                            (n = b.maxTranslate()),
                            (p = !0),
                            (g.allowMomentumBounce = !0))
                          : (a = b.maxTranslate()),
                          c.loop && c.centeredSlides && (q = !0);
                      else if (a > b.minTranslate())
                        c.freeMode.momentumBounce
                          ? (a - b.minTranslate() > h && (a = b.minTranslate() + h),
                            (n = b.minTranslate()),
                            (p = !0),
                            (g.allowMomentumBounce = !0))
                          : (a = b.minTranslate()),
                          c.loop && c.centeredSlides && (q = !0);
                      else if (c.freeMode.sticky) {
                        let j;
                        for (let k = 0; k < f.length; k += 1)
                          if (f[k] > -a) {
                            j = k;
                            break;
                          }
                        a = -(a =
                          Math.abs(f[j] - a) < Math.abs(f[j - 1] - a) || 'next' === b.swipeDirection
                            ? f[j]
                            : f[j - 1]);
                      }
                      if (
                        (q &&
                          e('transitionEnd', () => {
                            b.loopFix();
                          }),
                        0 !== b.velocity)
                      ) {
                        if (
                          ((i = l
                            ? Math.abs((-a - b.translate) / b.velocity)
                            : Math.abs((a - b.translate) / b.velocity)),
                          c.freeMode.sticky)
                        ) {
                          let v = Math.abs((l ? -a : a) - b.translate),
                            w = b.slidesSizesGrid[b.activeIndex];
                          i = v < w ? c.speed : v < 2 * w ? 1.5 * c.speed : 2.5 * c.speed;
                        }
                      } else if (c.freeMode.sticky) return void b.slideToClosest();
                      c.freeMode.momentumBounce && p
                        ? (b.updateProgress(n),
                          b.setTransition(i),
                          b.setTranslate(a),
                          b.transitionStart(!0, b.swipeDirection),
                          (b.animating = !0),
                          s.transitionEnd(() => {
                            b &&
                              !b.destroyed &&
                              g.allowMomentumBounce &&
                              (d('momentumBounce'),
                              b.setTransition(c.speed),
                              setTimeout(() => {
                                b.setTranslate(n),
                                  s.transitionEnd(() => {
                                    b && !b.destroyed && b.transitionEnd();
                                  });
                              }, 0));
                          }))
                        : b.velocity
                        ? (d('_freeModeNoMomentumRelease'),
                          b.updateProgress(a),
                          b.setTransition(i),
                          b.setTranslate(a),
                          b.transitionStart(!0, b.swipeDirection),
                          b.animating ||
                            ((b.animating = !0),
                            s.transitionEnd(() => {
                              b && !b.destroyed && b.transitionEnd();
                            })))
                        : b.updateProgress(a),
                        b.updateActiveIndex(),
                        b.updateSlidesClasses();
                    } else {
                      if (c.freeMode.sticky) return void b.slideToClosest();
                      c.freeMode && d('_freeModeNoMomentumRelease');
                    }
                    (!c.freeMode.momentum || x >= c.longSwipesMs) &&
                      (b.updateProgress(), b.updateActiveIndex(), b.updateSlidesClasses());
                  }
                },
              },
            });
        },
        function (a) {
          let d,
            e,
            f,
            { swiper: b, extendParams: c } = a;
          c({ grid: { rows: 1, fill: 'column' } }),
            (b.grid = {
              initSlides(c) {
                var g = b.params.slidesPerView,
                  { rows: a, fill: h } = b.params.grid;
                (e = d / a),
                  (f = Math.floor(c / a)),
                  (d = Math.floor(c / a) === c / a ? c : Math.ceil(c / a) * a),
                  'auto' !== g && 'row' === h && (d = Math.max(d, g * a));
              },
              updateSlide(i, l, q, r) {
                var { slidesPerGroup: g, spaceBetween: m } = b.params,
                  { rows: c, fill: n } = b.params.grid;
                let k, h, a;
                if ('row' === n && 1 < g) {
                  let j = Math.floor(i / (g * c)),
                    o = i - c * g * j,
                    p = 0 === j ? g : Math.min(Math.ceil((q - j * c * g) / c), g);
                  (a = Math.floor(o / p)),
                    (k = (h = o - a * p + j * g) + (a * d) / c),
                    l.css({ '-webkit-order': k, order: k });
                } else
                  'column' === n
                    ? ((h = Math.floor(i / c)),
                      (a = i - h * c),
                      (h > f || (h === f && a === c - 1)) && (a += 1) >= c && ((a = 0), (h += 1)))
                    : ((a = Math.floor(i / e)), (h = i - a * e));
                l.css(r('margin-top'), 0 !== a ? m && m + 'px' : '');
              },
              updateWrapperSize(h, a, i) {
                var { spaceBetween: e, centeredSlides: j, roundLengths: k } = b.params,
                  l = b.params.grid.rows;
                if (
                  ((b.virtualSize = (h + e) * d),
                  (b.virtualSize = Math.ceil(b.virtualSize / l) - e),
                  b.$wrapperEl.css({ [i('width')]: b.virtualSize + e + 'px' }),
                  j)
                ) {
                  a.splice(0, a.length);
                  let g = [];
                  for (let c = 0; c < a.length; c += 1) {
                    let f = a[c];
                    k && (f = Math.floor(f)), a[c] < b.virtualSize + a[0] && g.push(f);
                  }
                  a.push(...g);
                }
              },
            });
        },
        function (a) {
          (a = a.swiper),
            Object.assign(a, {
              appendSlide: function (a) {
                let { $wrapperEl: d, params: c } = this;
                if ((c.loop && this.loopDestroy(), 'object' == typeof a && 'length' in a))
                  for (let b = 0; b < a.length; b += 1) a[b] && d.append(a[b]);
                else d.append(a);
                c.loop && this.loopCreate(), c.observer || this.update();
              }.bind(a),
              prependSlide: function (a) {
                let { params: c, $wrapperEl: d, activeIndex: e } = this;
                c.loop && this.loopDestroy();
                let f = e + 1;
                if ('object' == typeof a && 'length' in a) {
                  for (let b = 0; b < a.length; b += 1) a[b] && d.prepend(a[b]);
                  f = e + a.length;
                } else d.prepend(a);
                c.loop && this.loopCreate(), c.observer || this.update(), this.slideTo(f, 0, !1);
              }.bind(a),
              addSlide: function (d, b) {
                let a = this,
                  { $wrapperEl: f, params: e, activeIndex: n } = a,
                  c = n;
                e.loop &&
                  ((c -= a.loopedSlides),
                  a.loopDestroy(),
                  (a.slides = f.children('.' + e.slideClass)));
                var l = a.slides.length;
                if (d <= 0) a.prependSlide(b);
                else if (l <= d) a.appendSlide(b);
                else {
                  let h = c > d ? c + 1 : c,
                    i = [];
                  for (let j = l - 1; j >= d; --j) {
                    let m = a.slides.eq(j);
                    m.remove(), i.unshift(m);
                  }
                  if ('object' == typeof b && 'length' in b) {
                    for (let g = 0; g < b.length; g += 1) b[g] && f.append(b[g]);
                    h = c > d ? c + b.length : c;
                  } else f.append(b);
                  for (let k = 0; k < i.length; k += 1) f.append(i[k]);
                  e.loop && a.loopCreate(),
                    e.observer || a.update(),
                    e.loop ? a.slideTo(h + a.loopedSlides, 0, !1) : a.slideTo(h, 0, !1);
                }
              }.bind(a),
              removeSlide: function (d) {
                let a = this,
                  { params: e, $wrapperEl: h, activeIndex: i } = a,
                  g = i;
                e.loop &&
                  ((g -= a.loopedSlides),
                  a.loopDestroy(),
                  (a.slides = h.children('.' + e.slideClass)));
                let c,
                  b = g;
                if ('object' == typeof d && 'length' in d) {
                  for (let f = 0; f < d.length; f += 1)
                    (c = d[f]), a.slides[c] && a.slides.eq(c).remove(), c < b && --b;
                  b = Math.max(b, 0);
                } else
                  (c = d),
                    a.slides[c] && a.slides.eq(c).remove(),
                    c < b && --b,
                    (b = Math.max(b, 0));
                e.loop && a.loopCreate(),
                  e.observer || a.update(),
                  e.loop ? a.slideTo(b + a.loopedSlides, 0, !1) : a.slideTo(b, 0, !1);
              }.bind(a),
              removeAllSlides: function () {
                let b = [];
                for (let a = 0; a < this.slides.length; a += 1) b.push(a);
                this.removeSlide(b);
              }.bind(a),
            });
        },
        function (a) {
          let { swiper: b, extendParams: c, on: d } = a;
          c({ fadeEffect: { crossFade: !1, transformEl: null } }),
            H({
              effect: 'fade',
              swiper: b,
              on: d,
              setTranslate() {
                let f = b.slides,
                  g = b.params.fadeEffect;
                for (let d = 0; d < f.length; d += 1) {
                  let a = b.slides.eq(d),
                    c = -a[0].swiperSlideOffset,
                    e = (b.params.virtualTranslate || (c -= b.translate), 0);
                  b.isHorizontal() || ((e = c), (c = 0));
                  var h = b.params.fadeEffect.crossFade
                    ? Math.max(1 - Math.abs(a[0].progress), 0)
                    : 1 + Math.min(Math.max(a[0].progress, -1), 0);
                  _(g, a).css({ opacity: h }).transform(`translate3d(${c}px, ${e}px, 0px)`);
                }
              },
              setTransition(c) {
                var a = b.params.fadeEffect.transformEl;
                (a ? b.slides.find(a) : b.slides).transition(c),
                  I({ swiper: b, duration: c, transformEl: a, allSlides: !0 });
              },
              overwriteParams: () => ({
                slidesPerView: 1,
                slidesPerGroup: 1,
                watchSlidesProgress: !0,
                spaceBetween: 0,
                virtualTranslate: !b.params.cssMode,
              }),
            });
        },
        function (a) {
          let { swiper: b, extendParams: c, on: e } = a;
          c({ cubeEffect: { slideShadows: !0, shadow: !0, shadowOffset: 20, shadowScale: 0.94 } }),
            H({
              effect: 'cube',
              swiper: b,
              on: e,
              setTranslate() {
                let {
                    $el: u,
                    $wrapperEl: q,
                    slides: v,
                    width: s,
                    height: w,
                    rtlTranslate: t,
                    size: a,
                    browser: x,
                  } = b,
                  h = b.params.cubeEffect,
                  c = b.isHorizontal(),
                  B = b.virtual && b.params.virtual.enabled,
                  e,
                  j = 0;
                h.shadow &&
                  (c
                    ? (0 === (e = q.find('.swiper-cube-shadow')).length &&
                        ((e = d('<div class="swiper-cube-shadow"></div>')), q.append(e)),
                      e.css({ height: s + 'px' }))
                    : 0 === (e = u.find('.swiper-cube-shadow')).length &&
                      ((e = d('<div class="swiper-cube-shadow"></div>')), u.append(e)));
                for (let r = 0; r < v.length; r += 1) {
                  let f = v.eq(r),
                    i = r,
                    l = 90 * (i = B ? parseInt(f.attr('data-swiper-slide-index'), 10) : i),
                    m = Math.floor(l / 360);
                  t && (m = Math.floor(-(l = -l) / 360));
                  let k = Math.max(Math.min(f[0].progress, 1), -1),
                    g = 0,
                    y = 0,
                    n = 0;
                  i % 4 == 0
                    ? ((g = -(4 * m) * a), (n = 0))
                    : (i - 1) % 4 == 0
                    ? ((g = 0), (n = -(4 * m) * a))
                    : (i - 2) % 4 == 0
                    ? ((g = a + 4 * m * a), (n = a))
                    : (i - 3) % 4 == 0 && ((g = -a), (n = 3 * a + 4 * a * m)),
                    t && (g = -g),
                    c || ((y = g), (g = 0));
                  var C = `rotateX(${c ? 0 : -l}deg) rotateY(${
                    c ? l : 0
                  }deg) translate3d(${g}px, ${y}px, ${n}px)`;
                  if (
                    (k <= 1 && -1 < k && ((j = 90 * i + 90 * k), t && (j = -(90 * i) - 90 * k)),
                    f.transform(C),
                    h.slideShadows)
                  ) {
                    let o = c
                        ? f.find('.swiper-slide-shadow-left')
                        : f.find('.swiper-slide-shadow-top'),
                      p = c
                        ? f.find('.swiper-slide-shadow-right')
                        : f.find('.swiper-slide-shadow-bottom');
                    0 === o.length &&
                      ((o = d(`<div class="swiper-slide-shadow-${c ? 'left' : 'top'}"></div>`)),
                      f.append(o)),
                      0 === p.length &&
                        ((p = d(
                          `<div class="swiper-slide-shadow-${c ? 'right' : 'bottom'}"></div>`,
                        )),
                        f.append(p)),
                      o.length && (o[0].style.opacity = Math.max(-k, 0)),
                      p.length && (p[0].style.opacity = Math.max(k, 0));
                  }
                }
                if (
                  (q.css({
                    '-webkit-transform-origin': `50% 50% -${a / 2}px`,
                    'transform-origin': `50% 50% -${a / 2}px`,
                  }),
                  h.shadow)
                ) {
                  if (c)
                    e.transform(
                      `translate3d(0px, ${s / 2 + h.shadowOffset}px, ${
                        -s / 2
                      }px) rotateX(90deg) rotateZ(0deg) scale(${h.shadowScale})`,
                    );
                  else {
                    let z = Math.abs(j) - 90 * Math.floor(Math.abs(j) / 90),
                      D =
                        1.5 -
                        (Math.sin((2 * z * Math.PI) / 360) / 2 +
                          Math.cos((2 * z * Math.PI) / 360) / 2),
                      E = h.shadowScale,
                      A = h.shadowScale / D,
                      F = h.shadowOffset;
                    e.transform(
                      `scale3d(${E}, 1, ${A}) translate3d(0px, ${w / 2 + F}px, ${
                        -w / 2 / A
                      }px) rotateX(-90deg)`,
                    );
                  }
                }
                var G = x.isSafari || x.isWebView ? -a / 2 : 0;
                q.transform(
                  `translate3d(0px,0,${G}px) rotateX(${b.isHorizontal() ? 0 : j}deg) rotateY(${
                    b.isHorizontal() ? -j : 0
                  }deg)`,
                );
              },
              setTransition(a) {
                let { $el: c, slides: d } = b;
                d
                  .transition(a)
                  .find(
                    '.swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left',
                  )
                  .transition(a),
                  b.params.cubeEffect.shadow &&
                    !b.isHorizontal() &&
                    c.find('.swiper-cube-shadow').transition(a);
              },
              perspective: () => !0,
              overwriteParams: () => ({
                slidesPerView: 1,
                slidesPerGroup: 1,
                watchSlidesProgress: !0,
                resistanceRatio: 0,
                spaceBetween: 0,
                centeredSlides: !1,
                virtualTranslate: !0,
              }),
            });
        },
        function (a) {
          let { swiper: b, extendParams: c, on: d } = a;
          c({ flipEffect: { slideShadows: !0, limitRotation: !0, transformEl: null } }),
            H({
              effect: 'flip',
              swiper: b,
              on: d,
              setTranslate() {
                let { slides: i, rtlTranslate: n } = b,
                  e = b.params.flipEffect;
                for (let j = 0; j < i.length; j += 1) {
                  let a = i.eq(j),
                    c = a[0].progress;
                  b.params.flipEffect.limitRotation &&
                    (c = Math.max(Math.min(a[0].progress, 1), -1));
                  var f = a[0].swiperSlideOffset;
                  let d = -180 * c,
                    l = 0,
                    k = b.params.cssMode ? -f - b.translate : -f,
                    m = 0;
                  if (
                    (b.isHorizontal() ? n && (d = -d) : ((m = k), (k = 0), (l = -d), (d = 0)),
                    (a[0].style.zIndex = -Math.abs(Math.round(c)) + i.length),
                    e.slideShadows)
                  ) {
                    let g = b.isHorizontal()
                        ? a.find('.swiper-slide-shadow-left')
                        : a.find('.swiper-slide-shadow-top'),
                      h = b.isHorizontal()
                        ? a.find('.swiper-slide-shadow-right')
                        : a.find('.swiper-slide-shadow-bottom');
                    0 === g.length && (g = J(e, a, b.isHorizontal() ? 'left' : 'top')),
                      0 === h.length && (h = J(e, a, b.isHorizontal() ? 'right' : 'bottom')),
                      g.length && (g[0].style.opacity = Math.max(-c, 0)),
                      h.length && (h[0].style.opacity = Math.max(c, 0));
                  }
                  (f = `translate3d(${k}px, ${m}px, 0px) rotateX(${l}deg) rotateY(${d}deg)`),
                    _(e, a).transform(f);
                }
              },
              setTransition(a) {
                var c = b.params.flipEffect.transformEl;
                (c ? b.slides.find(c) : b.slides)
                  .transition(a)
                  .find(
                    '.swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left',
                  )
                  .transition(a),
                  I({ swiper: b, duration: a, transformEl: c });
              },
              perspective: () => !0,
              overwriteParams: () => ({
                slidesPerView: 1,
                slidesPerGroup: 1,
                watchSlidesProgress: !0,
                spaceBetween: 0,
                virtualTranslate: !b.params.cssMode,
              }),
            });
        },
        function (a) {
          let { swiper: b, extendParams: c, on: d } = a;
          c({
            coverflowEffect: {
              rotate: 50,
              stretch: 0,
              depth: 100,
              scale: 1,
              modifier: 1,
              slideShadows: !0,
              transformEl: null,
            },
          }),
            H({
              effect: 'coverflow',
              swiper: b,
              on: d,
              setTranslate() {
                let { width: t, height: u, slides: q, slidesSizesGrid: v } = b,
                  a = b.params.coverflowEffect,
                  d = b.isHorizontal(),
                  r = b.translate,
                  w = d ? t / 2 - r : u / 2 - r,
                  s = d ? a.rotate : -a.rotate,
                  x = a.depth;
                for (let g = 0, y = q.length; g < y; g += 1) {
                  let e = q.eq(g),
                    j = v[g],
                    c = ((w - e[0].swiperSlideOffset - j / 2) / j) * a.modifier,
                    k = d ? s * c : 0,
                    l = d ? 0 : s * c,
                    m = -x * Math.abs(c),
                    f = a.stretch,
                    n =
                      ('string' == typeof f &&
                        -1 !== f.indexOf('%') &&
                        (f = (parseFloat(a.stretch) / 100) * j),
                      d ? 0 : f * c),
                    o = d ? f * c : 0,
                    p = 1 - (1 - a.scale) * Math.abs(c);
                  0.001 > Math.abs(o) && (o = 0),
                    0.001 > Math.abs(n) && (n = 0),
                    0.001 > Math.abs(m) && (m = 0),
                    0.001 > Math.abs(k) && (k = 0),
                    0.001 > Math.abs(l) && (l = 0),
                    0.001 > Math.abs(p) && (p = 0);
                  var z = `translate3d(${o}px,${n}px,${m}px)  rotateX(${l}deg) rotateY(${k}deg) scale(${p})`;
                  if (
                    (_(a, e).transform(z),
                    (e[0].style.zIndex = 1 - Math.abs(Math.round(c))),
                    a.slideShadows)
                  ) {
                    let h = d
                        ? e.find('.swiper-slide-shadow-left')
                        : e.find('.swiper-slide-shadow-top'),
                      i = d
                        ? e.find('.swiper-slide-shadow-right')
                        : e.find('.swiper-slide-shadow-bottom');
                    0 === h.length && (h = J(a, e, d ? 'left' : 'top')),
                      0 === i.length && (i = J(a, e, d ? 'right' : 'bottom')),
                      h.length && (h[0].style.opacity = 0 < c ? c : 0),
                      i.length && (i[0].style.opacity = 0 < -c ? -c : 0);
                  }
                }
              },
              setTransition(a) {
                var c = b.params.coverflowEffect.transformEl;
                (c ? b.slides.find(c) : b.slides)
                  .transition(a)
                  .find(
                    '.swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left',
                  )
                  .transition(a);
              },
              perspective: () => !0,
              overwriteParams: () => ({ watchSlidesProgress: !0 }),
            });
        },
        function (a) {
          let { swiper: b, extendParams: c, on: d } = a;
          c({
            creativeEffect: {
              transformEl: null,
              limitProgress: 1,
              shadowPerProgress: !1,
              progressMultiplier: 1,
              perspective: !0,
              prev: { translate: [0, 0, 0], rotate: [0, 0, 0], opacity: 1, scale: 1 },
              next: { translate: [0, 0, 0], rotate: [0, 0, 0], opacity: 1, scale: 1 },
            },
          }),
            H({
              effect: 'creative',
              swiper: b,
              on: d,
              setTranslate() {
                let { slides: l, $wrapperEl: r, slidesSizesGrid: s } = b,
                  a = b.params.creativeEffect,
                  h = a.progressMultiplier,
                  o = b.params.centeredSlides;
                if (o) {
                  let t = s[0] / 2 - b.params.slidesOffsetBefore || 0;
                  r.transform(`translateX(calc(50% - ${t}px))`);
                }
                for (let m = 0; m < l.length; m += 1) {
                  let d = l.eq(m),
                    u = d[0].progress,
                    f = Math.min(Math.max(d[0].progress, -a.limitProgress), a.limitProgress),
                    e = f;
                  o ||
                    (e = Math.min(
                      Math.max(d[0].originalProgress, -a.limitProgress),
                      a.limitProgress,
                    ));
                  let p = d[0].swiperSlideOffset,
                    g = [b.params.cssMode ? -p - b.translate : -p, 0, 0],
                    i = [0, 0, 0],
                    j = !1,
                    c =
                      (b.isHorizontal() || ((g[1] = g[0]), (g[0] = 0)),
                      { translate: [0, 0, 0], rotate: [0, 0, 0], scale: 1, opacity: 1 });
                  f < 0 ? ((c = a.next), (j = !0)) : 0 < f && ((c = a.prev), (j = !0)),
                    g.forEach((a, b) => {
                      g[b] = `calc(${a}px + (${
                        'string' == typeof (a = c.translate[b]) ? a : a + 'px'
                      } * ${Math.abs(f * h)}))`;
                    }),
                    i.forEach((b, a) => {
                      i[a] = c.rotate[a] * Math.abs(f * h);
                    }),
                    (d[0].style.zIndex = -Math.abs(Math.round(u)) + l.length);
                  var n = g.join(', '),
                    v = `rotateX(${i[0]}deg) rotateY(${i[1]}deg) rotateZ(${i[2]}deg)`,
                    w =
                      e < 0
                        ? `scale(${1 + (1 - c.scale) * e * h})`
                        : `scale(${1 - (1 - c.scale) * e * h})`,
                    x = e < 0 ? 1 + (1 - c.opacity) * e * h : 1 - (1 - c.opacity) * e * h,
                    n = `translate3d(${n}) ${v} ` + w;
                  if ((j && c.shadow) || !j) {
                    let k = d.children('.swiper-slide-shadow');
                    if ((k = 0 === k.length && c.shadow ? J(a, d) : k).length) {
                      let y = a.shadowPerProgress ? f * (1 / a.limitProgress) : f;
                      k[0].style.opacity = Math.min(Math.max(Math.abs(y), 0), 1);
                    }
                  }
                  let q = _(a, d);
                  q.transform(n).css({ opacity: x }),
                    c.origin && q.css('transform-origin', c.origin);
                }
              },
              setTransition(a) {
                var c = b.params.creativeEffect.transformEl;
                (c ? b.slides.find(c) : b.slides)
                  .transition(a)
                  .find('.swiper-slide-shadow')
                  .transition(a),
                  I({ swiper: b, duration: a, transformEl: c, allSlides: !0 });
              },
              perspective: () => b.params.creativeEffect.perspective,
              overwriteParams: () => ({
                watchSlidesProgress: !0,
                virtualTranslate: !b.params.cssMode,
              }),
            });
        },
        function (a) {
          let { swiper: b, extendParams: c, on: d } = a;
          c({ cardsEffect: { slideShadows: !0, transformEl: null } }),
            H({
              effect: 'cards',
              swiper: b,
              on: d,
              setTranslate() {
                let { slides: f, activeIndex: g } = b,
                  k = b.params.cardsEffect,
                  { startTranslate: p, isTouched: q } = b.touchEventsData,
                  r = b.translate;
                for (let c = 0; c < f.length; c += 1) {
                  let e = f.eq(c),
                    s = e[0].progress,
                    a = Math.min(Math.max(s, -4), 4),
                    l = e[0].swiperSlideOffset,
                    d =
                      (b.params.centeredSlides &&
                        !b.params.cssMode &&
                        b.$wrapperEl.transform(`translateX(${b.minTranslate()}px)`),
                      b.params.centeredSlides && b.params.cssMode && (l -= f[0].swiperSlideOffset),
                      b.params.cssMode ? -l - b.translate : -l),
                    h = 0;
                  var u = -100 * Math.abs(a);
                  let m = 1,
                    t = -2 * a,
                    n = 8 - 0.75 * Math.abs(a);
                  var o =
                      (c === g || c === g - 1) &&
                      0 < a &&
                      a < 1 &&
                      (q || b.params.cssMode) &&
                      r < p,
                    v =
                      (c === g || c === g + 1) &&
                      a < 0 &&
                      -1 < a &&
                      (q || b.params.cssMode) &&
                      p < r;
                  if (o || v) {
                    let i = (1 - Math.abs((Math.abs(a) - 0.5) / 0.5)) ** 0.5;
                    (t += -28 * a * i),
                      (m += -0.5 * i),
                      (n += 96 * i),
                      (h = -25 * i * Math.abs(a) + '%');
                  }
                  if (
                    ((d =
                      a < 0
                        ? `calc(${d}px + (${n * Math.abs(a)}%))`
                        : 0 < a
                        ? `calc(${d}px + (-${n * Math.abs(a)}%))`
                        : d + 'px'),
                    !b.isHorizontal())
                  ) {
                    let w = h;
                    (h = d), (d = w);
                  }
                  if (
                    ((o = `
        translate3d(${d}, ${h}, ${u}px)
        rotateZ(${t}deg)
        scale(${a < 0 ? '' + (1 + (1 - m) * a) : '' + (1 - (1 - m) * a)})
      `),
                    k.slideShadows)
                  ) {
                    let j = e.find('.swiper-slide-shadow');
                    (j = 0 === j.length ? J(k, e) : j).length &&
                      (j[0].style.opacity = Math.min(Math.max((Math.abs(a) - 0.5) / 0.5, 0), 1));
                  }
                  (e[0].style.zIndex = -Math.abs(Math.round(s)) + f.length), _(k, e).transform(o);
                }
              },
              setTransition(a) {
                var c = b.params.cardsEffect.transformEl;
                (c ? b.slides.find(c) : b.slides)
                  .transition(a)
                  .find('.swiper-slide-shadow')
                  .transition(a),
                  I({ swiper: b, duration: a, transformEl: c });
              },
              perspective: () => !0,
              overwriteParams: () => ({
                watchSlidesProgress: !0,
                virtualTranslate: !b.params.cssMode,
              }),
            });
        },
      ]),
      a
    );
  });
