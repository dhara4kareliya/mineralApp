  class Component extends DCLogic {
    PRIO = {
      high:   { label: 'גבוהה', color: '#c0392b', bg: '#fbeeed', border: '#f0c4bf' },
      normal: { label: 'רגילה', color: '#1d60a2', bg: '#eaf2fb', border: '#aecbe9' },
      low:    { label: 'נמוכה', color: '#5a6473', bg: '#f4f5f7', border: '#d8dde4' },
    };
    STATUS = {
      toschedule: { label: 'לתיאום',  color: '#1d60a2', bg: '#eaf2fb' },
      scheduled:  { label: 'מתוזמן',  color: '#50439d', bg: '#eef0fb' },
      inprogress: { label: 'בטיפול',  color: '#bd8324', bg: '#fdf6e8' },
    };
    FEE = {
      collect: { label: 'לגבות דמי שירות', sub: 'טרם נגבה מהלקוח', amount: '180₪', color: '#9a7320', bg: '#fdf6e8', border: '#ecd7a4', iconBg: '#fbeed0' },
      paid:    { label: 'נגבו דמי שירות',  sub: 'שולם בכרטיס אשראי', amount: '180₪', color: '#2e8a63', bg: '#eafaf0', border: '#c2e6d1', iconBg: '#d6f1e0' },
      none:    { label: 'ללא דמי שירות',   sub: 'במסגרת מסלול / אחריות', amount: '—', color: '#5a6473', bg: '#f6f7f9', border: '#e2e6ec', iconBg: '#eceef2' },
    };

    TAGS = ['ירידת לחץ', 'מערכת תת-כיורית'];
    PHOTOS = [
      { label: 'מתחת לכיור', grad: 'linear-gradient(135deg,#cdd6e2,#9aa9bd)' },
      { label: 'המסנן', grad: 'linear-gradient(135deg,#c7e0cf,#8fbf9f)' },
      { label: 'הברז', grad: 'linear-gradient(135deg,#d8cfe8,#b3a3d6)' },
    ];

    state = {
      ticket: null
    };

    componentDidMount() {
      this.loadTicket();
      window.addEventListener('mineralbar:ready', () => this.loadTicket());
    }

    async loadTicket() {
      try {
        const p = new URLSearchParams(window.location.search);
        const ticketId = p.get('ticket_id') || p.get('id');
        if (!ticketId) return;

        if (!window.MineralBarApp) {
          console.warn('[service-call-details] window.MineralBarApp not defined yet');
          return;
        }
        if (!window.MineralBarApp.getTicket) {
          console.warn('[service-call-details] window.MineralBarApp.getTicket not defined');
          return;
        }
        
        const client = window.MineralBarApp.getClient();
        if (!client || !client.getToken()) {
          console.warn('[service-call-details] MineralBar client not authenticated yet. Waiting for mineralbar:ready event...');
          return;
        }

        const res = await window.MineralBarApp.getTicket(ticketId);
        if (res && res.ticket) {
          this.setState({ ticket: res.ticket });
        } else {
          console.warn('[service-call-details] response did not contain ticket property', res);
        }
      } catch (e) {
        console.error('[service-call-details] Failed to load ticket details:', e);
      }
    }

    renderVals() {
      const t = this.state.ticket;
      if (!t) {
        return;
      }

      let badge = 'new';
      let callStatus = 'toschedule';
      if (t.is_done === 1 || t.close_date || t.status === 4) {
        badge = 'done';
        callStatus = 'scheduled';
      } else if (t.status === 3) {
        badge = 'tocollect';
        callStatus = 'inprogress';
      } else if (t.status === 2) {
        badge = 'scheduled';
        callStatus = 'scheduled';
      } else {
        badge = 'new';
        callStatus = 'toschedule';
      }

      const status = this.STATUS[callStatus] || this.STATUS.toschedule;

      let prioKey = 'normal';
      if (t.rating === '5' || t.rating === '4') {
        prioKey = 'high';
      } else if (t.rating === '1') {
        prioKey = 'low';
      }
      const prio = this.PRIO[prioKey] || this.PRIO.normal;

      const feeKey = (t.approved_by_customer === 1 || t.status === 3) ? 'collect' : 'none';
      const fee = this.FEE[feeKey] || this.FEE.none;

      let wait = 0;
      let age = 'היום';
      if (t.open_date) {
        const open = new Date(t.open_date);
        const now = new Date();
        const diff = Math.floor((now - open) / (1000 * 60 * 60 * 24));
        if (diff > 0) {
          wait = diff;
          age = diff + ' ימים';
        }
      }

      const name = t.joined_customer_name || t.customer_name || 'לקוח';
      const parts = name.split(' ');
      const custInitials = parts.map(p => p[0]).join('').substring(0, 2);

      const photos = [];
      if (t.messages) {
        t.messages.forEach((m, idx) => {
          if (m.message && m.message.indexOf('biz1upload/') !== -1) {
            photos.push({
              label: 'תמונה ' + (idx + 1),
              grad: `url(https://mineral.biz1.co.il/${m.message}) center/cover no-repeat`
            });
          }
        });
      }
      const hasPhotos = photos.length > 0;

      let repName = '---';
      let hasRep = false;
      if (t.assign_member_id && t.assign_member_id.length) {
        const memberId = Number(t.assign_member_id[0]);
        hasRep = true;
        if (window.MineralBarApp && window.MineralBarApp.getTeamMembers) {
          const team = window.MineralBarApp.getTeamMembers();
          const found = team.find(m => Number(m.id) === memberId);
          if (found) repName = found.name;
          else repName = 'נציג ' + memberId;
        } else {
          repName = 'נציג ' + memberId;
        }
      }

      let repInitials = '';
      if (hasRep && repName) {
        const rp = repName.split(' ');
        repInitials = rp.map(p => p[0]).join('').substring(0, 2);
      }

      let openDateStr = '';
      if (t.open_date) {
        const d = new Date(t.open_date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hour = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        openDateStr = day + '/' + month + '/' + year + ' · ' + hour + ':' + min;
      }

      let scheduledAt = '';
      if (t.due_date) {
        const d = new Date(t.due_date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const time = t.ticket_from_time ? t.ticket_from_time.substring(0, 5) + '–' + (t.ticket_to_time ? t.ticket_to_time.substring(0, 5) : '') : '';
        scheduledAt = day + '/' + month + '/' + year + (time ? ' · ' + time : '');
      }

      let descText = '';
      if (t.messages && t.messages.length) {
        descText = t.messages[0].message;
        if (descText.indexOf('biz1upload/') === 0) {
          descText = 'קובץ מצורף';
        }
      } else {
        descText = t.subject || '';
      }
      return {
        callId: '#SRV-' + t.ticket_id,
        openedAt: age,
        callType: t.subject || 'שירות טכני',
        source: t.email || t.phone || '---',

        statusLabel: status.label, statusColor: status.color, statusBg: status.bg,

        prioLabel: prio.label, prioColor: prio.color, prioBg: prio.bg, prioBorder: prio.border,
        waitLabel: wait === 0 ? 'היום' : (wait === 1 ? 'ממתין יום' : 'ממתין ' + wait + ' ימים'),
        waitColor: prio.color,

        custInitials: custInitials, custName: name, custAddress: t.address || '---',

        productName: t.subject || 'שירות טכני', 
        productMeta: t.email ? 'אימייל · ' + t.email : '',
        warranty: (t.approved_by_customer === 1) ? 'באחריות' : 'ללא אחריות',

        problem: descText,
        tags: [{ label: t.subject || 'שירות טכני' }, { label: t.department === 341 ? 'שירות לקוחות' : 'שירות טכני' }],

        hasPhotos, noPhotos: !hasPhotos,
        photoCountLabel: hasPhotos ? photos.length + ' תמונות' : 'אין',
        photos: photos,

        hasRep, noRep: !hasRep,
        repInitials: repInitials, repName: repName, repRole: 'נציג שירות שטח', repAssignedAt: 'היום',

        techName: repName,
        createdAt: openDateStr,
        isScheduled: (t.status === 2 || t.status === 3),
        scheduledAt: scheduledAt,
        updatedBy: 'מערכת', updatedAt: openDateStr,

        feeLabel: fee.label, feeSub: fee.sub, feeAmount: fee.amount,
        feeColor: fee.color, feeBg: fee.bg, feeBorder: fee.border, feeIconBg: fee.iconBg,

        primaryLabel: hasRep ? 'עדכן שיבוץ' : 'שבץ טכנאי',
      };
    }
  }
