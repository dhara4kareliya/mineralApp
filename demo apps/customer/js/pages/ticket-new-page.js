Layout.render({ active: 'tickets', titleKey: 'tickets.newTitle' });

    const RATING_LABELS = () => ({
      1: I18n.t('tickets.low'),
      2: I18n.t('tickets.medium'),
      3: I18n.t('tickets.normal'),
      4: I18n.t('tickets.high'),
      5: I18n.t('tickets.critical'),
    });
    const ratingInput = document.getElementById('rating');
    const ratingLabel = document.getElementById('rating-label');
    const starBtns = [...document.querySelectorAll('#rating-stars .star-btn')];

    function setRating(value, { hover = false } = {}) {
      const v = Number(value) || 1;
      if (!hover) ratingInput.value = v;
      starBtns.forEach((btn) => {
        const n = Number(btn.dataset.value);
        btn.classList.toggle('is-active', !hover && n <= v);
        btn.classList.toggle('is-hover', hover && n <= v);
      });
      if (!hover) {
        ratingLabel.textContent = RATING_LABELS()[v] || '';
        starBtns.forEach((btn) => {
          const n = Number(btn.dataset.value);
          const label = RATING_LABELS()[n] || '';
          btn.setAttribute('aria-label', `${n} — ${label}`);
        });
      }
    }

    starBtns.forEach((btn) => {
      btn.addEventListener('click', () => setRating(btn.dataset.value));
      btn.addEventListener('mouseenter', () => setRating(btn.dataset.value, { hover: true }));
    });
    document.getElementById('rating-stars').addEventListener('mouseleave', () => {
      starBtns.forEach((btn) => btn.classList.remove('is-hover'));
      setRating(ratingInput.value);
    });
    setRating(1);

    (async function loadForm() {
      try {
        const data = await API.ticketFormData();
        const cust = data.customer || {};
        if (cust.name) document.getElementById('customername').value = cust.name;
        if (cust.email) document.getElementById('email').value = cust.email;

        const dept = document.getElementById('ticket_department');
        (data.departments || []).forEach((d) => {
          const opt = document.createElement('option');
          opt.value = d.id;
          opt.textContent = d.name;
          dept.appendChild(opt);
        });

        const prod = document.getElementById('product_id');
        (data.products || []).forEach((p) => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.name || p.product_name;
          prod.appendChild(opt);
        });
      } catch (err) {
        Toast.error(err.message || I18n.t('failedToLoad'));
      }
    })();

    document.getElementById('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const alert = document.getElementById('form-alert');
      alert.hidden = true;
      const body = {
        topic: document.getElementById('topic').value.trim(),
        messages: document.getElementById('messages').value.trim(),
        rating: document.getElementById('rating').value,
        ticket_department: document.getElementById('ticket_department').value,
        customername: document.getElementById('customername').value.trim(),
        email: document.getElementById('email').value.trim(),
      };
      const pid = document.getElementById('product_id').value;
      if (pid) body.product_id = pid;

      const btn = document.getElementById('btn-submit');
      await UI.withButton(btn, async () => {
        try {
          const res = await API.ticketAdd(body);
          if (String(res.success) === '0' || res.success === 0) {
            throw new Error(res.message || res.error || I18n.t('tickets.couldNotCreate'));
          }
          Toast.success(I18n.t('tickets.created'));
          Realtime.handleEvent({ type: 'ticket', message: `Ticket #${res.ticket_id || res.insert_id} created` });
          location.href = `ticket-detail.html?id=${res.ticket_id || res.insert_id}`;
        } catch (err) {
          alert.hidden = false;
          alert.className = 'alert alert-error';
          alert.textContent = err.message;
        }
      });
    });
