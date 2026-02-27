// Telegram Web App initialization
let tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

// Global variables
let currentUser = null;
let currentTrack = null;
let audioPlayer = null;
let currentPlaylist = [];
let currentPlaylistIndex = -1;
let isPlaying = false;
let isShuffled = false;
let isRepeating = false;
let searchTimeout = null;
let currentLanguage = 'uz';
let pullToRefreshEnabled = true;
let touchStartY = 0;

// Translations
const translations = {
    uz: {
        home: "Bosh sahifa",
        search: "Qidirish",
        favorites: "Sevimlilar",
        playlists: "Playlistlar",
        recent: "Oxirgi eshitilgan",
        settings: "Sozlamalar",
        welcome: "Xush kelibsiz!",
        welcomeText: "Yangi musiqa kashf eting va sevimli qo'shiqlaringizdan zavqlaning",
        searchMusic: "Musiqa qidirish",
        topHits: "Top hitlar",
        recentlyPlayed: "Oxirgi eshitilgan",
        yourFavorites: "Sevimlilar",
        yourPlaylists: "Playlistlar",
        newPlaylist: "Yangi playlist",
        language: "Til",
        audioQuality: "Audio sifati",
        theme: "Mavzu",
        autoPlay: "Avtomatik ijro",
        shuffle: "Aralashtirish",
        repeat: "Takrorlash",
        exportData: "Ma'lumotlarni eksport qilish",
        downloadData: "Ma'lumotlarni yuklab olish",
        low: "Past",
        medium: "O'rta",
        high: "Yuqori",
        light: "Yorug'",
        dark: "Qorong'i",
        system: "Tizim",
        nowPlaying: "Ijro etilmoqda",
        addToPlaylist: "Playlistga qo'shish",
        searchPlaceholder: "Qo'shiq yoki ijrochi nomini kiriting...",
        noResults: "Hech narsa topilmadi",
        loading: "Yuklanmoqda...",
        error: "Xatolik yuz berdi",
        success: "Muvaffaqiyatli",
        addedToFavorites: "Sevimlilarga qo'shildi",
        removedFromFavorites: "Sevimlilardan olib tashlandi",
        addedToPlaylist: "Playlistga qo'shildi",
        shareTrack: "Qo'shiq ulashildi",
        downloadTrack: "Yuklab olinmoqda",
        sendToBot: "Botga yuborish",
        nextTrack: "Keyingi qo'shiq",
        previousTrack: "Oldingi qo'shiq"
    },
    ru: {
        home: "Главная",
        search: "Поиск",
        favorites: "Избранное",
        playlists: "Плейлисты",
        recent: "Недавние",
        settings: "Настройки",
        welcome: "Добро пожаловать!",
        welcomeText: "Открывайте новую музыку и наслаждайтесь любимыми треками",
        searchMusic: "Поиск музыки",
        topHits: "Топ хиты",
        recentlyPlayed: "Недавно слушали",
        yourFavorites: "Избранное",
        yourPlaylists: "Плейлисты",
        newPlaylist: "Новый плейлист",
        language: "Язык",
        audioQuality: "Качество аудио",
        theme: "Тема",
        autoPlay: "Автовоспроизведение",
        shuffle: "Перемешать",
        repeat: "Повтор",
        exportData: "Экспорт данных",
        downloadData: "Скачать данные",
        low: "Низкое",
        medium: "Среднее",
        high: "Высокое",
        light: "Светлая",
        dark: "Темная",
        system: "Системная",
        nowPlaying: "Сейчас играет",
        addToPlaylist: "Добавить в плейлист",
        searchPlaceholder: "Введите название песни или исполнителя...",
        noResults: "Ничего не найдено",
        loading: "Загрузка...",
        error: "Произошла ошибка",
        success: "Успешно",
        addedToFavorites: "Добавлено в избранное",
        removedFromFavorites: "Удалено из избранного",
        addedToPlaylist: "Добавлено в плейлист",
        shareTrack: "Поделиться треком",
        downloadTrack: "Скачать",
        sendToBot: "Отправить в бот",
        nextTrack: "Следующий трек",
        previousTrack: "Предыдущий трек"
    },
    en: {
        home: "Home",
        search: "Search",
        favorites: "Favorites",
        playlists: "Playlists",
        recent: "Recent",
        settings: "Settings",
        welcome: "Welcome back!",
        welcomeText: "Discover new music and enjoy your favorites",
        searchMusic: "Search Music",
        topHits: "Top Hits",
        recentlyPlayed: "Recently Played",
        yourFavorites: "Your Favorites",
        yourPlaylists: "Your Playlists",
        newPlaylist: "New Playlist",
        language: "Language",
        audioQuality: "Audio Quality",
        theme: "Theme",
        autoPlay: "Auto Play",
        shuffle: "Shuffle",
        repeat: "Repeat",
        exportData: "Export Data",
        downloadData: "Download My Data",
        low: "Low",
        medium: "Medium",
        high: "High",
        light: "Light",
        dark: "Dark",
        system: "System",
        nowPlaying: "Now Playing",
        addToPlaylist: "Add to Playlist",
        searchPlaceholder: "Enter song or artist name...",
        noResults: "No results found",
        loading: "Loading...",
        error: "An error occurred",
        success: "Success",
        addedToFavorites: "Added to favorites",
        removedFromFavorites: "Removed from favorites",
        addedToPlaylist: "Added to playlist",
        shareTrack: "Share track",
        downloadTrack: "Download",
        sendToBot: "Send to bot",
        nextTrack: "Next track",
        previousTrack: "Previous track"
    }
};

