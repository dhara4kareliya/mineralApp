const ticketId = UI.param('id');
    Layout.render({ active: 'tickets', title: ticketId ? `${I18n.t('nav.tickets')} #${ticketId}` : I18n.t('nav.tickets') });

    if (!ticketId) {
      Layout.error(document.getElementById('detail'), I18n.t('tickets.missingId'));
    } else {
      load();
    }

    async function load() {
      const el = document.getElementById('detail');
      Layout.loading(el);
      try {
        const res = await API.ticketGet(ticketId);
        const t = res.data || res;
        const allMessages = Array.isArray(t.messages) ? t.messages : [];
        const isOpen = t.show == null ? true : Number(t.show) === 1;

        // Title = ticket name/topic. Opening create body is often stuffed into messages[0]
        // (message_count may still be 0) — show that as a subject subline, not as chat.
        const ticketName = String(t.ticket_name || t.subject || t.topic || '').trim() || I18n.t('nav.tickets');
        const opening = allMessages[0];
        const openingText = opening
          ? String(opening.message || opening.text || opening.body || '').trim()
          : '';
        const openingIsCustomer =
          opening && (opening.direction == null || Number(opening.direction) === 0);
        const useOpeningAsSubject = Boolean(openingText && openingIsCustomer);
        const subjectLine = useOpeningAsSubject
          ? openingText
          : String(t.description || '').trim();
        const chatMessages = useOpeningAsSubject ? allMessages.slice(1) : allMessages;

        el.innerHTML = `
          <div class="card mb-2" data-live-target>
            <div class="flex-between wrap">
              <div>
                <div class="card-title">${Layout.escapeHtml(ticketName)}</div>
                ${
                  subjectLine
                    ? `<div class="card-meta mt-1">${Layout.escapeHtml(subjectLine)}</div>`
                    : ''
                }
                <div class="card-meta mt-1">${I18n.t('nav.tickets')} #${t.ticket_id || ticketId}</div>
              </div>
              <div class="flex gap-1 wrap">
                <span class="badge ${isOpen ? 'badge-success' : 'badge-muted'}">${isOpen ? I18n.t('tickets.open') : I18n.t('tickets.closed')}</span>
                <button type="button" class="btn btn-sm btn-secondary" id="btn-toggle">
                  ${isOpen ? I18n.t('tickets.closeTicket') : I18n.t('tickets.reopen')}
                </button>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-title mb-2">${I18n.t('tickets.conversation')}</div>
            <div class="thread" id="thread">
              ${
                chatMessages.length
                  ? chatMessages
                      .map((m) => {
                        const out = Number(m.direction) === 0;
                        return `<div class="bubble ${out ? 'out' : 'in'}">
                          <div>${Layout.escapeHtml(m.message || m.text || '')}</div>
                          <div class="time">${Layout.escapeHtml(m.time || '')}</div>
                        </div>`;
                      })
                      .join('')
                  : `<p class="muted text-sm">${I18n.t('tickets.noMessages')}</p>`
              }
            </div>
            ${
              isOpen
                ? `<form class="reply-box" id="reply-form">
                <textarea class="form-control" id="reply" placeholder="${I18n.t('tickets.writeReply')}" required></textarea>
                <button type="submit" class="btn btn-primary">${I18n.t('tickets.send')}</button>
              </form>`
                : `<p class="muted text-sm">${I18n.t('tickets.closedHint')}</p>`
            }
          </div>`;

        document.getElementById('btn-toggle')?.addEventListener('click', async () => {
          try {
            const show = isOpen ? 0 : 1;
            const out = await API.ticketStatus({ id: ticketId, show });
            Toast.success(out.output || (show ? I18n.t('tickets.opened') : I18n.t('tickets.closedToast')));
            Realtime.handleEvent({ type: 'status', message: `Ticket #${ticketId} status updated` });
            load();
          } catch (err) {
            Toast.error(err.message);
          }
        });

        document.getElementById('reply-form')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const message = document.getElementById('reply').value.trim();
          if (!message) return;
          const btn = e.target.querySelector('button[type="submit"]');
          await UI.withButton(btn, async () => {
            try {
              await API.ticketReply({ t_id: ticketId, message });
              Toast.success(I18n.t('tickets.replySent'));
              Realtime.handleEvent({ type: 'ticket', message: 'Your reply was posted' });
              load();
            } catch (err) {
              Toast.error(err.message);
            }
          });
        });
      } catch (err) {
        Layout.error(el, err.message);
      }
    }

    Realtime.on((p) => {
      if (p.type === 'ticket' || p.type === 'whatsapp' || p.type === 'status') {
        // optional auto-refresh
      }
    });
