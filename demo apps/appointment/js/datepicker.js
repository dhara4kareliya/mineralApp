/**
 * ClinicPulse DatePicker
 * Lightweight, localized (Hebrew / English) datepicker component.
 * Provides custom dropdown with localized month/weekday names,
 * and localized "Clear" ("נקה") and "Today" ("היום") buttons.
 */

(function () {
  const LOCALES = {
    he: {
      months: [
        "ינואר",
        "פברואר",
        "מרץ",
        "אפריל",
        "מאי",
        "יוני",
        "יולי",
        "אוגוסט",
        "ספטמבר",
        "אוקטובר",
        "נובמבר",
        "דצמבר",
      ],
      weekdays: ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"],
      clear: "נקה",
      today: "היום",
      placeholder: "יום/חודש/שנה",
      dir: "rtl",
    },
    en: {
      months: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ],
      weekdays: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
      clear: "Clear",
      today: "Today",
      placeholder: "dd/mm/yyyy",
      dir: "ltr",
    },
  };

  function getLang() {
    return (window.I18n && window.I18n.lang) || localStorage.getItem("clinicpulse_lang") || "he";
  }

  function getLocale() {
    return LOCALES[getLang()] || LOCALES.he;
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function parseDate(str) {
    if (!str) return null;
    const s = String(str).trim();
    // YYYY-MM-DD
    const mIso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (mIso) {
      const y = parseInt(mIso[1], 10);
      const m = parseInt(mIso[2], 10) - 1;
      const d = parseInt(mIso[3], 10);
      return new Date(y, m, d);
    }
    // DD/MM/YYYY or DD-MM-YYYY
    const mEu = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (mEu) {
      const d = parseInt(mEu[1], 10);
      const m = parseInt(mEu[2], 10) - 1;
      const y = parseInt(mEu[3], 10);
      return new Date(y, m, d);
    }
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt;
  }

  function formatDate(d) {
    if (!d || isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  const ClinicDatePicker = {
    activeInput: null,
    popupEl: null,
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth(),

    init() {
      document.querySelectorAll(".clinic-date-input, input[data-datepicker]").forEach((input) => {
        this.bindInput(input);
      });
      this.updateAll();
    },

    bindInput(input) {
      if (input._cdpBound) return;
      input._cdpBound = true;

      input.setAttribute("autocomplete", "off");
      input.setAttribute("spellcheck", "false");

      // Set placeholder based on current language
      const loc = getLocale();
      if (!input.placeholder || input.placeholder === "dd/mm/yyyy" || input.placeholder === "יום/חודש/שנה") {
        input.placeholder = loc.placeholder;
      }

      input.addEventListener("click", (e) => {
        e.stopPropagation();
        this.open(input);
      });

      input.addEventListener("focus", (e) => {
        e.stopPropagation();
        this.open(input);
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.close();
        } else if (e.key === "Enter") {
          this.close();
        }
      });
    },

    open(input) {
      if (this.activeInput === input && this.popupEl) return;
      this.activeInput = input;

      const parsed = parseDate(input.value);
      const today = new Date();
      if (parsed) {
        this.viewYear = parsed.getFullYear();
        this.viewMonth = parsed.getMonth();
      } else {
        this.viewYear = today.getFullYear();
        this.viewMonth = today.getMonth();
      }

      this.render();
      this.position();
      this.bindGlobalEvents();
    },

    close() {
      if (this.popupEl) {
        this.popupEl.remove();
        this.popupEl = null;
      }
      this.activeInput = null;
      this.unbindGlobalEvents();
    },

    position() {
      if (!this.popupEl || !this.activeInput) return;
      const rect = this.activeInput.getBoundingClientRect();
      const popup = this.popupEl;
      const loc = getLocale();
      const isRtl = loc.dir === "rtl";

      const popupWidth = 280;
      let top = rect.bottom + 6;
      let left = isRtl ? rect.right - popupWidth : rect.left;

      // Check viewport edges
      if (left < 10) left = 10;
      if (left + popupWidth > window.innerWidth - 10) {
        left = window.innerWidth - popupWidth - 10;
      }

      // If near bottom of viewport, flip up
      const popupHeight = 310;
      if (top + popupHeight > window.innerHeight && rect.top > popupHeight + 10) {
        top = rect.top - popupHeight - 6;
      }

      popup.style.top = `${top}px`;
      popup.style.left = `${left}px`;
    },

    render() {
      if (!this.popupEl) {
        this.popupEl = document.createElement("div");
        this.popupEl.className = "clinic-datepicker-popup";
        document.body.appendChild(this.popupEl);
      }

      const loc = getLocale();
      const isRtl = loc.dir === "rtl";
      this.popupEl.setAttribute("dir", loc.dir);

      const parsedSelected = parseDate(this.activeInput?.value);
      const selectedYmd = parsedSelected ? formatDate(parsedSelected) : "";

      const today = new Date();
      const todayYmd = formatDate(today);

      const year = this.viewYear;
      const month = this.viewMonth;

      const monthName = loc.months[month] || "";
      const weekdaysHtml = loc.weekdays.map((w) => `<span>${w}</span>`).join("");

      // Days math
      const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const daysInPrevMonth = new Date(year, month, 0).getDate();

      let daysHtml = "";

      // Previous month padding
      for (let i = firstDayOfMonth - 1; i >= 0; i--) {
        const d = daysInPrevMonth - i;
        daysHtml += `<button type="button" class="cdp-day cdp-day-other" data-cdp-prev-day="${d}">${d}</button>`;
      }

      // Current month days
      for (let d = 1; d <= daysInMonth; d++) {
        const ymd = `${year}-${pad(month + 1)}-${pad(d)}`;
        const isToday = ymd === todayYmd;
        const isSelected = ymd === selectedYmd;
        const classes = [
          "cdp-day",
          isToday ? "cdp-day-today" : "",
          isSelected ? "cdp-day-selected" : "",
        ]
          .filter(Boolean)
          .join(" ");

        daysHtml += `<button type="button" class="${classes}" data-cdp-day="${d}">${d}</button>`;
      }

      // Next month padding to fill grid to 35 or 42
      const totalCells = firstDayOfMonth + daysInMonth;
      const targetCells = totalCells > 35 ? 42 : 35;
      const nextMonthDays = targetCells - totalCells;
      for (let d = 1; d <= nextMonthDays; d++) {
        daysHtml += `<button type="button" class="cdp-day cdp-day-other" data-cdp-next-day="${d}">${d}</button>`;
      }

      // Navigation arrows (in RTL, prev points right or left)
      const prevIcon = isRtl ? "›" : "‹";
      const nextIcon = isRtl ? "‹" : "›";

      this.popupEl.innerHTML = `
        <div class="cdp-header">
          <button type="button" class="cdp-nav cdp-prev" aria-label="Previous Month">${prevIcon}</button>
          <div class="cdp-title">
            <span class="cdp-month-label">${monthName}</span>
            <span class="cdp-year-label">${year}</span>
          </div>
          <button type="button" class="cdp-nav cdp-next" aria-label="Next Month">${nextIcon}</button>
        </div>
        <div class="cdp-weekdays">
          ${weekdaysHtml}
        </div>
        <div class="cdp-grid">
          ${daysHtml}
        </div>
        <div class="cdp-footer">
          <button type="button" class="cdp-clear">${loc.clear}</button>
          <button type="button" class="cdp-today">${loc.today}</button>
        </div>
      `;

      this.bindPopupEvents();
    },

    bindPopupEvents() {
      if (!this.popupEl) return;

      this.popupEl.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      // Prev Month
      this.popupEl.querySelector(".cdp-prev")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.prevMonth();
      });

      // Next Month
      this.popupEl.querySelector(".cdp-next")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.nextMonth();
      });

      // Day Click
      this.popupEl.querySelectorAll("[data-cdp-day]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const day = parseInt(btn.getAttribute("data-cdp-day"), 10);
          this.selectDate(this.viewYear, this.viewMonth, day);
        });
      });

      // Previous month day click
      this.popupEl.querySelectorAll("[data-cdp-prev-day]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const day = parseInt(btn.getAttribute("data-cdp-prev-day"), 10);
          let m = this.viewMonth - 1;
          let y = this.viewYear;
          if (m < 0) {
            m = 11;
            y--;
          }
          this.selectDate(y, m, day);
        });
      });

      // Next month day click
      this.popupEl.querySelectorAll("[data-cdp-next-day]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const day = parseInt(btn.getAttribute("data-cdp-next-day"), 10);
          let m = this.viewMonth + 1;
          let y = this.viewYear;
          if (m > 11) {
            m = 0;
            y++;
          }
          this.selectDate(y, m, day);
        });
      });

      // Clear button
      this.popupEl.querySelector(".cdp-clear")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.clearValue();
      });

      // Today button
      this.popupEl.querySelector(".cdp-today")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectToday();
      });
    },

    prevMonth() {
      this.viewMonth--;
      if (this.viewMonth < 0) {
        this.viewMonth = 11;
        this.viewYear--;
      }
      this.render();
      this.position();
    },

    nextMonth() {
      this.viewMonth++;
      if (this.viewMonth > 11) {
        this.viewMonth = 0;
        this.viewYear++;
      }
      this.render();
      this.position();
    },

    selectDate(year, month, day) {
      if (!this.activeInput) return;
      const ymd = `${year}-${pad(month + 1)}-${pad(day)}`;
      this.setValue(ymd);
      this.close();
    },

    selectToday() {
      const today = new Date();
      const ymd = formatDate(today);
      this.setValue(ymd);
      this.close();
    },

    clearValue() {
      this.setValue("");
      this.close();
    },

    setValue(val) {
      if (!this.activeInput) return;
      this.activeInput.value = val;
      this.activeInput.dispatchEvent(new Event("input", { bubbles: true }));
      this.activeInput.dispatchEvent(new Event("change", { bubbles: true }));
    },

    updateAll() {
      const loc = getLocale();
      document.querySelectorAll(".clinic-date-input, input[data-datepicker]").forEach((input) => {
        input.placeholder = loc.placeholder;
      });
      if (this.popupEl) {
        this.render();
        this.position();
      }
    },

    _onDocClick: null,
    _onWinResize: null,

    bindGlobalEvents() {
      this.unbindGlobalEvents();
      this._onDocClick = (e) => {
        if (
          this.popupEl &&
          !this.popupEl.contains(e.target) &&
          e.target !== this.activeInput
        ) {
          this.close();
        }
      };
      this._onWinResize = () => {
        if (this.popupEl) this.position();
      };
      document.addEventListener("click", this._onDocClick);
      window.addEventListener("resize", this._onWinResize);
      window.addEventListener("scroll", this._onWinResize, true);
    },

    unbindGlobalEvents() {
      if (this._onDocClick) {
        document.removeEventListener("click", this._onDocClick);
        this._onDocClick = null;
      }
      if (this._onWinResize) {
        window.removeEventListener("resize", this._onWinResize);
        window.removeEventListener("scroll", this._onWinResize, true);
        this._onWinResize = null;
      }
    },
  };

  window.ClinicDatePicker = ClinicDatePicker;
  document.addEventListener("DOMContentLoaded", () => {
    ClinicDatePicker.init();
  });
})();