// Initialize app
async function initApp() {
    try {
        // Show loading
        showToast(translations[currentLanguage].loading, 'info');

        // Get user data from Telegram
        const user = tg.initDataUnsafe?.user;

        if (user) {
            document.getElementById('userName').textContent = user.first_name || 'User';
            await loadUserData(user.id);
        }

        // Set language from user preferences
        if (currentUser?.language) {
            setLanguage(currentUser.language);
        }

        // Load initial data
        await Promise.all([
            loadRecentlyPlayed(),
            loadFavorites(),
            loadPlaylists()
        ]);

        // Setup navigation
        setupNavigation();

        // Initialize audio player with auto-play
        initAudioPlayer();

        // Apply theme
        applyTheme(currentUser?.settings?.theme || 'dark');

        // Setup pull to refresh
        setupPullToRefresh();

        // Update UI
        updateUI();

        // Load top hits by default in search
        setTimeout(() => loadTopHits(), 500);

        tg.ready();

        // Hide loading
        hideToast();
    } catch (error) {
        console.error('Init error:', error);
        showToast(translations[currentLanguage].error, 'error');
    }
}

// Setup pull to refresh
function setupPullToRefresh() {
    const mainContent = document.querySelector('.main-content');
    let startY = 0;
    let currentY = 0;
    const threshold = 80;

    mainContent.addEventListener('touchstart', (e) => {
        if (mainContent.scrollTop === 0) {
            startY = e.touches[0].clientY;
        }
    }, { passive: true });

    mainContent.addEventListener('touchmove', (e) => {
        if (startY > 0) {
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;

            if (diff > 0 && diff < threshold) {
                e.preventDefault();
                // Show pull indicator
                const indicator = document.querySelector('.pull-to-refresh');
                if (indicator) {
                    indicator.style.transform = `translateY(${diff}px)`;
                }
            }
        }
    }, { passive: false });

    mainContent.addEventListener('touchend', async (e) => {
        if (startY > 0) {
            const diff = currentY - startY;

            if (diff > threshold) {
                // Refresh data
                await refreshData();
            }

            // Reset
            startY = 0;
            currentY = 0;
            const indicator = document.querySelector('.pull-to-refresh');
            if (indicator) {
                indicator.style.transform = 'translateY(-100%)';
            }
        }
    });
}

// Refresh data
async function refreshData() {
    showToast('Refreshing...', 'info');
    await Promise.all([
        loadRecentlyPlayed(),
        loadFavorites(),
        loadPlaylists()
    ]);
    hideToast();
    showToast('Updated!', 'success');
}

// Load user data from server
async function loadUserData(telegramId) {
    try {
        const response = await fetch(`/api/user/${telegramId}`);
        if (response.ok) {
            currentUser = await response.json();
        }
    } catch (error) {
        console.error('Failed to load user data:', error);
    }
}

