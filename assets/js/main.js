"use strict";

const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";

let emailJsInitialized = false;

document.addEventListener("DOMContentLoaded", () => {
  initSmoothScroll();
  initActiveNavOnScroll();
  initHamburgerMenu();
  initAccordion();
  initScrollAnimations();
  initFormValidationAndSubmit();
  updateCurrentYear();
});

function initSmoothScroll() {
  const navLinks = Array.from(
    document.querySelectorAll('.nav__link[href^="#"]')
  );
  if (!navLinks.length) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const getOffsetTop = (element) => {
    const header = document.getElementById("site-header");
    const headerHeight = header ? header.offsetHeight : 0;
    const elementRect = element.getBoundingClientRect();
    const scrollTop =
      window.pageYOffset || document.documentElement.scrollTop;
    return elementRect.top + scrollTop - headerHeight + 4;
  };

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");
      if (!targetId || !targetId.startsWith("#")) return;

      const target = document.querySelector(targetId);
      if (!target) return;

      event.preventDefault();

      const nav = document.querySelector(".nav");
      const toggle = document.querySelector(".nav__toggle");
      const overlay = document.querySelector("[data-nav-overlay]");
      if (nav && toggle && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        if (overlay) {
          overlay.classList.remove("is-active");
        }
        document.body.classList.remove("is-nav-open");
      }

      const top = getOffsetTop(target);
      if (prefersReducedMotion) {
        window.scrollTo(0, top);
      } else {
        window.scrollTo({
          top,
          behavior: "smooth",
        });
      }
    });
  });
}

function initActiveNavOnScroll() {
  const header = document.getElementById("site-header");
  const sections = Array.from(
    document.querySelectorAll("main section[id]")
  );
  const navLinks = new Map();

  sections.forEach((section) => {
    const link = document.querySelector(`.nav__link[href="#${section.id}"]`);
    if (link) {
      navLinks.set(section.id, link);
    }
  });

  if (!sections.length || !navLinks.size) return;

  const setActiveLink = (id) => {
    navLinks.forEach((link, linkId) => {
      if (linkId === id) {
        link.classList.add("nav__link--active");
      } else {
        link.classList.remove("nav__link--active");
      }
    });
  };

  const handleHeaderState = () => {
    if (!header) return;
    header.classList.toggle("site-header--scrolled", window.scrollY > 16);
  };

  handleHeaderState();
  window.addEventListener("scroll", handleHeaderState, { passive: true });

  const setActiveSectionOnScroll = () => {
    const offset = (header ? header.offsetHeight : 0) + 20;
    let currentId = sections[0]?.id;

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const sectionTop = rect.top - offset;
      const sectionBottom = rect.bottom - offset;
      if (sectionTop <= 0 && sectionBottom > 0) {
        currentId = section.id;
      }
    });

    setActiveLink(currentId);
  };

  setActiveSectionOnScroll();
  window.addEventListener("scroll", setActiveSectionOnScroll, { passive: true });
  window.addEventListener("resize", setActiveSectionOnScroll);
}

function initHamburgerMenu() {
  const toggle = document.querySelector(".nav__toggle");
  const nav = document.querySelector(".nav");
  const overlay = document.querySelector("[data-nav-overlay]");
  if (!toggle || !nav) return;

  const navLinks = nav.querySelectorAll(".nav__link");

  const setMenuState = (isOpen) => {
    nav.classList.toggle("is-open", isOpen);
    toggle.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    if (overlay) {
      overlay.classList.toggle("is-active", isOpen);
    }
    document.body.classList.toggle("is-nav-open", isOpen);
  };

  const closeMenu = () => {
    setMenuState(false);
  };

  toggle.addEventListener("click", () => {
    const nextState = !nav.classList.contains("is-open");
    setMenuState(nextState);
  });

  navLinks.forEach((link) => link.addEventListener("click", closeMenu));

  if (overlay) {
    overlay.addEventListener("click", closeMenu);
  }

  window.addEventListener(
    "resize",
    () => {
      if (window.innerWidth >= 1024) {
        closeMenu();
      }
    },
    { passive: true }
  );
}

function initAccordion() {
  const accordions = Array.from(
    document.querySelectorAll("[data-accordion]")
  );
  if (!accordions.length) return;

  accordions.forEach((accordion) => {
    const items = accordion.querySelectorAll(".accordion__item");
    items.forEach((item) => {
      const trigger = item.querySelector(".accordion__trigger");
      const panel = item.querySelector(".accordion__panel");
      if (!trigger || !panel) return;

      trigger.addEventListener("click", () => {
        const isExpanded = trigger.getAttribute("aria-expanded") === "true";
        trigger.setAttribute("aria-expanded", String(!isExpanded));
        panel.hidden = isExpanded;
        item.classList.toggle("is-open", !isExpanded);
      });
    });
  });
}

function initScrollAnimations() {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
    return;
  }

  const sections = Array.from(
    document.querySelectorAll("main .section")
  ).filter((section) => !section.hasAttribute("data-scroll-disable"));

  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.2,
      rootMargin: "0px 0px -10% 0px",
    }
  );

  sections.forEach((section) => {
    section.classList.add("scroll-animate");
    const rect = section.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.85) {
      section.classList.add("is-visible");
    } else {
      observer.observe(section);
    }
  });
}

