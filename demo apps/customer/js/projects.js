/**
 * Projects — list + detail modal for the customer portal
 */
const Projects = (() => {
  const STORE_KEY = 'cp_projects_store';
  const PREVIEW_KEY = 'cp_project_preview';
  const COLORS = ['#ec4899', '#0d9488', '#7c3aed', '#2563eb', '#d97706', '#db2777', '#0891b2'];
  const TEAM_DIR_KEY = 'cp_team_directory';
  let userDirectory = null;

  function tr(key) {
    return typeof I18n !== 'undefined' ? I18n.t(key) : key;
  }

  function esc(str) {
    return typeof Layout !== 'undefined' ? Layout.escapeHtml(str) : String(str ?? '');
  }

  function customerId() {
    const c = typeof Auth !== 'undefined' ? Auth.getCustomer() || {} : {};
    return String(c.id || c.c_id || c.customer_id || 'guest');
  }

  function customerName() {
    const c = typeof Auth !== 'undefined' ? Auth.getCustomer() || {} : {};
    return c.name || c.customer_name || tr('projects.noClient');
  }

  function loadStore() {
    try {
      const all = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      const bucket = all[customerId()] || { projects: {}, missions: {} };
      bucket.projects = bucket.projects || {};
      bucket.missions = bucket.missions || {};
      return { all, bucket };
    } catch {
      return { all: {}, bucket: { projects: {}, missions: {} } };
    }
  }

  function saveStore(bucket) {
    const { all } = loadStore();
    all[customerId()] = bucket;
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
  }

  function rememberPreview(project) {
    try {
      sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(project || {}));
    } catch {
      /* ignore */
    }
  }

  function readPreview() {
    try {
      return JSON.parse(sessionStorage.getItem(PREVIEW_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function initials(name) {
    const s = String(name || '').trim();
    if (!s) return '?';
    if (/^\d+$/.test(s)) return s.slice(-2);
    const parts = s.split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  }

  function formatShortDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  }

  function timelineHtml(p) {
    const counts = Array.isArray(p.timeline_counts) ? p.timeline_counts : [0, 0, 0];
    const todo = Number(p.timeline?.to_do ?? counts[0] ?? 0);
    const queries = Number(p.timeline?.queries ?? counts[1] ?? 0);
    const testing = Number(p.timeline?.testing ?? counts[2] ?? 0);
    return `<div class="proj-timeline" title="To Do / Queries / Testing">
      <span class="proj-tl proj-tl-todo">${todo}</span>
      <span class="proj-tl proj-tl-queries">${queries}</span>
      <span class="proj-tl proj-tl-testing">${testing}</span>
    </div>`;
  }

  function colorFor(key) {
    const s = String(key || '');
    let n = 0;
    for (let i = 0; i < s.length; i += 1) n = (n + s.charCodeAt(i) * (i + 1)) % 997;
    return COLORS[n % COLORS.length];
  }

  function avatarHtml(name, id) {
    const label = name || `#${id || ''}`;
    return `<span class="proj-avatar" title="${esc(label)}" style="background:${colorFor(id || label)}">${esc(
      initials(label)
    )}</span>`;
  }

  function looksLikeIdOnly(name, id) {
    if (name == null || name === '') return true;
    const s = String(name).trim();
    const mid = String(id || '').trim();
    if (!s) return true;
    if (mid && s === mid) return true;
    if (/^#?\d+$/.test(s)) return true;
    return false;
  }

  function loadDirectoryCache() {
    const map = new Map();
    try {
      const raw = JSON.parse(localStorage.getItem(TEAM_DIR_KEY) || '{}');
      Object.entries(raw).forEach(([id, name]) => {
        const mid = String(id || '').trim();
        const label = String(name || '').trim();
        if (mid && label && !looksLikeIdOnly(label, mid)) map.set(mid, label);
      });
    } catch {
      /* ignore */
    }
    const cfg = window.CP_CONFIG?.TEAM_USER_NAMES;
    if (cfg && typeof cfg === 'object') {
      Object.entries(cfg).forEach(([id, name]) => {
        const mid = String(id || '').trim();
        const label = String(name || '').trim();
        if (mid && label) map.set(mid, label);
      });
    }
    return map;
  }

  function saveDirectoryCache() {
    if (!userDirectory?.size) return;
    try {
      const obj = Object.fromEntries(userDirectory.entries());
      localStorage.setItem(TEAM_DIR_KEY, JSON.stringify(obj));
    } catch {
      /* ignore */
    }
  }

  function personIdFields(obj) {
    if (!obj || typeof obj !== 'object') return [];
    return [
      obj.id,
      obj.user_id,
      obj.member_id,
      obj.team_member_id,
      obj.organizations_user_id,
      obj.org_user_id,
      obj.doctor_id,
    ]
      .map((v) => String(v || '').trim())
      .filter(Boolean);
  }

  function personNameFields(obj) {
    if (!obj || typeof obj !== 'object') return '';
    return String(
      obj.name ||
        obj.full_name ||
        obj.user_name ||
        obj.member_name ||
        obj.display_name ||
        obj.doctor_name ||
        obj.first_name ||
        ''
    ).trim();
  }

  function ingestPeopleFromValue(value, add, depth = 0) {
    if (value == null || depth > 8) return;
    if (Array.isArray(value)) {
      value.forEach((v) => ingestPeopleFromValue(v, add, depth + 1));
      return;
    }
    if (typeof value === 'object') {
      const name = personNameFields(value);
      const ids = personIdFields(value);
      if (name && ids.length) ids.forEach((id) => add(id, name));
      Object.values(value).forEach((v) => {
        if (v && typeof v === 'object') ingestPeopleFromValue(v, add, depth + 1);
      });
      return;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed || (!trimmed.startsWith('[') && !trimmed.startsWith('{'))) return;
      try {
        ingestPeopleFromValue(JSON.parse(trimmed), add, depth + 1);
      } catch {
        /* ignore */
      }
    }
  }

  async function loadUserDirectory(projectRows = []) {
    userDirectory = loadDirectoryCache();
    const add = (id, name) => {
      const mid = String(id || '').trim();
      const label = String(name || '').trim();
      if (!mid || !label || looksLikeIdOnly(label, mid)) return;
      userDirectory.set(mid, label);
    };

    (Array.isArray(projectRows) ? projectRows : []).forEach((row) => ingestPeopleFromValue(row, add));

    try {
      const docs = await API.appointmentsDoctors();
      UI.listRows(docs).forEach((d) => {
        const name = d.name || d.doctor_name || d.full_name;
        add(d.team_member_id, name);
        add(d.doctor_id, name);
      });
    } catch {
      /* ignore */
    }

    saveDirectoryCache();
    return userDirectory;
  }

  function resolveUserName(id, cachedName) {
    const mid = String(id || '').trim();
    if (!mid) return '';
    if (!looksLikeIdOnly(cachedName, mid)) return String(cachedName).trim();
    return userDirectory?.get(mid) || '';
  }

  function applyDirectoryToProject(project) {
    if (!project || !userDirectory?.size) return project;
    const members = (project.members || []).map((m) => {
      const name = resolveUserName(m.id, m.name) || (looksLikeIdOnly(m.name, m.id) ? '' : m.name);
      return { ...m, name };
    });
    const default_user_name =
      resolveUserName(project.default_user_id, project.default_user_name) || project.default_user_name;
    const created_by_name = resolveUserName(project.created_by, project.created_by_name) || project.created_by_name;
    const user_name = resolveUserName(project.user_id, project.user_name) || project.user_name;
    return {
      ...project,
      members,
      default_user_name,
      created_by_name,
      user_name,
    };
  }

  async function enrichProject(project, rawRow) {
    await loadUserDirectory(rawRow ? [rawRow] : []);
    return applyDirectoryToProject(normalizeProject(project));
  }

  function parseIdList(value) {
    if (value == null || value === '') return [];
    if (Array.isArray(value)) {
      return value
        .map((v) => {
          if (v && typeof v === 'object') return String(v.id || v.user_id || v.member_id || '').trim();
          return String(v).trim();
        })
        .filter(Boolean);
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];
      try {
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          return parseIdList(JSON.parse(trimmed));
        }
      } catch {
        /* fall through to comma split */
      }
      return trimmed
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (typeof value === 'number') return [String(value)];
    return [];
  }

  function parseMembers(raw = {}, extra = {}) {
    const fromArrays = [];
    const pushPair = (id, name) => {
      const mid = String(id || '').trim();
      if (!mid) return;
      if (fromArrays.some((m) => m.id === mid)) return;
      fromArrays.push({ id: mid, name: name || '' });
    };

    const objectLists = [
      raw.team_members,
      raw.members,
      raw.users,
      raw.assignees,
      extra.team_members,
      extra.members,
    ];
    objectLists.forEach((list) => {
      if (!Array.isArray(list)) return;
      list.forEach((m) => {
        if (typeof m === 'string' || typeof m === 'number') pushPair(m, String(m));
        else {
          pushPair(
            m.id || m.user_id || m.member_id || m.team_member_id,
            m.name || m.full_name || m.user_name || m.member_name || m.email || ''
          );
        }
      });
    });

    const memberNameMap =
      raw.member_names && typeof raw.member_names === 'object' && !Array.isArray(raw.member_names)
        ? raw.member_names
        : extra.member_names && typeof extra.member_names === 'object' && !Array.isArray(extra.member_names)
          ? extra.member_names
          : null;

    // Projects.List / Customer.Projects.List: "member": [14, 47] or ["24209"] or [{id,name}]
    const memberRaw = raw.member ?? extra.member;
    if (typeof memberRaw === 'string' && memberRaw.trim().startsWith('[')) {
      try {
        ingestPeopleFromValue(JSON.parse(memberRaw), (id, name) => pushPair(id, name));
      } catch {
        parseIdList(memberRaw).forEach((id) => pushPair(id, memberNameMap?.[id] || ''));
      }
    } else if (Array.isArray(memberRaw) && memberRaw.length && typeof memberRaw[0] === 'object') {
      memberRaw.forEach((m) =>
        pushPair(
          m.id || m.user_id || m.member_id || m.team_member_id,
          m.name || m.full_name || m.user_name || m.member_name || ''
        )
      );
    } else {
      const ids = parseIdList(memberRaw);
      const namesArr = Array.isArray(raw.member_names)
        ? raw.member_names
        : Array.isArray(extra.member_names)
          ? extra.member_names
          : null;
      ids.forEach((id, idx) => {
        const mapped = memberNameMap?.[id] || memberNameMap?.[Number(id)] || (namesArr ? namesArr[idx] : '');
        pushPair(id, mapped || '');
      });
    }
    parseIdList(raw.member_ids ?? raw.organizations_user ?? extra.member_ids ?? extra.organizations_user).forEach(
      (id) => pushPair(id, memberNameMap?.[id] || memberNameMap?.[Number(id)] || '')
    );

    const singleId = raw.member_id || raw.team_member_id || extra.member_id || '';
    const singleName = raw.member_name || raw.team_member_name || extra.member_name || '';
    if (singleId) pushPair(singleId, singleName);

    return fromArrays;
  }

  function parseDefaultUser(raw = {}, extra = {}, members = []) {
    const ids = parseIdList(
      raw.default_user ??
        raw['default user'] ??
        raw.default_user_id ??
        extra.default_user ??
        extra.default_user_id
    );
    let defaultUserId = ids[0] || String(raw.default_user_id || extra.default_user_id || '');
    let defaultUserName = raw.default_user_name || extra.default_user_name || '';
    if (defaultUserId && members.length && !members.some((m) => m.id === defaultUserId)) {
      // keep id even if not in member list
      defaultUserName = defaultUserName || defaultUserId;
    } else if (!defaultUserId && members.length === 1) {
      defaultUserId = members[0].id;
      defaultUserName = members[0].name;
    } else if (defaultUserId && !defaultUserName) {
      defaultUserName = members.find((m) => m.id === defaultUserId)?.name || defaultUserId;
    }
    return { defaultUserId, defaultUserName, defaultUserIds: ids };
  }

  function normalizeProject(raw = {}) {
    const extra = loadStore().bucket.projects[String(raw.id)] || {};
    const members = parseMembers(raw, extra);
    const { defaultUserId, defaultUserName, defaultUserIds } = parseDefaultUser(raw, extra, members);
    const memberName =
      members
        .map((m) => (m.name && String(m.name) !== String(m.id) ? m.name : ''))
        .filter(Boolean)
        .join(', ') ||
      raw.member_name ||
      extra.member_name ||
      '';
    const memberId = members[0]?.id || raw.member_id || extra.member_id || '';
    const clientId = String(raw.client_id || raw.customer_id || raw.cust_id || extra.client_id || customerId());
    const clientObj = raw.client && typeof raw.client === 'object' ? raw.client : null;
    const clientName =
      raw.client_name ||
      raw.customer_name ||
      clientObj?.name ||
      extra.client_name ||
      customerName();
    const timeline = raw.timeline || extra.timeline || {};
    const timelineCounts = Array.isArray(raw.timeline_counts)
      ? raw.timeline_counts
      : Array.isArray(extra.timeline_counts)
        ? extra.timeline_counts
        : [Number(timeline.to_do || 0), Number(timeline.queries || 0), Number(timeline.testing || 0)];

    return {
      ...extra,
      ...raw,
      id: String(raw.id || extra.id || ''),
      name: raw.name || raw.project_name || extra.name || tr('projects.untitled'),
      type: raw.type || extra.type || tr('projects.project'),
      note: raw.note || extra.note || '',
      credentials: raw.credentials || extra.credentials || '',
      members,
      member: members.map((m) => m.id),
      member_ids: members.map((m) => m.id),
      member_id: String(memberId || ''),
      member_name: memberName,
      default_user: defaultUserIds,
      default_user_id: defaultUserId,
      default_user_name: defaultUserName,
      user_id: String(raw.user_id || extra.user_id || ''),
      user_name: raw.user_name || extra.user_name || '',
      created_by: String(raw.created_by || extra.created_by || ''),
      created_by_name:
        raw.created_by_name ||
        raw.creator_name ||
        raw.created_by_user_name ||
        extra.created_by_name ||
        '',
      client_id: clientId,
      customer_id: clientId,
      client_name: clientName,
      allow_add_missions: String(raw.allow_add_mission ?? raw.allow_add_missions ?? extra.allow_add_missions ?? '') === '1',
      done: String(raw.done ?? extra.done ?? '') === '1',
      use_as_template: String(raw.use_as_template ?? extra.use_as_template ?? '') === '1',
      timeline,
      timeline_counts: timelineCounts,
      created_at: raw.created_at || raw.c_date || raw.date || extra.created_at || '',
    };
  }

  function missionsFor(projectId) {
    return loadStore().bucket.missions[String(projectId)] || [];
  }

  function saveMissions(projectId, missions) {
    const { bucket } = loadStore();
    bucket.missions[String(projectId)] = missions;
    saveStore(bucket);
  }


  function moveLocalMission(projectId, missionId, column) {
    const missions = missionsFor(projectId).map((m) =>
      String(m.id) === String(missionId) ? { ...m, column } : m
    );
    saveMissions(projectId, missions);
  }

  function mergeRows(apiRows = []) {
    const { bucket } = loadStore();
    const seen = new Set();
    const rows = [];
    apiRows.forEach((row) => {
      const id = String(row.id);
      seen.add(id);
      rows.push(normalizeProject(row));
    });
    Object.values(bucket.projects)
      .filter((p) => p.local && !seen.has(String(p.id)))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      .forEach((p) => rows.unshift(normalizeProject(p)));
    return rows;
  }

  function isLocalId(id) {
    return String(id || '').startsWith('local-');
  }

  async function fetchProject(id) {
    const preview = readPreview();
    const extra = loadStore().bucket.projects[String(id)] || {};
    let apiRow = null;
    if (!isLocalId(id)) {
      try {
        const got = await API.projectsGet(id);
        if (got && (got.success === 0 || got.success === '0')) throw new Error(got.error || 'not found');
        apiRow = got.data || got.project || got;
        if (apiRow && typeof apiRow === 'object' && !apiRow.id && !apiRow.name && !apiRow.project_name) {
          apiRow = null;
        } else if (apiRow && typeof apiRow === 'object' && !apiRow.id) {
          apiRow.id = id;
        }
      } catch {
        apiRow = null;
      }
      if (!apiRow) {
        try {
          const list = await API.projectsList({ limit: 25, search: '' });
          apiRow = UI.listRows(list).find((r) => String(r.id) === String(id)) || null;
        } catch {
          apiRow = null;
        }
      }
    }
    const base = apiRow || (preview && String(preview.id) === String(id) ? preview : extra);
    if (!base || (!base.id && !extra.id && !apiRow)) {
      if (extra.id) return normalizeProject(extra);
      return null;
    }
    return normalizeProject({ id, ...extra, ...base });
  }

  async function fetchMissions(projectId) {
    const local = missionsFor(projectId);
    if (isLocalId(projectId)) return local;
    try {
      const res = await API.missionsList({ project_id: projectId });
      const rows = UI.listRows(res);
      if (rows.length) {
        return rows.map((row) => ({
          id: String(row.id || row.mission_id),
          title: row.mission || row.title || row.message || row.name || '',
          column: row.project_column || row.column_name || row.status || 'to_do',
          date: row.date_to_do || row.date || row.due_date || '',
          assignee: row.assignee || row.user_name || row.member_name || '',
        }));
      }
    } catch {
      /* Customer.Missions.List is not in the public catalog */
    }
    return local;
  }


  function ensureModal() {
    let el = document.getElementById('project-modal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'project-modal';
      el.hidden = true;
      document.body.appendChild(el);
    }
    return el;
  }

  function closeModal() {
    const el = document.getElementById('project-modal');
    if (el) {
      el.hidden = true;
      el.innerHTML = '';
    }
    document.removeEventListener('keydown', onEsc);
  }

  function onEsc(e) {
    if (e.key === 'Escape') closeModal();
  }

  function detailRow(label, value) {
    if (value == null || value === '') return '';
    return `<div class="proj-detail-row">
      <div class="proj-detail-label">${esc(label)}</div>
      <div class="proj-detail-value">${value}</div>
    </div>`;
  }

  function personDisplayName(id, name) {
    const mid = String(id || '').trim();
    const resolved =
      resolveUserName(mid, name) || (looksLikeIdOnly(name, mid) ? '' : String(name || '').trim());
    if (resolved) return { primary: resolved, mid, showId: mid && resolved !== mid && !resolved.includes(mid) };
    if (mid) return { primary: `#${mid}`, mid, showId: false };
    return { primary: tr('projects.unnamedPerson'), mid: '', showId: false };
  }

  function personDetailHtml(id, name) {
    if (!id && !name) return '';
    const { primary, mid, showId } = personDisplayName(id, name);
    return `<div class="proj-detail-member">${avatarHtml(primary, mid || primary)}<div class="proj-detail-person"><span class="proj-detail-person-name">${esc(
      primary
    )}</span>${showId ? `<span class="proj-detail-person-id">#${esc(mid)}</span>` : ''}</div></div>`;
  }

  function membersDetailHtml(project) {
    const people = Array.isArray(project.members) ? project.members : [];
    if (!people.length) return `<span class="text-muted">${esc(tr('projects.noTeam'))}</span>`;
    return `<div class="proj-detail-members">${people.map((m) => personDetailHtml(m.id, m.name)).join('')}</div>`;
  }

  function detailBodyHtml(project) {
    const client = project.client_name || customerName();
    const defaultUserHtml = project.default_user_id
      ? personDetailHtml(project.default_user_id, project.default_user_name)
      : '';
    const createdByHtml = project.created_by
      ? personDetailHtml(project.created_by, project.created_by_name)
      : '';
    const ownerHtml = project.user_id ? personDetailHtml(project.user_id, project.user_name) : '';
    const flags = [
      project.allow_add_missions ? tr('projects.allowMissions') : '',
      project.done ? tr('projects.doneFlag') : '',
      project.use_as_template ? tr('projects.useAsTemplate') : '',
    ].filter(Boolean);

    return `
      <div class="proj-detail-hero">
        <div class="proj-detail-hero-main">
          <div class="proj-board-name">${esc(project.name)}</div>
          <div class="proj-board-meta">${esc(
            [`${tr('table.id')} #${project.id}`, project.type || tr('projects.project')].filter(Boolean).join(' · ')
          )}</div>
        </div>
        ${timelineHtml(project)}
      </div>
      <div class="proj-detail-grid">
        ${detailRow(
          tr('projects.client'),
          `<div class="proj-detail-inline">${avatarHtml(client, project.client_id || customerId())}<span>${esc(
            client
          )}${project.client_id ? ` <span class="text-muted">(#${esc(project.client_id)})</span>` : ''}</span></div>`
        )}
        ${detailRow(tr('projects.team'), membersDetailHtml(project))}
        ${defaultUserHtml ? detailRow(tr('projects.defaultUser'), defaultUserHtml) : ''}
        ${createdByHtml ? detailRow(tr('projects.createdBy'), createdByHtml) : ''}
        ${ownerHtml ? detailRow(tr('projects.projectUser'), ownerHtml) : ''}
        ${detailRow(tr('projects.credentials'), project.credentials ? esc(project.credentials) : '')}
        ${detailRow(tr('projects.note'), project.note ? esc(project.note) : '')}
        ${detailRow(tr('projects.date'), project.created_at ? esc(formatShortDate(project.created_at)) : '')}
        ${flags.length ? detailRow(tr('projects.flags'), `<div class="proj-detail-flags">${flags.map((f) => `<span class="proj-flag">${esc(f)}</span>`).join('')}</div>`) : ''}
      </div>`;
  }

  async function openDetailModal(project) {
    if (!project) return;
    rememberPreview(project);
    const overlay = ensureModal();
    overlay.hidden = false;
    overlay.innerHTML = `
      <div class="proj-modal-backdrop" data-close></div>
      <div class="proj-modal proj-modal-detail" role="dialog" aria-modal="true" aria-labelledby="proj-detail-title">
        <div class="proj-modal-head">
          <h2 id="proj-detail-title">${esc(tr('projects.details'))}</h2>
          <button type="button" class="proj-modal-close" data-close aria-label="${esc(tr('projects.closeModal'))}">×</button>
        </div>
        <div class="proj-detail-body"><div class="spinner"></div></div>
        <div class="proj-modal-foot proj-modal-foot-end">
          <button type="button" class="btn btn-primary" data-close>${esc(tr('projects.closeModal'))}</button>
        </div>
      </div>`;
    overlay.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', closeModal));
    document.addEventListener('keydown', onEsc);

    const enriched = await enrichProject(project);
    rememberPreview(enriched);
    const body = overlay.querySelector('.proj-detail-body');
    if (body) body.innerHTML = detailBodyHtml(enriched);
  }

  function renderDetailPage(root, project) {
    if (!root || !project) return;
    root.innerHTML = `
      <div class="proj-detail-page">
        <div class="proj-detail-page-head">
          <a class="proj-back-btn" href="projects.html" aria-label="${esc(tr('projects.back'))}">‹</a>
          <div class="proj-board-name">${esc(project.name)}</div>
        </div>
        <div class="card proj-detail-card">${detailBodyHtml(project)}</div>
      </div>`;
  }

  function cardHtml(p) {
    const members = Array.isArray(p.members) ? p.members : [];
    const avatars = members
      .slice(0, 4)
      .map((m) => {
        const label = resolveUserName(m.id, m.name) || m.name || m.id;
        return avatarHtml(label, m.id);
      })
      .join('');
    const more =
      members.length > 4 ? `<span class="proj-avatar-more">+${members.length - 4}</span>` : '';
    return `<button type="button" class="card proj-card" data-project-id="${esc(p.id)}">
      <div class="proj-card-top">
        <div>
          <div class="card-title">${esc(p.name || tr('projects.untitled'))}</div>
          <div class="card-meta mt-1">${tr('table.id')} #${esc(
            isLocalId(p.id) ? String(p.id).replace(/^local-/, '') : p.id
          )}${p.client_id ? ` · ${esc(tr('projects.clientId'))} ${esc(p.client_id)}` : ''}</div>
        </div>
        ${timelineHtml(p)}
      </div>
      <div class="proj-card-foot">
        <div class="proj-avatar-stack">${avatars}${more}</div>
        <span class="proj-card-date">${esc(formatShortDate(p.created_at))}</span>
      </div>
      ${p.note ? `<p class="text-sm mt-2">${esc(p.note)}</p>` : ''}
    </button>`;
  }

  function initList({ searchInput, listEl }) {
    let search = '';
    let timer;

    async function load() {
      Layout.loading(listEl);
      try {
        const data = await API.projectsList({ search, limit: 25 });
        const rawRows = UI.listRows(data);
        await loadUserDirectory(rawRows);
        const rows = mergeRows(data.data || rawRows).map((p) => applyDirectoryToProject(p));
        const filtered = search
          ? rows.filter((p) => `${p.name} ${p.note} ${p.id}`.toLowerCase().includes(search.toLowerCase()))
          : rows;
        if (!filtered.length) {
          Layout.empty(listEl, tr('projects.none'), tr('projects.noneHint'));
          return;
        }
        listEl.innerHTML = `<div class="grid grid-2">${filtered.map(cardHtml).join('')}</div>`;
        listEl.querySelectorAll('[data-project-id]').forEach((card) => {
          card.addEventListener('click', () => {
            const id = card.getAttribute('data-project-id');
            const project = filtered.find((p) => String(p.id) === String(id));
            if (project) openDetailModal(project);
          });
        });
      } catch (err) {
        const local = mergeRows([]);
        if (local.length) {
          listEl.innerHTML = `<div class="grid grid-2">${local.map(cardHtml).join('')}</div>`;
          listEl.querySelectorAll('[data-project-id]').forEach((card) => {
            card.addEventListener('click', () => {
              const id = card.getAttribute('data-project-id');
              const project = local.find((p) => String(p.id) === String(id));
              if (project) openDetailModal(project);
            });
          });
          return;
        }
        Layout.error(listEl, err.message);
      }
    }

    window.__cpReloadProjects = load;

    searchInput?.addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        search = e.target.value.trim();
        load();
      }, 350);
    });

    load();
    return { load };
  }

  async function initDetail({ root }) {
    const id = UI.param('id');
    if (!id) {
      Layout.error(root, tr('projects.missingId'));
      return;
    }
    Layout.loading(root);
    const project = await fetchProject(id);
    if (!project) {
      Layout.error(root, tr('projects.notFound'));
      return;
    }
    const enriched = await enrichProject(project);
    rememberPreview(enriched);
    const titleEl = document.querySelector('.page-title');
    if (titleEl) titleEl.textContent = enriched.name;
    renderDetailPage(root, enriched);
  }

  return { initList, initDetail, openDetailModal, rememberPreview };
})();

window.Projects = Projects;