// Navigation
function setupNavigation() {
    // Desktop nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            navigateTo(page);
        });
    });

    // Mobile bottom nav
    document.querySelectorAll('.nav-item-mobile').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            navigateTo(page);
        });

        // Add touch feedback
        item.addEventListener('touchstart', () => {
            item.style.transform = 'scale(0.9)';
        });

        item.addEventListener('touchend', () => {
            item.style.transform = 'scale(1)';
        });
    });
}

function navigateTo(page) {
    // Update active nav items
    document.querySelectorAll('.nav-item, .nav-item-mobile').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // Update page title
    const titles = {
        home: translations[currentLanguage].home,
        search: translations[currentLanguage].search,
        favorites: translations[currentLanguage].favorites,
        playlists: translations[currentLanguage].playlists,
        recent: translations[currentLanguage].recent,
        settings: translations[currentLanguage].settings
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;

    // Show selected page with animation
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    document.getElementById(`${page}Page`).classList.add('active');

    // Load page data
    switch (page) {
        case 'favorites':
            renderFavorites();
            break;
        case 'playlists':
            renderPlaylists();
            break;
        case 'recent':
            renderRecent();
            break;
        case 'search':
            // Focus search input on mobile
            setTimeout(() => {
                document.getElementById('searchInput')?.focus();
            }, 300);
            break;
    }

    // Haptic feedback
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

// Search functionality
async function searchMusic(query) {
    if (!query.trim()) {
        document.getElementById('searchResults').innerHTML = '';
        loadTopHits();
        return;
    }

    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
            const tracks = await response.json();
            renderSearchResults(tracks);
        }
    } catch (error) {
        console.error('Search error:', error);
        resultsDiv.innerHTML = `<div class="no-results">
            <i class="fas fa-exclamation-circle"></i>
            <p>${translations[currentLanguage].error}</p>
        </div>`;
    }
}

function renderSearchResults(tracks) {
    const resultsDiv = document.getElementById('searchResults');

    if (tracks.length === 0) {
        resultsDiv.innerHTML = `<div class="no-results">
            <i class="fas fa-music"></i>
            <p>${translations[currentLanguage].noResults}</p>
        </div>`;
        return;
    }

    let html = '';
    tracks.forEach((track, index) => {
        html += `
            <div class="track-item" onclick="playTrack(${JSON.stringify(track).replace(/"/g, '&quot;')})">
                <div class="track-item-index">${index + 1}</div>
                <div class="track-item-info">
                    <div class="track-item-title">${track.title}</div>
                    <div class="track-item-artist">${track.performer}</div>
                </div>
                <div class="track-item-actions">
                    <button class="track-item-action" onclick="toggleFavorite(event, ${JSON.stringify(track).replace(/"/g, '&quot;')})">
                        <i class="fa${isFavorite(track) ? 's' : 'r'} fa-heart"></i>
                    </button>
                    <button class="track-item-action" onclick="addToPlaylistModal(event, ${JSON.stringify(track).replace(/"/g, '&quot;')})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `;
    });

    resultsDiv.innerHTML = html;
}

// Audio player with auto-play
function initAudioPlayer() {
    audioPlayer = new Audio();

    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('loadedmetadata', updateDuration);
    audioPlayer.addEventListener('ended', handleTrackEnd);
    audioPlayer.addEventListener('play', () => {
        isPlaying = true;
        updatePlayButtons();
        updateMiniPlayer();
    });
    audioPlayer.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayButtons();
    });
    audioPlayer.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        showToast(translations[currentLanguage].error, 'error');
        nextTrack();
    });
}

// Handle track end with auto-play
function handleTrackEnd() {
    if (isRepeating) {
        // Repeat current track
        audioPlayer.currentTime = 0;
        audioPlayer.play();
    } else {
        nextTrack();
    }
}

