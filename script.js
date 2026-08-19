document.addEventListener('DOMContentLoaded', () => {
  // --- 1. DETECT OS FOR SHORTCUT HINT ---
  const hintEl = document.getElementById('shortcut-hint');
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  hintEl.textContent = isMac ? '⌘K' : 'Ctrl+K';

  // --- 2. TIME, DATE & GREETING ---
  const clockEl = document.getElementById('clock');
  const dateEl = document.getElementById('date');
  const greetingEl = document.getElementById('greeting');

  function updateTime() {
    const now = new Date();
    
    // Time
    clockEl.textContent = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    }).replace(' AM', '').replace(' PM', ''); // Remove AM/PM for cleaner look

    // Date
    dateEl.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });

    // Greeting
    const hour = now.getHours();
    let greeting = 'Good evening';
    if (hour >= 5 && hour < 12) greeting = 'Good morning';
    else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    else if (hour >= 22 || hour < 5) greeting = 'Good night';
    
    // Add subtlety rather than high-energy exclamation
    greetingEl.textContent = `${greeting}.`;
  }
  
  updateTime();
  setInterval(updateTime, 1000); // Update every second

  // --- 3. SEARCH LOGIC ---
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    // Basic URL regex detection
    const urlPattern = /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-.\/?%&=]*)?$/i;
    
    if (urlPattern.test(query)) {
      // If it's a URL, navigate directly
      const url = query.startsWith('http') ? query : `https://${query}`;
      window.location.href = url;
    } else {
      // Otherwise, perform web search (Defaulted to Google, change as needed)
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
  });

  // --- 4. FAVORITES RENDERER (MOCK / LOCALSTORAGE READY) ---
  const favoritesGrid = document.getElementById('favorites-grid');
  
  // You can replace this array with a localStorage parse in your existing app
  const defaultFavorites = [
    { name: 'Google', url: 'https://google.com', icon: 'G' },
    { name: 'YouTube', url: 'https://youtube.com', icon: 'Y' },
    { name: 'GitHub', url: 'https://github.com', icon: 'Gt' },
    { name: 'Reddit', url: 'https://reddit.com', icon: 'R' },
    { name: 'ChatGPT', url: 'https://chat.openai.com', icon: 'C' }
  ];

  defaultFavorites.forEach(fav => {
    const a = document.createElement('a');
    a.href = fav.url;
    a.className = 'favorite-card glass-secondary';
    
    const icon = document.createElement('div');
    icon.className = 'fav-icon';
    icon.textContent = fav.icon; // Using text for simplicity; replace with SVGs
    
    const name = document.createElement('span');
    name.className = 'fav-name';
    name.textContent = fav.name;

    a.appendChild(icon);
    a.appendChild(name);
    favoritesGrid.appendChild(a);
  });

  // --- 5. COMMAND PALETTE (Ctrl+K / Cmd+K) ---
  const commandPalette = document.getElementById('command-palette');
  const paletteInput = document.getElementById('palette-input');

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault(); // Prevent browser search bar focus
      
      if (commandPalette.hasAttribute('open')) {
        commandPalette.removeAttribute('open');
        searchInput.focus(); // Return focus to main search
      } else {
        commandPalette.setAttribute('open', '');
        paletteInput.focus();
      }
    }
    
    // Close palette on Escape
    if (e.key === 'Escape' && commandPalette.hasAttribute('open')) {
      commandPalette.removeAttribute('open');
      searchInput.focus();
    }
  });

  // --- 6. SUBTLE POINTER LIQUID INTERACTION (Desktop Only) ---
  // A subtle trick: we move a radial gradient mask variable on the main glass container
  const glassPrimary = document.querySelector('.search-container');
  
  // Only apply on hover capable devices to save battery/performance on mobile
  if (window.matchMedia("(hover: hover)").matches) {
    document.addEventListener('mousemove', (e) => {
      // We calculate the mouse position relative to the search bar to create a soft reflection
      const rect = glassPrimary.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Update CSS variables for a subtle hover glow (can be tied to background properties)
      glassPrimary.style.setProperty('--mouse-x', `${x}px`);
      glassPrimary.style.setProperty('--mouse-y', `${y}px`);
    });
  }
});
