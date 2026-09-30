document.addEventListener("DOMContentLoaded", function () {
  // Nav
  var stickyNav = document.querySelector(".sticky-nav");
  window.addEventListener("scroll", function () {
    stickyNav && (54 <= window.pageYOffset ? stickyNav.classList.add("is-fixed") : stickyNav.classList.remove("is-fixed"));
  });

  var mobileMenuBtn = document.getElementById("js-toggle-mobile-menu");
  var mobileMenu = document.getElementById("dl-menu");

  if (mobileMenu && mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", () => {
      const mobileMenuOffsetTop = mobileMenu.getBoundingClientRect().top;
      mobileMenu.style.position = "fixed";
      mobileMenu.style.top = `${mobileMenuOffsetTop}px`;

      if (!mobileMenu.classList.contains("is-open")) {
        mobileMenu.style.position = "absolute";
        mobileMenu.style.top = "60px";
      }
    });
  }

  // Search
  (function () {
    var searchBox = document.querySelector(".js-search-box");
    var searchBtn = document.querySelector(".js-social-search-btn");

    if (searchBox && searchBtn) {
      searchBtn.addEventListener("click", function () {
        this.classList.contains("is-active") ? (this.classList.remove("is-active"), searchBox.classList.remove("is-visible")) : (this.classList.add("is-active"), searchBox.classList.add("is-visible"));
      });
    }

    var b,
      d = document.querySelectorAll(".content table");
    for (b = 0; b < d.length; ++b) {
      d[b].classList.add("table");
      var f = document.createElement("div");
      f.classList.add("table-responsive"), d[b].parentNode.insertBefore(f, d[b]), f.appendChild(d[b]);
    }
    var a,
      c = document.querySelectorAll(".content iframe");
    for (a = 0; a < c.length; ++a) {
      c[a].removeAttribute("height"), c[a].removeAttribute("width");
      var e = document.createElement("div");
      e.classList.add("ratio"), e.classList.add("ratio-16x9"), c[a].parentNode.insertBefore(e, c[a]), e.appendChild(c[a]);
    }

    var toggleSearchBtn = document.querySelector(".new-search__select");

    if (toggleSearchBtn) {
      toggleSearchBtn.addEventListener("click", function () {
        document.querySelector(".dropdown-menu").classList.toggle("show");
        toggleSearchBtn.setAttribute("aria-expanded", document.querySelector(".dropdown-menu").classList.contains("show"));
      });
    }

    $(".new-search__inner .new-search__label").on("click", function () {
      if (!$(this).is(".active")) {
        $(".search-select-1").toggleClass("show");
        $(".search-select-2").toggleClass("show");
      }

      $(".new-search__inner").find(".search-tab").removeClass("tab-active").hide();
      $(".new-search__inner .dropdown-menu").find(".new-search__label").removeClass("active");
      $(this).addClass("active");

      var a = $(this).attr("data-id");
      $("#" + a)
        .addClass("tab-active")
        .fadeIn();
    });

    $("#web").click(function () {
      $("#web input").prop("checked", !0);
    });

    $("#player").click(function () {
      $("#player input").prop("checked", !0);
    });

    $(".dropdown-search").click(function () {
      $(this).addClass("open");
    });

    $(".new-search__label").click(function () {
      $(this).parent().removeClass("show");
    });

    if (!$("html").hasClass("homePage")) {
      $(".h-search-box").remove();
      $(".social-search").remove();
    }
  })();

  // Init vendors
  var fanshopSlider = new Swiper(".js-fanshop-slider", {
    loop: !0,
    slidesPerView: 4,
    navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
    breakpoints: {
      0: { slidesPerView: 1 },
      480: { slidesPerView: 2 },
      640: { slidesPerView: 3 },
      1280: { slidesPerView: 4 }
    }
  });
  var lazyLoad = new LazyLoad({ elements_selector: "[data-src], [data-srcset], [data-bg]" });
  var smoothScroll = new SmoothScroll(".js-scroll", { speed: 300 });

  // Remove space between 3rd-party ads in right column on Homepage
  var bannerRight300x300 = document.getElementById("js-banner-right_column-300x300");
  var bannerRight300x600 = document.getElementById("js-banner-right_column-300x600");

  var moveBanners = function moveBanners() {
    bannerRight300x600.style.paddingTop = "0px";
    bannerRight300x600.style.marginTop = "0px";

    var spaceBetweenBanners = bannerRight300x600.offsetTop - bannerRight300x300.offsetTop - bannerRight300x300.offsetHeight;

    bannerRight300x600.style.marginTop = -spaceBetweenBanners + "px";
  };

  // Check and move banners on DOM mutation
  if (bannerRight300x300 && bannerRight300x600) {
    var mutationCallback = function mutationCallback() {
      if (bannerRight300x300.querySelector("iframe") && bannerRight300x600.querySelector("iframe")) {
        moveBanners();
      }
    };

    var mutationObserver = new MutationObserver(mutationCallback);
    var targetNode = document.querySelector("body");
    mutationObserver.observe(targetNode, { subtree: true, childList: true });
  }

  // Check and move banners on load
  window.addEventListener("load", function () {
    if (bannerRight300x300 && bannerRight300x600) {
      if (bannerRight300x300.querySelector("iframe") && bannerRight300x600.querySelector("iframe")) {
        setTimeout(moveBanners(), 1000);
      }
    }
  });

  // Check and move banners on resize
  window.addEventListener("resize", function () {
    if (bannerRight300x300 && bannerRight300x600) {
      if (bannerRight300x300.querySelector("iframe") && bannerRight300x600.querySelector("iframe")) {
        moveBanners();
      }
    }
  });
});