async function playTrack(track) {
    try {
        currentTrack = track;

        // Add to playlist if not already
        if (!currentPlaylist.length) {
            currentPlaylist = [track];
            currentPlaylistIndex = 0;
        }

        // Update UI
        document.getElementById('trackName').textContent = track.title;
        document.getElementById('trackArtist').textContent = track.performer;
        document.getElementById('miniTrackName').textContent = track.title;
        document.getElementById('miniTrackArtist').textContent = track.performer;

        // Update mini art
        document.querySelector('.mini-art i').className = track.cover ? `fas fa-${track.cover}` : 'fas fa-music';

        // Update favorite button
        updateFavoriteButton();

        // Load and play audio
        audioPlayer.src = track.audio_url;
        await audioPlayer.play();

        // Add to recently played
        await addToRecentlyPlayed(track);

        // Show player if minimized
        document.getElementById('musicPlayer').classList.remove('minimized');

        // Haptic feedback
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('medium');
        }
    } catch (error) {
        console.error('Play error:', error);
        showToast(translations[currentLanguage].error, 'error');
    }
}

function updateFavoriteButton() {
    const favBtn = document.getElementById('favoriteBtn');
    if (currentTrack && isFavorite(currentTrack)) {
        favBtn.innerHTML = '<i class="fas fa-heart"></i>';
        favBtn.classList.add('active');
    } else {
        favBtn.innerHTML = '<i class="far fa-heart"></i>';
        favBtn.classList.remove('active');
    }
}

function togglePlay() {
    if (!audioPlayer) return;

    if (isPlaying) {
        audioPlayer.pause();
    } else {
        audioPlayer.play();
    }
}

function updatePlayButtons() {
    const playIcon = document.getElementById('playIcon');
    const miniPlayIcon = document.getElementById('miniPlayIcon');

    if (isPlaying) {
        playIcon.className = 'fas fa-pause';
        miniPlayIcon.className = 'fas fa-pause';
    } else {
        playIcon.className = 'fas fa-play';
        miniPlayIcon.className = 'fas fa-play';
    }
}

function updateMiniPlayer() {
    // Update mini player with current track info
    if (currentTrack) {
        document.getElementById('miniTrackName').textContent = currentTrack.title;
        document.getElementById('miniTrackArtist').textContent = currentTrack.performer;
    }
}

function updateProgress() {
    if (!audioPlayer.duration) return;

    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('currentTime').textContent = formatTime(audioPlayer.currentTime);
}

function updateDuration() {
    document.getElementById('duration').textContent = formatTime(audioPlayer.duration);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function seekTo(event) {
    const bar = event.currentTarget;
    const rect = bar.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    audioPlayer.currentTime = percent * audioPlayer.duration;
}

function setVolume(value) {
    if (audioPlayer) {
        audioPlayer.volume = value / 100;
    }
}

// Next track with auto-play
function nextTrack() {
    if (!currentPlaylist.length) return;

    if (isShuffled) {
        // Play random track
        const newIndex = Math.floor(Math.random() * currentPlaylist.length);
        currentPlaylistIndex = newIndex;
    } else {
        // Play next track
        if (currentPlaylistIndex < currentPlaylist.length - 1) {
            currentPlaylistIndex++;
        } else if (isRepeating) {
            // Repeat playlist
            currentPlaylistIndex = 0;
        } else {
            // Stop if end of playlist
            audioPlayer.pause();
            return;
        }
    }

    playTrack(currentPlaylist[currentPlaylistIndex]);
}

function previousTrack() {
    if (currentPlaylistIndex > 0) {
        currentPlaylistIndex--;
        playTrack(currentPlaylist[currentPlaylistIndex]);
    } else if (isRepeating) {
        currentPlaylistIndex = currentPlaylist.length - 1;
        playTrack(currentPlaylist[currentPlaylistIndex]);
    }
}

function toggleShuffle() {
    isShuffled = !isShuffled;
    const shuffleBtn = document.getElementById('shuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.classList.toggle('active', isShuffled);
    }

    showToast(isShuffled ? 'Shuffle on' : 'Shuffle off', 'info');
}

function toggleRepeat() {
    isRepeating = !isRepeating;
    const repeatBtn = document.getElementById('repeatBtn');
    if (repeatBtn) {
        repeatBtn.classList.toggle('active', isRepeating);
    }

    showToast(isRepeating ? 'Repeat on' : 'Repeat off', 'info');
}

function togglePlayer() {
    document.getElementById('musicPlayer').classList.toggle('minimized');
}

// Favorites
async function toggleFavorite(event, track) {
    event.stopPropagation();

    try {
        const isFav = isFavorite(track);
        const url = isFav ? '/api/favorites/remove' : '/api/favorites/add';

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegramId: tg.initDataUnsafe?.user?.id,
                track: track
            })
        });

        if (response.ok) {
            const message = isFav
                ? translations[currentLanguage].removedFromFavorites
                : translations[currentLanguage].addedToFavorites;
            showToast(message, 'success');

            // Update UI
            await loadFavorites();
            updateFavoriteButton();

            if (document.getElementById('favoritesPage').classList.contains('active')) {
                renderFavorites();
            }

            // Haptic feedback
            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }
        }
    } catch (error) {
        console.error('Toggle favorite error:', error);
        showToast(translations[currentLanguage].error, 'error');
    }
}

