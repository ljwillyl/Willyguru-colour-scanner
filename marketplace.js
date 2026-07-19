'use strict';

(() => {
  const BUCKET = window.KUBROW_CONFIG.storageBucket;
  const ACTIVE_STATUSES = ['for_sale', 'open_to_offers', 'reserved'];
  const FAVOURITES_KEY = 'kubrow-companion-market-favourites';
  const PUBLIC_LISTING_COLUMNS = [
    'id', 'kdna_id', 'name', 'companion_type', 'breed', 'pattern', 'build_type',
    'primary_colour', 'secondary_colour', 'tertiary_colour', 'eye_colour', 'accent_colour',
    'verification_source', 'imprints_remaining', 'gender', 'trade_status', 'asking_price',
    'listing_notes', 'screenshot_path', 'created_at', 'is_public'
  ].join(',');

  const $ = (id) => document.getElementById(id);
  const client = window.KubrowApp?.getSupabaseClient();
  let records = [];
  let signedImages = {};
  let marketSession = null;
  let ownKennel = [];
  let favourites = readFavourites();
  let toastTimer = null;

  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  const pretty = (value) => String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  function readFavourites() {
    try {
      const value = JSON.parse(localStorage.getItem(FAVOURITES_KEY) || '[]');
      return new Set(Array.isArray(value) ? value.map(String) : []);
    } catch {
      return new Set();
    }
  }

  function saveFavourites() {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify([...favourites]));
    updateFavouriteCount();
  }

  function updateFavouriteCount() {
    if ($('favouriteCount')) $('favouriteCount').textContent = favourites.size;
  }

  function showToast(text) {
    const toast = $('marketToast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = text;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
  }

  function setMessage(text, type = '') {
    const host = $('message');
    if (!host) return;
    host.className = `message marketplaceMessage ${type}`.trim();
    host.innerHTML = text;
  }

  function dnaUrl(record) {
    return `dna.html?id=${encodeURIComponent(record.kdna_id || record.id)}`;
  }

  function statusLabel(status) {
    return { for_sale: 'For sale', open_to_offers: 'Open to offers', reserved: 'Reserved' }[status] || pretty(status);
  }

  function priceLabel(record) {
    if (record.asking_price === null || record.asking_price === undefined || record.asking_price === '') {
      return record.trade_status === 'open_to_offers' ? 'Offers invited' : 'Price not listed';
    }
    return `${Number(record.asking_price).toLocaleString()}`;
  }

  function searchText(record) {
    return [record.name, record.kdna_id, record.breed, record.pattern, record.build_type,
      record.primary_colour, record.secondary_colour, record.tertiary_colour,
      record.eye_colour, record.accent_colour, record.companion_type, record.listing_notes]
      .filter(Boolean).join(' ').toLowerCase();
  }

  function rarityScore(record) {
    let score = 0;
    if (record.verification_source === 'screenshot') score += 3;
    if (String(record.pattern).toLowerCase() === 'lotus') score += 3;
    if (String(record.build_type).toLowerCase() === 'bulky') score += 2;
    if (String(record.companion_type).toLowerCase() === 'hybrid') score += 4;
    if (record.accent_colour) score += 1;
    return score;
  }

  function filteredRecords() {
    const query = $('search').value.trim().toLowerCase();
    const status = $('status').value;
    const breed = $('breed').value;
    const pattern = $('pattern').value;
    const build = $('build').value;
    const sort = $('sort').value;
    const verifiedOnly = $('verifiedOnly').checked;
    const favouritesOnly = $('favouritesOnly').checked;

    const result = records.filter((record) => {
      if (query && !searchText(record).includes(query)) return false;
      if (status && record.trade_status !== status) return false;
      if (breed && record.breed !== breed) return false;
      if (pattern && record.pattern !== pattern) return false;
      if (build && record.build_type !== build) return false;
      if (verifiedOnly && record.verification_source !== 'screenshot') return false;
      if (favouritesOnly && !favourites.has(String(record.id))) return false;
      return true;
    });

    result.sort((a, b) => {
      if (sort === 'price_low') return (a.asking_price ?? Number.MAX_SAFE_INTEGER) - (b.asking_price ?? Number.MAX_SAFE_INTEGER);
      if (sort === 'price_high') return (b.asking_price ?? -1) - (a.asking_price ?? -1);
      if (sort === 'rare') return rarityScore(b) - rarityScore(a);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
    return result;
  }

  function colourValue(name) {
    const value = String(name || '').trim().toLowerCase();
    const named = {
      black: '#101319', white: '#e8edf2', grey: '#7d8792', gray: '#7d8792',
      red: '#b9434b', orange: '#d9803d', yellow: '#d6b64c', gold: '#c9a54d',
      green: '#4f9c67', emerald: '#2f9d77', lime: '#8ebd58', blue: '#4c77bd',
      navy: '#293e70', cyan: '#4ba7ae', teal: '#367f7d', purple: '#76539c',
      violet: '#7b58a8', pink: '#c66f91', brown: '#79553e', tan: '#aa815b',
      cream: '#d6c6a3', beige: '#b7a17f', silver: '#aeb8c4'
    };
    const exact = Object.keys(named).find((key) => value.includes(key));
    if (exact) return named[exact];
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) hash = value.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360} 34% 48%)`;
  }

  function colourCell(label, value) {
    return `<div class="marketColour"><div class="marketColourTop"><span class="marketSwatch" style="background:${colourValue(value)}"></span><small>${esc(label)}</small></div><strong title="${esc(value || 'Unknown')}">${esc(value || 'Unknown')}</strong></div>`;
  }

  function populateSelect(id, values, placeholder) {
    const select = $(id);
    const current = select.value;
    const options = [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
    select.innerHTML = `<option value="">${placeholder}</option>${options.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`).join('')}`;
    if (options.includes(current)) select.value = current;
  }

  function render() {
    const visible = filteredRecords();
    $('count').textContent = visible.length;
    $('priced').textContent = visible.filter((r) => r.asking_price !== null && r.asking_price !== undefined).length;
    $('offers').textContent = visible.filter((r) => r.trade_status === 'open_to_offers').length;
    $('resultSummary').textContent = `${visible.length} ${visible.length === 1 ? 'result' : 'results'}`;
    updateFavouriteCount();

    if (!records.length) {
      setMessage('', 'empty');
      $('grid').innerHTML = `<div class="marketEmpty"><div class="marketEmptyInner"><div class="marketEmptyMark">K</div><h3>No Kubrows are listed yet</h3><p>Be the first breeder to place a companion in the community marketplace. Publish one directly from your kennel.</p><a class="button" href="kennel.html">Open My Kennel</a></div></div>`;
      return;
    }
    if (!visible.length) {
      $('grid').innerHTML = '';
      setMessage('<strong>No listings match these filters.</strong><span>Clear one or more filters and try again.</span>', 'empty');
      return;
    }

    setMessage('', 'ready');
    $('grid').innerHTML = visible.map((record) => {
      const image = signedImages[record.id];
      const type = pretty(record.companion_type || 'kubrow');
      const traits = [type, record.breed, record.pattern, record.build_type].filter(Boolean).join(' · ');
      const isSaved = favourites.has(String(record.id));
      const verified = record.verification_source === 'screenshot';
      const price = priceLabel(record);
      const priceMarkup = record.asking_price === null || record.asking_price === undefined
        ? `<strong class="marketPrice">${esc(price)}</strong>`
        : `<strong class="marketPrice">${esc(price)}<small>Platinum</small></strong>`;

      return `<article class="marketCard" data-record-id="${esc(record.id)}">
        <div class="marketImage">
          ${image ? `<img src="${esc(image)}" alt="Appearance screenshot for ${esc(record.name)}" loading="lazy">` : '<div class="marketPlaceholder"><span>W</span><small>No screenshot available</small></div>'}
          <span class="marketStatus ${esc(record.trade_status)}">${esc(statusLabel(record.trade_status))}</span>
          <button class="marketFavourite ${isSaved ? 'isSaved' : ''}" data-favourite="${esc(record.id)}" aria-label="${isSaved ? 'Remove from' : 'Add to'} favourites" aria-pressed="${isSaved}">${isSaved ? '♥' : '♡'}</button>
        </div>
        <div class="marketBody">
          <div class="marketTitleRow"><div><div class="eyebrow">${esc(record.kdna_id || 'DNA pending')}</div><h2>${esc(record.name || 'Unnamed companion')}</h2></div>${priceMarkup}</div>
          <p class="marketTraits">${esc(traits || 'Traits not recorded')}</p>
          <div class="marketBadges">
            ${verified ? '<span class="kc-badge kc-badge--verified">✓ Palette verified</span>' : '<span class="kc-badge">Manual record</span>'}
            ${record.pattern ? `<span class="kc-badge">${esc(record.pattern)}</span>` : ''}
            ${record.build_type ? `<span class="kc-badge">${esc(record.build_type)}</span>` : ''}
          </div>
          <div class="marketColours">${colourCell('Primary', record.primary_colour)}${colourCell('Secondary', record.secondary_colour)}${colourCell('Tertiary', record.tertiary_colour)}</div>
          ${record.listing_notes ? `<p class="marketListingNotes">${esc(record.listing_notes)}</p>` : ''}
          <div class="marketMeta"><span>${record.imprints_remaining ?? 'Unknown'} imprints</span>${record.gender ? `<span>${esc(record.gender)}</span>` : ''}<span>${esc(statusLabel(record.trade_status))}</span></div>
          <div class="marketActions"><a class="button" href="${dnaUrl(record)}">View DNA profile</a><button class="marketIconButton" data-share="${esc(record.id)}" aria-label="Share listing">↗</button></div>
        </div>
      </article>`;
    }).join('');
  }

  async function signImages(rows) {
    signedImages = {};
    await Promise.all(rows.filter((row) => row.screenshot_path).map(async (row) => {
      try {
        const { data, error } = await client.storage.from(BUCKET).createSignedUrl(row.screenshot_path, 3600);
        if (!error && data?.signedUrl) signedImages[row.id] = data.signedUrl;
      } catch (error) { console.warn('Marketplace image could not be signed', error); }
    }));
  }

  async function loadMarketplace() {
    if (!client) {
      setMessage('<strong>Marketplace could not start.</strong><span>The Supabase library did not load.</span><button id="retryMarketplace" class="ghost">Retry</button>', 'error');
      $('retryMarketplace')?.addEventListener('click', loadMarketplace);
      return;
    }
    setMessage('<span class="marketSpinner" aria-hidden="true"></span><strong>Loading marketplace…</strong><span>Fetching active public listings.</span>', 'loading');
    $('grid').innerHTML = '';
    try {
      const { data, error } = await client.from('kennel_kubrows').select(PUBLIC_LISTING_COLUMNS)
        .eq('is_public', true).in('trade_status', ACTIVE_STATUSES).order('created_at', { ascending: false });
      if (error) throw error;
      records = data || [];
      populateSelect('breed', records.map((r) => r.breed), 'All breeds');
      populateSelect('pattern', records.map((r) => r.pattern), 'All patterns');
      await signImages(records);
      render();
    } catch (error) {
      console.error('Marketplace load failed:', error);
      records = []; signedImages = {};
      ['count', 'priced', 'offers'].forEach((id) => { $(id).textContent = '0'; });
      setMessage(`<strong>Marketplace failed to load.</strong><span>${esc(error.message || 'The database request could not be completed.')}</span><button id="retryMarketplace" class="ghost">Try again</button>`, 'error');
      $('retryMarketplace')?.addEventListener('click', loadMarketplace);
    }
  }

  function toggleFavourite(id) {
    const key = String(id);
    if (favourites.has(key)) { favourites.delete(key); showToast('Removed from favourites'); }
    else { favourites.add(key); showToast('Saved to favourites'); }
    saveFavourites(); render();
  }

  async function shareRecord(id) {
    const record = records.find((item) => String(item.id) === String(id));
    if (!record) return;
    const url = new URL(dnaUrl(record), window.location.href).href;
    const shareData = { title: `${record.name || 'Kubrow'} · Kubrow Companion`, text: `View ${record.name || 'this Kubrow'} on Kubrow Companion`, url };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(url); showToast('DNA profile link copied'); }
    } catch (error) {
      if (error?.name !== 'AbortError') showToast('Could not share this listing');
    }
  }

  const listingActive = (record) => ACTIVE_STATUSES.includes(record?.trade_status);
  function setSellMessage(text, type = '') { const el = $('marketSellMessage'); el.textContent = text; el.className = `message ${type}`.trim(); }
  function closeMarketSell() { $('marketSellModal').hidden = true; document.body.classList.remove('modalOpen'); }
  async function openMarketSell() {
    $('marketSellModal').hidden = false; document.body.classList.add('modalOpen'); setSellMessage('');
    const { data } = await client.auth.getSession(); marketSession = data.session;
    $('marketAuthView').hidden = !!marketSession; $('marketPickerView').hidden = !marketSession;
    if (marketSession) await loadOwnKennel();
  }
  async function loadOwnKennel() {
    setSellMessage('Loading your kennel…');
    const { data, error } = await client.from('kennel_kubrows').select('*').eq('owner_id', marketSession.user.id).order('name');
    if (error) return setSellMessage(error.message, 'bad');
    ownKennel = data || [];
    if (!ownKennel.length) { $('marketPickerView').hidden = true; return setSellMessage('Your kennel is empty. Add a Kubrow in My Kennel first.', 'warn'); }
    $('marketKubrowPicker').innerHTML = ownKennel.map((r) => `<option value="${esc(r.id)}">${esc(r.name)}${listingActive(r) ? ' — listed' : ''}</option>`).join('');
    $('marketPickerView').hidden = false; updateMarketPicker(); setSellMessage('');
  }
  function updateMarketPicker() {
    const r = ownKennel.find((x) => String(x.id) === String($('marketKubrowPicker').value)); if (!r) return;
    $('marketSelectedSummary').innerHTML = `<strong>${esc(r.name)}</strong><span>${esc([r.breed, r.pattern, r.build_type].filter(Boolean).join(' · ') || 'Traits not recorded')}</span>`;
    $('marketTradeStatus').value = listingActive(r) ? r.trade_status : 'for_sale'; $('marketAskingPrice').value = r.asking_price ?? ''; $('marketListingNotes').value = r.listing_notes || '';
    $('marketPublishListing').textContent = listingActive(r) ? 'Save listing' : 'Publish listing'; $('marketRemoveListing').hidden = !listingActive(r);
  }

  $('sellKubrowButton')?.addEventListener('click', openMarketSell);
  document.querySelectorAll('[data-market-close]').forEach((el) => el.addEventListener('click', closeMarketSell));
  $('marketKubrowPicker')?.addEventListener('change', updateMarketPicker);
  $('marketSignIn')?.addEventListener('click', async () => {
    setSellMessage('Signing in…');
    const { data, error } = await client.auth.signInWithPassword({ email: $('marketEmail').value.trim(), password: $('marketPassword').value });
    if (error) return setSellMessage(error.message, 'bad'); marketSession = data.session; $('marketAuthView').hidden = true; await loadOwnKennel();
  });
  $('marketPublishListing')?.addEventListener('click', async () => {
    const id = $('marketKubrowPicker').value; const status = $('marketTradeStatus').value; const price = $('marketAskingPrice').value === '' ? null : Number($('marketAskingPrice').value);
    if (status === 'for_sale' && price === null) return setSellMessage('Enter a price or choose Open to offers.', 'bad');
    setSellMessage('Publishing listing…');
    const { error } = await client.from('kennel_kubrows').update({ is_public: true, trade_status: status, asking_price: price, listing_notes: $('marketListingNotes').value.trim() || null }).eq('id', id).eq('owner_id', marketSession.user.id);
    if (error) return setSellMessage(error.message, 'bad'); setSellMessage('Listing published.', 'good'); await Promise.all([loadOwnKennel(), loadMarketplace()]);
  });
  $('marketRemoveListing')?.addEventListener('click', async () => {
    const id = $('marketKubrowPicker').value; if (!confirm('Remove this Kubrow from the Marketplace?')) return;
    const { error } = await client.from('kennel_kubrows').update({ trade_status: 'not_for_sale', asking_price: null, listing_notes: null }).eq('id', id).eq('owner_id', marketSession.user.id);
    if (error) return setSellMessage(error.message, 'bad'); setSellMessage('Listing removed.', 'good'); await Promise.all([loadOwnKennel(), loadMarketplace()]);
  });

  ['search', 'status', 'breed', 'pattern', 'build', 'sort', 'verifiedOnly', 'favouritesOnly'].forEach((id) => {
    $(id)?.addEventListener(id === 'search' ? 'input' : 'change', render);
  });
  const filterPanel = document.querySelector('.marketFilters');
  $('toggleFilters')?.addEventListener('click', () => {
    const open = filterPanel?.classList.toggle('filtersOpen') || false;
    $('toggleFilters').setAttribute('aria-expanded', String(open));
  });

  $('clearFilters')?.addEventListener('click', () => {
    $('search').value = ''; $('status').value = ''; $('breed').value = ''; $('pattern').value = ''; $('build').value = ''; $('sort').value = 'newest'; $('verifiedOnly').checked = false; $('favouritesOnly').checked = false; render();
  });
  $('grid')?.addEventListener('click', (event) => {
    const favourite = event.target.closest('[data-favourite]'); if (favourite) { toggleFavourite(favourite.dataset.favourite); return; }
    const share = event.target.closest('[data-share]'); if (share) shareRecord(share.dataset.share);
  });

  window.addEventListener('online', loadMarketplace);
  updateFavouriteCount();
  loadMarketplace();
})();
