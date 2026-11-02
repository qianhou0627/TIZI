export const ADMIN_SCRIPT = String.raw`
(() => {
  'use strict';

  const GIB = 1073741824;
  const DEFAULT_TRAFFIC_LIMIT = 695784701952;
  const DEFAULT_TRAFFIC_PERIOD_START = '2026-08-12T00:25:00.000Z';
  const DEFAULT_TRAFFIC_EXPIRY = '2026-09-11T00:25:00.000Z';
  const ADMIN_API_PAGE_SIZE = 200;
  const ADMIN_API_MAX_ROWS = 5000;
  const USER_NOTICE_DEFAULT_DURATION_MINUTES = 10;
  const USER_NOTICE_MIN_DURATION_MINUTES = 5;
  const USER_NOTICE_MAX_DURATION_MINUTES = 10080;
  const USER_NOTICE_DURATION_STEP_MINUTES = 5;
  const viewMeta = {
    overview: { title: '概览' },
    users: { title: '用户管理' },
    config: { title: '配置' },
    anomalies: { title: '异常记录' },
    subscriptions: { title: '订阅管理' }
  };
  const state = {
    view: 'overview',
    users: [],
    anomalies: [],
    quota: {
      trafficLimitBytes: DEFAULT_TRAFFIC_LIMIT,
      uploadBytes: 0,
      downloadBytes: 0,
      usedBytes: 0,
      remainingBytes: DEFAULT_TRAFFIC_LIMIT,
      usagePercent: 0,
      trafficPeriodStartedAt: DEFAULT_TRAFFIC_PERIOD_START,
      trafficExpiresAt: DEFAULT_TRAFFIC_EXPIRY
    },
    trafficTrend: {
      range: 'day',
      points: [],
      cache: {},
      error: '',
      requestSequence: 0,
      activeIndex: -1
    },
    userSort: { key: 'totalBytes', direction: 'desc' },
    userPage: 1,
    userPageSize: 10,
    anomalySort: { key: 'createdAt', direction: 'desc' },
    anomalyPage: 1,
    anomalyPageSize: 8,
    activeUserId: '',
    activeUserName: '',
    activeUserTrafficRows: [],
    userTrafficPage: 1,
    userTrafficPageSize: 8,
    overviewSection: 'users',
    configSection: 'global',
    anomalySection: 'records',
    activeRequests: 0,
    userLoadSequence: 0,
    mergePreviewSequence: 0,
    mergePreviewState: null,
    mergeRequestId: '',
    profileRequestId: '',
    noticeRequestId: '',
    broadcastRequestId: '',
    resetNoticesRequestId: '',
    resetNoticesUserKey: '',
    selectedUserIds: new Set()
  };

  const adminShell = document.getElementById('adminShell');
  const adminWorkspace = document.getElementById('adminWorkspace');
  const authPanel = document.getElementById('authPanel');
  const tokenInput = document.getElementById('token');
  const loginButton = document.getElementById('login');
  const changeTokenButton = document.getElementById('changeToken');
  const refreshButton = document.getElementById('refresh');
  const statusEl = document.getElementById('status');
  const pageTitle = document.getElementById('pageTitle');
  const toast = document.getElementById('toast');
  const usersBody = document.getElementById('users');
  const userCountEl = document.getElementById('userCount');
  const userPageSummary = document.getElementById('userPageSummary');
  const userPagination = document.getElementById('userPagination');
  const userSearch = document.getElementById('userSearch');
  const userSubscriptionFilter = document.getElementById('userSubscriptionFilter');
  const userAnomalyFilter = document.getElementById('userAnomalyFilter');
  const userSortKey = document.getElementById('userSortKey');
  const userSortDirection = document.getElementById('userSortDirection');
  const userPageSize = document.getElementById('userPageSize');
  const anomaliesBody = document.getElementById('anomalies');
  const anomalyCountEl = document.getElementById('anomalyCount');
  const anomalyPageSummary = document.getElementById('anomalyPageSummary');
  const anomalyPagination = document.getElementById('anomalyPagination');
  const anomalySearch = document.getElementById('anomalySearch');
  const anomalySortKey = document.getElementById('anomalySortKey');
  const anomalySortDirection = document.getElementById('anomalySortDirection');
  const anomalyPageSize = document.getElementById('anomalyPageSize');
  const userDrawer = document.getElementById('userDrawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const drawerPlaceholder = document.getElementById('drawerPlaceholder');
  const drawerContent = document.getElementById('drawerContent');
  const detailsBody = document.getElementById('details');
  const trafficPageSummary = document.getElementById('trafficPageSummary');
  const trafficPagination = document.getElementById('trafficPagination');
  const globalSubscriptionState = document.getElementById('globalSubscriptionState');
  const userSubscriptionState = document.getElementById('userSubscriptionState');
  const userModeEl = document.getElementById('userMode');
  const userCanEditManagedConfigEl = document.getElementById('userCanEditManagedConfig');
  const userProfileNameEl = document.getElementById('userProfileName');
  const userProfileNicknameEl = document.getElementById('userProfileNickname');
  const userProfileNameError = document.getElementById('userProfileNameError');
  const userNoticeTone = document.getElementById('userNoticeTone');
  const userNoticeMessage = document.getElementById('userNoticeMessage');
  const userNoticeDuration = document.getElementById('userNoticeDuration');
  const userNoticeError = document.getElementById('userNoticeError');
  const userSelectionCount = document.getElementById('userSelectionCount');
  const selectVisibleUsers = document.getElementById('selectVisibleUsers');
  const selectFilteredUsers = document.getElementById('selectFilteredUsers');
  const broadcastNoticeButton = document.getElementById('broadcastNotice');
  const resetSelectedNoticesButton = document.getElementById('resetSelectedNotices');
  const broadcastDialog = document.getElementById('broadcastDialog');
  const broadcastNoticeForm = document.getElementById('broadcastNoticeForm');
  const broadcastTargetSummary = document.getElementById('broadcastTargetSummary');
  const broadcastNoticeTone = document.getElementById('broadcastNoticeTone');
  const broadcastNoticeMessage = document.getElementById('broadcastNoticeMessage');
  const broadcastNoticeDuration = document.getElementById('broadcastNoticeDuration');
  const broadcastNoticeError = document.getElementById('broadcastNoticeError');
  const noticeReceiptSummary = document.getElementById('noticeReceiptSummary');
  const noticeReceiptList = document.getElementById('noticeReceiptList');
  const mergeTargetEl = document.getElementById('mergeTarget');
  const mergePreviewEl = document.getElementById('mergePreview');
  const mergePreviewSummary = document.getElementById('mergePreviewSummary');
  const mergeConflictEl = document.getElementById('mergeConflict');
  const mergeResolutionEl = document.getElementById('mergeResolution');
  const previewMergeButton = document.getElementById('previewMerge');
  const confirmMergeButton = document.getElementById('confirmMerge');
  const confirmDialog = document.getElementById('confirmDialog');
  const confirmText = document.getElementById('confirmText');
  const confirmPhraseWrap = document.getElementById('confirmPhraseWrap');
  const confirmPhrase = document.getElementById('confirmPhrase');
  const confirmAccept = document.getElementById('confirmAccept');
  const closeUserDrawerButton = document.getElementById('closeUserDrawer');
  const trafficTrendPlot = document.getElementById('trafficTrendPlot');
  const trafficTrendChart = document.getElementById('trafficTrendChart');
  const trafficTrendTooltip = document.getElementById('trafficTrendTooltip');
  const trafficTrendDescription = document.getElementById('trafficTrendDescription');
  const drawerBackgroundElements = [
    document.querySelector('.sidebar'),
    document.querySelector('.topbar'),
    document.querySelector('#viewUsers > .metric-grid'),
    document.querySelector('#viewUsers .user-list-panel')
  ].filter(Boolean);
  let toastTimer = 0;
  let viewportFrame = 0;
  let drawerReturnFocus = null;

  let committedToken = '';
  let subscriptions = [];
  let subscriptionCategory = '';
  let subscriptionExpiryFilter = '总数';
  let editingSubscriptionId = '';
  let subscriptionCategories = [];

  authPanel.addEventListener('submit', (event) => {
    event.preventDefault();
    runAction(loginButton, '验证中', authenticate);
  });
  changeTokenButton.addEventListener('click', () => setAuthPanelOpen(authPanel.hidden));
  refreshButton.addEventListener('click', () => runAction(refreshButton, '刷新中', () => loadAll(true)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' && document.body.classList.contains('drawer-modal') && !(confirmDialog && confirmDialog.open)) {
      trapDrawerFocus(event);
      return;
    }
    if (event.key !== 'Escape') return;
    if (broadcastDialog && (broadcastDialog.open || broadcastDialog.hasAttribute('open'))) {
      closeBroadcastDialog();
      return;
    }
    if (!adminWorkspace.hidden && !authPanel.hidden) setAuthPanelOpen(false);
    else if (userDrawer.classList.contains('is-open')) closeUserContext();
  });
  document.addEventListener('pointerdown', (event) => {
    if (adminWorkspace.hidden || authPanel.hidden) return;
    if (!authPanel.contains(event.target) && !changeTokenButton.contains(event.target)) setAuthPanelOpen(false);
  });
  drawerBackdrop.addEventListener('click', closeUserContext);
  closeUserDrawerButton.addEventListener('click', closeUserContext);
  window.addEventListener('resize', scheduleViewportLayout);

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });
  document.querySelectorAll('[data-go-config]').forEach((button) => button.addEventListener('click', () => {
    state.configSection = 'quota';
    setView('config');
    syncSectionSwitcher('config');
  }));
  document.querySelectorAll('[data-go-users]').forEach((button) => button.addEventListener('click', () => setView('users')));
  document.querySelectorAll('[data-go-anomalies]').forEach((button) => button.addEventListener('click', () => setView('anomalies')));
  bindSectionSwitcher('overview');
  bindSectionSwitcher('config');
  bindSectionSwitcher('anomaly');
  bindTrendRange();

  trafficTrendPlot.addEventListener('pointermove', updateTrendPointer);
  trafficTrendPlot.addEventListener('pointerleave', () => {
    if (state.trafficTrend.activeIndex < 0) return;
    state.trafficTrend.activeIndex = -1;
    renderTrafficTrend();
  });
  trafficTrendPlot.addEventListener('keydown', moveTrendKeyboardCursor);
  if (typeof window.ResizeObserver === 'function') {
    const trendResizeObserver = new window.ResizeObserver(() => renderTrafficTrend());
    trendResizeObserver.observe(trafficTrendPlot);
  }

  document.getElementById('globalConfigForm').addEventListener('submit', (event) => {
    event.preventDefault();
    runAction(document.getElementById('saveGlobal'), '保存中', saveGlobalConfig);
  });
  document.getElementById('syncGlobalUsers').addEventListener('click', () => runAction(document.getElementById('syncGlobalUsers'), '清除中', syncGlobalUsers));
  document.getElementById('trafficLimitForm').addEventListener('submit', (event) => {
    event.preventDefault();
    runAction(document.getElementById('saveTrafficLimit'), '保存中', saveTrafficLimit);
  });
  document.getElementById('userConfigForm').addEventListener('submit', (event) => {
    event.preventDefault();
    runAction(document.getElementById('saveUserConfig'), '保存中', saveUserConfig);
  });
  document.getElementById('resetUserConfig').addEventListener('click', () => runAction(document.getElementById('resetUserConfig'), '重置中', resetUserConfig));
  document.getElementById('userProfileForm').addEventListener('submit', (event) => {
    event.preventDefault();
    runAction(document.getElementById('saveUserProfile'), '保存中', saveUserProfile);
  });
  document.getElementById('saveUserNickname').addEventListener('click', () => runAction(document.getElementById('saveUserNickname'), '保存中', saveUserNickname));
  userProfileNameEl.addEventListener('input', () => { state.profileRequestId = ''; });
  document.getElementById('userNoticeForm').addEventListener('submit', (event) => {
    event.preventDefault();
    runAction(document.getElementById('saveUserNotice'), '保存中', saveUserNotice);
  });
  document.getElementById('clearUserNotice').addEventListener('click', () => runAction(document.getElementById('clearUserNotice'), '停用中', clearUserNotice));
  document.getElementById('decreaseUserNoticeDuration').addEventListener('click', () => adjustUserNoticeDuration(-USER_NOTICE_DURATION_STEP_MINUTES));
  document.getElementById('increaseUserNoticeDuration').addEventListener('click', () => adjustUserNoticeDuration(USER_NOTICE_DURATION_STEP_MINUTES));
  userNoticeTone.addEventListener('change', () => { state.noticeRequestId = ''; });
  [userNoticeMessage, userNoticeDuration].forEach((element) => element.addEventListener('input', () => { state.noticeRequestId = ''; }));
  selectVisibleUsers.addEventListener('change', () => {
    toggleVisibleUserSelection(selectVisibleUsers.checked);
  });
  selectFilteredUsers.addEventListener('click', selectAllFilteredUsers);
  broadcastNoticeButton.addEventListener('click', openBroadcastDialog);
  resetSelectedNoticesButton.addEventListener('click', () => runAction(resetSelectedNoticesButton, '停用中', resetSelectedNotices));
  broadcastNoticeForm.addEventListener('submit', (event) => {
    event.preventDefault();
    runAction(document.getElementById('confirmBroadcastNotice'), '发送中', submitBroadcastNotice);
  });
  document.getElementById('cancelBroadcastNotice').addEventListener('click', closeBroadcastDialog);
  document.getElementById('decreaseBroadcastNoticeDuration').addEventListener('click', () => adjustBroadcastNoticeDuration(-USER_NOTICE_DURATION_STEP_MINUTES));
  document.getElementById('increaseBroadcastNoticeDuration').addEventListener('click', () => adjustBroadcastNoticeDuration(USER_NOTICE_DURATION_STEP_MINUTES));
  broadcastNoticeTone.addEventListener('change', () => { state.broadcastRequestId = ''; });
  [broadcastNoticeMessage, broadcastNoticeDuration].forEach((element) => element.addEventListener('input', () => { state.broadcastRequestId = ''; }));
  userModeEl.addEventListener('change', updateUserModeState);
  userCanEditManagedConfigEl.addEventListener('change', () =>
    runAction(null, '保存中', saveUserManagedConfigPermission)
  );
  document.getElementById('userPreferredRegion').addEventListener('change', updateUserModeState);
  document.getElementById('globalPreferredRegion').addEventListener('change', updateGlobalRegionFallbackState);
  mergeTargetEl.addEventListener('change', resetMergePreview);
  mergeResolutionEl.addEventListener('change', updateMergeConfirmState);
  previewMergeButton.addEventListener('click', () => runAction(previewMergeButton, '预览中', previewUserMerge));
  confirmMergeButton.addEventListener('click', () => runAction(confirmMergeButton, '合并中', mergeUsers));

  const drawerTabs = Array.from(document.querySelectorAll('[data-drawer-tab]'));
  drawerTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setDrawerTab(tab.dataset.drawerTab));
    tab.addEventListener('keydown', (event) => {
      let targetIndex = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') targetIndex = (index + 1) % drawerTabs.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') targetIndex = (index - 1 + drawerTabs.length) % drawerTabs.length;
      else if (event.key === 'Home') targetIndex = 0;
      else if (event.key === 'End') targetIndex = drawerTabs.length - 1;
      else return;
      event.preventDefault();
      drawerTabs[targetIndex].click();
      drawerTabs[targetIndex].focus();
    });
  });
  document.querySelectorAll('[data-user-sort]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.userSort;
      if (state.userSort.key === key) state.userSort.direction = state.userSort.direction === 'desc' ? 'asc' : 'desc';
      else {
        state.userSort.key = key;
        state.userSort.direction = key === 'name' || key === 'subscriptionState' ? 'asc' : 'desc';
      }
      userSortKey.value = state.userSort.key;
      userSortDirection.value = state.userSort.direction;
      state.userPage = 1;
      renderUsers();
    });
  });
  userSearch.addEventListener('input', resetUserPageAndRender);
  userSubscriptionFilter.addEventListener('change', () => {
    delete userSubscriptionFilter.dataset.category; delete userSubscriptionFilter.dataset.subscriptionIds;
    const trigger = document.getElementById('subscriptionFilterTrigger'); if (trigger) trigger.textContent = userSubscriptionFilter.options[userSubscriptionFilter.selectedIndex]?.textContent || '全部订阅';
    resetUserPageAndRender();
  });
  userAnomalyFilter.addEventListener('change', resetUserPageAndRender);
  userSortKey.addEventListener('change', () => {
    state.userSort.key = userSortKey.value;
    state.userPage = 1;
    renderUsers();
  });
  userSortDirection.addEventListener('change', () => {
    state.userSort.direction = userSortDirection.value;
    state.userPage = 1;
    renderUsers();
  });
  anomalySearch.addEventListener('input', resetAnomalyPageAndRender);
  anomalySortKey.addEventListener('change', () => {
    state.anomalySort.key = anomalySortKey.value;
    state.anomalyPage = 1;
    renderAnomalies();
  });
  anomalySortDirection.addEventListener('change', () => {
    state.anomalySort.direction = anomalySortDirection.value;
    state.anomalyPage = 1;
    renderAnomalies();
  });

  async function authenticate() {
    const token = tokenInput.value.trim();
    tokenInput.value = '';
    if (!token) {
      setAuthenticated(false);
      tokenInput.focus();
      throw new Error('请输入管理令牌');
    }
    await loadAll(false, token);
    committedToken = token;
    setAuthenticated(true);
    setStatus('数据已更新');
  }

  function setAuthenticated(value) {
    adminWorkspace.hidden = !value;
    authPanel.hidden = value;
    refreshButton.disabled = !value;
    changeTokenButton.setAttribute('aria-expanded', value && !authPanel.hidden ? 'true' : 'false');
  }

  function setAuthPanelOpen(value) {
    authPanel.hidden = !value;
    changeTokenButton.setAttribute('aria-expanded', value ? 'true' : 'false');
    tokenInput.value = '';
    if (value) tokenInput.focus();
  }

  function setView(view) {
    if (!viewMeta[view]) return;
    state.view = view;
    document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('is-active', button.dataset.view === view));
    document.querySelectorAll('[data-view-panel]').forEach((panel) => { panel.hidden = panel.dataset.viewPanel !== view; });
    pageTitle.textContent = viewMeta[view].title;
    setStatus('');
    if (view !== 'users') closeDrawerOverlay();
    if (view === 'subscriptions' && committedToken) void runAction(null, '加载中', loadSubscriptions);
    scheduleViewportLayout();
  }

  function bindSectionSwitcher(group) {
    const buttons = Array.from(document.querySelectorAll('[data-' + group + '-section]'));
    const panes = Array.from(document.querySelectorAll('[data-' + group + '-pane]'));
    buttons.forEach((button, index) => {
      const value = button.dataset[group + 'Section'];
      const pane = panes.find((candidate) => candidate.dataset[group + 'Pane'] === value);
      if (value) {
        button.id = group + '-tab-' + value;
        button.setAttribute('aria-controls', group + '-panel-' + value);
      }
      if (pane && value) {
        pane.id = group + '-panel-' + value;
        pane.setAttribute('role', 'tabpanel');
        pane.setAttribute('aria-labelledby', button.id);
      }
      button.addEventListener('click', () => {
        if (!value) return;
        state[group + 'Section'] = value;
        syncSectionSwitcher(group);
      });
      button.addEventListener('keydown', (event) => {
        let targetIndex = index;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') targetIndex = (index + 1) % buttons.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') targetIndex = (index - 1 + buttons.length) % buttons.length;
        else if (event.key === 'Home') targetIndex = 0;
        else if (event.key === 'End') targetIndex = buttons.length - 1;
        else return;
        event.preventDefault();
        buttons[targetIndex].click();
        buttons[targetIndex].focus();
      });
    });
  }

  function bindTrendRange() {
    const buttons = Array.from(document.querySelectorAll('[data-trend-range]'));
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => selectTrafficTrendRange(button.dataset.trendRange));
      button.addEventListener('keydown', (event) => {
        let targetIndex = index;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') targetIndex = (index + 1) % buttons.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') targetIndex = (index - 1 + buttons.length) % buttons.length;
        else if (event.key === 'Home') targetIndex = 0;
        else if (event.key === 'End') targetIndex = buttons.length - 1;
        else return;
        event.preventDefault();
        buttons[targetIndex].click();
        buttons[targetIndex].focus();
      });
    });
  }

  function syncTrendRange() {
    document.querySelectorAll('[data-trend-range]').forEach((button) => {
      const selected = button.dataset.trendRange === state.trafficTrend.range;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.tabIndex = selected ? 0 : -1;
    });
  }

  async function selectTrafficTrendRange(range) {
    if (!['hour', 'day', 'month'].includes(range) || range === state.trafficTrend.range) return;
    state.trafficTrend.range = range;
    state.trafficTrend.activeIndex = -1;
    state.trafficTrend.error = '';
    state.trafficTrend.points = state.trafficTrend.cache[range] || [];
    syncTrendRange();
    renderTrafficTrend();
    if (!state.trafficTrend.cache[range]) {
      try {
        await loadTrafficTrend(undefined, range);
      } catch (error) {
        state.trafficTrend.error = '暂时无法加载';
        renderTrafficTrend();
      }
    }
  }

  function syncSectionSwitcher(group) {
    const active = state[group + 'Section'];
    const compact = group === 'overview'
      ? mediaMatches('(max-width:1279px), (max-height:700px)')
      : mediaMatches('(max-width:900px), (max-height:700px)');
    document.querySelectorAll('[data-' + group + '-section]').forEach((button) => {
      const selected = button.dataset[group + 'Section'] === active;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll('[data-' + group + '-pane]').forEach((pane) => {
      pane.hidden = compact && pane.dataset[group + 'Pane'] !== active;
    });
    if (group === 'overview') {
      const requestFrame = typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : (callback) => window.setTimeout(callback, 0);
      requestFrame(() => {
        if (!compact || active === 'trend') renderTrafficTrend();
        if (!compact || active === 'users') renderRecentUsers();
        if (!compact || active === 'ranking') renderTrafficRanking();
        if (!compact || active === 'anomalies') renderRecentAnomalies();
      });
    }
  }

  function getViewportProfile() {
    const width = window.innerWidth || document.documentElement.clientWidth || 1280;
    const height = window.innerHeight || document.documentElement.clientHeight || 850;
    let profile = height >= 850
      ? { users: 10, anomalies: 8, traffic: 8 }
      : { users: 8, anomalies: 6, traffic: 6 };
    if (width <= 700) {
      profile = height >= 800
        ? { users: 8, anomalies: 8, traffic: 8 }
        : { users: 6, anomalies: 6, traffic: 6 };
    }
    if (width <= 430 && height < 700) profile = { users: 4, anomalies: 4, traffic: 4 };
    return profile;
  }

  function pageFromAnchor(page, oldSize, newSize) {
    const anchor = Math.max(0, (Math.max(1, page) - 1) * Math.max(1, oldSize));
    return Math.floor(anchor / Math.max(1, newSize)) + 1;
  }

  function scheduleViewportLayout() {
    if (viewportFrame) return;
    const requestFrame = typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : (callback) => window.setTimeout(callback, 0);
    viewportFrame = requestFrame(() => {
      viewportFrame = 0;
      applyViewportLayout();
    });
  }

  function applyViewportLayout() {
    const profile = getViewportProfile();
    let usersChanged = false;
    let anomaliesChanged = false;
    let trafficChanged = false;
    if (profile.users !== state.userPageSize) {
      state.userPage = pageFromAnchor(state.userPage, state.userPageSize, profile.users);
      state.userPageSize = profile.users;
      usersChanged = true;
    }
    if (profile.anomalies !== state.anomalyPageSize) {
      state.anomalyPage = pageFromAnchor(state.anomalyPage, state.anomalyPageSize, profile.anomalies);
      state.anomalyPageSize = profile.anomalies;
      anomaliesChanged = true;
    }
    if (profile.traffic !== state.userTrafficPageSize) {
      state.userTrafficPage = pageFromAnchor(state.userTrafficPage, state.userTrafficPageSize, profile.traffic);
      state.userTrafficPageSize = profile.traffic;
      trafficChanged = true;
    }
    syncPageSizeLabel(userPageSize, state.userPageSize);
    syncPageSizeLabel(anomalyPageSize, state.anomalyPageSize);
    syncDrawerMode();
    syncSectionSwitcher('overview');
    syncSectionSwitcher('config');
    syncSectionSwitcher('anomaly');
    syncTrendRange();
    renderTrafficRanking();
    renderRecentUsers();
    renderRecentAnomalies();
    renderTrafficTrend();
    renderAnomalySummary();
    if (usersChanged) renderUsers();
    if (anomaliesChanged) renderAnomalies();
    if (trafficChanged) renderUserTrafficPage();
  }

  function syncPageSizeLabel(element, size) {
    if (!element) return;
    if (element.tagName === 'SELECT') element.value = String(size);
    else element.textContent = size + ' 条/页';
  }

  function mediaMatches(query) {
    return typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false;
  }

  async function runAction(button, loadingText, action) {
    if (button && button.disabled) return;
    state.activeRequests += 1;
    adminShell.setAttribute('aria-busy', 'true');
    if (button) {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
    }
    setStatus(loadingText);
    try {
      return await action();
    } catch (error) {
      if (error && (error.status === 401 || error.status === 403)) setAuthenticated(false);
      const message = formatAdminError(error);
      setStatus(message);
      showToast(message, true);
      return undefined;
    } finally {
      state.activeRequests = Math.max(0, state.activeRequests - 1);
      adminShell.setAttribute('aria-busy', state.activeRequests ? 'true' : 'false');
      if (button) {
        button.removeAttribute('aria-busy');
        if (button === refreshButton) button.disabled = adminWorkspace.hidden;
        else if (button === previewMergeButton) button.disabled = !state.activeUserId || !mergeTargetEl.value;
        else if (button !== confirmMergeButton) button.disabled = false;
      }
      updateMergeConfirmState();
    }
  }

  async function api(path, options, tokenOverride) {
    const token = tokenOverride || committedToken;
    const headers = Object.assign({ authorization: 'Bearer ' + token }, options && options.headers ? options.headers : {});
    const response = await fetch(path, Object.assign({}, options || {}, { headers: headers }));
    const text = await response.text();
    const data = parseJson(text);
    if (!response.ok) {
      const error = new Error(formatApiError(response.status, data));
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data || {};
  }

  async function loadPagedCollection(path, field, tokenOverride) {
    const rows = [];
    let offset = 0;
    while (true) {
      const separator = path.includes('?') ? '&' : '?';
      const data = await api(
        path + separator + 'limit=' + ADMIN_API_PAGE_SIZE + '&offset=' + offset,
        undefined,
        tokenOverride
      );
      const batch = Array.isArray(data[field]) ? data[field] : [];
      if (batch.length > ADMIN_API_PAGE_SIZE || rows.length + batch.length > ADMIN_API_MAX_ROWS) {
        throw new Error('返回数据超过安全上限，请先减少数据范围');
      }
      rows.push(...batch);
      const page = data.page;
      if (!page || page.hasMore !== true) return rows;
      const nextOffset = Number(page.nextOffset);
      if (!Number.isSafeInteger(nextOffset) || nextOffset <= offset || batch.length === 0) {
        throw new Error('分页响应无效，请稍后重试');
      }
      offset = nextOffset;
    }
  }

  async function loadAll(refreshActive, tokenOverride) {
    const selectedId = refreshActive ? state.activeUserId : '';
    if (refreshActive) state.trafficTrend.cache = {};
    const trendRequest = loadTrafficTrend(tokenOverride, state.trafficTrend.range).catch(() => {
      state.trafficTrend.error = '暂时无法加载';
    });
    await Promise.all([
      loadGlobalConfig(tokenOverride),
      loadUsers(tokenOverride),
      loadAnomalies(tokenOverride),
      loadTrafficLimit(tokenOverride)
    ]);
    await trendRequest;
    renderAll();
    if (selectedId) {
      const selected = state.users.find((user) => user.id === selectedId);
      if (selected) await loadUserOverview(selected.id, selected.name || '未命名');
      else closeUserContext();
    }
    setStatus('');
    if (refreshActive) showToast('已刷新');
    scheduleViewportLayout();
  }

  async function loadGlobalConfig(tokenOverride) {
    const data = await api('/api/admin/config', undefined, tokenOverride);
    const config = data.config || {};
    document.getElementById('globalEnabled').value = config.enabled === false ? 'false' : 'true';
    document.getElementById('globalCanEditManagedConfig').value =
      config.canEditManagedConfig === false ? 'false' : 'true';
    document.getElementById('globalSubscription').value = config.subscriptionUrl || '';
    document.getElementById('globalRuleProfile').value = normalizeRuleProfile(config.ruleProfile);
    document.getElementById('globalPreferredRegion').value = normalizePreferredRegion(config.preferredRegion);
    document.getElementById('globalRegionFallback').value = normalizeRegionFallback(config.regionFallback);
    updateGlobalRegionFallbackState();
    document.getElementById('globalVersion').textContent = 'v' + (config.version || 1);
    setGlobalSubscriptionState(config);
  }

  async function loadUsers(tokenOverride) {
    state.users = await loadPagedCollection('/api/admin/users', 'users', tokenOverride);
    const activeUser = state.users.find(user => user.id === state.activeUserId);
    if (activeUser) renderUserProfile(activeUser);
    populateMergeTargets();
    if (state.mergePreviewState) resetMergePreview();
  }

  async function loadAnomalies(tokenOverride) {
    state.anomalies = await loadPagedCollection('/api/admin/anomalies', 'anomalies', tokenOverride);
  }

  async function loadTrafficLimit(tokenOverride) {
    const data = await api('/api/admin/traffic-limit', undefined, tokenOverride);
    const limit = positiveNumber(data.trafficLimitBytes) || DEFAULT_TRAFFIC_LIMIT;
    state.quota = {
      trafficLimitBytes: limit,
      uploadBytes: nonNegativeNumber(data.uploadBytes),
      downloadBytes: nonNegativeNumber(data.downloadBytes),
      usedBytes: nonNegativeNumber(data.usedBytes),
      remainingBytes: nonNegativeNumber(data.remainingBytes),
      usagePercent: nonNegativeNumber(data.usagePercent),
      trafficPeriodStartedAt: normalizeTrafficPeriodStart(data.trafficPeriodStartedAt),
      trafficExpiresAt: normalizeTrafficExpiry(data.trafficExpiresAt)
    };
    document.getElementById('trafficLimitGb').value = formatEditableGb(limit);
    document.getElementById('trafficPeriodStartedAt').value = formatShanghaiDateTimeInput(state.quota.trafficPeriodStartedAt);
    document.getElementById('trafficExpiresAt').value = formatShanghaiDateTimeInput(state.quota.trafficExpiresAt);
  }

  async function loadTrafficTrend(tokenOverride, range) {
    const requestedRange = range || state.trafficTrend.range;
    const sequence = ++state.trafficTrend.requestSequence;
    const data = await api('/api/admin/traffic-trend?range=' + encodeURIComponent(requestedRange), undefined, tokenOverride);
    if (sequence !== state.trafficTrend.requestSequence) return;
    const points = Array.isArray(data.points) ? data.points.map(normalizeTrendPoint).filter(Boolean) : [];
    state.trafficTrend.cache[requestedRange] = points;
    if (requestedRange !== state.trafficTrend.range) return;
    state.trafficTrend.points = points;
    state.trafficTrend.error = '';
    state.trafficTrend.activeIndex = -1;
    renderTrafficTrend();
  }

  function renderAll() {
    renderDashboardMetrics();
    renderQuota();
    renderTrafficTrend();
    renderTrafficRanking();
    renderRecentUsers();
    renderRecentAnomalies();
    renderUsers();
    renderConfigDistribution();
    renderAnomalySummary();
    renderAnomalyDistribution();
    renderAnomalies();
  }

  function renderDashboardMetrics() {
    const totals = aggregateUsers();
    const compactValues = (window.innerWidth || document.documentElement.clientWidth || 1280) <= 430;
    const todayKey = shanghaiDateKey(new Date());
    const todayReported = state.users.filter((user) => shanghaiDateKey(user.lastSeenAt) === todayKey).length;
    setStat('todayReported', String(todayReported));
    setStat('users', String(state.users.length));
    setStat('devices', String(totals.devices));
    setStat('upload', compactValues ? formatCompactBytes(totals.upload) : formatBytes(totals.upload));
    setStat('download', compactValues ? formatCompactBytes(totals.download) : formatBytes(totals.download));
    setStat('anomalies', String(totals.anomalies));
  }

  function renderQuota() {
    const quota = Object.assign({}, state.quota);
    const ring = Math.min(100, Math.max(0, quota.usagePercent));
    document.querySelectorAll('[data-quota-donut]').forEach((donut) => {
      donut.style.setProperty('--ring', String(ring));
      donut.classList.toggle('warning', quota.usagePercent >= 80);
    });
    document.querySelectorAll('[data-quota-percent]').forEach((element) => { element.textContent = formatPercent(quota.usagePercent); });
    document.querySelectorAll('[data-quota-limit]').forEach((element) => { element.textContent = formatQuotaLimit(quota.trafficLimitBytes); });
    document.querySelectorAll('[data-quota-used]').forEach((element) => { element.textContent = formatBytes(quota.usedBytes); });
    document.querySelectorAll('[data-quota-limit-value]').forEach((element) => { element.textContent = formatQuotaLimit(quota.trafficLimitBytes); });
    document.querySelectorAll('[data-quota-balance]').forEach((element) => {
      element.textContent = formatBytes(quota.remainingBytes);
    });
    document.querySelectorAll('[data-quota-start]').forEach((element) => {
      element.textContent = formatShanghaiDateTime(quota.trafficPeriodStartedAt);
    });
    document.querySelectorAll('[data-quota-expiry]').forEach((element) => {
      element.textContent = formatShanghaiDateTime(quota.trafficExpiresAt);
      element.title = formatQuotaExpiryTitle(quota.trafficExpiresAt);
      element.classList.toggle('danger-text', dateValue(quota.trafficExpiresAt) <= Date.now());
    });
  }

  function renderTrafficTrend() {
    const width = trafficTrendPlot.clientWidth;
    const height = trafficTrendPlot.clientHeight;
    if (width < 120 || height < 90) return;

    trafficTrendChart.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    trafficTrendChart.setAttribute('width', String(width));
    trafficTrendChart.setAttribute('height', String(height));
    const points = state.trafficTrend.points;
    if (state.trafficTrend.error || !points.length) {
      trafficTrendChart.replaceChildren();
      appendSvgElement(trafficTrendChart, 'text', {
        class: 'trend-empty',
        x: '50%',
        y: '50%',
        'text-anchor': 'middle'
      }, state.trafficTrend.error || '暂无趋势数据');
      trafficTrendTooltip.hidden = true;
      trafficTrendDescription.textContent = state.trafficTrend.error || '暂无趋势数据';
      return;
    }

    const margins = { left: 44, right: 12, top: 10, bottom: 24 };
    const plotWidth = Math.max(1, width - margins.left - margins.right);
    const plotHeight = Math.max(1, height - margins.top - margins.bottom);
    const maximum = Math.max(0, ...points.flatMap((point) => [point.uploadBytes, point.downloadBytes]));
    const scale = niceChartScale(maximum);
    const unit = chartUnit(scale.maximum);
    const xAt = (index) => margins.left + (points.length === 1 ? plotWidth / 2 : index / (points.length - 1) * plotWidth);
    const yAt = (value) => margins.top + plotHeight - Math.max(0, value) / scale.maximum * plotHeight;
    const uploadCoordinates = points.map((point, index) => [xAt(index), yAt(point.uploadBytes)]);
    const downloadCoordinates = points.map((point, index) => [xAt(index), yAt(point.downloadBytes)]);
    const uploadLine = svgLinePath(uploadCoordinates);
    const downloadLine = svgLinePath(downloadCoordinates);
    const uploadArea = svgAreaPath(uploadCoordinates, margins.top + plotHeight);
    const downloadArea = svgAreaPath(downloadCoordinates, margins.top + plotHeight);
    trafficTrendChart.replaceChildren();
    const grid = appendSvgElement(trafficTrendChart, 'g', { class: 'trend-grid' });
    for (let index = 0; index <= 4; index += 1) {
      const value = scale.maximum * index / 4;
      const y = yAt(value);
      appendSvgElement(grid, 'line', {
        x1: margins.left,
        y1: y,
        x2: width - margins.right,
        y2: y
      });
      appendSvgElement(grid, 'text', {
        x: margins.left - 7,
        y: y + 3,
        'text-anchor': 'end'
      }, formatAxisNumber(value / unit.value));
    }
    appendSvgElement(grid, 'text', { class: 'trend-unit', x: 4, y: 10 }, unit.label);
    appendSvgElement(trafficTrendChart, 'path', { class: 'trend-area trend-area-download', d: downloadArea });
    appendSvgElement(trafficTrendChart, 'path', { class: 'trend-area trend-area-upload', d: uploadArea });
    appendSvgElement(trafficTrendChart, 'path', { class: 'trend-line trend-line-download', d: downloadLine });
    appendSvgElement(trafficTrendChart, 'path', { class: 'trend-line trend-line-upload', d: uploadLine });

    const labelIndexes = trendLabelIndexes(points.length);
    const xAxis = appendSvgElement(trafficTrendChart, 'g', { class: 'trend-axis-x' });
    labelIndexes.forEach((index) => {
      const anchor = index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle';
      appendSvgElement(xAxis, 'text', {
        x: xAt(index),
        y: height - 5,
        'text-anchor': anchor
      }, points[index].label);
    });

    const activeIndex = Math.min(points.length - 1, Math.max(-1, state.trafficTrend.activeIndex));
    if (activeIndex >= 0) {
      const x = xAt(activeIndex);
      const cursor = appendSvgElement(trafficTrendChart, 'g', { class: 'trend-cursor' });
      appendSvgElement(cursor, 'line', {
        x1: x,
        y1: margins.top,
        x2: x,
        y2: margins.top + plotHeight
      });
      appendSvgElement(cursor, 'circle', {
        class: 'upload',
        cx: x,
        cy: yAt(points[activeIndex].uploadBytes),
        r: 3.5
      });
      appendSvgElement(cursor, 'circle', {
        class: 'download',
        cx: x,
        cy: yAt(points[activeIndex].downloadBytes),
        r: 3.5
      });
    }

    const uploadTotal = points.reduce((sum, point) => sum + point.uploadBytes, 0);
    const downloadTotal = points.reduce((sum, point) => sum + point.downloadBytes, 0);
    const rangeLabel = state.trafficTrend.range === 'hour' ? '分时' : state.trafficTrend.range === 'month' ? '月' : '日';
    trafficTrendDescription.textContent = rangeLabel + '趋势，共 ' + points.length + ' 个时间点，上传 ' + formatBytes(uploadTotal) + '，下载 ' + formatBytes(downloadTotal);
    updateTrendTooltip(activeIndex, xAt, width);
  }

  function updateTrendTooltip(activeIndex, xAt, width) {
    if (activeIndex < 0 || !state.trafficTrend.points[activeIndex]) {
      trafficTrendTooltip.hidden = true;
      return;
    }
    const point = state.trafficTrend.points[activeIndex];
    trafficTrendTooltip.replaceChildren();
    trafficTrendTooltip.appendChild(createTextElement('strong', '', point.label));
    const upload = createTextElement('span', '', '上传 ' + formatBytes(point.uploadBytes));
    upload.prepend(createTextElement('i', 'upload'));
    const download = createTextElement('span', '', '下载 ' + formatBytes(point.downloadBytes));
    download.prepend(createTextElement('i', 'download'));
    trafficTrendTooltip.append(upload, download);
    trafficTrendTooltip.hidden = false;
    trafficTrendTooltip.style.left = Math.max(8, Math.min(width - 150, xAt(activeIndex) - 70)) + 'px';
  }

  function updateTrendPointer(event) {
    const points = state.trafficTrend.points;
    if (!points.length) return;
    const rect = trafficTrendPlot.getBoundingClientRect();
    const plotWidth = Math.max(1, rect.width - 56);
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left - 44) / plotWidth));
    const index = points.length === 1 ? 0 : Math.round(ratio * (points.length - 1));
    if (index === state.trafficTrend.activeIndex) return;
    state.trafficTrend.activeIndex = index;
    renderTrafficTrend();
  }

  function moveTrendKeyboardCursor(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
    const lastIndex = state.trafficTrend.points.length - 1;
    if (lastIndex < 0) return;
    event.preventDefault();
    if (event.key === 'Home') state.trafficTrend.activeIndex = 0;
    else if (event.key === 'End') state.trafficTrend.activeIndex = lastIndex;
    else if (event.key === 'ArrowLeft') state.trafficTrend.activeIndex = Math.max(0, state.trafficTrend.activeIndex < 0 ? lastIndex : state.trafficTrend.activeIndex - 1);
    else state.trafficTrend.activeIndex = Math.min(lastIndex, state.trafficTrend.activeIndex < 0 ? 0 : state.trafficTrend.activeIndex + 1);
    renderTrafficTrend();
  }

  function niceChartScale(maximum) {
    if (!(maximum > 0)) return { maximum: 1 };
    const rawStep = maximum * 1.06 / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const fraction = rawStep / magnitude;
    const fractions = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    const niceFraction = fractions.find((candidate) => candidate >= fraction) || 10;
    const step = niceFraction * magnitude;
    return { maximum: step * 4 };
  }

  function chartUnit(maximum) {
    if (maximum >= GIB * 1024) return { value: GIB * 1024, label: 'TB' };
    if (maximum >= GIB) return { value: GIB, label: 'GB' };
    if (maximum >= 1048576) return { value: 1048576, label: 'MB' };
    if (maximum >= 1024) return { value: 1024, label: 'KB' };
    return { value: 1, label: 'B' };
  }

  function formatAxisNumber(value) {
    if (value === 0) return '0';
    if (Math.abs(value) >= 100) return String(Math.round(value));
    if (Math.abs(value) >= 10) return value.toFixed(1).replace(/\.0$/, '');
    return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  }

  function svgLinePath(coordinates) {
    return coordinates.map((point, index) => (index ? 'L' : 'M') + point[0].toFixed(2) + ' ' + point[1].toFixed(2)).join(' ');
  }

  function svgAreaPath(coordinates, baseline) {
    if (!coordinates.length) return '';
    return svgLinePath(coordinates) + ' L' + coordinates[coordinates.length - 1][0].toFixed(2) + ' ' + baseline.toFixed(2) +
      ' L' + coordinates[0][0].toFixed(2) + ' ' + baseline.toFixed(2) + ' Z';
  }

  function trendLabelIndexes(length) {
    if (length <= 1) return [0];
    const step = Math.max(1, Math.ceil((length - 1) / 5));
    const indexes = [];
    for (let index = 0; index < length; index += step) indexes.push(index);
    if (indexes[indexes.length - 1] !== length - 1) indexes.push(length - 1);
    return indexes;
  }

  function renderTrafficRanking() {
    const container = document.getElementById('trafficRanking');
    container.replaceChildren();
    const users = state.users.slice().sort((a, b) => totalBytes(b) - totalBytes(a)).slice(0, overviewRowCapacity('ranking'));
    if (!users.length) {
      container.appendChild(createTextElement('p', 'muted', '暂无用户'));
      return;
    }
    const maximum = Math.max(1, totalBytes(users[0]));
    users.forEach((user, index) => {
      const row = document.createElement('div');
      row.className = 'ranking-row';
      const button = createTextElement('button', 'user-link', user.name || '未命名');
      button.type = 'button';
      button.addEventListener('click', () => openUserFromAnywhere(user));
      row.append(
        createTextElement('span', 'rank-index', String(index + 1)),
        button,
        createBarTrack(Math.max(4, totalBytes(user) / maximum * 100)),
        createTextElement('span', 'rank-value', formatBytes(totalBytes(user)))
      );
      container.appendChild(row);
    });
  }

  function renderRecentUsers() {
    const body = document.getElementById('recentUsers');
    body.replaceChildren();
    const users = state.users.slice().sort((a, b) => dateValue(b.lastSeenAt) - dateValue(a.lastSeenAt)).slice(0, overviewRowCapacity('users'));
    if (!users.length) {
      appendEmptyTableRow(body, 7, '暂无用户');
      return;
    }
    users.forEach((user) => {
      const row = document.createElement('tr');
      const anomalyCount = nonNegativeNumber(user.anomalies);
      const nameCell = appendTableCell(row);
      const button = createTextElement('button', 'user-link', user.name || '未命名');
      button.type = 'button';
      button.addEventListener('click', () => openUserFromAnywhere(user));
      nameCell.appendChild(button);
      appendTableCell(row, nonNegativeNumber(user.devices), 'num recent-devices');
      appendTableCell(row, formatCompactBytes(user.uploadBytes), 'num');
      appendTableCell(row, formatCompactBytes(user.downloadBytes), 'num');
      appendTableCell(row, formatCompactBytes(totalBytes(user)), 'num recent-total');
      appendTableCell(row, anomalyCount, 'num ' + (anomalyCount > 0 ? 'danger-text' : 'muted'));
      appendTableCell(row, formatShortTime(user.lastSeenAt), 'recent-seen', formatTime(user.lastSeenAt));
      body.appendChild(row);
    });
  }

  function renderRecentAnomalies() {
    const body = document.getElementById('recentAnomalies');
    body.replaceChildren();
    const rows = state.anomalies.slice(0, overviewRowCapacity('anomalies'));
    if (!rows.length) {
      appendEmptyTableRow(body, 4, '暂无异常记录');
      return;
    }
    rows.forEach((entry) => {
      const row = document.createElement('tr');
      appendTableCell(row, entry.userName || entry.userId || '-');
      appendTableCell(row, entry.deviceName || entry.deviceId || '-');
      appendTableCell(
        row,
        formatBytes(nonNegativeNumber(entry.uploadBytes) + nonNegativeNumber(entry.downloadBytes)),
        'num danger-text'
      );
      appendTableCell(row, formatTime(entry.createdAt));
      body.appendChild(row);
    });
  }

  function overviewRowCapacity(kind) {
    const fallback = kind === 'users' ? 9 : kind === 'ranking' ? 4 : 3;
    const maximum = kind === 'users' ? 14 : kind === 'ranking' ? 5 : 4;
    const panel = document.querySelector('.overview-' + kind);
    if (!panel || panel.hidden) return fallback;
    if (kind === 'ranking') {
      const body = panel.querySelector('.panel-body');
      const available = body ? body.clientHeight : 0;
      return available > 40 ? Math.max(1, Math.min(maximum, Math.floor((available + 9) / 34))) : fallback;
    }
    const wrap = panel.querySelector('.table-wrap');
    const available = wrap ? wrap.clientHeight : 0;
    const rowHeight = kind === 'users' ? 36 : 40;
    return available > rowHeight * 2
      ? Math.max(1, Math.min(maximum, Math.floor((available - rowHeight) / rowHeight)))
      : fallback;
  }

  function resetUserPageAndRender() {
    state.userPage = 1;
    renderUsers();
  }

  function getFilteredSortedUsers() {
    const search = userSearch.value.trim().toLocaleLowerCase('zh-CN');
    const subscription = userSubscriptionFilter.value;
    const anomaly = userAnomalyFilter.value;
    return state.users.filter((user) => {
      const haystack = String(user.name || '') + ' ' + String(user.nickname || '');
      if (search && !haystack.toLocaleLowerCase('zh-CN').includes(search)) return false;
      if (subscription && user.subscriptionState !== subscription) return false;
      if (userSubscriptionFilter.dataset.subscriptionIds) {
        const ids = JSON.parse(userSubscriptionFilter.dataset.subscriptionIds);
        if (!ids.includes(user.subscriptionId)) return false;
      }
      const count = nonNegativeNumber(user.anomalies);
      if (anomaly === 'has' && count <= 0) return false;
      if (anomaly === 'none' && count > 0) return false;
      if (anomaly === 'no-nickname' && user.nickname !== null && user.nickname !== undefined && user.nickname !== '') return false;
      return true;
    }).sort((a, b) => {
      const result = compareUserValue(a, b, state.userSort.key);
      return state.userSort.direction === 'asc' ? result : -result;
    });
  }

  const columnDefinitions = [
    ['nickname', '昵称', 1], ['name', 'ID', 2], ['subscription', '订阅名称', 3],
    ['expiry', '到期时间', 13], ['synced', '最新同步时间', 14], ['total', '总量', 9],
    ['version', '客户端', 4], ['notice', '通知', 5], ['devices', '设备', 6],
    ['upload', '上传', 7], ['download', '下载', 8], ['anomalies', '异常', 10], ['seen', '最近上报', 11]
  ];
  let userColumns = columnDefinitions.map((entry, index) => ({ key: entry[0], visible: index < 6 }));
  try {
    const saved = JSON.parse(localStorage.getItem('youyu-admin-user-columns') || 'null');
    if (Array.isArray(saved) && saved.length === columnDefinitions.length && new Set(saved.map(item => item.key)).size === columnDefinitions.length && saved.every(item => columnDefinitions.some(def => def[0] === item.key) && typeof item.visible === 'boolean')) userColumns = saved;
  } catch {}
  function arrangeUserColumns() {
    const table = document.querySelector('.users-table');
    const head = table.tHead.rows[0];
    if (!head.dataset.prepared) {
      for (const label of ['到期时间', '最新同步时间']) { const th = document.createElement('th'); th.textContent = label; head.append(th); }
      const subscriptionHeader = head.cells[3].querySelector('button'); if (subscriptionHeader) subscriptionHeader.firstChild.textContent = '订阅名称';
      head.dataset.prepared = 'true';
      Array.from(head.cells).forEach((cell, index) => cell.dataset.columnIndex = index);
      const colgroup = table.querySelector('colgroup'); if (colgroup) colgroup.remove();
      table.style.tableLayout = 'auto';
    }
    for (const row of [head, ...Array.from(usersBody.rows)]) {
      if (row.cells.length < 15) continue;
      const cells = Array.from(row.cells); cells.forEach((cell, index) => { if (!cell.dataset.columnIndex) cell.dataset.columnIndex = index; });
      const byIndex = index => cells.find(cell => Number(cell.dataset.columnIndex) === index);
      row.append(byIndex(0));
      for (const item of userColumns) { const def = columnDefinitions.find(def => def[0] === item.key); const cell = byIndex(def[2]); cell.hidden = !item.visible; row.append(cell); }
      row.append(byIndex(12));
    }
  }
  function floatingEditor(anchor, title) {
    const panel = document.createElement('div'); panel.setAttribute('popover', 'auto'); panel.className = 'anchored-editor';
    const header = document.createElement('div'); header.className = 'anchored-editor-header';
    const heading = document.createElement('h3'); heading.textContent = title;
    const close = document.createElement('button'); close.type = 'button'; close.className = 'button secondary small'; close.textContent = '关闭'; close.onclick = () => panel.hidePopover();
    header.append(heading, close); panel.append(header); document.body.append(panel);
    const position = () => {
      if (!anchor.isConnected || !panel.matches(':popover-open')) return;
      const bounds = anchor.getBoundingClientRect(); const viewport = window.visualViewport;
      const leftEdge = (viewport?.offsetLeft || 0) + 8; const topEdge = (viewport?.offsetTop || 0) + 8;
      const rightEdge = leftEdge + (viewport?.width || window.innerWidth) - 16; const bottomEdge = topEdge + (viewport?.height || window.innerHeight) - 16;
      const below = Math.max(0, bottomEdge - bounds.bottom - 6); const above = Math.max(0, bounds.top - topEdge - 6);
      const desiredHeight = Math.max(panel.scrollHeight, panel.getBoundingClientRect().height);
      const openBelow = desiredHeight <= below || below >= above;
      panel.style.maxHeight = Math.min(420, Math.max(60, openBelow ? below : above)) + 'px';
      const rect = panel.getBoundingClientRect();
      panel.style.left = Math.max(leftEdge, Math.min(bounds.left, rightEdge - rect.width)) + 'px';
      panel.style.top = Math.max(topEdge, Math.min(openBelow ? bounds.bottom + 6 : bounds.top - rect.height - 6, bottomEdge - rect.height)) + 'px';
    };
    const observer = new ResizeObserver(position); observer.observe(panel);
    const contentObserver = new MutationObserver(position); contentObserver.observe(panel, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden','class'] });
    window.addEventListener('resize', position); window.addEventListener('scroll', position, true);
    window.visualViewport?.addEventListener('resize', position); window.visualViewport?.addEventListener('scroll', position);
    panel.addEventListener('toggle', event => {
      if (event.newState === 'closed') {
        observer.disconnect(); contentObserver.disconnect(); window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true);
        window.visualViewport?.removeEventListener('resize', position); window.visualViewport?.removeEventListener('scroll', position); panel.remove();
      }
    });
    panel.showPopover(); position(); return panel;
  }
  userSubscriptionFilter.hidden = true;
  userSubscriptionFilter.style.display = 'none';
  const subscriptionFilterTrigger = document.createElement('button'); subscriptionFilterTrigger.type = 'button'; subscriptionFilterTrigger.id = 'subscriptionFilterTrigger'; subscriptionFilterTrigger.className = 'mode-picker-trigger compact'; subscriptionFilterTrigger.textContent = '全部订阅'; subscriptionFilterTrigger.setAttribute('aria-label', '订阅筛选'); subscriptionFilterTrigger.setAttribute('aria-haspopup', 'menu'); subscriptionFilterTrigger.setAttribute('aria-expanded', 'false'); userSubscriptionFilter.after(subscriptionFilterTrigger);
  subscriptionFilterTrigger.onclick = () => {
    const panel = floatingEditor(subscriptionFilterTrigger, '订阅筛选'); panel.classList.add('mode-picker-panel'); subscriptionFilterTrigger.setAttribute('aria-expanded', 'true'); panel.addEventListener('toggle', event => { if (event.newState === 'closed') subscriptionFilterTrigger.setAttribute('aria-expanded', 'false'); });
    const layout = document.createElement('div'); layout.className = 'mode-picker-layout'; const menu = document.createElement('div'); menu.className = 'mode-picker-menu'; menu.setAttribute('role', 'menu'); const secondary = document.createElement('div'); secondary.className = 'mode-picker-secondary'; secondary.hidden = true; layout.append(menu, secondary); panel.append(layout);
    const apply = (value, category, ids, label) => {
      userSubscriptionFilter.value = value; userSubscriptionFilter.dataset.category = category || ''; userSubscriptionFilter.dataset.subscriptionIds = ids ? JSON.stringify(ids) : ''; subscriptionFilterTrigger.textContent = label; resetUserPageAndRender();
    };
    let data = null;
    const expand = async () => {
      secondary.hidden = false; secondary.textContent = '加载中';
      try {
        data = data || await api('/api/admin/subscriptions'); if (!panel.isConnected) return;
        secondary.replaceChildren(); const tabs = document.createElement('div'); tabs.className = 'subscription-picker-tabs'; tabs.setAttribute('aria-label', '订阅分类'); const list = document.createElement('div'); list.className = 'subscription-picker-list'; secondary.append(tabs, list);
        let selected = userSubscriptionFilter.dataset.category || '';
        const draw = () => {
          tabs.replaceChildren(); list.replaceChildren();
          for (const category of ['', ...data.categories]) {
            const tab = document.createElement('button'); tab.type = 'button'; tab.textContent = category || '全部分类'; tab.setAttribute('aria-pressed', String(selected === category));
            tab.onclick = () => { selected = category; const ids = category ? data.subscriptions.filter(item => item.category === category).map(item => item.id) : null; apply('分类订阅', category, ids, category || '分类订阅'); draw(); }; tabs.append(tab);
          }
          const items = data.subscriptions.filter(item => !selected || item.category === selected);
          for (const item of items) { const button = document.createElement('button'); button.type = 'button'; button.className = 'subscription-picker-item'; button.textContent = item.name; button.onclick = () => { apply('分类订阅', item.category, [item.id], item.name); panel.hidePopover(); }; list.append(button); }
          if (!items.length) list.textContent = '先添加订阅';
        }; draw();
      } catch { secondary.textContent = '读取失败，请重新点击分类订阅'; }
    };
    for (const [value, label] of [['','全部订阅'],['跟随全局','跟随全局'],['分类订阅','分类订阅'],['私人定制','私人定制'],['停用','停用'],['未配置','未配置']]) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'mode-picker-item'; button.textContent = label; button.setAttribute('role', 'menuitem');
      button.onclick = () => { apply(value, '', null, label); if (value === '分类订阅') void expand(); else panel.hidePopover(); }; menu.append(button);
    }
  };
  document.getElementById('manageUserColumns').onclick = event => {
    const panel = floatingEditor(event.currentTarget, '显示列管理');
    const draw = () => {
      panel.querySelectorAll('.column-choice').forEach(row => row.remove());
      userColumns.forEach((item, index) => {
        const row = document.createElement('div'); row.className = 'column-choice'; row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 0';
        const label = document.createElement('label'); label.style.cssText = 'display:flex;align-items:center;gap:8px;min-width:120px'; const check = document.createElement('input'); check.type = 'checkbox'; check.style.cssText = 'width:18px;height:18px;min-height:0;margin:0'; check.checked = item.visible;
        check.onchange = () => { item.visible = check.checked; persist(); }; label.append(check, document.createTextNode(columnDefinitions.find(def => def[0] === item.key)[1])); row.append(label);
        for (const [offset, text] of [[-1, '左移'], [1, '右移']]) { const button = document.createElement('button'); button.type = 'button'; button.className = 'button secondary small'; button.textContent = text; button.disabled = index + offset < 0 || index + offset >= userColumns.length;
          button.onclick = () => { [userColumns[index], userColumns[index + offset]] = [userColumns[index + offset], userColumns[index]]; persist(); draw(); }; row.append(button); }
        panel.append(row);
      });
    };
    const persist = () => { try { localStorage.setItem('youyu-admin-user-columns', JSON.stringify(userColumns)); } catch {} arrangeUserColumns(); };
    draw();
  };
  async function chooseUserSubscription(anchor, user) {
    const panel = floatingEditor(anchor, '分类'); panel.classList.add('subscription-picker');
    const loading = document.createElement('p'); loading.textContent = '加载中'; panel.append(loading);
    try {
      const data = await api('/api/admin/subscriptions'); loading.remove();
      const tabs = document.createElement('div'); tabs.className = 'subscription-picker-tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', '订阅分类');
      const list = document.createElement('div'); list.className = 'subscription-picker-list'; list.setAttribute('role', 'tabpanel');
      let selected = (data.subscriptions.find(item => item.id === user.subscriptionId) || {}).category || (data.categories || [])[0] || '';
      const categories = data.categories.length ? data.categories : [''];
      const draw = () => {
        tabs.replaceChildren(); list.replaceChildren();
        categories.forEach((name, index) => { const tab = document.createElement('button'); tab.type = 'button'; tab.textContent = name || '全部'; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(name === selected)); tab.tabIndex = name === selected ? 0 : -1;
          tab.onclick = () => { selected = name; draw(); tabs.children[index].focus(); };
          tab.onkeydown = event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? categories.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + categories.length) % categories.length; selected = categories[next]; draw(); tabs.children[next].focus(); } }; tabs.append(tab); });
        const items = data.subscriptions.filter(item => !selected || item.category === selected);
        if (!items.length) list.textContent = '先添加订阅';
        for (const item of items) { const button = document.createElement('button'); button.type = 'button'; button.className = 'subscription-picker-item'; const name = document.createElement('span'); name.textContent = item.name; const arrow = document.createElement('span'); arrow.textContent = '›'; arrow.setAttribute('aria-hidden', 'true'); button.append(name, arrow);
          if (item.id === user.subscriptionId) button.setAttribute('aria-current', 'true');
          button.onclick = () => runAction(button, '保存中', async () => { await api('/api/admin/users/' + encodeURIComponent(user.id) + '/config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enabled: true, subscriptionUrl: item.url }) }); panel.hidePopover(); await loadUsers(); if (state.activeUserId === user.id) await loadUserOverview(user.id, user.name); showToast('订阅已切换'); }); list.append(button); }
      }; panel.append(tabs, list); draw();
    } catch { loading.textContent = '读取失败，请关闭后重试'; if (!loading.isConnected) panel.append(loading); }
  }
  function shiftCalendarMonth(date) {
    const next = new Date(date); const day = next.getDate(); next.setDate(1); next.setMonth(next.getMonth() + 1); const end = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate(); next.setDate(Math.min(day, end)); return next;
  }
  function editUserExpiry(anchor, user) {
    if (!user.subscriptionId) { showToast('先选择订阅', true); return; }
    const panel = floatingEditor(anchor, '时间设置'); panel.classList.add('subscription-time-editor');
    const localValue = value => { if (!value) return ''; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
    const field = (label, value) => { const wrapper = document.createElement('label'); wrapper.className = 'period-field'; const text = document.createElement('span'); text.textContent = label; const input = document.createElement('input'); input.type = 'datetime-local'; input.setAttribute('aria-label', label); input.value = localValue(value); wrapper.append(text, input); panel.append(wrapper); return input; };
    const start = field('开始时间', user.subscriptionStartedAt); const end = field('结束时间', user.subscriptionExpiresAt);
    const action = (label, handler) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'period-action'; button.textContent = label; button.onclick = handler; panel.append(button); return button; };
    action('初始化1个月', () => { const now = new Date(); start.value = localValue(now); end.value = localValue(shiftCalendarMonth(now)); });
    action('续费一个月', () => { if (!end.value) { showToast('先设置结束时间', true); return; } end.value = localValue(shiftCalendarMonth(new Date(end.value))); });
    action('清空', () => { start.value = ''; end.value = ''; }).classList.add('danger-text');
    const note = document.createElement('p'); note.className = 'period-note'; note.textContent = '同一订阅的用户同步更新'; panel.append(note);
    const save = action('保存', () => runAction(save, '保存中', async () => {
      if (start.value && !end.value) { showToast('请设置结束时间', true); return; }
      if (start.value && new Date(start.value) >= new Date(end.value)) { showToast('结束时间需晚于开始时间', true); return; }
      await api('/api/admin/subscriptions/' + encodeURIComponent(user.subscriptionId) + '/expiry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ startedAt: start.value ? new Date(start.value).toISOString() : null, expiresAt: end.value ? new Date(end.value).toISOString() : null }) }); panel.hidePopover(); await loadUsers(); renderUsers(); showToast('时间已更新');
    }));
  }

  function renderUsers() {
    const filtered = getFilteredSortedUsers();
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.userPageSize));
    state.userPage = Math.min(state.userPage, totalPages);
    const start = (state.userPage - 1) * state.userPageSize;
    const visible = filtered.slice(start, start + state.userPageSize);
    usersBody.replaceChildren();
    updateUserSortHeaders();
    pruneUserSelection();
    if (!visible.length) {
      appendEmptyTableRow(usersBody, 13, '暂无符合条件的用户');
    } else {
      visible.forEach((user) => {
        const row = document.createElement('tr');
        const displayName = user.name || '未命名';
        const logicalDevices = nonNegativeNumber(user.devices);
        const deviceRecords = nonNegativeNumber(user.deviceRecords);
        row.dataset.userId = user.id || '';
        row.tabIndex = 0;
        row.setAttribute('aria-label', displayName + '，查看详情');
        if (user.id === state.activeUserId) row.classList.add('is-active');
        const selectCell = appendTableCell(row, undefined, 'select-cell');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.setAttribute('aria-label', '选择' + displayName);
        checkbox.checked = Boolean(user.id) && state.selectedUserIds.has(user.id);
        checkbox.addEventListener('click', (event) => event.stopPropagation());
        checkbox.addEventListener('change', (event) => {
          event.stopPropagation();
          setUserSelected(user.id, checkbox.checked);
        });
        selectCell.appendChild(checkbox);
        appendTableCell(row, user.nickname || '—', 'nickname-cell', user.nickname || '');
        appendTableCell(row, displayName, 'name-cell', displayName);
        const subscriptionButton = createTextElement('button', 'chip blue', user.subscriptionName || '选择订阅'); subscriptionButton.type = 'button'; subscriptionButton.onclick = () => chooseUserSubscription(subscriptionButton, user); appendTableCell(row).append(subscriptionButton);
        appendTableCell(
          row,
          formatAppVersion(user.latestAppVersion),
          'client-version',
          user.appVersionReportedAt ? '最近版本上报：' + formatTime(user.appVersionReportedAt) : '尚未收到客户端版本上报'
        );
        appendTableCell(row, formatNoticeStatus(user), 'notice-status');
        appendTableCell(row, logicalDevices, 'num', '逻辑设备 ' + logicalDevices + '，原始记录 ' + deviceRecords);
        appendTableCell(row, formatBytes(nonNegativeNumber(user.uploadBytes)), 'num');
        appendTableCell(row, formatBytes(nonNegativeNumber(user.downloadBytes)), 'num');
        appendTableCell(row, formatBytes(totalBytes(user)), 'num');
        appendTableCell(
          row,
          nonNegativeNumber(user.anomalies),
          'num ' + (nonNegativeNumber(user.anomalies) ? 'danger-text' : 'success-text')
        );
        appendTableCell(row, formatTime(user.lastSeenAt));
        const actionCell = appendTableCell(row);
        const detailButton = createTextElement('button', 'button secondary small', '详情');
        detailButton.type = 'button';
        actionCell.appendChild(detailButton);
        const open = () => runAction(null, displayName + ' 加载中', () => loadUserOverview(user.id, displayName));
        row.addEventListener('click', (event) => { if (!event.target.closest('button')) open(); });
        row.addEventListener('keydown', (event) => {
          if (event.target.closest('button, input, select')) return;
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
        });
        detailButton.addEventListener('click', (event) => { event.stopPropagation(); open(); });
        const expiry = createTextElement('button', 'chip ' + (user.subscriptionExpiresAt && Date.parse(user.subscriptionExpiresAt) < Date.now() ? 'red' : 'green'), user.subscriptionExpiresAt ? formatTime(user.subscriptionExpiresAt) : '未设置'); expiry.type = 'button'; expiry.onclick = () => editUserExpiry(expiry, user); appendTableCell(row).append(expiry);
        appendTableCell(row, user.subscriptionSyncedAt ? formatTime(user.subscriptionSyncedAt) : '未同步');
        usersBody.appendChild(row);
      });
    }
    userCountEl.textContent = state.users.length + ' 个用户';
    userPageSummary.textContent = filtered.length + ' 条' + (filtered.length ? ' · ' + state.userPage + '/' + totalPages + ' 页' : '');
    renderPagination(userPagination, state.userPage, totalPages, (page) => { state.userPage = page; renderUsers(); });
    arrangeUserColumns();
    revealSelectedUser(state.activeUserId);
    updateUserSelectionUi(visible);
  }

  function updateUserSortHeaders() {
    document.querySelectorAll('[data-user-sort]').forEach((button) => {
      const active = button.dataset.userSort === state.userSort.key;
      const mark = button.querySelector('.sort-mark');
      if (mark) mark.textContent = active ? (state.userSort.direction === 'asc' ? '↑' : '↓') : '↕';
      const header = button.closest('th');
      if (header) header.setAttribute('aria-sort', active ? (state.userSort.direction === 'asc' ? 'ascending' : 'descending') : 'none');
    });
  }

  async function renderDevices(userId) {
    const host = document.getElementById('userDeviceList');
    host.textContent = '加载中';
    try {
      const data = await api('/api/admin/users/' + encodeURIComponent(userId) + '/devices');
      if (state.activeUserId !== userId) return;
      host.replaceChildren();
      if (!data.devices.length) host.textContent = '登记客户端后查看设备';
      document.getElementById('activeUserDevices').textContent = data.devices.length;
      for (const device of data.devices) {
        const row = document.createElement('div'); row.style.cssText = 'padding:16px 0;display:flex;gap:12px;flex-wrap:wrap;align-items:center';
        const name = document.createElement('strong'); name.textContent = (device.deviceName || '未命名设备') + (device.status === 'disabled' ? '（已禁用）' : ''); row.append(name);
        for (const [action, label] of [[device.status === 'disabled' ? 'restore' : 'disable', device.status === 'disabled' ? '恢复' : '禁用'], ['delete', '删除']]) {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'button secondary'; button.textContent = label;
          button.onclick = () => runAction(button, '处理中', async () => {
            if (action === 'delete' && !window.confirm('删除此设备？历史流量保留，当前设备将无法继续认证。')) return;
            await api('/api/admin/users/' + encodeURIComponent(userId) + '/devices/' + encodeURIComponent(device.id) + '/' + action, { method: 'POST' });
            await renderDevices(userId);
          }); row.append(button);
        }
        const detail = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = '查看详情'; detail.append(summary);
        let hardware = {}; try { hardware = JSON.parse(device.hardwareInfo || '{}'); } catch {}
        const fields = [['设备编号', device.id], ['系统', device.platform], ['客户端', device.appVersion], ['厂商', hardware.Vendor], ['型号', hardware.Name], ['序列号', hardware.IdentifyingNumber], ['UUID', hardware.UUID], ['获取时间', hardware.collectedAt], ['首次登记', device.firstSeenAt], ['最近上报', device.lastSeenAt]];
        const list = document.createElement('dl'); list.style.overflowWrap = 'anywhere';
        for (const [label, value] of fields) { const term = document.createElement('dt'); term.textContent = label; const text = document.createElement('dd'); text.textContent = value || '未获取'; list.append(term, text); }
        detail.append(list); row.append(detail); host.append(row);
      }
    } catch { host.textContent = '设备读取失败，请重新打开用户详情'; }
  }

  async function loadUserOverview(userId, name) {
    if (!userId) return;
    if (!userDrawer.classList.contains('is-open') && document.activeElement instanceof HTMLElement && !userDrawer.contains(document.activeElement)) {
      drawerReturnFocus = document.activeElement;
    }
    const sequence = ++state.userLoadSequence;
    const responses = await Promise.all([
      api('/api/admin/users/' + encodeURIComponent(userId) + '/config'),
      loadPagedCollection('/api/admin/users/' + encodeURIComponent(userId) + '/traffic', 'rows'),
      api('/api/admin/users/' + encodeURIComponent(userId) + '/profile'),
      api('/api/admin/users/' + encodeURIComponent(userId) + '/notice')
    ]);
    if (sequence !== state.userLoadSequence) return;
    const user = state.users.find((entry) => entry.id === userId) || { id: userId, name: name };
    state.activeUserId = userId;
    state.activeUserName = name;
    state.activeUserTrafficRows = Array.isArray(responses[1]) ? responses[1] : [];
    state.userTrafficPage = 1;
    void renderDevices(userId);
    renderUserProfile(user);
    renderUserConfig(name, responses[0]);
    renderUserSubscriptionSummary(user);
    renderUserTraffic(name, state.activeUserTrafficRows);
    renderUserManagement(responses[2].user || user, responses[3]);
    drawerPlaceholder.hidden = true;
    drawerContent.hidden = false;
    setDrawerTab('config');
    populateMergeTargets();
    resetMergePreview();
    revealSelectedUser(userId);
    openDrawerOverlay();
    setStatus('');
  }

  function renderUserProfile(user) {
    const name = user.name || '未命名';
    document.getElementById('activeUserInitial').textContent = Array.from(name)[0] || '—';
    document.getElementById('activeUserName').textContent = name;
    document.getElementById('activeUserVersion').textContent = formatAppVersion(user.latestAppVersion);
    document.getElementById('activeUserReportedAt').textContent = formatShortTime(user.appVersionReportedAt || user.lastSeenAt);
    document.getElementById('activeUserDevices').textContent = nonNegativeNumber(user.devices);

    document.getElementById('activeUserTraffic').textContent = formatBytes(totalBytes(user));
    renderUserSubscriptionSummary(user);
  }

  function renderUserSubscriptionSummary(user) {
    const expiryTime = user.subscriptionExpiresAt ? Date.parse(user.subscriptionExpiresAt) : NaN;
    const remaining = expiryTime - Date.now(); const hasExpiry = Number.isFinite(expiryTime);
    const remainingEl = document.getElementById('activeUserRemainingDays');
    remainingEl.textContent = !hasExpiry ? '未设置' : remaining <= 0 ? '已过期' : String(Math.ceil(remaining / 86400000));
    remainingEl.classList.toggle('danger-text', hasExpiry && remaining <= 0);
    userSubscriptionState.textContent = user.subscriptionName || '选择订阅'; userSubscriptionState.style.cursor = 'pointer'; userSubscriptionState.tabIndex = 0; userSubscriptionState.setAttribute('role', 'button');
    userSubscriptionState.onclick = () => chooseUserSubscription(userSubscriptionState, user);
    userSubscriptionState.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chooseUserSubscription(userSubscriptionState, user); } };
    const tag = document.getElementById('userSubscriptionExpiry');
    tag.textContent = hasExpiry ? formatTime(user.subscriptionExpiresAt) : '未设置到期时间';
    tag.className = 'chip ' + (!hasExpiry ? 'gray' : remaining <= 0 ? 'red' : 'green');
    tag.disabled = !user.subscriptionId; tag.onclick = () => editUserExpiry(tag, user);
  }

  function setDrawerTab(name) {
    document.querySelectorAll('[data-drawer-tab]').forEach((tab) => {
      const active = tab.dataset.drawerTab === name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll('[data-drawer-section]').forEach((section) => { section.hidden = section.dataset.drawerSection !== name; });
    scheduleViewportLayout();
  }

  function openDrawerOverlay() {
    userDrawer.classList.add('is-open');
    drawerBackdrop.classList.add('is-open');
    syncDrawerMode();
    if (document.body.classList.contains('drawer-modal')) {
      window.setTimeout(() => {
        if (document.body.classList.contains('drawer-modal') && !userDrawer.contains(document.activeElement)) {
          closeUserDrawerButton.focus();
        }
      }, 80);
    }
  }

  function closeDrawerOverlay() {
    userDrawer.classList.remove('is-open');
    drawerBackdrop.classList.remove('is-open');
    syncDrawerMode();
  }

  function syncDrawerMode() {
    const modal = mediaMatches('(max-width: 1420px)') && userDrawer.classList.contains('is-open');
    document.body.classList.toggle('drawer-modal', modal);
    userDrawer.setAttribute('aria-modal', modal ? 'true' : 'false');
    drawerBackgroundElements.forEach((element) => { element.inert = modal; });
  }

  function trapDrawerFocus(event) {
    const focusable = Array.from(userDrawer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true' && element.getClientRects().length);
    if (!focusable.length) {
      event.preventDefault();
      userDrawer.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!userDrawer.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function closeUserContext() {
    const returnFocus = drawerReturnFocus;
    state.userLoadSequence += 1;
    state.activeUserId = '';
    state.activeUserName = '';
    state.activeUserTrafficRows = [];
    state.profileRequestId = '';
    state.noticeRequestId = '';
    state.userTrafficPage = 1;
    drawerContent.hidden = true;
    drawerPlaceholder.hidden = false;
    closeDrawerOverlay();
    revealSelectedUser('');
    resetMergePreview();
    drawerReturnFocus = null;
    if (returnFocus && returnFocus.isConnected) window.requestAnimationFrame(() => returnFocus.focus());
  }

  function revealSelectedUser(userId) {
    usersBody.querySelectorAll('tr[data-user-id]').forEach((row) => row.classList.toggle('is-active', row.dataset.userId === userId));
  }

  function renderUserConfig(name, data) {
    const override = data.override || null;
    const effective = data.effective || {};
    const permissionOverride = data.canEditManagedConfigOverride;
    userCanEditManagedConfigEl.value =
      typeof permissionOverride === 'boolean' ? (permissionOverride ? 'true' : 'false') : 'inherit';
    userCanEditManagedConfigEl.dataset.savedValue = userCanEditManagedConfigEl.value;
    setUserConfigFields(effective);
    setUserMode(getUserModeFromConfig(override));
    setUserSubscriptionState(effective, override);
  }

  function renderUserManagement(profile, noticeData) {
    state.profileRequestId = '';
    state.noticeRequestId = '';
    userProfileNameEl.value = profile && profile.name ? String(profile.name) : state.activeUserName;
    userProfileNicknameEl.value = profile && profile.nickname !== null && profile.nickname !== undefined ? String(profile.nickname) : '';
    clearFieldError(userProfileNameEl, userProfileNameError);
    renderUserNotice(noticeData && noticeData.notice);
    renderNoticeReceipts(noticeData);
  }

  function renderUserNotice(notice) {
    const exists = Boolean(notice && Number.isSafeInteger(Number(notice.revision)));
    userNoticeTone.value = exists && notice.tone === 'warning' ? 'warning' : 'info';
    userNoticeMessage.value = exists && typeof notice.message === 'string' ? notice.message : '';
    userNoticeDuration.value = String(getNoticeDurationForEditor(notice, exists));
    clearFieldError(userNoticeMessage, userNoticeError);
    userNoticeDuration.removeAttribute('aria-invalid');
  }

  function getNoticeDurationForEditor(notice, exists) {
    if (!exists || notice.enabled === false) return USER_NOTICE_DEFAULT_DURATION_MINUTES;
    const remaining = dateValue(notice.expiresAt) - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) return USER_NOTICE_DEFAULT_DURATION_MINUTES;
    const rounded = Math.ceil(remaining / (USER_NOTICE_DURATION_STEP_MINUTES * 60000)) * USER_NOTICE_DURATION_STEP_MINUTES;
    return Math.min(USER_NOTICE_MAX_DURATION_MINUTES, Math.max(USER_NOTICE_MIN_DURATION_MINUTES, rounded));
  }

  function adjustUserNoticeDuration(delta) {
    const current = parseUserNoticeDuration(userNoticeDuration.value);
    const base = current === null ? USER_NOTICE_DEFAULT_DURATION_MINUTES : current;
    const next = Math.min(USER_NOTICE_MAX_DURATION_MINUTES, Math.max(USER_NOTICE_MIN_DURATION_MINUTES, base + delta));
    userNoticeDuration.value = String(next);
    clearFieldError(userNoticeDuration, userNoticeError);
    state.noticeRequestId = '';
  }

  function renderNoticeReceipts(data) {
    const acknowledgements = data && Array.isArray(data.acknowledgements) ? data.acknowledgements : [];
    const acknowledgedCount = Number(data && data.acknowledgedCount);
    const deviceCount = Number(data && data.deviceCount);
    noticeReceiptSummary.textContent =
      (Number.isFinite(acknowledgedCount) ? acknowledgedCount : acknowledgements.filter((entry) => entry.acknowledgedAt).length) +
      '/' +
      (Number.isFinite(deviceCount) ? deviceCount : acknowledgements.length);
    noticeReceiptList.replaceChildren();
    acknowledgements.forEach((entry) => {
      const item = document.createElement('li');
      item.appendChild(createTextElement('span', 'receipt-name', entry.deviceName || '未命名设备'));
      item.appendChild(
        createTextElement('span', 'receipt-state', entry.acknowledgedAt ? formatShortTime(entry.acknowledgedAt) : '未读')
      );
      noticeReceiptList.appendChild(item);
    });
  }

  function formatNoticeStatus(user) {
    const notice = user && user.notice;
    if (!notice || notice.enabled === false) return '—';
    const expires = dateValue(notice.expiresAt);
    if (!Number.isFinite(expires) || expires <= Date.now()) return '—';
    return (nonNegativeNumber(notice.acknowledgedCount) || 0) + '/' + (nonNegativeNumber(notice.deviceCount) || 0);
  }

  function pruneUserSelection() {
    const known = new Set(state.users.map((user) => user.id).filter(Boolean));
    Array.from(state.selectedUserIds).forEach((userId) => {
      if (!known.has(userId)) state.selectedUserIds.delete(userId);
    });
  }

  function getSelectedUserIds() {
    return state.users.filter((user) => user.id && state.selectedUserIds.has(user.id)).map((user) => user.id);
  }

  function setUserSelected(userId, selected) {
    if (!userId) return;
    if (selected) state.selectedUserIds.add(userId);
    else state.selectedUserIds.delete(userId);
    renderUsers();
  }

  function toggleVisibleUserSelection(selected) {
    getFilteredSortedUsers()
      .slice((state.userPage - 1) * state.userPageSize, state.userPage * state.userPageSize)
      .forEach((user) => {
        if (!user.id) return;
        if (selected) state.selectedUserIds.add(user.id);
        else state.selectedUserIds.delete(user.id);
      });
    renderUsers();
  }

  function selectAllFilteredUsers() {
    getFilteredSortedUsers().forEach((user) => {
      if (user.id) state.selectedUserIds.add(user.id);
    });
    renderUsers();
  }

  function updateUserSelectionUi(visible) {
    const selectedCount = getSelectedUserIds().length;
    userSelectionCount.textContent = '已选 ' + selectedCount + ' 人';
    broadcastNoticeButton.disabled = selectedCount === 0;
    resetSelectedNoticesButton.disabled = selectedCount === 0;
    const visibleIds = visible.filter((user) => user.id);
    const selectedVisible = visibleIds.filter((user) => state.selectedUserIds.has(user.id)).length;
    selectVisibleUsers.checked = visibleIds.length > 0 && selectedVisible === visibleIds.length;
    selectVisibleUsers.indeterminate = selectedVisible > 0 && selectedVisible < visibleIds.length;
  }

  function openBroadcastDialog() {
    const count = getSelectedUserIds().length;
    if (!count) return;
    broadcastTargetSummary.textContent = '发给 ' + count + ' 人';
    broadcastNoticeTone.value = 'info';
    broadcastNoticeDuration.value = String(USER_NOTICE_DEFAULT_DURATION_MINUTES);
    broadcastNoticeMessage.value = '';
    clearFieldError(broadcastNoticeMessage, broadcastNoticeError);
    broadcastNoticeDuration.removeAttribute('aria-invalid');
    state.broadcastRequestId = '';
    if (typeof broadcastDialog.showModal === 'function') broadcastDialog.showModal();
    else broadcastDialog.setAttribute('open', '');
  }

  function closeBroadcastDialog() {
    if (typeof broadcastDialog.close === 'function' && broadcastDialog.open) broadcastDialog.close();
    else broadcastDialog.removeAttribute('open');
  }

  function adjustBroadcastNoticeDuration(delta) {
    const current = parseUserNoticeDuration(broadcastNoticeDuration.value);
    const base = current === null ? USER_NOTICE_DEFAULT_DURATION_MINUTES : current;
    const next = Math.min(USER_NOTICE_MAX_DURATION_MINUTES, Math.max(USER_NOTICE_MIN_DURATION_MINUTES, base + delta));
    broadcastNoticeDuration.value = String(next);
    clearFieldError(broadcastNoticeDuration, broadcastNoticeError);
    state.broadcastRequestId = '';
  }

  async function submitBroadcastNotice() {
    const userIds = getSelectedUserIds();
    if (!userIds.length) return;
    const message = broadcastNoticeMessage.value.trim();
    const durationMinutes = parseUserNoticeDuration(broadcastNoticeDuration.value);
    clearFieldError(broadcastNoticeMessage, broadcastNoticeError);
    broadcastNoticeDuration.removeAttribute('aria-invalid');
    if (!message || Array.from(message).length > 500 || hasControlCharacters(message)) {
      setFieldError(broadcastNoticeMessage, broadcastNoticeError, '请输入 1 至 500 个有效字符');
      return;
    }
    if (durationMinutes === null) {
      setFieldError(broadcastNoticeDuration, broadcastNoticeError, '持续时间请使用 5 分钟的整数倍（5 分钟至 7 天）');
      return;
    }
    const requestId = state.broadcastRequestId || createRequestId();
    state.broadcastRequestId = requestId;
    const data = await api('/api/admin/notices/broadcast', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userIds: userIds,
        message: message,
        tone: broadcastNoticeTone.value === 'warning' ? 'warning' : 'info',
        durationMinutes: durationMinutes,
        requestId: requestId
      })
    });
    const failedCount = Array.isArray(data.failed) ? data.failed.length : 0;
    if (!failedCount) {
      closeBroadcastDialog();
      state.broadcastRequestId = '';
    }
    await loadUsers();
    renderUsers();
    if (state.activeUserId && userIds.includes(state.activeUserId)) {
      const noticeData = await api('/api/admin/users/' + encodeURIComponent(state.activeUserId) + '/notice');
      renderUserNotice(noticeData.notice || null);
      renderNoticeReceipts(noticeData);
    }
    const result = formatNoticeBatchResult('发送', data);
    setStatus(result);
    showToast(result);
  }

  async function resetSelectedNotices() {
    const userIds = getSelectedUserIds();
    if (!userIds.length) return;
    const accepted = await askConfirm('停止选中 ' + userIds.length + ' 人的通知？', '停止');
    if (!accepted) return;
    const userKey = userIds.slice().sort().join(',');
    if (state.resetNoticesUserKey !== userKey) {
      state.resetNoticesRequestId = '';
      state.resetNoticesUserKey = userKey;
    }
    const requestId = state.resetNoticesRequestId || createRequestId();
    state.resetNoticesRequestId = requestId;
    const data = await api('/api/admin/notices/reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userIds: userIds, requestId: requestId })
    });
    const failedCount = Array.isArray(data.failed) ? data.failed.length : 0;
    if (!failedCount) {
      state.resetNoticesRequestId = '';
      state.resetNoticesUserKey = '';
    }
    await loadUsers();
    renderUsers();
    if (state.activeUserId && userIds.includes(state.activeUserId)) {
      const noticeData = await api('/api/admin/users/' + encodeURIComponent(state.activeUserId) + '/notice');
      renderUserNotice(noticeData.notice || null);
      renderNoticeReceipts(noticeData);
    }
    const result = formatNoticeBatchResult('停止', data);
    setStatus(result);
    showToast(result);
  }

  function formatNoticeBatchResult(action, data) {
    const sent = Math.max(0, Number(data.sent) || 0);
    const alreadyApplied = Math.max(0, Number(data.alreadyApplied) || 0);
    const failed = Array.isArray(data.failed) ? data.failed.length : 0;
    return action + ' ' + sent + ' 人，已完成 ' + alreadyApplied + ' 人，失败 ' + failed + ' 人';
  }

  async function refreshActiveUserNotice() {
    if (!state.activeUserId) return;
    const noticeData = await api('/api/admin/users/' + encodeURIComponent(state.activeUserId) + '/notice');
    renderUserNotice(noticeData.notice || null);
    renderNoticeReceipts(noticeData);
  }

  function renderUserTraffic(name, rows) {
    state.activeUserTrafficRows = Array.isArray(rows) ? rows : [];
    renderUserTrafficPage();
  }

  function renderUserTrafficPage() {
    detailsBody.replaceChildren();
    const rows = state.activeUserTrafficRows;
    const totalPages = Math.max(1, Math.ceil(rows.length / state.userTrafficPageSize));
    state.userTrafficPage = Math.min(state.userTrafficPage, totalPages);
    const start = (state.userTrafficPage - 1) * state.userTrafficPageSize;
    const visibleRows = rows.slice(start, start + state.userTrafficPageSize);
    if (trafficPageSummary) {
      trafficPageSummary.textContent = rows.length + ' 条' + (rows.length ? ' · ' + state.userTrafficPage + '/' + totalPages + ' 页' : '');
    }
    if (trafficPagination) {
      renderPagination(trafficPagination, state.userTrafficPage, totalPages, (page) => {
        state.userTrafficPage = page;
        renderUserTrafficPage();
      });
    }
    if (!rows.length) {
      appendEmptyTableRow(detailsBody, 5, '暂无流量');
      return;
    }
    visibleRows.forEach((entry) => {
      const upload = nonNegativeNumber(entry.uploadBytes);
      const download = nonNegativeNumber(entry.downloadBytes);
      const row = document.createElement('tr');
      appendTableCell(row, entry.date || '');
      appendTableCell(row, entry.deviceName || entry.deviceId || '-', '', entry.deviceId || '');
      appendTableCell(row, formatBytes(upload), 'num');
      appendTableCell(row, formatBytes(download), 'num');
      appendTableCell(row, formatBytes(upload + download), 'num');
      detailsBody.appendChild(row);
    });
  }

  function openUserFromAnywhere(user) {
    setView('users');
    runAction(null, (user.name || '用户') + ' 加载中', () => loadUserOverview(user.id, user.name || '未命名'));
  }

  async function saveGlobalConfig() {
    if (!validateSubscriptionField('global')) return;
    const payload = {
      enabled: document.getElementById('globalEnabled').value === 'true',
      canEditManagedConfig: document.getElementById('globalCanEditManagedConfig').value === 'true',
      subscriptionUrl: document.getElementById('globalSubscription').value.trim() || null,
      ruleProfile: document.getElementById('globalRuleProfile').value,
      preferredRegion: document.getElementById('globalPreferredRegion').value,
      regionFallback: document.getElementById('globalRegionFallback').value
    };
    const data = await api('/api/admin/config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const config = data.config || payload;
    document.getElementById('globalEnabled').value = config.enabled === false ? 'false' : 'true';
    document.getElementById('globalCanEditManagedConfig').value =
      config.canEditManagedConfig === false ? 'false' : 'true';
    document.getElementById('globalSubscription').value = config.subscriptionUrl || '';
    document.getElementById('globalRuleProfile').value = normalizeRuleProfile(config.ruleProfile);
    document.getElementById('globalPreferredRegion').value = normalizePreferredRegion(config.preferredRegion);
    document.getElementById('globalRegionFallback').value = normalizeRegionFallback(config.regionFallback);
    updateGlobalRegionFallbackState();
    document.getElementById('globalVersion').textContent = 'v' + (config.version || 1);
    setGlobalSubscriptionState(config);
    await loadUsers();
    renderAll();
    setStatus('已保存，客户端会自动同步');
    showToast('全局配置已保存');
  }

  async function syncGlobalUsers() {
    const confirmed = await askConfirm('清除所有用户的单独配置？输入“清除”确认', '清除', '清除');
    if (!confirmed) {
      setStatus('');
      return;
    }
    const data = await api('/api/admin/config/sync-users', { method: 'POST' });
    if (state.activeUserId) {
      const config = data.config || {};
      setUserConfigFields(config);
      setUserMode('follow');
      setUserSubscriptionState(config, null);
    }
    await loadUsers();
    renderAll();
    const message = '已清除 ' + (data.clearedUsers || 0) + ' 个覆盖';
    setStatus(message);
    showToast(message);
  }

  async function saveTrafficLimit() {
    const input = document.getElementById('trafficLimitGb');
    const periodStartInput = document.getElementById('trafficPeriodStartedAt');
    const expiryInput = document.getElementById('trafficExpiresAt');
    const gb = Number(input.value);
    const bytes = Math.round(gb * GIB);
    if (!Number.isFinite(gb) || gb <= 0 || !Number.isSafeInteger(bytes)) {
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      throw new Error('请输入有效的正数额度');
    }
    input.removeAttribute('aria-invalid');
    const trafficPeriodStartedAt = parseShanghaiDateTimeInput(periodStartInput.value);
    if (!trafficPeriodStartedAt) {
      periodStartInput.setAttribute('aria-invalid', 'true');
      periodStartInput.focus();
      throw new Error('请输入有效的开始时间');
    }
    periodStartInput.removeAttribute('aria-invalid');
    const trafficExpiresAt = parseShanghaiDateTimeInput(expiryInput.value);
    if (!trafficExpiresAt) {
      expiryInput.setAttribute('aria-invalid', 'true');
      expiryInput.focus();
      throw new Error('请输入有效的到期时间');
    }
    expiryInput.removeAttribute('aria-invalid');
    if (dateValue(trafficPeriodStartedAt) >= dateValue(trafficExpiresAt)) {
      periodStartInput.setAttribute('aria-invalid', 'true');
      expiryInput.setAttribute('aria-invalid', 'true');
      periodStartInput.focus();
      throw new Error('开始时间必须早于到期时间');
    }
    const data = await api('/api/admin/traffic-limit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        trafficLimitBytes: bytes,
        trafficPeriodStartedAt: trafficPeriodStartedAt,
        trafficExpiresAt: trafficExpiresAt
      })
    });
    const limit = positiveNumber(data.trafficLimitBytes) || bytes;
    state.quota = {
      trafficLimitBytes: limit,
      uploadBytes: nonNegativeNumber(data.uploadBytes),
      downloadBytes: nonNegativeNumber(data.downloadBytes),
      usedBytes: nonNegativeNumber(data.usedBytes),
      remainingBytes: nonNegativeNumber(data.remainingBytes),
      usagePercent: nonNegativeNumber(data.usagePercent),
      trafficPeriodStartedAt: normalizeTrafficPeriodStart(data.trafficPeriodStartedAt || trafficPeriodStartedAt),
      trafficExpiresAt: normalizeTrafficExpiry(data.trafficExpiresAt || trafficExpiresAt)
    };
    input.value = formatEditableGb(limit);
    periodStartInput.value = formatShanghaiDateTimeInput(state.quota.trafficPeriodStartedAt);
    expiryInput.value = formatShanghaiDateTimeInput(state.quota.trafficExpiresAt);
    renderQuota();
    setStatus('流量设置已保存');
    showToast('流量设置已保存');
  }

  async function saveUserConfig() {
    if (!state.activeUserId) return;
    const userId = state.activeUserId;
    const userName = state.activeUserName;
    const sequence = state.userLoadSequence;
    const mode = getUserMode();
    if (mode === 'follow') {
      const data = await api('/api/admin/users/' + encodeURIComponent(userId) + '/config/reset', { method: 'POST' });
      if (!isCurrentUserContext(userId, sequence)) return;
      setUserConfigFields(data.effective || {});
      setUserMode('follow');
      setUserSubscriptionState(data.effective || {}, null);
      await loadUsers();
      renderAll();
      setStatus(userName + ' 已跟随全局');
      showToast(userName + ' 已跟随全局');
      return;
    }
    if (mode === 'category' && !document.getElementById('userSubscription').value.trim()) { showToast('先选择分类订阅', true); return; }
    if (!validateSubscriptionField('user')) return;
    const payload = {
      managementMode: mode,
      enabled: mode !== 'disabled' && mode !== 'unconfigured',
      subscriptionUrl: ['custom', 'category'].includes(mode) ? document.getElementById('userSubscription').value.trim() || null : null,
      managedRuleProfile: document.getElementById('userRuleProfile').value || null,
      preferredRegion: document.getElementById('userPreferredRegion').value,
      regionFallback: document.getElementById('userRegionFallback').value
    };
    const data = await api('/api/admin/users/' + encodeURIComponent(userId) + '/config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!isCurrentUserContext(userId, sequence)) return;
    renderUserConfig(userName, data);
    await loadUsers();
    renderAll();
    setStatus(userName + ' 已保存');
    showToast(userName + ' 配置已保存');
  }

  async function saveUserManagedConfigPermission() {
    if (!state.activeUserId) return;
    const userId = state.activeUserId;
    const userName = state.activeUserName;
    const sequence = state.userLoadSequence;
    const previousValue = userCanEditManagedConfigEl.dataset.savedValue || 'inherit';
    const selectedValue = userCanEditManagedConfigEl.value;
    const canEditManagedConfig = selectedValue === 'inherit' ? null : selectedValue === 'true';
    try {
      const data = await api(
        '/api/admin/users/' + encodeURIComponent(userId) + '/config-permission',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ canEditManagedConfig: canEditManagedConfig })
        }
      );
      if (!isCurrentUserContext(userId, sequence)) return;
      const acceptedOverride = data.canEditManagedConfigOverride;
      userCanEditManagedConfigEl.value =
        typeof acceptedOverride === 'boolean' ? (acceptedOverride ? 'true' : 'false') : 'inherit';
      userCanEditManagedConfigEl.dataset.savedValue = userCanEditManagedConfigEl.value;
      const message =
        userName +
        (userCanEditManagedConfigEl.value === 'inherit'
          ? ' 已改为跟随全局'
          : userCanEditManagedConfigEl.value === 'true'
            ? ' 已允许自行配置'
            : ' 已禁止自行配置');
      setStatus(message);
      showToast(message);
    } catch (error) {
      if (isCurrentUserContext(userId, sequence)) userCanEditManagedConfigEl.value = previousValue;
      throw error;
    }
  }

  async function resetUserConfig() {
    if (!state.activeUserId) return;
    const userId = state.activeUserId;
    const userName = state.activeUserName;
    const sequence = state.userLoadSequence;
    const data = await api('/api/admin/users/' + encodeURIComponent(userId) + '/config/reset', { method: 'POST' });
    if (!isCurrentUserContext(userId, sequence)) return;
    setUserConfigFields(data.effective || {});
    setUserMode('follow');
    setUserSubscriptionState(data.effective || {}, null);
    await loadUsers();
    renderAll();
    setStatus(userName + ' 已重置为跟随全局');
    showToast(userName + ' 已重置');
  }

  async function saveUserProfile() {
    if (!state.activeUserId) return;
    const userId = state.activeUserId;
    const sequence = state.userLoadSequence;
    const name = userProfileNameEl.value.trim();
    clearFieldError(userProfileNameEl, userProfileNameError);
    if (!name || Array.from(name).length > 80 || hasControlCharacters(name)) {
      setFieldError(userProfileNameEl, userProfileNameError, '请输入 1 至 80 个有效字符');
      return;
    }
    const requestId = state.profileRequestId || createRequestId();
    state.profileRequestId = requestId;
    const data = await api('/api/admin/users/' + encodeURIComponent(userId) + '/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: name, requestId: requestId })
    });
    if (!isCurrentUserContext(userId, sequence)) return;
    const profile = data.user || { id: userId, name: name };
    state.profileRequestId = '';
    state.activeUserName = profile.name || name;
    userProfileNameEl.value = state.activeUserName;
    await loadUsers();
    if (!isCurrentUserContext(userId, sequence)) return;
    const refreshed = state.users.find((user) => user.id === userId) || profile;
    state.activeUserName = refreshed.name || state.activeUserName;
    renderAll();
    renderUserProfile(refreshed);
    revealSelectedUser(userId);
    setStatus('ID 已保存，客户端会自动同步');
    showToast('ID 已保存');
  }

  async function saveUserNickname() {
    if (!state.activeUserId) return;
    const userId = state.activeUserId;
    const sequence = state.userLoadSequence;
    await api('/api/admin/users/' + encodeURIComponent(userId) + '/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nickname: userProfileNicknameEl.value || null })
    });
    await loadUsers();
    if (!isCurrentUserContext(userId, sequence)) return;
    renderAll();
    setStatus('昵称已保存');
    showToast('昵称已保存');
  }

  async function saveUserNotice() {
    if (!state.activeUserId) return;
    const userId = state.activeUserId;
    const sequence = state.userLoadSequence;
    const message = userNoticeMessage.value.trim();
    const durationMinutes = parseUserNoticeDuration(userNoticeDuration.value);
    clearFieldError(userNoticeMessage, userNoticeError);
    userNoticeDuration.removeAttribute('aria-invalid');
    if (!message || Array.from(message).length > 500 || hasControlCharacters(message)) {
      setFieldError(userNoticeMessage, userNoticeError, '请输入 1 至 500 个有效字符');
      return;
    }
    if (durationMinutes === null) {
      setFieldError(userNoticeDuration, userNoticeError, '持续时间请使用 5 分钟的整数倍（5 分钟至 7 天）');
      return;
    }
    const requestId = state.noticeRequestId || createRequestId();
    state.noticeRequestId = requestId;
    const data = await api('/api/admin/users/' + encodeURIComponent(userId) + '/notice', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        message: message,
        tone: userNoticeTone.value === 'warning' ? 'warning' : 'info',
        durationMinutes: durationMinutes,
        requestId: requestId
      })
    });
    if (!isCurrentUserContext(userId, sequence)) return;
    state.noticeRequestId = '';
    await loadUsers();
    renderUsers();
    if (!isCurrentUserContext(userId, sequence)) return;
    await refreshActiveUserNotice();
    setStatus('定向通知已保存并重新计时');
    showToast('定向通知已保存并重新计时');
  }

  async function clearUserNotice() {
    if (!state.activeUserId) return;
    const userId = state.activeUserId;
    const sequence = state.userLoadSequence;
    const data = await api('/api/admin/users/' + encodeURIComponent(userId) + '/notice/reset', { method: 'POST' });
    if (!isCurrentUserContext(userId, sequence)) return;
    state.noticeRequestId = '';
    await loadUsers();
    renderUsers();
    if (!isCurrentUserContext(userId, sequence)) return;
    await refreshActiveUserNotice();
    setStatus('定向通知已停用');
    showToast('定向通知已停用');
  }

  function renderConfigDistribution() {
    const container = document.getElementById('configDistribution');
    container.replaceChildren();
    const order = ['跟随全局', '分类订阅', '私人定制', '停用', '未配置'];
    const counts = new Map();
    state.users.forEach((user) => {
      const key = user.subscriptionState || '未配置';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const entries = order.map((label) => [label, counts.get(label) || 0]).filter((entry) => entry[1] > 0);
    counts.forEach((count, label) => { if (!order.includes(label)) entries.push([label, count]); });
    if (!entries.length) {
      container.appendChild(createTextElement('p', 'muted', '暂无用户配置'));
      return;
    }
    entries.forEach((entry) => {
      const percent = state.users.length ? entry[1] / state.users.length * 100 : 0;
      const row = document.createElement('div');
      row.className = 'distribution-row';
      row.append(
        createTextElement('span', '', entry[0]),
        createBarTrack(percent),
        createTextElement('span', 'distribution-value', entry[1] + '（' + percent.toFixed(1) + '%）')
      );
      container.appendChild(row);
    });
  }

  function renderAnomalySummary() {
    const rows = state.anomalies;
    const users = new Set(rows.map((entry) => entry.userId || entry.userName).filter(Boolean));
    const maxUpload = rows.reduce((max, entry) => Math.max(max, nonNegativeNumber(entry.uploadBytes)), 0);
    const maxDownload = rows.reduce((max, entry) => Math.max(max, nonNegativeNumber(entry.downloadBytes)), 0);
    const latest = rows.reduce((value, entry) => dateValue(entry.createdAt) > dateValue(value) ? entry.createdAt : value, '');
    setStat('anomalyRecords', String(rows.length));
    setStat('anomalyUsers', String(users.size));
    const compact = window.innerWidth <= 430;
    const upload = formatBytes(maxUpload);
    const download = formatBytes(maxDownload);
    const latestTime = latest ? formatShortTime(latest) : '—';
    setStat('anomalyMaxUpload', compact ? formatCompactBytes(maxUpload) : upload, upload);
    setStat('anomalyMaxDownload', compact ? formatCompactBytes(maxDownload) : download, download);
    setStat('anomalyLatest', compact && latest ? formatClockTime(latest) : latestTime, latestTime);
  }

  function renderAnomalyDistribution() {
    const container = document.getElementById('anomalyDistribution');
    container.replaceChildren();
    const counts = new Map();
    state.anomalies.forEach((entry) => {
      const key = entry.userName || entry.userId || '未命名';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 5);
    const other = entries.slice(5).reduce((sum, entry) => sum + entry[1], 0);
    document.getElementById('otherAnomalyCount').textContent = other + ' 条';
    if (!top.length) {
      container.appendChild(createTextElement('p', 'muted', '暂无异常记录'));
      return;
    }
    const max = Math.max(1, top[0][1]);
    top.forEach((entry) => {
      const percent = state.anomalies.length ? entry[1] / state.anomalies.length * 100 : 0;
      const row = document.createElement('div');
      row.className = 'distribution-row';
      row.append(
        createTextElement('span', '', entry[0]),
        createBarTrack(Math.max(4, entry[1] / max * 100)),
        createTextElement('span', 'distribution-value', entry[1] + ' 条 · ' + percent.toFixed(1) + '%')
      );
      container.appendChild(row);
    });
  }

  function resetAnomalyPageAndRender() {
    state.anomalyPage = 1;
    renderAnomalies();
  }

  function getFilteredSortedAnomalies() {
    const search = anomalySearch.value.trim().toLocaleLowerCase('zh-CN');
    return state.anomalies.filter((entry) => {
      if (!search) return true;
      const value = [entry.userName, entry.userId, entry.deviceName, entry.deviceId].filter(Boolean).join('\n').toLocaleLowerCase('zh-CN');
      return value.includes(search);
    }).sort((a, b) => {
      let result;
      if (state.anomalySort.key === 'createdAt') result = dateValue(a.createdAt) - dateValue(b.createdAt);
      else result = nonNegativeNumber(a[state.anomalySort.key]) - nonNegativeNumber(b[state.anomalySort.key]);
      return state.anomalySort.direction === 'asc' ? result : -result;
    });
  }

  function renderAnomalies() {
    const filtered = getFilteredSortedAnomalies();
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.anomalyPageSize));
    state.anomalyPage = Math.min(state.anomalyPage, totalPages);
    const start = (state.anomalyPage - 1) * state.anomalyPageSize;
    const visible = filtered.slice(start, start + state.anomalyPageSize);
    anomaliesBody.replaceChildren();
    if (!visible.length) {
      appendEmptyTableRow(anomaliesBody, 9, '暂无符合条件的异常记录');
    } else {
      visible.forEach((entry) => {
        const user = state.users.find((candidate) => candidate.id === entry.userId);
        const upload = nonNegativeNumber(entry.uploadBytes);
        const download = nonNegativeNumber(entry.downloadBytes);
        const row = document.createElement('tr');
        const nameCell = appendTableCell(row, '', 'name-cell');
        const userButton = createTextElement('button', 'user-link', entry.userName || entry.userId || '-');
        userButton.type = 'button';
        userButton.disabled = !user;
        nameCell.appendChild(userButton);
        appendTableCell(row, entry.deviceName || entry.deviceId || '-', '', entry.deviceId || '');
        appendTableCell(row, entry.date || '-');
        appendTableCell(row, formatBytes(upload), 'num danger-text');
        appendTableCell(row, formatBytes(download), 'num danger-text');
        appendTableCell(
          row,
          formatBytes(upload + download),
          'num danger-text mobile-anomaly-total',
          '上传 ' + formatBytes(upload) + '，下载 ' + formatBytes(download)
        );
        appendTableCell(row).appendChild(createAnomalyReason(entry.reason));
        appendTableCell(row, formatTime(entry.createdAt));
        const actionCell = appendTableCell(row);
        const detailButton = createTextElement('button', 'button secondary small', '详情');
        detailButton.type = 'button';
        detailButton.disabled = !user;
        actionCell.appendChild(detailButton);
        if (user) {
          userButton.addEventListener('click', () => openUserFromAnywhere(user));
          detailButton.addEventListener('click', () => openUserFromAnywhere(user));
        }
        anomaliesBody.appendChild(row);
      });
    }
    anomalyCountEl.textContent = state.anomalies.length + ' 条';
    anomalyPageSummary.textContent = filtered.length + ' 条' + (filtered.length ? ' · ' + state.anomalyPage + '/' + totalPages + ' 页' : '');
    renderPagination(anomalyPagination, state.anomalyPage, totalPages, (page) => { state.anomalyPage = page; renderAnomalies(); });
  }

  function populateMergeTargets() {
    const selected = mergeTargetEl.value;
    mergeTargetEl.replaceChildren();
    const placeholder = createTextElement('option', '', '选择保留的用户');
    placeholder.value = '';
    mergeTargetEl.appendChild(placeholder);
    state.users.forEach((user) => {
      if (!user.id || user.id === state.activeUserId) return;
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = user.name || '未命名';
      mergeTargetEl.appendChild(option);
    });
    if (Array.from(mergeTargetEl.options).some((option) => option.value === selected)) mergeTargetEl.value = selected;
    previewMergeButton.disabled = !state.activeUserId || !mergeTargetEl.value;
  }

  function resetMergePreview() {
    state.mergePreviewSequence += 1;
    state.mergePreviewState = null;
    state.mergeRequestId = '';
    mergePreviewEl.classList.add('hidden');
    mergeConflictEl.classList.add('hidden');
    mergeResolutionEl.value = '';
    mergePreviewSummary.replaceChildren();
    previewMergeButton.disabled = !state.activeUserId || !mergeTargetEl.value;
    confirmMergeButton.disabled = true;
  }

  async function previewUserMerge() {
    const targetUserId = mergeTargetEl.value;
    if (!state.activeUserId || !targetUserId || state.activeUserId === targetUserId) return;
    const sourceUserId = state.activeUserId;
    const sequence = ++state.mergePreviewSequence;
    const data = await api('/api/admin/users/' + encodeURIComponent(sourceUserId) + '/merge-preview?targetUserId=' + encodeURIComponent(targetUserId));
    if (sequence !== state.mergePreviewSequence || sourceUserId !== state.activeUserId || targetUserId !== mergeTargetEl.value) return;
    const preview = data.preview && typeof data.preview === 'object' ? data.preview : data;
    const conflict = hasConfigConflict(data, preview);
    state.mergePreviewState = {
      targetUserId: targetUserId,
      conflict: conflict,
      source: preview.source || data.source || null,
      target: preview.target || data.target || null
    };
    state.mergeRequestId = createRequestId();
    renderMergePreview(targetUserId, conflict, state.mergePreviewState.source, state.mergePreviewState.target);
    setStatus('');
  }

  function hasConfigConflict(data, preview) {
    const conflicts = preview && preview.conflicts && typeof preview.conflicts === 'object' ? preview.conflicts : null;
    const raw = preview.configConflict !== undefined ? preview.configConflict :
      data.configConflict !== undefined ? data.configConflict :
      preview.config && preview.config.conflict !== undefined ? preview.config.conflict :
      data.config && data.config.conflict !== undefined ? data.config.conflict :
      preview.requiresConfigResolution !== undefined ? preview.requiresConfigResolution :
      data.requiresConfigResolution !== undefined ? data.requiresConfigResolution :
      conflicts && conflicts.config !== undefined ? conflicts.config : false;
    if (raw && typeof raw === 'object') {
      if (raw.hasConflict !== undefined) return Boolean(raw.hasConflict);
      if (raw.required !== undefined) return Boolean(raw.required);
      return Object.keys(raw).length > 0;
    }
    return Boolean(raw);
  }

  function renderMergePreview(targetUserId, conflict, previewSource, previewTarget) {
    const source = Object.assign({}, state.users.find((user) => user.id === state.activeUserId) || {}, previewSource || {});
    const target = Object.assign({}, state.users.find((user) => user.id === targetUserId) || {}, previewTarget || {});
    mergePreviewSummary.replaceChildren();
    mergePreviewSummary.appendChild(createPreviewCard('当前用户', source.name || state.activeUserName || '未命名', source));
    mergePreviewSummary.appendChild(createPreviewCard('目标用户', target.name || '未命名', target));
    mergeConflictEl.classList.toggle('hidden', !conflict);
    mergeResolutionEl.value = '';
    mergePreviewEl.classList.remove('hidden');
    updateMergeConfirmState();
  }

  function createPreviewCard(label, name, user) {
    const card = document.createElement('div');
    card.className = 'preview-card';
    const title = document.createElement('strong');
    const detail = document.createElement('span');
    title.textContent = label + '：' + name;
    detail.textContent = '逻辑设备 ' + nonNegativeNumber(user.devices) + ' · 原始记录 ' + nonNegativeNumber(user.deviceRecords);
    card.appendChild(title);
    card.appendChild(detail);
    return card;
  }

  function updateMergeConfirmState() {
    const needsResolution = state.mergePreviewState && state.mergePreviewState.conflict;
    const hasResolution = !needsResolution || Boolean(mergeResolutionEl.value);
    confirmMergeButton.disabled = !state.mergePreviewState || !hasResolution || state.activeRequests > 0;
  }

  async function mergeUsers() {
    if (!state.mergePreviewState || state.mergePreviewState.targetUserId !== mergeTargetEl.value) return;
    if (state.mergePreviewState.conflict && !mergeResolutionEl.value) {
      mergeResolutionEl.focus();
      setStatus('请选择配置处理方式');
      return;
    }
    const sourceUserId = state.activeUserId;
    const sourceSequence = state.userLoadSequence;
    const previewState = state.mergePreviewState;
    const targetUserId = state.mergePreviewState.targetUserId;
    const target = state.users.find((user) => user.id === targetUserId);
    const targetName = target ? target.name || '未命名' : '目标用户';
    const confirmed = await askConfirm('当前用户的数据将并入“' + targetName + '”，合并后不能撤销。', '合并');
    if (!confirmed) {
      setStatus('');
      return;
    }
    if (!isCurrentUserContext(sourceUserId, sourceSequence) || state.mergePreviewState !== previewState) return;
    const payload = {
      targetUserId: targetUserId,
      configResolution: state.mergePreviewState.conflict ? mergeResolutionEl.value : undefined,
      requestId: state.mergeRequestId || createRequestId()
    };
    try {
      await api('/api/admin/users/' + encodeURIComponent(sourceUserId) + '/merge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      if (error && error.status === 409) {
        if (!isCurrentUserContext(sourceUserId, sourceSequence) || state.mergePreviewState !== previewState) return;
        state.mergePreviewState.conflict = true;
        mergeConflictEl.classList.remove('hidden');
        mergeResolutionEl.value = '';
        mergeResolutionEl.focus();
        setStatus('配置存在冲突，请选择处理方式后重试');
        return;
      }
      throw error;
    }
    state.activeUserId = '';
    state.activeUserName = '';
    await loadAll(false);
    const refreshedTarget = state.users.find((user) => user.id === targetUserId);
    if (refreshedTarget) await loadUserOverview(targetUserId, refreshedTarget.name || targetName);
    else closeUserContext();
    setStatus('用户已合并');
    showToast('用户已合并');
  }

  function askConfirm(message, acceptLabel, phrase) {
    if (!confirmDialog || typeof confirmDialog.showModal !== 'function') return Promise.resolve(window.confirm(message));
    confirmText.textContent = message;
    confirmAccept.textContent = acceptLabel;
    confirmPhraseWrap.classList.toggle('hidden', !phrase);
    confirmPhrase.value = '';
    confirmAccept.disabled = Boolean(phrase);
    const onInput = () => { confirmAccept.disabled = Boolean(phrase) && confirmPhrase.value.trim() !== phrase; };
    confirmPhrase.addEventListener('input', onInput);
    confirmDialog.returnValue = '';
    confirmDialog.showModal();
    if (phrase) confirmPhrase.focus();
    return new Promise((resolve) => {
      confirmDialog.addEventListener('close', () => {
        confirmPhrase.removeEventListener('input', onInput);
        resolve(confirmDialog.returnValue === 'confirm');
      }, { once: true });
    });
  }

  function renderPagination(container, page, totalPages, onSelect) {
    container.replaceChildren();
    const previous = createPagerButton('chevron-left', page === 1, () => onSelect(page - 1), '上一页', true);
    container.appendChild(previous);
    paginationItems(page, totalPages).forEach((item) => {
      if (item === 'ellipsis') {
        const span = document.createElement('span');
        span.className = 'muted';
        span.textContent = '…';
        container.appendChild(span);
      } else {
        const button = createPagerButton(String(item), false, () => onSelect(item), '第 ' + item + ' 页');
        button.classList.toggle('is-active', item === page);
        button.setAttribute('aria-current', item === page ? 'page' : 'false');
        container.appendChild(button);
      }
    });
    container.appendChild(createPagerButton('chevron-right', page === totalPages, () => onSelect(page + 1), '下一页', true));
  }

  function paginationItems(page, totalPages) {
    if ((window.innerWidth || document.documentElement.clientWidth || 1280) <= 430 && totalPages > 3) {
      const compactPages = Array.from(new Set([1, page, totalPages])).sort((a, b) => a - b);
      const compactResult = [];
      compactPages.forEach((value, index) => {
        if (index && value - compactPages[index - 1] > 1) compactResult.push('ellipsis');
        compactResult.push(value);
      });
      return compactResult;
    }
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
    const pages = new Set([1, totalPages, page - 1, page, page + 1]);
    const sorted = Array.from(pages).filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
    const result = [];
    sorted.forEach((value, index) => {
      if (index && value - sorted[index - 1] > 1) result.push('ellipsis');
      result.push(value);
    });
    return result;
  }

  function createPagerButton(content, disabled, onClick, label, iconOnly) {
    const button = document.createElement('button');
    button.className = 'pager-button';
    button.type = 'button';
    button.disabled = disabled;
    if (iconOnly) button.appendChild(createSvgIcon(content));
    else button.textContent = content;
    button.setAttribute('aria-label', label);
    button.addEventListener('click', onClick);
    return button;
  }

  function validateSubscriptionField(prefix) {
    const input = document.getElementById(prefix + 'Subscription');
    const errorEl = document.getElementById(prefix + 'SubscriptionError');
    const value = input.value.trim();
    input.removeAttribute('aria-invalid');
    errorEl.textContent = '';
    if (value && !value.startsWith('https://')) {
      const message = '订阅链接需以 https:// 开头';
      input.setAttribute('aria-invalid', 'true');
      errorEl.textContent = message;
      setStatus(message);
      input.focus();
      return false;
    }
    return true;
  }

  function setFieldError(input, errorEl, message) {
    input.setAttribute('aria-invalid', 'true');
    errorEl.textContent = message;
    setStatus(message);
    input.focus();
  }

  function clearFieldError(input, errorEl) {
    input.removeAttribute('aria-invalid');
    errorEl.textContent = '';
  }

  function hasControlCharacters(value) {
    return Array.from(value).some((character) => {
      const codePoint = character.codePointAt(0) || 0;
      return codePoint <= 31 || (codePoint >= 127 && codePoint <= 159);
    });
  }

  function setUserConfigFields(config) {
    document.getElementById('userSubscription').value = config.subscriptionUrl || '';
    document.getElementById('userRuleProfile').value = ['ruleset', 'smart-custom', 'custom'].includes(config.managedRuleProfile) ? config.managedRuleProfile : '';
    document.getElementById('userPreferredRegion').value = normalizePreferredRegion(config.preferredRegion);
    document.getElementById('userRegionFallback').value = normalizeRegionFallback(config.regionFallback);
  }

  function getUserMode() {
    return ['custom', 'category', 'disabled', 'unconfigured'].includes(userModeEl.value) ? userModeEl.value : 'follow';
  }

  function setUserMode(mode) {
    userModeEl.value = mode;
    updateUserModeState();
  }

  function getUserModeFromConfig(override) {
    if (!override) return 'follow';
    if (override.managementMode) return override.managementMode;
    if (override.enabled !== false && state.users.some(user => user.id === state.activeUserId && user.subscriptionId)) return 'category';
    return override.enabled === false ? 'disabled' : 'custom';
  }

  function updateUserModeState() {
    const editable = ['custom', 'category'].includes(getUserMode());

    document.getElementById('userSubscription').disabled = !editable;
    document.getElementById('userRuleProfile').disabled = !editable;
    document.getElementById('userPreferredRegion').disabled = !editable;
    document.getElementById('userRegionFallback').disabled =
      !editable || document.getElementById('userPreferredRegion').value === 'auto';
  }

  function updateGlobalRegionFallbackState() {
    document.getElementById('globalRegionFallback').disabled =
      document.getElementById('globalPreferredRegion').value === 'auto';
  }

  function isCurrentUserContext(userId, sequence) {
    return state.activeUserId === userId && state.userLoadSequence === sequence;
  }

  function setGlobalSubscriptionState(config) {
    if (config.enabled === false) return setSubscriptionChip(globalSubscriptionState, '已停用');
    if (config.subscriptionUrl) return setSubscriptionChip(globalSubscriptionState, '已设置');
    setSubscriptionChip(globalSubscriptionState, '未配置');
  }

  function setUserSubscriptionState(effective, override) {
    if (override && override.enabled === false) return setSubscriptionChip(userSubscriptionState, '已停用');
    if (override && override.subscriptionUrl) return setSubscriptionChip(userSubscriptionState, '单独订阅');
    if (override) return setSubscriptionChip(userSubscriptionState, '单独配置');
    if (effective && effective.subscriptionUrl) return setSubscriptionChip(userSubscriptionState, '跟随全局');
    setSubscriptionChip(userSubscriptionState, '未配置');
  }

  function setSubscriptionChip(element, text) {
    element.textContent = text;
    element.className = 'chip ' + subscriptionClass(text);
  }

  function createSubscriptionBadge(value) {
    const text = value || '未配置';
    return createTextElement('span', 'chip ' + subscriptionClass(text), text);
  }

  function subscriptionClass(value) {
    if (value === '已设置' || value === '跟随全局') return 'green';
    if (value === '单独订阅' || value === '分类订阅') return 'blue';
    if (value === '单独配置' || value === '私人定制') return 'orange';
    if (value === '已停用' || value === '停用') return 'gray';
    return 'red';
  }

  function aggregateUsers() {
    return state.users.reduce((totals, user) => {
      totals.devices += nonNegativeNumber(user.devices);
      totals.upload += nonNegativeNumber(user.uploadBytes);
      totals.download += nonNegativeNumber(user.downloadBytes);
      totals.anomalies += nonNegativeNumber(user.anomalies);
      return totals;
    }, { devices: 0, upload: 0, download: 0, anomalies: 0 });
  }

  function compareUserValue(a, b, key) {
    if (key === 'name') return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
    if (key === 'subscriptionState') return String(a.subscriptionState || '').localeCompare(String(b.subscriptionState || ''), 'zh-CN');
    if (key === 'lastSeenAt') return dateValue(a.lastSeenAt) - dateValue(b.lastSeenAt);
    if (key === 'totalBytes') return totalBytes(a) - totalBytes(b);
    return nonNegativeNumber(a[key]) - nonNegativeNumber(b[key]);
  }

  function totalBytes(user) {
    return nonNegativeNumber(user.uploadBytes) + nonNegativeNumber(user.downloadBytes);
  }

  function setStat(name, value, title) {
    document.querySelectorAll('[data-stat="' + name + '"]').forEach((element) => {
      element.textContent = value;
      element.title = title || value;
    });
  }

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function showToast(message, error) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle('is-error', Boolean(error));
    toast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
  }

  function createAnomalyReason(value) {
    const text = value === 'traffic_spike' || !value ? '流量突增' : String(value);
    return createTextElement('span', 'chip red', text);
  }

  function normalizeRuleProfile(value) {
    return value === 'subscription' ? 'subscription' : 'ruleset';
  }

  function normalizePreferredRegion(value) {
    return ['auto', 'jp', 'hk', 'tw', 'sg', 'us', 'kr'].includes(value) ? value : 'jp';
  }

  function normalizeRegionFallback(value) {
    return value === 'strict' ? 'strict' : 'global';
  }

  function positiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function nonNegativeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function dateValue(value) {
    const time = value ? new Date(value).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
  }

  function normalizeTrendPoint(value) {
    if (!value || typeof value !== 'object') return null;
    const key = typeof value.key === 'string' ? value.key : '';
    const label = typeof value.label === 'string' ? value.label : key;
    if (!key || !label) return null;
    return {
      key: key,
      label: label,
      uploadBytes: nonNegativeNumber(value.uploadBytes),
      downloadBytes: nonNegativeNumber(value.downloadBytes)
    };
  }

  function normalizeTrafficExpiry(value) {
    const time = dateValue(value);
    return time > 0 ? new Date(time).toISOString() : DEFAULT_TRAFFIC_EXPIRY;
  }

  function normalizeTrafficPeriodStart(value) {
    const time = dateValue(value);
    return time > 0 ? new Date(time).toISOString() : DEFAULT_TRAFFIC_PERIOD_START;
  }

  function shanghaiDateKey(value) {
    const time = value instanceof Date ? value.getTime() : dateValue(value);
    if (!Number.isFinite(time) || time <= 0) return '';
    return new Date(time + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  function formatShanghaiDateTime(value) {
    const time = dateValue(value);
    if (!time) return '—';
    const parts = new Date(time + 8 * 60 * 60 * 1000).toISOString();
    return parts.slice(0, 10).replace(/-/g, '/') + ' ' + parts.slice(11, 16);
  }

  function formatShanghaiDateTimeInput(value) {
    const time = dateValue(value);
    if (!time) return '';
    return new Date(time + 8 * 60 * 60 * 1000).toISOString().slice(0, 16);
  }

  function parseShanghaiDateTimeInput(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(value || '').trim());
    if (!match) return '';
    const time = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]) - 8, Number(match[5]));
    if (!Number.isFinite(time)) return '';
    const iso = new Date(time).toISOString();
    return formatShanghaiDateTimeInput(iso) === value ? iso : '';
  }

  function parseUserNoticeDuration(value) {
    const text = String(value || '').trim();
    if (!/^(?:0|[1-9]\d*)$/.test(text)) return null;
    const minutes = Number(text);
    if (
      !Number.isSafeInteger(minutes) ||
      minutes < USER_NOTICE_MIN_DURATION_MINUTES ||
      minutes > USER_NOTICE_MAX_DURATION_MINUTES ||
      minutes % USER_NOTICE_DURATION_STEP_MINUTES !== 0
    ) return null;
    return minutes;
  }

  function formatQuotaExpiryTitle(value) {
    const time = dateValue(value);
    if (!time) return '';
    const remaining = time - Date.now();
    if (remaining <= 0) return formatShanghaiDateTime(value) + ' · 已到期';
    const hours = Math.ceil(remaining / 3600000);
    return formatShanghaiDateTime(value) + ' · ' + (hours < 24 ? '剩余 ' + hours + ' 小时' : '剩余 ' + Math.ceil(hours / 24) + ' 天');
  }

  function formatBytes(value) {
    const bytes = Math.max(0, Number(value) || 0);
    if (bytes < 1024) return Math.round(bytes) + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < GIB) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes < GIB * 1024) return (bytes / GIB).toFixed(2) + ' GB';
    return (bytes / (GIB * 1024)).toFixed(2) + ' TB';
  }

  function formatCompactBytes(value) {
    const bytes = Math.max(0, Number(value) || 0);
    if (bytes < 1024) return Math.round(bytes) + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    if (bytes < GIB) return Math.round(bytes / 1048576) + ' MB';
    if (bytes < GIB * 1024) return (bytes / GIB).toFixed(bytes < GIB * 10 ? 1 : 0) + ' GB';
    return (bytes / (GIB * 1024)).toFixed(1) + ' TB';
  }

  function formatQuotaLimit(bytes) {
    const gb = bytes / GIB;
    return (Number.isInteger(gb) ? gb.toFixed(0) : gb.toFixed(2)) + ' GB';
  }

  function formatEditableGb(bytes) {
    const value = bytes / GIB;
    return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  }

  function formatPercent(value) {
    const percent = Number.isFinite(Number(value)) ? Math.min(100, Math.max(0, Number(value))) : 0;
    return percent.toFixed(1) + '%';
  }

  function formatTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '—';
    return date.toLocaleString('zh-CN', { hour12: false });
  }

  function formatAppVersion(value) {
    const version = typeof value === 'string' ? value.trim() : '';
    if (!version) return '未上报';
    return /^v/i.test(version) ? version : 'v' + version;
  }

  function formatShortTime(value) {
    const time = dateValue(value);
    if (!time) return '—';
    const parts = new Date(time + 8 * 60 * 60 * 1000).toISOString();
    return parts.slice(5, 10).replace('-', '/') + ' ' + parts.slice(11, 16);
  }

  function formatClockTime(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '—';
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function createRequestId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes).map((value) => value.toString(16).padStart(2, '0')).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
  }

  function createSvgIcon(name) {
    const allowed = new Set(['chevron-left', 'chevron-right']);
    const safeName = allowed.has(name) ? name : 'chevron-right';
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    icon.setAttribute('class', 'icon icon-sm');
    icon.setAttribute('aria-hidden', 'true');
    use.setAttribute('href', '#icon-' + safeName);
    icon.appendChild(use);
    return icon;
  }

  function appendSvgElement(parent, tagName, attributes, text) {
    const allowedTags = new Set(['g', 'line', 'text', 'path', 'circle']);
    const allowedAttributes = new Set(['class', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'd', 'text-anchor']);
    if (!allowedTags.has(tagName)) throw new Error('不支持的图表元素');
    const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
    Object.entries(attributes || {}).forEach(([name, value]) => {
      if (allowedAttributes.has(name)) element.setAttribute(name, String(value));
    });
    if (text !== undefined) element.textContent = String(text);
    parent.appendChild(element);
    return element;
  }

  function createTextElement(tagName, className, text) {
    const allowedTags = new Set(['button', 'i', 'option', 'p', 'span', 'strong']);
    if (!allowedTags.has(tagName)) throw new Error('不支持的界面元素');
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }

  function appendTableCell(row, text, className, title) {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    if (title) cell.title = String(title);
    if (text !== undefined) cell.textContent = String(text);
    row.appendChild(cell);
    return cell;
  }

  function appendEmptyTableRow(body, columnCount, message) {
    const row = document.createElement('tr');
    const cell = appendTableCell(row, message, 'empty-cell');
    cell.colSpan = columnCount;
    body.appendChild(row);
  }

  function createBarTrack(percent) {
    const track = createTextElement('span', 'bar-track');
    const fill = createTextElement('span', 'bar-fill');
    fill.style.width = Math.max(0, Math.min(100, Number(percent) || 0)) + '%';
    track.appendChild(fill);
    return track;
  }

  function parseJson(text) {
    if (!text) return null;
    try { return JSON.parse(text); } catch { return null; }
  }

  function formatApiError(status, data) {
    const error = data && data.error ? String(data.error) : '';
    if (status === 403) return error === 'admin disabled' ? '后台未启用管理' : '管理令牌不正确';
    if (status === 401) return '认证无效';
    if (status === 409) {
      if (error === 'category in use') return '该分类仍有订阅，请先调整订阅分类';
      if (error === 'category exists') return '分类名称已存在';
      if (error === 'subscription exists') return '该订阅链接已存在';
      if (error === 'subscription changed') return '订阅已修改，请重新同步';
      if (error === 'config conflict') return '用户配置存在冲突';
      if (error === 'name conflict') return 'ID 已被其他用户使用';
      if (error === 'profile request conflict') return '本次 ID 修改与已提交内容冲突';
      if (error === 'notice state changed') return '通知状态已变化，请刷新后重试';
      return '当前数据已变化，请刷新后重试';
    }
    if (status === 429) return '请求太频繁';
    if (status === 400) {
      if (error === 'invalid subscription url') return '订阅链接无效';
      if (error === 'invalid traffic limit') return '套餐额度无效';
      if (error === 'invalid traffic period start') return '开始时间无效';
      if (error === 'invalid traffic period') return '开始时间必须早于到期时间';
      if (error === 'invalid traffic expiry') return '流量到期时间无效';
      if (error === 'invalid traffic trend range') return '趋势范围无效';
      if (error === 'invalid name') return 'ID 无效';
      if (error === 'invalid notice message') return '通知内容无效';
      if (error === 'invalid notice expiry') return '通知到期时间无效';
      if (error === 'invalid notice tone') return '通知级别无效';
      if (error === 'invalid notice users') return '请选择要发送的用户';
      if (error === 'too many notice users') return '一次最多发给 200 人';
      if (error === 'unknown user') return '有用户已不存在，请刷新后重试';
      return '请求内容有误';
    }
    if (status === 404) return '接口不存在';
    if (error === 'subscription usage unavailable') return '订阅未提供流量信息';
    if (error === 'invalid subscription usage') return '订阅流量信息无效';
    if (error === 'subscription sync failed') return '订阅同步失败';
    if (status >= 500) return '后台暂时不可用';
    return '请求失败';
  }

  function formatAdminError(error) {
    return error instanceof Error && error.message ? error.message : '无法加载';
  }

  async function loadSubscriptions() {
    const data = await api('/api/admin/subscriptions');
    subscriptions = data.subscriptions || [];
    subscriptionCategories = data.categories || [];
    if (subscriptionCategory && !subscriptionCategories.includes(subscriptionCategory)) subscriptionCategory = '';
    const options = document.getElementById('subscriptionCategoryOptions');
    options.replaceChildren();
    subscriptionCategories.forEach((category) => {
      const option = document.createElement('option'); option.value = category; options.appendChild(option);
    });
    renderCategoryManager();
    renderSubscriptions();
    renderSubscriptionUsers();
    setStatus('');
  }

  function renderCategoryManager() {
    const rows = document.getElementById('subscriptionCategoryRows'); rows.replaceChildren();
    if (!subscriptionCategories.length) { rows.appendChild(createTextElement('p', '', '添加订阅时输入分类')); return; }
    subscriptionCategories.forEach((category) => {
      const row = document.createElement('div'); row.className = 'subscription-category-row';
      const input = document.createElement('input'); input.value = category; input.maxLength = 80;
      input.setAttribute('aria-label', '分类名称：' + category);
      const save = createTextElement('button', 'button secondary small', '保存'); save.type = 'button';
      save.addEventListener('click', () => runAction(save, '保存中', async () => {
        const newName = input.value.trim();
        if (!newName) throw new Error('请输入分类名称');
        await api('/api/admin/subscription-categories', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'rename', name: category, newName: newName }) });
        if (subscriptionCategory === category) subscriptionCategory = newName;
        await loadSubscriptions(); showToast('分类已更新');
      }));
      const remove = createTextElement('button', 'button secondary small', '删除'); remove.type = 'button';
      remove.addEventListener('click', () => runAction(remove, '删除中', async () => {
        if (!await askConfirm('确定删除分类“' + category + '”？', '删除')) return;
        await api('/api/admin/subscription-categories', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'delete', name: category }) });
        await loadSubscriptions(); showToast('分类已删除');
      }));
      row.append(input, save, remove); rows.appendChild(row);
    });
  }

  function renderSubscriptions() {
    const categories = document.getElementById('subscriptionCategories');
    categories.replaceChildren();
    [['', '全部订阅'], ...subscriptionCategories.map((category) => [category, category])].forEach(([value, label]) => {
      const count = value ? subscriptions.filter((item) => item.category === value).length : subscriptions.length;
      const button = createTextElement('button', value === subscriptionCategory ? 'is-active' : '', label + ' ' + count);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(value === subscriptionCategory));
      button.addEventListener('click', () => { subscriptionCategory = value; renderSubscriptions(); });
      categories.appendChild(button);
    });
    const search = document.getElementById('subscriptionSearch').value.trim().toLocaleLowerCase();
    const rows = document.getElementById('subscriptionRows');
    rows.replaceChildren();
    const filtered = subscriptions.filter((item) => (!subscriptionCategory || item.category === subscriptionCategory) &&
      (String(item.name) + ' ' + String(item.note)).toLocaleLowerCase().includes(search));
    if (!filtered.length) appendEmptyTableRow(rows, 6, subscriptions.length ? '没有符合条件的订阅' : '添加订阅后在这里查看');
    filtered.forEach((item) => {
      const row = document.createElement('tr');
      appendTableCell(row, item.name, 'subscription-name');
      appendTableCell(row, item.note || '—');
      const usage = appendTableCell(row);
      if (item.totalBytes === null || item.uploadBytes === null || item.downloadBytes === null) usage.textContent = '未同步';
      else {
        const used = item.uploadBytes + item.downloadBytes;
        usage.textContent = formatBytes(used) + ' / ' + formatBytes(item.totalBytes);
        const bar = document.createElement('progress');
        bar.max = Math.max(item.totalBytes, 1); bar.value = Math.min(used, bar.max);
        bar.setAttribute('aria-label', '已用流量'); usage.appendChild(bar);
      }
      appendTableCell(row, String(item.userCount));
      appendTableCell(row, formatTime(item.syncedAt));
      const actions = appendTableCell(row, undefined, 'subscription-actions');
      const sync = createTextElement('button', 'button secondary small', '同步'); sync.type = 'button';
      sync.addEventListener('click', () => runAction(sync, '同步中', async () => { await syncOneSubscription(item.id); await loadUsers(); await loadSubscriptions(); showToast('同步完成'); }));
      const edit = createTextElement('button', 'button secondary small', '编辑'); edit.type = 'button';
      edit.addEventListener('click', () => openSubscriptionForm(item));
      actions.append(sync, edit); rows.appendChild(row);
    });
  }

  function subscriptionExpiryBucket(user) {
    const expiry = dateValue(user.subscriptionExpiresAt);
    if (!expiry) return '未设置';
    const remaining = expiry - Date.now();
    if (remaining <= 0) return '已过期';
    if (remaining <= 86400000) return '24小时内';
    if (remaining <= 3 * 86400000) return '3天内';
    if (remaining <= 7 * 86400000) return '7天内';
    return '正常';
  }

  function renderSubscriptionUsers() {
    const summary = document.getElementById('subscriptionSummary');
    summary.replaceChildren();
    ['总数', '已过期', '24小时内', '3天内', '7天内', '未设置'].forEach((label) => {
      const count = label === '总数' ? state.users.length : state.users.filter((user) => subscriptionExpiryBucket(user) === label).length;
      const block = document.createElement('button');
      block.type = 'button';
      block.setAttribute('aria-pressed', String(subscriptionExpiryFilter === label));
      block.addEventListener('click', () => { subscriptionExpiryFilter = label; renderSubscriptionUsers(); });
      block.append(createTextElement('span', '', label), createTextElement('strong', '', String(count)));
      summary.appendChild(block);
    });
    const rows = document.getElementById('subscriptionUserRows'); rows.replaceChildren();
    const search = document.getElementById('subscriptionUserSearch').value.trim().toLocaleLowerCase();
    const direction = document.getElementById('subscriptionUserSort').value === 'desc' ? -1 : 1;
    const users = state.users.filter((user) => (subscriptionExpiryFilter === '总数' || subscriptionExpiryBucket(user) === subscriptionExpiryFilter) && [user.name, user.nickname, user.subscriptionName].join(' ').toLocaleLowerCase().includes(search))
      .sort((a, b) => { const left = dateValue(a.subscriptionExpiresAt), right = dateValue(b.subscriptionExpiresAt); return !left ? (!right ? 0 : 1) : !right ? -1 : (left - right) * direction; });
    if (!users.length) appendEmptyTableRow(rows, 8, '没有符合条件的用户');
    users.forEach((user) => {
      const row = document.createElement('tr');
      appendTableCell(row, user.nickname || '—'); appendTableCell(row, user.name || '—');
      appendTableCell(row, user.subscriptionName || '未匹配'); appendTableCell(row, '—');
      appendTableCell(row, user.subscriptionExpiresAt ? formatTime(user.subscriptionExpiresAt) : '未设置');
      appendTableCell(row, formatBytes(totalBytes(user))); appendTableCell(row, String(nonNegativeNumber(user.devices)));
      const cell = appendTableCell(row); const button = createTextElement('button', 'button secondary small', '查看');
      button.type = 'button'; button.addEventListener('click', () => openUserFromAnywhere(user)); cell.appendChild(button); rows.appendChild(row);
    });
  }

  function openSubscriptionForm(item) {
    editingSubscriptionId = item ? item.id : '';
    document.getElementById('subscriptionDialogTitle').textContent = item ? '编辑订阅' : '新增订阅';
    document.getElementById('subscriptionName').value = item ? item.name : '';
    document.getElementById('subscriptionCategory').value = item ? item.category : '';
    document.getElementById('subscriptionUrl').value = item ? item.url : '';
    document.getElementById('subscriptionNote').value = item ? item.note : '';
    document.getElementById('subscriptionDialog').showModal();
  }
  async function syncOneSubscription(id) {
    await api('/api/admin/subscriptions/' + encodeURIComponent(id) + '/sync', { method: 'POST' });
  }
  document.querySelectorAll('[data-subscription-view]').forEach((button) => button.addEventListener('click', () => {
    const dashboard = button.dataset.subscriptionView === 'dashboard';
    document.getElementById('subscriptionCatalog').hidden = dashboard;
    document.getElementById('subscriptionDashboard').hidden = !dashboard;
    document.getElementById('addSubscription').hidden = dashboard;
    document.querySelectorAll('[data-subscription-view]').forEach((tab) => tab.setAttribute('aria-selected', String(tab === button)));
    if (dashboard) renderSubscriptionUsers();
  }));
  document.getElementById('addSubscription').addEventListener('click', () => openSubscriptionForm(null));
  document.getElementById('manageSubscriptionCategories').addEventListener('click', (event) => {
    const manager = document.getElementById('subscriptionCategoryManager');
    manager.hidden = !manager.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(!manager.hidden));
  });
  document.getElementById('cancelSubscription').addEventListener('click', () => document.getElementById('subscriptionDialog').close());
  document.getElementById('subscriptionSearch').addEventListener('input', renderSubscriptions);
  document.getElementById('subscriptionUserSearch').addEventListener('input', renderSubscriptionUsers);
  document.getElementById('subscriptionUserSort').addEventListener('change', renderSubscriptionUsers);
  document.getElementById('subscriptionForm').addEventListener('submit', (event) => {
    event.preventDefault();
    runAction(document.getElementById('saveSubscription'), '保存中', async () => {
      const body = { name: document.getElementById('subscriptionName').value, category: document.getElementById('subscriptionCategory').value,
        url: document.getElementById('subscriptionUrl').value, note: document.getElementById('subscriptionNote').value };
      await api('/api/admin/subscriptions' + (editingSubscriptionId ? '/' + encodeURIComponent(editingSubscriptionId) : ''),
        { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      document.getElementById('subscriptionDialog').close(); await loadUsers(); await loadSubscriptions(); showToast('已保存');
    });
  });
  document.getElementById('syncAllSubscriptions').addEventListener('click', (event) => runAction(event.currentTarget, '同步中', async () => {
    let failures = 0;
    for (const item of subscriptions) { try { await syncOneSubscription(item.id); } catch { failures++; } }
    await Promise.all([loadUsers(), loadSubscriptions()]);
    showToast(failures ? '同步失败 ' + failures + ' 项' : '同步完成', Boolean(failures));
  }));

  setView('overview');
})();
`;