function isFavorite(track) {
    if (!currentUser?.favorites) return false;
    const trackId = `${track.performer}-${track.title}`.replace(/[^a-zA-Z0-9]/g, '');
    return currentUser.favorites.some(f => f.trackId === trackId);
}

async function loadFavorites() {
    try {
        const response = await fetch(`/api/favorites/${tg.initDataUnsafe?.user?.id}`);
        if (response.ok) {
            const favorites = await response.json();
            if (currentUser) {
                currentUser.favorites = favorites;
            }
            renderFavoritesGrid();
        }
    } catch (error) {
        console.error('Load favorites error:', error);
    }
}

function renderFavorites() {
    const listDiv = document.getElementById('favoritesList');

    if (!currentUser?.favorites?.length) {
        listDiv.innerHTML = `<div class="no-results">
            <i class="fas fa-heart"></i>
            <p>${translations[currentLanguage].noResults}</p>
        </div>`;
        document.getElementById('favoritesCount').textContent = '0 tracks';
        return;
    }

    let html = '';
    currentUser.favorites.forEach((track, index) => {
        html += `
            <div class="track-item" onclick="playTrack(${JSON.stringify(track).replace(/"/g, '&quot;')})">
                <div class="track-item-index">${index + 1}</div>
                <div class="track-item-info">
                    <div class="track-item-title">${track.title}</div>
                    <div class="track-item-artist">${track.performer}</div>
                </div>
                <div class="track-item-actions">
                    <button class="track-item-action" onclick="toggleFavorite(event, ${JSON.stringify(track).replace(/"/g, '&quot;')})">
                        <i class="fas fa-heart" style="color: #ef4444;"></i>
                    </button>
                </div>
            </div>
        `;
    });

    listDiv.innerHTML = html;
    document.getElementById('favoritesCount').textContent = `${currentUser.favorites.length} tracks`;
}

