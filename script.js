document.addEventListener('DOMContentLoaded', () => {
  // --- CONFIGURATION ---
  const DATA_URL = 'https://masud.eu.org/start-page/data.json';
  const CACHE_KEY_DATA = 'liquid_glass_bookmarks';
  const CACHE_KEY_WEATHER = 'liquid_glass_weather';
  const WEATHER_TTL = 3600000; // 1 hour in ms
  
  // Open-Meteo API for Dhaka, Bangladesh (Requires no API Key, highly reliable)
  const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=23.8103&longitude=90.4125&current=temperature_2m&timezone=Asia%2FDhaka';

  // Global State
  let sitesData = [];

  // --- 1. CLOCK & DATE ---
  const clockEl = document.getElementById('clock');
  const dateEl = document.getElementById('date');

  function updateTime() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/ AM| PM/, '');
    dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
  updateTime();
  setInterval(updateTime, 1000);

  // --- 2. WEATHER (BANGLADESH) ---
  async function loadWeather() {
    const weatherText = document.getElementById('weather-text');
    
    // Check Cache
    const cached = localStorage.getItem(CACHE_KEY_WEATHER);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < WEATHER_TTL) {
        weatherText.textContent = `☀ ${parsed.temp}°C · Bangladesh`;
        return; // Use valid cache
      }
    }

    try {
      const response = await fetch(WEATHER_URL);
      if (!response.ok) throw new Error('Weather API error');
      
      const data = await response.json();
      const temp = Math.round(data.current.temperature_2m);
      
      // Update Cache
      localStorage.setItem(CACHE_KEY_WEATHER, JSON.stringify({ temp, timestamp: Date.now() }));
      
      // Update UI
      weatherText.style.opacity = '0';
      setTimeout(() => {
        weatherText.textContent = `☀ ${temp}°C · Bangladesh`;
        weatherText.style.opacity = '1';
      }, 300);
      
    } catch (err) {
      console.warn("Weather fetch failed, degrading gracefully.", err);
      // If API fails but we have stale cache, show stale cache. Otherwise, fallback string.
      if (cached) {
         weatherText.textContent = `☀ ${JSON.parse(cached).temp}°C · Bangladesh`;
      } else {
         weatherText.textContent = 'Bangladesh'; // Clean fallback
      }
    }
  }
  loadWeather();

  // --- 3. DATA FETCHING & NORMALIZATION ---
  async function loadBookmarks() {
    const grid = document.getElementById('favorites-grid');
    
    // Attempt to load from cache first for instant UI
    const cachedData = localStorage.getItem(CACHE_KEY_DATA);
    if (cachedData) {
      try {
        sitesData = JSON.parse(cachedData);
        renderBookmarks(sitesData, grid);
        updateCommandPalette(sitesData);
      } catch (e) {
        console.warn("Cache parse failed", e);
      }
    }

    // Fetch fresh data asynchronously
    try {
      const response = await fetch(DATA_URL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const rawData = await response.json();
      
      // Normalize JSON (Handle if it's an array directly, or nested inside an object)
      const extractedArray = Array.isArray(rawData) ? rawData : (rawData.bookmarks || rawData.data || rawData.sites || Object.values(rawData)[0]);
      
      if (!Array.isArray(extractedArray)) {
        throw new Error('Could not identify array of websites in JSON structure.');
      }

      const normalizedData = extractedArray.map(item => ({
        name: item.name || item.title || extractDomain(item.url) || 'Site',
        title: item.title || item.description || item.name || '',
        url: validateUrl(item.url),
        icon: item.icon || item.logo || '', // Will handle fallbacks in renderer
        category: item.category || 'General'
      })).filter(item => item.url !== '#'); // Filter out invalid URLs

      // Check if data actually changed to prevent unnecessary DOM reflows
      if (JSON.stringify(normalizedData) !== JSON.stringify(sitesData)) {
        sitesData = normalizedData;
        localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(sitesData));
        renderBookmarks(sitesData, grid);
        updateCommandPalette(sitesData);
      }

    } catch (err) {
      console.error("Failed to fetch JSON bookmarks:", err);
      if (sitesData.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-secondary); text-align:center; grid-column:1/-1;">Unable to load favorites.</p>';
      }
    }
  }

  // --- 4. RENDERERS ---
  function renderBookmarks(data, container) {
    container.innerHTML = ''; // Clear skeletons/old data
    
    data.forEach(site => {
      const a = document.createElement('a');
      a.href = site.url;
      a.className = 'favorite-card glass-secondary';
      a.title = site.title; // Native subtle tooltip

      // Icon Wrapper
      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'fav-icon-wrapper';
      
      // Attempt image, use text fallback on error
      const img = document.createElement('img');
      img.className = 'fav-icon-img';
      img.alt = ''; // Decorative
      img.loading = 'lazy'; // Performance on large sets
      
      const fallback = document.createElement('div');
      fallback.className = 'fav-fallback';
      fallback.textContent = site.name.charAt(0).toUpperCase();
      fallback.style.display = 'none';

      // Robust image error handling
      img.onerror = () => {
        img.style.display = 'none';
        fallback.style.display = 'flex';
      };

      // Set source (try JSON provided, fallback to favicon service)
      img.src = site.icon || `https://icon.horse/icon/${getHostname(site.url)}`;

      iconWrapper.appendChild(img);
      iconWrapper.appendChild(fallback);

      // Name Label
      const name = document.createElement('span');
      name.className = 'fav-name';
      name.textContent = site.name;

      a.appendChild(iconWrapper);
      a.appendChild(name);
      container.appendChild(a);
    });
  }

  function updateCommandPalette(data) {
    const list = document.getElementById('palette-actions');
    list.innerHTML = ''; // Reset

    // Settings / Native commands first
    const nativeCmds = [
      { name: "Settings", action: () => alert("Settings toggled") },
      { name: "Appearance", action: () => alert("Appearance toggled") }
    ];

    nativeCmds.forEach(cmd => {
      const li = document.createElement('li');
      li.className = 'palette-item';
      li.tabIndex = 0;
      li.innerHTML = `<div class="palette-item-icon">⚙</div> <span>${cmd.name}</span>`;
      li.addEventListener('click', cmd.action);
      li.addEventListener('keydown', (e) => { if(e.key === 'Enter') cmd.action(); });
      list.appendChild(li);
    });

    // Inject JSON Data
    data.forEach(site => {
      const a = document.createElement('a');
      a.className = 'palette-item palette-site-item';
      a.href = site.url;
      a.tabIndex = 0;
      
      const firstLetter = site.name.charAt(0).toUpperCase();
      a.innerHTML = `<div class="palette-item-icon">${firstLetter}</div> <span>${site.name}</span> <span style="color:var(--text-tertiary); font-size:0.85em; margin-left:auto;">${site.category}</span>`;
      
      list.appendChild(a);
    });
  }

  // --- 5. SEARCH & COMMAND PALETTE LOGIC ---
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    if (/^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-.\/?%&=]*)?$/i.test(query)) {
      window.location.href = query.startsWith('http') ? query : `https://${query}`;
    } else {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
  });

  // OS Hint
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  document.getElementById('shortcut-hint').textContent = isMac ? '⌘K' : 'Ctrl+K';

  // Command Palette interactions
  const commandPalette = document.getElementById('command-palette');
  const paletteInput = document.getElementById('palette-input');

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (commandPalette.hasAttribute('open')) {
        commandPalette.removeAttribute('open');
        searchInput.focus();
      } else {
        commandPalette.setAttribute('open', '');
        paletteInput.value = '';
        filterPalette(''); // Reset filter
        paletteInput.focus();
      }
    }
    if (e.key === 'Escape' && commandPalette.hasAttribute('open')) {
      commandPalette.removeAttribute('open');
      searchInput.focus();
    }
  });

  // Palette Filtering
  paletteInput.addEventListener('input', (e) => {
    filterPalette(e.target.value.toLowerCase());
  });

  function filterPalette(query) {
    const items = document.querySelectorAll('.palette-item');
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(query) ? 'flex' : 'none';
    });
  }

  // --- UTILS ---
  function validateUrl(url) {
    if (!url) return '#';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }
  
  function getHostname(url) {
    try { return new URL(url).hostname; } catch(e) { return url; }
  }

  function extractDomain(url) {
    if(!url) return 'Website';
    let domain = getHostname(url);
    return domain.replace('www.', '').split('.')[0]; 
  }

  // Initialize Data
  loadBookmarks();
});