function initFormValidationAndSubmit() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const statusEl = form.querySelector(".form__status");
  const formBody = form.querySelector(".form__body");
  const confirmContainer = form.querySelector(".form__confirm");
  const confirmFields = new Map();
  form
    .querySelectorAll("[data-confirm-field]")
    .forEach((el) => confirmFields.set(el.dataset.confirmField, el));
  const errorEls = new Map();
  form
    .querySelectorAll("[data-error-for]")
    .forEach((el) => errorEls.set(el.dataset.errorFor, el));

  const setStatus = (message, status) => {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.classList.toggle("is-success", status === "success");
    statusEl.classList.toggle("is-error", status === "error");
    if (!status) {
      statusEl.classList.remove("is-success", "is-error");
    }
  };

  const clearErrors = () => {
    errorEls.forEach((el) => {
      el.textContent = "";
    });
  };

  const showError = (field, message) => {
    const el = errorEls.get(field);
    if (el) {
      el.textContent = message;
    }
  };

  const hideConfirm = () => {
    form.dataset.state = "input";
    form.classList.remove("is-confirm");
    if (formBody) {
      formBody.hidden = false;
    }
    if (confirmContainer) {
      confirmContainer.hidden = true;
    }
  };

  const showConfirm = (values) => {
    confirmFields.forEach((el, field) => {
      const value = values[field];
      el.textContent = value || "未入力";
    });

    form.dataset.state = "confirm";
    form.classList.add("is-confirm");
    if (formBody) {
      formBody.hidden = true;
    }
    if (confirmContainer) {
      confirmContainer.hidden = false;
    }
    setStatus(
      "入力内容をご確認ください。内容に問題なければ送信ボタンを押してください。",
      null
    );
  };

  hideConfirm();

  form.addEventListener("input", (event) => {
    const target = event.target;
    if (!target.name) return;
    showError(target.name, "");
    if (target.name === "agreement") {
      showError("agreement", "");
    }
  });

  form.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-form-action]");
    if (!actionButton) return;

    if (actionButton.dataset.formAction === "edit") {
      event.preventDefault();
      hideConfirm();
      setStatus("", null);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors();
    setStatus("", null);

    const formData = new FormData(form);
    const name = (formData.get("name") || "").toString().trim();
    const email = (formData.get("email") || "").toString().trim();
    const phone = (formData.get("phone") || "").toString().trim();
    const message = (formData.get("message") || "").toString().trim();
    const agreement = form.querySelector("#agreement")?.checked ?? false;
    const contactMethodValues = Array.from(
      form.querySelectorAll('input[name="contact_method"]:checked')
    ).map((input) => input.value);
    const contactMethods = contactMethodValues.join(", ");
    const contactMethodSummary = contactMethodValues
      .map((value) => {
        if (value === "phone") return "電話での連絡を希望";
        if (value === "email") return "メールでの連絡を希望";
        return value;
      })
      .join(" / ");

    let hasError = false;

    if (!name) {
      showError("name", "お名前を入力してください。");
      hasError = true;
    }

    if (!email) {
      showError("email", "メールアドレスを入力してください。");
      hasError = true;
    } else {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        showError("email", "正しい形式のメールアドレスを入力してください。");
        hasError = true;
      }
    }

    if (phone) {
      const phonePattern = /^[0-9+\-\s()]{10,}$/;
      if (!phonePattern.test(phone)) {
        showError("phone", "電話番号は数字とハイフンで入力してください。");
        hasError = true;
      }
    }

    if (!message) {
      showError("message", "ご相談内容を入力してください。");
      hasError = true;
    }

    if (!agreement) {
      showError("agreement", "同意が必要です。");
      hasError = true;
    }

    if (hasError) {
      setStatus("入力内容をご確認ください。", "error");
      return;
    }

    const isConfirmState = form.dataset.state === "confirm";

    if (!isConfirmState) {
      showConfirm({
        name,
        email,
        phone: phone || "未入力",
        message,
        contact_method: contactMethodSummary || "指定なし",
      });
      return;
    }

    setStatus("送信中です…", null);

    try {
      const emailJsAvailable =
        typeof window.emailjs !== "undefined" &&
        EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY" &&
        EMAILJS_SERVICE_ID !== "YOUR_SERVICE_ID" &&
        EMAILJS_TEMPLATE_ID !== "YOUR_TEMPLATE_ID";

      if (emailJsAvailable && !emailJsInitialized) {
        window.emailjs.init(EMAILJS_PUBLIC_KEY);
        emailJsInitialized = true;
      }

      if (emailJsAvailable) {
        const templateParams = {
          name,
          email,
          tel: phone || "未入力",
          message,
          contact_method: contactMethodSummary || "指定なし",
        };

        await window.emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          templateParams
        );
      } else {
        await submitViaFormspree(form, formData);
      }

      form.reset();
      hideConfirm();
      setStatus(
        "送信が完了しました。担当者より折り返しご連絡いたします。",
        "success"
      );
    } catch (error) {
      setStatus(
        getFormErrorMessage(error),
        "error"
      );
    }
  });
}

function updateCurrentYear() {
  const yearEl = document.getElementById("js-current-year");
  if (!yearEl) return;
  yearEl.textContent = new Date().getFullYear().toString();
}

async function submitViaFormspree(form, formData) {
  const action = form.getAttribute("action");
  if (!action || action.includes("{your-id}")) {
    throw new Error("FORM_ENDPOINT_NOT_CONFIGURED");
  }

  const response = await fetch(action, {
    method: form.method || "POST",
    body: formData,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("FORM_SUBMIT_FAILED");
  }
}

function getFormErrorMessage(error) {
  if (!error) {
    return "送信に失敗しました。お手数ですが再度お試しください。";
  }

  if (error.message === "FORM_ENDPOINT_NOT_CONFIGURED") {
    return "送信設定が完了していません。EmailJSまたはFormspreeの接続設定をご確認ください。";
  }

  return "送信に失敗しました。お手数ですが再度お試しください。";
}