function renderFavoritesGrid() {
    const grid = document.getElementById('favoritesGrid');

    if (!currentUser?.favorites?.length) {
        grid.innerHTML = `<div class="no-results">${translations[currentLanguage].noResults}</div>`;
        return;
    }

    let html = '';
    currentUser.favorites.slice(0, 10).forEach(track => {
        html += `
            <div class="track-card" onclick="playTrack(${JSON.stringify(track).replace(/"/g, '&quot;')})">
                <div class="track-card-art">
                    <i class="fas fa-music"></i>
                </div>
                <div class="track-card-title">${track.title}</div>
                <div class="track-card-artist">${track.performer}</div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

// Playlists
async function createPlaylist() {
    // For mobile, use custom prompt
    const name = await showPrompt(translations[currentLanguage].newPlaylist);
    if (!name) return;

    try {
        const response = await fetch('/api/playlists/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegramId: tg.initDataUnsafe?.user?.id,
                name: name
            })
        });

        if (response.ok) {
            await loadPlaylists();
            renderPlaylists();
            showToast(translations[currentLanguage].success, 'success');

            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }
        }
    } catch (error) {
        console.error('Create playlist error:', error);
        showToast(translations[currentLanguage].error, 'error');
    }
}

// Custom prompt for mobile
function showPrompt(message) {
    return new Promise((resolve) => {
        const result = prompt(message);
        resolve(result);
    });
}

async function loadPlaylists() {
    try {
        const response = await fetch(`/api/playlists/${tg.initDataUnsafe?.user?.id}`);
        if (response.ok) {
            const playlists = await response.json();
            if (currentUser) {
                currentUser.playlists = playlists;
            }
        }
    } catch (error) {
        console.error('Load playlists error:', error);
    }
}

function renderPlaylists() {
    const grid = document.getElementById('playlistsGrid');

    if (!currentUser?.playlists?.length) {
        grid.innerHTML = `<div class="no-results">
            <i class="fas fa-list"></i>
            <p>${translations[currentLanguage].noResults}</p>
        </div>`;
        return;
    }

    let html = '';
    currentUser.playlists.forEach(playlist => {
        html += `
            <div class="track-card" onclick="openPlaylist('${playlist.name}')">
                <div class="track-card-art">
                    <i class="fas fa-list"></i>
                </div>
                <div class="track-card-title">${playlist.name}</div>
                <div class="track-card-artist">${playlist.tracks?.length || 0} tracks</div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

// Recently played
async function loadRecentlyPlayed() {
    try {
        const response = await fetch(`/api/recent/${tg.initDataUnsafe?.user?.id}`);
        if (response.ok) {
            const recent = await response.json();
            if (currentUser) {
                currentUser.recentlyPlayed = recent;
            }
            renderRecentlyPlayed();
        }
    } catch (error) {
        console.error('Load recent error:', error);
    }
}

function renderRecentlyPlayed() {
    const grid = document.getElementById('recentlyPlayedGrid');

    if (!currentUser?.recentlyPlayed?.length) {
        grid.innerHTML = `<div class="no-results">${translations[currentLanguage].noResults}</div>`;
        return;
    }

    let html = '';
    currentUser.recentlyPlayed.slice(0, 10).forEach(track => {
        html += `
            <div class="track-card" onclick="playTrack(${JSON.stringify(track).replace(/"/g, '&quot;')})">
                <div class="track-card-art">
                    <i class="fas fa-history"></i>
                </div>
                <div class="track-card-title">${track.title}</div>
                <div class="track-card-artist">${track.performer}</div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

function renderRecent() {
    const listDiv = document.getElementById('recentList');

    if (!currentUser?.recentlyPlayed?.length) {
        listDiv.innerHTML = `<div class="no-results">
            <i class="fas fa-history"></i>
            <p>${translations[currentLanguage].noResults}</p>
        </div>`;
        return;
    }

    let html = '';
    currentUser.recentlyPlayed.forEach((track, index) => {
        html += `
            <div class="track-item" onclick="playTrack(${JSON.stringify(track).replace(/"/g, '&quot;')})">
                <div class="track-item-index">${index + 1}</div>
                <div class="track-item-info">
                    <div class="track-item-title">${track.title}</div>
                    <div class="track-item-artist">${track.performer}</div>
                </div>
                <div class="track-item-actions">
                    <button class="track-item-action" onclick="toggleFavorite(event, ${JSON.stringify(track).replace(/"/g, '&quot;')})">
                        <i class="fa${isFavorite(track) ? 's' : 'r'} fa-heart"></i>
                    </button>
                </div>
            </div>
        `;
    });

    listDiv.innerHTML = html;
}

// Add to recently played
async function addToRecentlyPlayed(track) {
    try {
        await fetch('/api/recent/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegramId: tg.initDataUnsafe?.user?.id,
                track: track
            })
        });
    } catch (error) {
        console.error('Add to recent error:', error);
    }
}

// Share track
function shareTrack() {
    if (!currentTrack) return;

    const text = `${currentTrack.title} - ${currentTrack.performer}`;

    if (navigator.share) {
        navigator.share({
            title: currentTrack.title,
            text: text,
            url: currentTrack.audio_url
        }).catch(() => {
            copyToClipboard(text);
        });
    } else {
        copyToClipboard(text);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast(translations[currentLanguage].shareTrack, 'success');

    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

// Download track
function downloadTrack() {
    if (!currentTrack) return;

    showToast(translations[currentLanguage].downloadTrack, 'info');

    const a = document.createElement('a');
    a.href = currentTrack.audio_url;
    a.download = `${currentTrack.title} - ${currentTrack.performer}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
        showToast(translations[currentLanguage].success, 'success');
    }, 1000);
}

// Send to bot
function sendToBot() {
    if (!currentTrack) return;

    tg.sendData(JSON.stringify({
        action: 'send_track',
        track: currentTrack
    }));
}

// Language
function setLanguage(lang) {
    currentLanguage = lang;
    document.getElementById('currentLang').textContent = lang.toUpperCase();

    // Update all translatable elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });

    // Update placeholders
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.placeholder = translations[lang].searchPlaceholder;
    }

    // Update page title
    const activePage = document.querySelector('.nav-item.active')?.dataset.page || 'home';
    const titles = {
        home: translations[lang].home,
        search: translations[lang].search,
        favorites: translations[lang].favorites,
        playlists: translations[lang].playlists,
        recent: translations[lang].recent,
        settings: translations[lang].settings
    };
    document.getElementById('pageTitle').textContent = titles[activePage];
}

function toggleLanguage() {
    const langs = ['uz', 'ru', 'en'];
    const currentIndex = langs.indexOf(currentLanguage);
    const nextIndex = (currentIndex + 1) % langs.length;
    setLanguage(langs[nextIndex]);

    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

// Theme
function setTheme(theme) {
    applyTheme(theme);

    if (currentUser) {
        if (!currentUser.settings) currentUser.settings = {};
        currentUser.settings.theme = theme;
    }

    // Update active state
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.querySelector('span').textContent.toLowerCase() === theme) {
            btn.classList.add('active');
        }
    });
}

function applyTheme(theme) {
    const root = document.documentElement;

    if (theme === 'light') {
        root.style.setProperty('--bg-primary', '#f8fafc');
        root.style.setProperty('--bg-secondary', '#ffffff');
        root.style.setProperty('--bg-tertiary', '#f1f5f9');
        root.style.setProperty('--text-primary', '#0f172a');
        root.style.setProperty('--text-secondary', '#475569');
        root.style.setProperty('--border', '#e2e8f0');
    } else {
        root.style.setProperty('--bg-primary', '#0f172a');
        root.style.setProperty('--bg-secondary', '#1e293b');
        root.style.setProperty('--bg-tertiary', '#334155');
        root.style.setProperty('--text-primary', '#f1f5f9');
        root.style.setProperty('--text-secondary', '#94a3b8');
        root.style.setProperty('--border', '#334155');
    }
}

function toggleTheme() {
    const currentTheme = currentUser?.settings?.theme || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);

    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

// Quality
function setQuality(quality) {
    document.querySelectorAll('.quality-option').forEach(btn => {
        btn.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    if (currentUser) {
        if (!currentUser.settings) currentUser.settings = {};
        currentUser.settings.quality = quality;
    }

    showToast(`Quality: ${quality}`, 'info');
}

// Auto play
function toggleAutoPlay() {
    if (currentUser) {
        if (!currentUser.settings) currentUser.settings = {};
        currentUser.settings.autoPlay = document.getElementById('autoPlayToggle').checked;
    }
}

// Export data
async function exportUserData() {
    try {
        showToast(translations[currentLanguage].loading, 'info');

        const response = await fetch(`/api/export/${tg.initDataUnsafe?.user?.id}`);
        if (response.ok) {
            const data = await response.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'music-bot-data.json';
            a.click();
            URL.revokeObjectURL(url);

            showToast(translations[currentLanguage].success, 'success');
        }
    } catch (error) {
        console.error('Export error:', error);
        showToast(translations[currentLanguage].error, 'error');
    }
}

// Modal
function addToPlaylistModal(event, track) {
    event.stopPropagation();

    const modal = document.getElementById('playlistModal');
    const body = document.getElementById('playlistModalBody');

    if (!currentUser?.playlists?.length) {
        body.innerHTML = `<div class="no-results">
            <i class="fas fa-list"></i>
            <p>${translations[currentLanguage].noResults}</p>
        </div>`;
    } else {
        let html = '';
        currentUser.playlists.forEach(playlist => {
            html += `
                <div class="playlist-item" onclick="addToPlaylist('${playlist.name}', ${JSON.stringify(track).replace(/"/g, '&quot;')})">
                    <i class="fas fa-list"></i>
                    <div class="playlist-info">
                        <div class="playlist-name">${playlist.name}</div>
                        <div class="playlist-count">${playlist.tracks?.length || 0} tracks</div>
                    </div>
                </div>
            `;
        });
        body.innerHTML = html;
    }

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('playlistModal').classList.remove('active');
}

async function addToPlaylist(playlistName, track) {
    try {
        const response = await fetch('/api/playlists/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegramId: tg.initDataUnsafe?.user?.id,
                playlistName: playlistName,
                track: track
            })
        });

        if (response.ok) {
            showToast(translations[currentLanguage].addedToPlaylist, 'success');
            closeModal();

            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }
        }
    } catch (error) {
        console.error('Add to playlist error:', error);
        showToast(translations[currentLanguage].error, 'error');
    }
}

function createNewPlaylist() {
    closeModal();
    createPlaylist();
}

// Toast notifications
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';

    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span class="toast-message">${message}</span>
    `;

    document.body.appendChild(toast);

    // Auto hide
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function hideToast() {
    const toast = document.querySelector('.toast');
    if (toast) {
        toast.remove();
    }
}

// Debounce search
function debounceSearch() {
    clearTimeout(searchTimeout);
    const query = document.getElementById('searchInput').value;
    searchTimeout = setTimeout(() => searchMusic(query), 500);
}

// Filter search
function filterSearch(filter) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    if (filter === 'top') {
        loadTopHits();
    } else {
        searchMusic(document.getElementById('searchInput').value);
    }
}

// Load top hits
async function loadTopHits() {
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const response = await fetch('/api/top');
        if (response.ok) {
            const tracks = await response.json();
            renderSearchResults(tracks);
        }
    } catch (error) {
        console.error('Load top hits error:', error);
        resultsDiv.innerHTML = `<div class="no-results">
            <i class="fas fa-exclamation-circle"></i>
            <p>${translations[currentLanguage].error}</p>
        </div>`;
    }
}

// Update UI
function updateUI() {
    // Update user name
    if (currentUser?.firstName) {
        document.getElementById('userName').textContent = currentUser.firstName;
    }

    // Update settings
    if (currentUser?.settings) {
        document.getElementById('autoPlayToggle').checked = currentUser.settings.autoPlay || false;

        const quality = currentUser.settings.quality || 'medium';
        document.querySelectorAll('.quality-option').forEach(btn => {
            btn.classList.remove('active');
            if (btn.querySelector('span').textContent.toLowerCase() === quality) {
                btn.classList.add('active');
            }
        });

        // Apply theme
        applyTheme(currentUser.settings.theme || 'dark');
    }
}

// Handle back button
tg.BackButton.onClick(() => {
    const player = document.getElementById('musicPlayer');
    if (!player.classList.contains('minimized')) {
        player.classList.add('minimized');
    } else {
        tg.close();
    }
});

// Handle main button
tg.MainButton.setText('PLAY');
tg.MainButton.onClick(() => {
    if (currentTrack) {
        togglePlay();
    }
});

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // App in background
        if (audioPlayer && isPlaying) {
            // Keep playing
        }
    } else {
        // App in foreground
        tg.expand();
    }
});

// Prevent zoom on double tap
document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

// Add pull to refresh indicator to HTML
const pullToRefreshDiv = document.createElement('div');
pullToRefreshDiv.className = 'pull-to-refresh';
pullToRefreshDiv.innerHTML = '<i class="fas fa-arrow-down"></i> Pull to refresh';
document.querySelector('.main-content').prepend(pullToRefreshDiv);

// Add shuffle and repeat buttons to player
const playerActions = document.querySelector('.player-actions');
if (playerActions) {
    const shuffleBtn = document.createElement('button');
    shuffleBtn.className = 'action-btn';
    shuffleBtn.id = 'shuffleBtn';
    shuffleBtn.innerHTML = '<i class="fas fa-random"></i>';
    shuffleBtn.onclick = toggleShuffle;

    const repeatBtn = document.createElement('button');
    repeatBtn.className = 'action-btn';
    repeatBtn.id = 'repeatBtn';
    repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
    repeatBtn.onclick = toggleRepeat;

    playerActions.prepend(shuffleBtn);
    playerActions.appendChild(repeatBtn);
}

// Add mini art to minimized player
const miniPlayer = document.querySelector('.player-minimized');
if (miniPlayer) {
    const miniArt = document.createElement('div');
    miniArt.className = 'mini-art';
    miniArt.innerHTML = '<i class="fas fa-music"></i>';
    miniPlayer.prepend(miniArt);
}