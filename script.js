// ============================================================
//  FIREBASE CONFIG
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
    signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore, doc, setDoc, getDoc,
    enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCDnLmN6zAEoAMzB4ahvjUBQAMm6b2WuNk",
    authDomain: "ojt-tracker-1553b.firebaseapp.com",
    projectId: "ojt-tracker-1553b",
    storageBucket: "ojt-tracker-1553b.firebasestorage.app",
    messagingSenderId: "935447831959",
    appId: "1:935447831959:web:70db3f509c4c387563d0d2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Cache data locally — repeat visits load instantly
enableIndexedDbPersistence(db).catch(() => {/* multi-tab or private mode: skip */});

// ============================================================
//  LANDING PAGE HELPERS
// ============================================================
window.landingTab = (tab) => {
    const loginForm   = document.getElementById('landingLoginForm');
    const signupForm  = document.getElementById('landingSignupForm');
    const tabLogin    = document.getElementById('tabLogin');
    const tabSignup   = document.getElementById('tabSignup');

    if (tab === 'login') {
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
    } else {
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
    }
};

window.checkLandingPassword = (pw) => {
    const set = (id, ok) => {
        const el = document.getElementById(id); if (!el) return;
        el.querySelector('i').className = ok ? 'bi bi-check-circle' : 'bi bi-x-circle';
        el.classList.toggle('rule-pass', ok);
    };
    set('lr-lower', /[a-z]/.test(pw));
    set('lr-upper', /[A-Z]/.test(pw));
    set('lr-number', /[0-9]/.test(pw));
    set('lr-length', pw.length >= 6);
};

window.showAuth = (tab) => {
    // Focus the landing card to the right tab
    window.landingTab(tab || 'login');
    document.querySelector('.landing-auth-card')?.scrollIntoView({ behavior: 'smooth' });
};

window.handleLandingLogin = async () => {
    const email = document.getElementById('lLoginEmail').value.trim();
    const pw = document.getElementById('lLoginPassword').value;
    const btn = document.getElementById('lLoginBtn');
    const errEl = document.getElementById('lLoginError');
    errEl.textContent = '';
    if (!email || !pw) { errEl.textContent = 'Please fill in all fields.'; errEl.style.color = '#ef4444'; return; }
    btn.disabled = true; btn.textContent = 'Signing in...';
    try {
        await signInWithEmailAndPassword(auth, email, pw);
    } catch (e) {
        errEl.textContent = friendlyError(e.code); errEl.style.color = '#ef4444';
        btn.disabled = false; btn.textContent = 'Sign In';
    }
};

window.handleLandingSignup = async () => {
    const name = document.getElementById('lSignupName').value.trim();
    const email = document.getElementById('lSignupEmail').value.trim();
    const pw = document.getElementById('lSignupPassword').value;
    const btn = document.getElementById('lSignupBtn');
    const errEl = document.getElementById('lSignupError');
    errEl.textContent = '';
    if (!name || !email || !pw) { errEl.textContent = 'Please fill in all fields.'; errEl.style.color = '#ef4444'; return; }
    if (pw.length < 6 || !/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) {
        errEl.textContent = 'Password must meet all requirements.'; errEl.style.color = '#ef4444'; return;
    }
    btn.disabled = true; btn.textContent = 'Creating account...';
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pw);
        await updateProfile(cred.user, { displayName: name });
    } catch (e) {
        errEl.textContent = friendlyError(e.code); errEl.style.color = '#ef4444';
        btn.disabled = false; btn.textContent = 'Create Account';
    }
};

window.handleLandingForgot = async () => {
    const email = document.getElementById('lLoginEmail').value.trim();
    const errEl = document.getElementById('lLoginError');
    if (!email) { errEl.textContent = 'Enter your email above first.'; errEl.style.color = '#ef4444'; return; }
    try {
        await sendPasswordResetEmail(auth, email);
        errEl.textContent = 'Reset email sent! Check your inbox.'; errEl.style.color = '#22c55e';
    } catch (e) { errEl.textContent = friendlyError(e.code); errEl.style.color = '#ef4444'; }
};

function friendlyError(code) {
    const map = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/invalid-credential': 'Invalid email or password.',
    };
    return map[code] || 'Something went wrong. Please try again.';
}

// ============================================================
//  SECTION NAVIGATION
// ============================================================
window.showSection = (name) => {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`section-${name}`)?.classList.add('active');
    document.querySelector(`.nav-item[onclick="showSection('${name}')"]`)?.classList.add('active');
    const titles = { dashboard: 'Dashboard', entries: 'Time Entries', weekly: 'Weekly Report', profile: 'Report Information', export: 'Export Report' };
    document.getElementById('topbarTitle').textContent = titles[name] || name;
};

// ============================================================
//  AUTH STATE OBSERVER
// ============================================================
let _authResolved = false;
onAuthStateChanged(auth, async (user) => {
    if (user) { showLoading(true); }

    // Safety net: never spin forever — force-hide after 8 seconds
    const safetyTimer = setTimeout(() => showLoading(false), 8000);

    try {
        if (user) {
            document.getElementById('landingScreen').classList.add('hidden');
            document.getElementById('appScreen').classList.remove('hidden');
            const name = user.displayName || user.email.split('@')[0];
            document.getElementById('userDisplayName').textContent = name;
            document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();
            window.calculator = new OJTCalculator(user.uid);
            await window.calculator.init();
            document.getElementById('logoutBtn').onclick = async () => {
                if (window.calculator) await window.calculator.saveToFirestore();
                await signOut(auth);
            };
        } else {
            document.getElementById('landingScreen').classList.remove('hidden');
            document.getElementById('appScreen').classList.add('hidden');
            window.calculator = null;
            const lb = document.getElementById('lLoginBtn');
            const sb = document.getElementById('lSignupBtn');
            if (lb) { lb.disabled = false; lb.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Sign In'; }
            if (sb) { sb.disabled = false; sb.innerHTML = '<i class="bi bi-person-plus"></i> Create Account — It\'s Free'; }
        }
    } catch (err) {
        console.error('Auth init error:', err);
    } finally {
        clearTimeout(safetyTimer);
        showLoading(false);
        _authResolved = true;
    }
});

function showLoading(show) {
    document.getElementById('loadingOverlay').classList.toggle('hidden', !show);
}

// ============================================================
//  OJT CALCULATOR CLASS
// ============================================================
class OJTCalculator {
    constructor(userId) {
        this.userId = userId;
        this.entries = [];
        this.hoursNeeded = 500;
        this.includeWeekends = true;
        this.profileData = { name: '', school: '', company: '', period: '', supervisor: '', supervisorRole: '' };
        this.weeklyReports = [];
        this.holidays = [];
        this._dayRowCount = 0;
        this._weeklyStartDate = null;
        this._weeklyEndDate = null;
        this._filterMonth = null;
        this._filteredEntries = [];
        this._currentPage = 1;
        this._pageSize = 10;
    }

    // ====================================================================
    //  INITIALIZATION & FIRESTORE
    // ====================================================================
    async init() {
        await this.loadFromFirestore();
        this.initEventListeners();
        this.setupDatePicker();
        this.setupWeekendToggle();
        this.populateProfileForm();
        this.initEntryFilter(); // Initialize filter to current month
        this.initExportPreview(); // Initialize export preview on load
        this.render();
        this.renderWeeklyReportsList();
        this.renderHolidays();
        this.initWeeklyDays();
    }

    // ---- Firestore ----
    async saveToFirestore() {
        try {
            await setDoc(doc(db, 'users', this.userId), {
                entries: this.entries,
                hoursNeeded: this.hoursNeeded,
                includeWeekends: this.includeWeekends,
                profileData: this.profileData,
                weeklyReports: this.weeklyReports,
                holidays: this.holidays
            });
        } catch (e) { console.error('Save error:', e); this.notify('Could not save data.', 'error'); }
    }

    async loadFromFirestore() {
        try {
            // Race: Firestore read vs 5-second timeout
            const snap = await Promise.race([
                getDoc(doc(db, 'users', this.userId)),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 5000))
            ]);
            if (snap.exists()) {
                const d = snap.data();
                this.entries = (d.entries || []).map(e => ({ ...e, breakMins: Number(e.breakMins) || 0, hours: parseFloat(e.hours) || 0 }));
                this.hoursNeeded = d.hoursNeeded || 500;
                this.includeWeekends = d.includeWeekends ?? true;
                if (d.profileData) this.profileData = { ...this.profileData, ...d.profileData };
                this.weeklyReports = d.weeklyReports || [];
                this.holidays = d.holidays || [];
            }
        } catch (e) {
            console.warn('Load warning (using defaults):', e.message);
            this.notify('Loaded with defaults — check your connection.', 'info');
        }
    }

    // ---- Event Listeners ----
    initEventListeners() {
        document.getElementById('addBtn').addEventListener('click', () => this.addEntry());
        document.getElementById('duplicateBtn').addEventListener('click', () => this.duplicateEntry());
        document.getElementById('updateHours').addEventListener('click', () => this.updateHoursNeeded());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToExcel());
        document.getElementById('exportBtnProfile')?.addEventListener('click', () => this.exportToExcel());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAll());
        document.getElementById('saveProfileBtn').addEventListener('click', () => this.saveProfile());
        document.getElementById('saveWeeklyBtn').addEventListener('click', () => this.saveWeeklyReport());
        document.getElementById('addDayRowBtn').addEventListener('click', () => this.addDayRow());
        document.getElementById('timeOut').addEventListener('keypress', e => { if (e.key === 'Enter') this.addEntry(); });
        // Time entries filter listeners
        const filterMonthEl = document.getElementById('filterMonth');
        const sortEl = document.getElementById('sortOrder');
        const clearFilterBtn = document.getElementById('clearFilterBtn');
        if (filterMonthEl) filterMonthEl.addEventListener('change', () => this.applyFilter());
        if (sortEl) sortEl.addEventListener('change', () => this.applyFilter());
        if (clearFilterBtn) clearFilterBtn.addEventListener('click', () => this.clearFilter());
        // Pagination listeners
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        if (prevPageBtn) prevPageBtn.addEventListener('click', () => this.previousPage());
        if (nextPageBtn) nextPageBtn.addEventListener('click', () => this.nextPage());
        // Weekly report date range listeners
        const startDateEl = document.getElementById('wkStartDate');
        const endDateEl = document.getElementById('wkEndDate');
        if (startDateEl) {
            startDateEl.addEventListener('change', () => {
                // Set max for end date (6 days after start date = 7 days inclusive)
                const start = new Date(startDateEl.value + 'T00:00:00');
                const maxEnd = new Date(start);
                maxEnd.setDate(maxEnd.getDate() + 6);
                endDateEl.max = this.dateToInputStr(maxEnd);
                this.updateWeeklyDateRange();
            });
        }
        if (endDateEl) endDateEl.addEventListener('change', () => this.updateWeeklyDateRange());
        // Export preview listener
        const exportMonthEl = document.getElementById('exportMonth');
        if (exportMonthEl) exportMonthEl.addEventListener('change', (e) => {
            if (e.target.value) this.generateExportPreview(e.target.value);
        });
    }

    // ---- Weekend Toggle ----
    setupWeekendToggle() {
        const t = document.getElementById('weekendToggle');
        t.checked = this.includeWeekends;
        t.addEventListener('change', async () => {
            this.includeWeekends = t.checked;
            await this.saveToFirestore();
            this.notify(t.checked ? 'Weekends included' : 'Weekends excluded', 'success');
        });
    }

    // ---- Date helpers ----
    setupDatePicker() {
        const di = document.getElementById('date');
        const today = new Date();
        const s = this.dateToInputStr(today);
        di.value = s; di.max = s;
    }

    dateToInputStr(d) {
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    getNextWorkDate(from) {
        const d = new Date(from); d.setDate(d.getDate() + 1);
        if (!this.includeWeekends) {
            const day = d.getDay();
            if (day === 6) d.setDate(d.getDate() + 2);
            else if (day === 0) d.setDate(d.getDate() + 1);
        }
        return d;
    }

    formatDate(ds) {
        const d = new Date(ds + 'T00:00:00');
        const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2,'0')}, ${d.getFullYear()} (${days[d.getDay()]})`;
    }

    // Format date as MM/DD/YY for weekly report display
    formatDateShort(ds) {
        const d = new Date(ds + 'T00:00:00');
        const m = String(d.getMonth()+1).padStart(2,'0');
        const day = String(d.getDate()).padStart(2,'0');
        const y = String(d.getFullYear()).slice(-2);
        return `${m}/${day}/${y}`;
    }

    to12h(t) {
        const [h, m] = t.split(':');
        let hr = parseInt(h); const ap = hr >= 12 ? 'PM' : 'AM';
        if (hr > 12) hr -= 12; if (hr === 0) hr = 12;
        return `${hr}:${m} ${ap}`;
    }

    // ---- Hour calc ----
    calcHours(tin, tout, brk = 0) {
        try {
            let diff = this._minDiff(tin, tout);
            if (diff <= 0) { this.notify('Time out must be after time in!', 'error'); return 0; }
            if (diff > 1440) { this.notify('Hours cannot exceed 24!', 'error'); return 0; }
            diff = Math.max(0, diff - Number(brk));
            return parseFloat((diff / 60).toFixed(2));
        } catch { return 0; }
    }

    calcHoursQ(tin, tout, brk = 0) {
        try {
            let diff = this._minDiff(tin, tout);
            if (diff <= 0 || diff > 1440) return 0;
            diff = Math.max(0, diff - Number(brk));
            return parseFloat((diff / 60).toFixed(2));
        } catch { return 0; }
    }

    _minDiff(tin, tout) {
        const [ih, im] = tin.split(':').map(Number);
        const [oh, om] = tout.split(':').map(Number);
        return (oh * 60 + om) - (ih * 60 + im);
    }

    timeFrac(t) { const [h, m] = t.split(':').map(Number); return (h * 60 + m) / 1440; }

    dateSerial(dateObj) {
        const epoch = new Date(1899, 11, 30);
        return Math.floor((dateObj - epoch) / 86400000);
    }

    // ====================================================================
    //  MODULE: TIME ENTRIES — CRUD Operations & Management
    // ====================================================================
    async addEntry() {
        const date = document.getElementById('date').value;
        const tin = document.getElementById('timeIn').value;
        const tout = document.getElementById('timeOut').value;
        const brk = parseInt(document.getElementById('breakTime').value) || 0;
        if (!date || !tin || !tout) { this.notify('Please fill in all fields!', 'error'); return; }
        const hours = this.calcHours(tin, tout, brk);
        if (hours === 0) return;
        const idx = this.entries.findIndex(e => e.date === date);
        if (idx !== -1) { this.entries[idx] = { date, timeIn: tin, timeOut: tout, breakMins: brk, hours }; this.notify('Entry updated!', 'success'); }
        else { this.entries.push({ date, timeIn: tin, timeOut: tout, breakMins: brk, hours }); this.notify('Entry added!', 'success'); }
        this.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
        document.getElementById('timeIn').value = '';
        document.getElementById('timeOut').value = '';
        document.getElementById('breakTime').value = '';
        this.setupDatePicker();
        await this.saveToFirestore();
        this.render();
    }

    duplicateEntry() {
        if (!this.entries.length) { this.notify('No previous entry to duplicate!', 'error'); return; }
        if (document.getElementById('pendingRow')) { this.notify('Complete or cancel the current entry first!', 'warning'); return; }
        const last = this.entries[this.entries.length - 1];
        const nextDate = this.dateToInputStr(this.getNextWorkDate(new Date(last.date + 'T00:00:00')));
        const tbody = document.getElementById('tableBody');
        if (!tbody) { this.notify('Table not ready yet!', 'error'); return; }
        tbody.querySelector('.empty-row')?.remove();
        
        // Check if the new entry matches the active filter
        const isFiltered = this._filterMonth;
        let matchesFilter = true;
        if (isFiltered) {
            const [filterYear, filterMonth] = this._filterMonth.split('-');
            const newDate = new Date(nextDate + 'T00:00:00');
            matchesFilter = newDate.getFullYear() == filterYear && newDate.getMonth() == filterMonth - 1;
        }
        
        const row = document.createElement('tr');
        row.id = 'pendingRow'; row.classList.add('pending-row');
        row.innerHTML = `
            <td></td>
            <td><input type="date" class="table-input" id="pendingDate" value="${nextDate}"></td>
            <td><input type="time" class="table-input" id="pendingTimeIn" value="${last.timeIn}"></td>
            <td><input type="time" class="table-input" id="pendingTimeOut" value="${last.timeOut}"></td>
            <td><input type="number" class="table-input" id="pendingBreak" value="${last.breakMins||0}" min="0" style="width:60px"></td>
            <td id="pendingGross">${this.calcHoursQ(last.timeIn, last.timeOut, 0)}</td>
            <td id="pendingHours">${last.hours}</td>
            <td class="pending-actions">
                <button class="save-btn" onclick="window.calculator.savePendingRow()"><i class="bi bi-check-lg"></i></button>
                <button class="cancel-btn" onclick="window.calculator.cancelPendingRow()"><i class="bi bi-x-lg"></i></button>
            </td>`;
        
        // Position the pending row
        if (!matchesFilter) {
            // Entry doesn't match filter - show at top
            tbody.insertBefore(row, tbody.firstChild);
        } else {
            // Entry matches filter - append to end (will be in sort position after save)
            tbody.appendChild(row);
        }
        
        const upd = () => {
            const tin = document.getElementById('pendingTimeIn').value;
            const tout = document.getElementById('pendingTimeOut').value;
            const brk = parseInt(document.getElementById('pendingBreak').value) || 0;
            if (tin && tout) {
                document.getElementById('pendingGross').textContent = this.calcHoursQ(tin, tout, 0) || '—';
                document.getElementById('pendingHours').textContent = this.calcHoursQ(tin, tout, brk) || '—';
            }
        };
        ['pendingTimeIn','pendingTimeOut'].forEach(id => document.getElementById(id).addEventListener('change', upd));
        document.getElementById('pendingBreak').addEventListener('input', upd);
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.notify('Edit then click ✓ to save', 'info');
    }

    async savePendingRow() {
        const date = document.getElementById('pendingDate').value;
        const tin = document.getElementById('pendingTimeIn').value;
        const tout = document.getElementById('pendingTimeOut').value;
        const brk = parseInt(document.getElementById('pendingBreak').value) || 0;
        if (!date || !tin || !tout) { this.notify('Fill in all fields!', 'error'); return; }
        const hours = this.calcHours(tin, tout, brk); if (!hours) return;
        const idx = this.entries.findIndex(e => e.date === date);
        if (idx !== -1) this.entries[idx] = { date, timeIn: tin, timeOut: tout, breakMins: brk, hours };
        else this.entries.push({ date, timeIn: tin, timeOut: tout, breakMins: brk, hours });
        this.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
        await this.saveToFirestore(); this.applyFilter(); this.goToEntryPage(date); this.notify('Entry saved!', 'success');
    }

    cancelPendingRow() {
        document.getElementById('pendingRow')?.remove();
        if (!this.entries.length) document.getElementById('tableBody').innerHTML = '<tr class="empty-row"><td colspan="8"><i class="bi bi-inbox"></i> No entries yet.</td></tr>';
    }

    async deleteEntry(index) {
        if (!confirm('Delete this entry?')) return;
        const currentPage = this._currentPage;  // Store current page
        this.entries.splice(index, 1);
        await this.saveToFirestore(); 
        this.applyFilter(false);  // Don't reset page
        // Verify page is still valid
        const totalPages = Math.ceil(this._filteredEntries.length / this._pageSize);
        if (this._currentPage > totalPages) {
            this._currentPage = Math.max(1, totalPages);
            this.renderTable();
        }
        this.notify('Entry deleted!', 'success');
    }

    // ====================================================================
    //  MODULE: TIME ENTRIES — FILTERING
    // ====================================================================
    initEntryFilter() {
        // Set filter to current month on initialization
        const today = new Date();
        const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        
        const filterMonthEl = document.getElementById('filterMonth');
        if (filterMonthEl) filterMonthEl.value = yearMonth;
        
        this.applyFilter();
    }

    initExportPreview() {
        // Set export preview to current month on page load
        const today = new Date();
        const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const exportMonthEl = document.getElementById('exportMonth');
        if (exportMonthEl && !exportMonthEl.value) {
            exportMonthEl.value = yearMonth;
            this.generateExportPreview(yearMonth);
        }
    }

    applyFilter(resetPage = true) {
        const filterMonthEl = document.getElementById('filterMonth');
        const sortEl = document.getElementById('sortOrder');
        
        if (!filterMonthEl) return;
        
        const monthVal = filterMonthEl.value;
        this._filterMonth = monthVal;
        
        if (!monthVal) {
            this._filteredEntries = [...this.entries];
        } else {
            const [year, month] = monthVal.split('-');
            this._filteredEntries = this.entries.filter(e => {
                const eDate = new Date(e.date + 'T00:00:00');
                return eDate.getFullYear() == year && eDate.getMonth() == month - 1;
            });
        }
        
        // Apply sorting
        const sortOrder = sortEl?.value || 'asc';
        this._filteredEntries.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
        
        if (resetPage) this._currentPage = 1;  // Reset to first page only when user changes filter
        this.updateFilterInfo();
        this.render();
    }

    clearFilter() {
        const filterMonthEl = document.getElementById('filterMonth');
        if (filterMonthEl) filterMonthEl.value = '';
        this.applyFilter();
    }

    updateFilterInfo() {
        const filterInfo = document.getElementById('filterInfo');
        if (!filterInfo) return;
        
        const totalCount = this.entries.length;
        const filteredCount = this._filteredEntries.length;
        
        if (filteredCount === totalCount) {
            filterInfo.textContent = `Showing all ${totalCount} entries`;
        } else {
            filterInfo.textContent = `Showing ${filteredCount} of ${totalCount} entries`;
        }
    }

    updatePaginationInfo(totalPages) {
        const pageInfo = document.getElementById('pageInfo');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        
        if (pageInfo) pageInfo.textContent = `Page ${this._currentPage} of ${totalPages || 1}`;
        if (prevBtn) prevBtn.disabled = this._currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this._currentPage >= totalPages;
    }

    nextPage() {
        const totalPages = Math.ceil(this._filteredEntries.length / this._pageSize);
        
        if (this._currentPage < totalPages) {
            this._currentPage++;
            this.renderTable();
        }
    }

    previousPage() {
        if (this._currentPage > 1) {
            this._currentPage--;
            this.renderTable();
        }
    }

    goToEntryPage(dateStr) {
        // Find which page the entry should be on based on filter and sort
        const entriesToRender = this._filteredEntries;
        
        // Check if entry exists in rendered list
        const entryIndex = entriesToRender.findIndex(e => e.date === dateStr);
        if (entryIndex === -1) {
            // Entry not in filtered list, stay on current page
            return;
        }
        
        // Calculate which page it's on
        const pageNum = Math.floor(entryIndex / this._pageSize) + 1;
        this._currentPage = pageNum;
        
        // Re-render to show the entry on the correct page
        this.renderTable();
        
        setTimeout(() => {
            // Scroll to the entry after render
            const tbody = document.getElementById('tableBody');
            if (tbody) {
                const rows = tbody.querySelectorAll('tr');
                if (rows.length > 0) {
                    rows[Math.min(entryIndex % this._pageSize, rows.length - 1)].scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, 0);
    }

    // Dashboard Table & Recent Entries Rendering
    render() { this.renderTable(); this.renderRecent(); this.updateStats(); }

    editRow(index) {
        document.getElementById('pendingRow')?.remove();
        const e = this.entries[index];
        const tbody = document.getElementById('tableBody');
        // Select the row correctly by finding the one with the matching data-index
        const row = tbody.querySelector(`tr[data-index="${index}"]`);
        if (!row) { this.notify('Entry not found!', 'error'); return; }
        row.id = 'pendingRow';
        row.classList.add('pending-row');
        row.innerHTML = `
            <td class="row-number">${index+1}</td>
            <td><input type="date" class="table-input" id="editDate" value="${e.date}"></td>
            <td><input type="time" class="table-input" id="editTimeIn" value="${e.timeIn}"></td>
            <td><input type="time" class="table-input" id="editTimeOut" value="${e.timeOut}"></td>
            <td><input type="number" class="table-input" id="editBreak" value="${e.breakMins||0}" min="0" style="width:60px"></td>
            <td id="editGross">${this.calcHoursQ(e.timeIn, e.timeOut, 0)}</td>
            <td id="editNet">${e.hours}</td>
            <td class="pending-actions">
                <button class="save-btn" onclick="window.calculator.saveEditRow(${index})"><i class="bi bi-check-lg"></i></button>
                <button class="cancel-btn" onclick="window.calculator.render()"><i class="bi bi-x-lg"></i></button>
            </td>`;
        const upd = () => {
            const tin = document.getElementById('editTimeIn').value;
            const tout = document.getElementById('editTimeOut').value;
            const brk = parseInt(document.getElementById('editBreak').value) || 0;
            if (tin && tout) {
                document.getElementById('editGross').textContent = this.calcHoursQ(tin, tout, 0) || '—';
                document.getElementById('editNet').textContent = this.calcHoursQ(tin, tout, brk) || '—';
            }
        };
        ['editTimeIn','editTimeOut'].forEach(id => document.getElementById(id).addEventListener('change', upd));
        document.getElementById('editBreak').addEventListener('input', upd);
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async saveEditRow(index) {
        const date = document.getElementById('editDate').value;
        const tin = document.getElementById('editTimeIn').value;
        const tout = document.getElementById('editTimeOut').value;
        const brk = parseInt(document.getElementById('editBreak').value) || 0;
        if (!date || !tin || !tout) { this.notify('Fill in all fields!', 'error'); return; }
        const hours = this.calcHours(tin, tout, brk); if (!hours) return;
        this.entries[index] = { date, timeIn: tin, timeOut: tout, breakMins: brk, hours };
        this.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
        await this.saveToFirestore(); this.applyFilter(false); this.goToEntryPage(date); this.notify('Entry updated!', 'success');
    }

    // ====================================================================
    //  MODULE: DASHBOARD — Statistics & Progress
    // ====================================================================
    totalHours() { return this.entries.reduce((s, e) => s + e.hours, 0).toFixed(2); }
    remainingHours() { return Math.max(0, this.hoursNeeded - parseFloat(this.totalHours())).toFixed(2); }
    remainingDays() { return (parseFloat(this.remainingHours()) / 8).toFixed(1); }
    progress() { return Math.round(Math.min(100, parseFloat(this.totalHours()) / this.hoursNeeded * 100)); }

    renderTable() {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        const isFiltered = this._filterMonth;
        // Always use _filteredEntries which has sorting applied
        const entriesToRender = this._filteredEntries;
        
        if (!entriesToRender.length) { 
            const emptyMsg = isFiltered ? 'No entries match your filter.' : 'No entries yet.';
            tbody.innerHTML = `<tr class="empty-row"><td colspan="8"><i class="bi bi-inbox"></i> ${emptyMsg}</td></tr>`; 
            this.updatePaginationInfo(0);
            return; 
        }
        
        // Calculate pagination
        const totalPages = Math.ceil(entriesToRender.length / this._pageSize);
        if (this._currentPage > totalPages) this._currentPage = Math.max(1, totalPages);
        
        const startIdx = (this._currentPage - 1) * this._pageSize;
        const endIdx = startIdx + this._pageSize;
        const pageEntries = entriesToRender.slice(startIdx, endIdx);
        
        pageEntries.forEach((e, displayIndex) => {
            const actualPageIndex = startIdx + displayIndex;
            const actualIndex = this.entries.indexOf(e);
            const i = actualIndex >= 0 ? actualIndex : actualPageIndex;
            const row = document.createElement('tr'); 
            row.dataset.index = i;
            row.setAttribute('data-row-number', actualPageIndex + 1);
            const brk = Number(e.breakMins) || 0;
            let bLbl = '—';
            if (brk > 0) { const h = Math.floor(brk/60), m = brk%60; bLbl = h>0&&m>0?`${h}h ${m}m`:h>0?`${h}h`:`${m}m`; }
            const gross = this.calcHoursQ(e.timeIn, e.timeOut, 0) || parseFloat((e.hours + brk/60).toFixed(2));
            row.innerHTML = `
                <td style="color:var(--text-3);font-size:12px" class="row-number">${actualPageIndex+1}</td>
                <td><strong>${this.formatDate(e.date)}</strong></td>
                <td>${this.to12h(e.timeIn)}</td><td>${this.to12h(e.timeOut)}</td>
                <td>${bLbl}</td><td>${gross}</td><td><strong>${e.hours}</strong></td>
                <td class="row-actions">
                    <button class="edit-btn" onclick="window.calculator.editRow(${i})">Edit</button>
                    <button class="delete-btn" onclick="window.calculator.deleteEntry(${i})">Delete</button>
                </td>`;
            tbody.appendChild(row);
        });
        
        this.updatePaginationInfo(totalPages);
    }

    renderRecent() {
        const tbody = document.getElementById('recentBody');
        if (!tbody) return; // Element doesn't exist yet (landing page still showing)
        tbody.innerHTML = '';
        if (!this.entries.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="6"><i class="bi bi-inbox"></i> No entries yet</td></tr>'; return; }
        [...this.entries].slice(-5).reverse().forEach(e => {
            const row = document.createElement('tr');
            const brk = Number(e.breakMins)||0;
            let bLbl = '—'; if (brk>0) { const h=Math.floor(brk/60),m=brk%60; bLbl=h>0&&m>0?`${h}h ${m}m`:h>0?`${h}h`:`${m}m`; }
            const gross = this.calcHoursQ(e.timeIn, e.timeOut, 0) || parseFloat((e.hours+brk/60).toFixed(2));
            row.innerHTML = `<td><strong>${this.formatDate(e.date)}</strong></td><td>${this.to12h(e.timeIn)}</td><td>${this.to12h(e.timeOut)}</td><td>${bLbl}</td><td>${gross}</td><td><strong>${e.hours}</strong></td>`;
            tbody.appendChild(row);
        });
    }

    updateStats() {
        const total = this.totalHours(), rem = this.remainingHours(), prog = this.progress();
        // Safely update elements only if they exist (app screen loaded)
        const setContent = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        const setStyle = (id, prop, val) => { const el = document.getElementById(id); if (el) el.style[prop] = val; };
        const setValue = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        
        setContent('totalHours', total);
        setContent('hoursRendered', total);
        setContent('remainingHours', rem);
        setContent('entriesCount', this.entries.length);
        setStyle('progressFill', 'width', prog + '%');
        setContent('progressText', prog + '%');
        setValue('hoursNeeded', this.hoursNeeded);
        setContent('targetHoursLabel', this.hoursNeeded);
        setContent('progressEndLabel', this.hoursNeeded + ' hrs');
        setContent('progressMidLabel', (this.hoursNeeded / 2) + ' hrs');
        const msgs = ['Keep going — every hour counts!', "Solid progress!", "Halfway there!", "Almost done!", "OJT Complete! 🎉"];
        setContent('progressMsg', msgs[prog < 25 ? 0 : prog < 50 ? 1 : prog < 75 ? 2 : prog < 100 ? 3 : 4]);
        const fill = document.getElementById('progressFill');
        if (fill) fill.style.background = prog < 50 ? 'linear-gradient(90deg,#3b82f6,#6366f1)' : prog < 80 ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : 'linear-gradient(90deg,#10b981,#059669)';
        
        // Update Est. End Date
        const estEndDate = this.calculateEstEndDate();
        const daysRem = this.calculateDaysRemaining();
        setContent('estEndDate', estEndDate);
        setContent('daysRemaining', daysRem);
    }

    isMonFriOnly() {
        if (!this.entries.length) return false;
        for (let e of this.entries) {
            const date = new Date(e.date + 'T00:00:00');
            const day = date.getDay();
            if (day === 0 || day === 6) return false;  // Found weekend entry
        }
        return true;
    }

    calculateDaysRemaining() {
        const remHours = parseFloat(this.remainingHours());
        if (remHours === 0 || isNaN(remHours)) return 0;
        
        const dailyHours = 8;
        const daysNeeded = Math.ceil(remHours / dailyHours);
        return daysNeeded;
    }

    calculateEstEndDate() {
        const remHours = parseFloat(this.remainingHours());
        if (remHours === 0 || isNaN(remHours)) return 'Done!';
        
        const dailyHours = 8;
        const daysNeeded = Math.ceil(remHours / dailyHours);
        
        let currentDate = new Date();
        let daysAdded = 0;
        
        while (daysAdded < daysNeeded) {
            currentDate.setDate(currentDate.getDate() + 1);
            const day = currentDate.getDay();
            const dateStr = this.dateToInputStr(currentDate);
            
            // Check if day should be counted
            let isWorkday = true;
            if (!this.includeWeekends && (day === 0 || day === 6)) {
                isWorkday = false;  // Skip weekends if not including them
            }
            
            // Check if it's a holiday or absence
            const isHoliday = this.holidays.some(h => h.date === dateStr && h.type === 'holiday');
            const isAbsence = this.holidays.some(h => h.date === dateStr && h.type === 'absence');
            
            if (isWorkday && !isHoliday && !isAbsence) {
                daysAdded++;
            }
        }
        
        // Format as short date
        return this.formatDateShort(this.dateToInputStr(currentDate));
    }

    async updateHoursNeeded() {
        const val = parseInt(document.getElementById('hoursNeeded').value);
        if (isNaN(val) || val <= 0) { this.notify('Enter a valid number > 0!', 'error'); return; }
        this.hoursNeeded = val;
        document.getElementById('profileHoursRequired').value = val;
        await this.saveToFirestore(); this.render(); this.updatePreview();
        this.notify(`Target updated to ${val} hours!`, 'success');
    }

    async clearAll() {
        if (!confirm('Delete ALL time entries? This cannot be undone.')) return;
        this.entries = []; await this.saveToFirestore(); this.render(); this.notify('All entries cleared!', 'success');
    }

    // ====================================================================
    //  MODULE: REPORT INFO — Profile & Export Management
    // ====================================================================
    populateProfileForm() {
        const p = this.profileData;
        document.getElementById('profileName').value = p.name || '';
        document.getElementById('profileSchool').value = p.school || '';
        document.getElementById('profileCompany').value = p.company || '';
        document.getElementById('profilePeriod').value = p.period || '';
        document.getElementById('profileSupervisor').value = p.supervisor || '';
        document.getElementById('profileSupervisorRole').value = p.supervisorRole || '';
        document.getElementById('profileHoursRequired').value = this.hoursNeeded;
        this.updatePreview();
    }

    updatePreview() {
        const p = this.profileData;
        document.getElementById('prev-name').textContent = p.name || '—';
        document.getElementById('prev-school').textContent = p.school || '—';
        document.getElementById('prev-company').textContent = p.company || '—';
        document.getElementById('prev-period').textContent = p.period || '—';
        document.getElementById('prev-hours').textContent = this.hoursNeeded;
        document.getElementById('prev-supervisor').textContent = p.supervisor || '—';
        document.getElementById('prev-supervisor-role').textContent = p.supervisorRole || '—';
    }

    async saveProfile() {
        this.profileData.name = document.getElementById('profileName').value.trim();
        this.profileData.school = document.getElementById('profileSchool').value.trim();
        this.profileData.company = document.getElementById('profileCompany').value.trim();
        this.profileData.period = document.getElementById('profilePeriod').value.trim();
        this.profileData.supervisor = document.getElementById('profileSupervisor').value.trim();
        this.profileData.supervisorRole = document.getElementById('profileSupervisorRole').value.trim();
        const hrs = parseInt(document.getElementById('profileHoursRequired').value);
        if (!isNaN(hrs) && hrs > 0) { this.hoursNeeded = hrs; document.getElementById('hoursNeeded').value = hrs; }
        await this.saveToFirestore(); this.updatePreview(); this.updateStats();
        this.notify('Report info saved!', 'success');
    }

    async exportToExcel() {
        // Navigate to export section
        window.showSection('export');
    }

    generateExportPreview(yearMonth) {
        if (!yearMonth) return;
        
        const [year, month] = yearMonth.split('-');
        const filteredEntries = this.entries.filter(e => {
            const eDate = new Date(e.date + 'T00:00:00');
            return eDate.getFullYear() === parseInt(year) && eDate.getMonth() === parseInt(month) - 1;
        });
        
        const previewDiv = document.getElementById('exportPreviewTable');
        
        if (!filteredEntries.length) {
            previewDiv.innerHTML = '<div class="export-preview-empty"><i class="bi bi-inbox"></i><p>No entries for this month</p></div>';
            return;
        }
        
        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const totalHoursDec = filteredEntries.reduce((sum, e) => sum + e.hours, 0);
        const totalHoursFormatted = (() => {
            const h = Math.floor(totalHoursDec);
            const m = Math.round((totalHoursDec - h) * 60);
            return `${h}:${m.toString().padStart(2, '0')}`;
        })();
        
        // Build preview matching Excel format exactly with proper HTML table
        let html = `<div style="padding: 20px; background: #f5f5f5; min-height: 100vh;">
        <table style="width: 100%; max-width: 900px; margin: 0 auto; border-collapse: collapse; background: white; font-family: Arial, sans-serif; font-size: 11px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        
        <!-- Title Section -->
        <tbody>
        <tr>
            <td colspan="6" style="background: #1f3864; color: white; padding: 15px; text-align: center; border: 2px solid #1f3864;">
                <div style="font-size: 18px; font-weight: bold; margin-bottom: 4px;">DAILY TIME REPORT</div>
                <div style="font-size: 11px;">On-the-Job Training</div>
            </td>
        </tr>
        
        <!-- Profile Section -->
        <tr>
            <td style="background: #deeaf1; padding: 8px 10px; border: 1px solid #b4c6e7; font-weight: 600; font-size: 10px; width: 20%;">Name:</td>
            <td style="background: white; padding: 8px 10px; border: 1px solid #b4c6e7; font-size: 10px; width: 30%;">${this.profileData.name || ''}</td>
            <td style="background: #deeaf1; padding: 8px 10px; border: 1px solid #b4c6e7; font-weight: 600; font-size: 10px; width: 20%;">Required OJT Hours:</td>
            <td style="background: white; padding: 8px 10px; border: 1px solid #b4c6e7; text-align: center; font-weight: 600; font-size: 10px; width: 15%;">${this.hoursNeeded}</td>
        </tr>
        
        <tr>
            <td style="background: #deeaf1; padding: 8px 10px; border: 1px solid #b4c6e7; font-weight: 600; font-size: 10px;">School / University:</td>
            <td style="background: white; padding: 8px 10px; border: 1px solid #b4c6e7; font-size: 10px;">${this.profileData.school || ''}</td>
            <td style="background: #deeaf1; padding: 8px 10px; border: 1px solid #b4c6e7; font-weight: 600; font-size: 10px;">Total Hours Rendered:</td>
            <td style="background: white; padding: 8px 10px; border: 1px solid #b4c6e7; text-align: center; font-weight: 600; font-size: 10px;">${totalHoursFormatted}</td>
        </tr>
        
        <tr>
            <td style="background: #deeaf1; padding: 8px 10px; border: 1px solid #b4c6e7; font-weight: 600; font-size: 10px;">Company / Department:</td>
            <td style="background: white; padding: 8px 10px; border: 1px solid #b4c6e7; font-size: 10px;">${this.profileData.company || ''}</td>
            <td style="background: #deeaf1; padding: 8px 10px; border: 1px solid #b4c6e7; font-weight: 600; font-size: 10px;">Period Covered:</td>
            <td style="background: white; padding: 8px 10px; border: 1px solid #b4c6e7; font-size: 10px;">Month of ${monthName}</td>
        </tr>
        
        <!-- Header Row -->
        <tr style="background: #1f3864; color: white;">
            <td style="background: #1f3864; border: 1px solid #b4c6e7; padding: 10px; text-align: center; font-weight: 600; font-size: 10px; width: 8%;">No.</td>
            <td style="background: #1f3864; border: 1px solid #b4c6e7; padding: 10px; text-align: center; font-weight: 600; font-size: 10px; width: 25%;">Date</td>
            <td style="background: #1f3864; border: 1px solid #b4c6e7; padding: 10px; text-align: center; font-weight: 600; font-size: 10px; width: 22%;">Time In</td>
            <td style="background: #1f3864; border: 1px solid #b4c6e7; padding: 10px; text-align: center; font-weight: 600; font-size: 10px; width: 22%;">Time Out</td>
            <td style="background: #1f3864; border: 1px solid #b4c6e7; padding: 10px; text-align: center; font-weight: 600; font-size: 10px; width: 23%;">Hours Rendered</td>
        </tr>`;
        
        // Add data rows
        for (let i = 0; i < 25; i++) {
            const bgColor = i % 2 === 0 ? '#ffffff' : '#F2F2F2';
            let dateVal = '', inVal = '', outVal = '', hrsVal = '';
            
            if (i < filteredEntries.length) {
                const e = filteredEntries[i];
                const dateObj = new Date(e.date + 'T00:00:00');
                const dtOpts = { month: 'short', day: 'numeric', year: 'numeric' };
                const dayOpts = { weekday: 'short' };
                const dtStr = dateObj.toLocaleDateString('en-US', dtOpts);
                const dayStr = dateObj.toLocaleDateString('en-US', dayOpts);
                dateVal = `${dtStr} (${dayStr})`;
                inVal = this.to12h(e.timeIn);
                outVal = this.to12h(e.timeOut);
                const h = Math.floor(e.hours);
                const m = Math.round((e.hours - h) * 60);
                hrsVal = h + ':' + m.toString().padStart(2, '0');
            }
            
            html += '<tr style="background: ' + bgColor + ';">' +
                '<td style="border: 1px solid #b4c6e7; padding: 8px; text-align: center; font-size: 9px; color: #666666;">' + (i + 1) + '</td>' +
                '<td style="border: 1px solid #b4c6e7; padding: 8px; text-align: left; font-size: 10px;">' + dateVal + '</td>' +
                '<td style="border: 1px solid #b4c6e7; padding: 8px; text-align: center; font-size: 10px;">' + inVal + '</td>' +
                '<td style="border: 1px solid #b4c6e7; padding: 8px; text-align: center; font-size: 10px;">' + outVal + '</td>' +
                '<td style="border: 1px solid #b4c6e7; padding: 8px; text-align: center; font-size: 10px;">' + hrsVal + '</td>' +
            '</tr>';
        }
        
        // Footer note
        html += '<tr>' +
            '<td colspan="5" style="border: 1px solid #b4c6e7; padding: 8px; font-style: italic; font-size: 8px; color: #666666;">* Hours rendered are computed net of 1-hour lunch break, capped at 8 hours/day.</td>' +
        '</tr>';
        
        // Total row
        html += '<tr style="background: #1f3864; color: white;">' +
            '<td colspan="4" style="border: 1px solid #b4c6e7; padding: 12px; text-align: right; font-weight: 600; font-size: 10px;">TOTAL HOURS RENDERED</td>' +
            '<td style="border: 1px solid #b4c6e7; padding: 12px; text-align: center; font-weight: 600; font-size: 10px; background: #1f3864;">' + totalHoursFormatted + '</td>' +
        '</tr>';
        
        // Empty row
        html += '<tr><td colspan="5" style="height: 8px;"></td></tr>';
        
        // Certified correct
        html += '<tr>' +
            '<td colspan="5" style="border: 1px solid #b4c6e7; padding: 8px; font-weight: 600; font-size: 10px; color: #1f3864;">Certified Correct:</td>' +
        '</tr>';
        
        // Signature line
        html += '<tr>' +
            '<td colspan="5" style="border: 1px solid #b4c6e7; padding: 30px 8px 4px 8px; text-align: center; border-bottom: 2px solid #333; font-size: 9px; font-weight: 600;">' + (this.profileData.supervisor || '') + '</td>' +
        '</tr>';
        
        // Role label
        html += '<tr>' +
            '<td colspan="5" style="background: #bdd7ee; border: 1px solid #b4c6e7; padding: 8px; text-align: center; font-size: 9px; font-weight: 600; color: #1f3864;">OJT Supervisor / Immediate Head</td>' +
        '</tr>';
        
        // Date line
        html += '<tr>' +
            '<td colspan="5" style="border: 1px solid #b4c6e7; padding: 8px; font-size: 9px;"><strong>Date:</strong> _____________________</td>' +
        '</tr>';
        
        html += '</tbody></table></div>';
        
        previewDiv.innerHTML = html;
    }

    closeExportModal() {
        // Legacy method - now using section-based navigation
        // Can optionally navigate away or just return
    }

    async confirmExportToExcel() {
        const yearMonth = document.getElementById('exportMonth').value;
        if (!yearMonth) { this.notify('Select a month!', 'error'); return; }
        
        const [year, month] = yearMonth.split('-');
        const filteredEntries = this.entries.filter(e => {
            const eDate = new Date(e.date + 'T00:00:00');
            return eDate.getFullYear() === parseInt(year) && eDate.getMonth() === parseInt(month) - 1;
        });
        
        if (!filteredEntries.length) { this.notify('No entries to export!', 'error'); return; }
        
        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const totalHours = filteredEntries.reduce((sum, e) => sum + e.hours, 0);
        
        // Helper to format decimal hours to H:MM
        const formatHM = (dec) => {
            if (!dec && dec !== 0) return '';
            const h = Math.floor(dec);
            const m = Math.round((dec - h) * 60);
            return `${h}:${m.toString().padStart(2, '0')}`;
        };
        
        // Create workbook with ExcelJS
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Daily Time Report');
        
        // Define colors
        const colors = {
            navy: 'FF1F3864',
            darkNavy: 'FF2E5090',
            profileBg: 'FFDEEAF1',
            lightBlueBg: 'FFBDD7EE',
            white: 'FFFFFFFF',
            darkGray: 'FF000000',
            labelBlue: 'FF1F3864',
            lightGray: 'FFA0A0A0',
            profileBorder: 'FF1F3864',
            dataBorder: 'FFB4C6E7'
        };
        
        // Set column widths - 7 columns with borders
        worksheet.columns = [
            { width: 4.22 },   // Column A: Left border
            { width: 21.33 },  // Column B: No./Labels
            { width: 17.22 },  // Column C: Data/Date
            { width: 15.22 },  // Column D: Time In/School
            { width: 20.33 },  // Column E: Time Out
            { width: 17.22 },  // Column F: Hours/Values
            { width: 4.22 }    // Column G: Right border
        ];
        
        // Style functions
        const titleCellStyle = () => ({
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.navy } },
            font: { name: 'Arial', size: 18, bold: true, color: { argb: colors.white } },
            alignment: { horizontal: 'center', vertical: 'center' }
        });
        
        const subtitleCellStyle = () => ({
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.navy } },
            font: { name: 'Arial', size: 10, bold: false, color: { argb: colors.white } },
            alignment: { horizontal: 'center', vertical: 'center' }
        });
        
        const profileCellStyle = (isLabel = false) => ({
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: isLabel ? colors.profileBg : colors.white } },
            font: { name: 'Arial', size: 10, bold: isLabel, color: { argb: colors.labelBlue } },
            alignment: { horizontal: isLabel ? 'right' : 'center', vertical: 'center', wrapText: true },
            border: {
                top: { style: 'thin', color: { argb: colors.profileBorder } },
                bottom: { style: 'thin', color: { argb: colors.profileBorder } },
                left: { style: 'thin', color: { argb: colors.profileBorder } },
                right: { style: 'thin', color: { argb: colors.profileBorder } }
            }
        });
        
        const headerCellStyle = () => ({
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.darkNavy } },
            font: { name: 'Arial', size: 10, bold: true, color: { argb: colors.white } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
                top: { style: 'thin', color: { argb: colors.dataBorder } },
                bottom: { style: 'thin', color: { argb: colors.dataBorder } },
                left: { style: 'thin', color: { argb: colors.dataBorder } },
                right: { style: 'thin', color: { argb: colors.dataBorder } }
            }
        });
        
        const dataCellStyle = (isBlueRow = false, isDate = false, isNo = false) => ({
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.white } },
            font: { name: 'Arial', size: 10, color: { argb: isNo ? colors.lightGray : colors.darkGray } },
            alignment: { horizontal: isDate ? 'left' : 'center', vertical: 'center' },
            border: {
                top: { style: 'thin', color: { argb: colors.dataBorder } },
                bottom: { style: 'thin', color: { argb: colors.dataBorder } },
                left: { style: 'thin', color: { argb: colors.dataBorder } },
                right: { style: 'thin', color: { argb: colors.dataBorder } }
            }
        });
        
        const totalCellStyle = (isTotal = false, isTotalValue = false) => ({
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: isTotal ? colors.navy : colors.white } },
            font: { name: 'Arial', size: 10, bold: true, color: { argb: isTotalValue ? colors.navy : (isTotal ? colors.white : colors.darkGray) } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
                top: { style: 'thin', color: { argb: colors.dataBorder } },
                bottom: { style: 'thin', color: { argb: colors.dataBorder } },
                left: { style: 'thin', color: { argb: colors.dataBorder } },
                right: { style: 'thin', color: { argb: colors.dataBorder } }
            }
        });
        
        // Row 1: Empty
        let row = worksheet.addRow(['', '', '', '', '', '', '']);
        row.height = 7.5;
        row.getCell(1).border = {};
        row = worksheet.addRow(['', '', '', '', '', '', '']);
        row.height = 54;
        row.getCell(2).value = 'DAILY TIME REPORT\nOn-the-Job Training';
        row.getCell(2).alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
        row.getCell(2).font = { name: 'Arial', size: 16, bold: true, color: { argb: colors.white } };
        row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.navy } };
        row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
        row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
        worksheet.mergeCells('B2:F2');
        
        // Row 3: Empty
        row = worksheet.addRow(['', '', '', '', '', '', '']);
        row.height = 12;
        row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
        row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
        
        // Row 4: Name and Required OJT Hours
        row = worksheet.addRow(['', 'Name:', this.profileData.name || '', '', 'Required OJT Hours:', this.hoursNeeded, '']);
        row.height = 20;
        row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
        row.getCell(2).style = profileCellStyle(true);
        row.getCell(3).style = profileCellStyle(false);
        row.getCell(3).alignment = { horizontal: 'left', vertical: 'center' };
        row.getCell(5).style = profileCellStyle(true);
        row.getCell(6).style = profileCellStyle(false);
        row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
        worksheet.mergeCells('C4:D4');
        
        // Row 5: School / University and Total Hours Rendered
        row = worksheet.addRow(['', 'School / University:', this.profileData.school || '', this.profileData.school || '', 'Total Hours Rendered:', formatHM(totalHours), '']);
        row.height = 31;
        row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
        row.getCell(2).style = profileCellStyle(true);
        row.getCell(2).alignment = { horizontal: 'right', vertical: 'center', wrapText: false };
        row.getCell(3).style = profileCellStyle(false);
        row.getCell(3).alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
        row.getCell(4).style = profileCellStyle(false);
        row.getCell(4).alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
        row.getCell(5).style = profileCellStyle(true);
        row.getCell(5).alignment = { horizontal: 'right', vertical: 'center', wrapText: false };
        row.getCell(6).style = profileCellStyle(false);
        row.getCell(6).font = { name: 'Arial', size: 10, bold: true, color: { argb: colors.navy } };
        row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
        worksheet.mergeCells('C5:D5');
        
        // Row 6: Company / Department
        row = worksheet.addRow(['', 'Company / Department:', this.profileData.company || '', '', '', '', '']);
        row.height = 20;
        row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
        row.getCell(2).style = profileCellStyle(true);
        row.getCell(3).style = profileCellStyle(false);
        row.getCell(3).alignment = { horizontal: 'left', vertical: 'center' };
        row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDEEAF1' } };
        row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
        worksheet.mergeCells('C6:D6');
        
        // Row 7: Period Covered
        row = worksheet.addRow(['', 'Period Covered:', `Month of ${monthName}`, '', '', '', '']);
        row.height = 20;
        row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
        row.getCell(2).style = profileCellStyle(true);
        row.getCell(3).style = profileCellStyle(false);
        row.getCell(3).alignment = { horizontal: 'left', vertical: 'center' };
        row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDEEAF1' } };
        row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
        worksheet.mergeCells('C7:D7');
        
        // Row 8: Empty
        row = worksheet.addRow(['', '', '', '', '', '', '']);
        row.height = 12;
        row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
        row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
        
        // Row 9: Headers
        row = worksheet.addRow(['', 'No.', 'Date', 'Time In', 'Time Out', 'Hours Rendered', '']);
        row.height = 27.8;
        row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5090' } };
        for (let i = 2; i <= 6; i++) {
            row.getCell(i).style = headerCellStyle();
            row.getCell(i).alignment = { horizontal: 'center', vertical: 'center', wrapText: false };
        }
        row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
        row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5090' } };
        
        // Rows 10-34: Data
        for (let i = 0; i < 25; i++) {
            const rowNum = 10 + i;
            row = worksheet.addRow(['', '', '', '', '', '', '']);
            row.height = 18;
            
            row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
            row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5090' } };
            
            // Alternating row fill
            const hasAlternatingFill = i % 2 === 1;
            const fillColor = hasAlternatingFill ? 'FFF2F2F2' : 'FFFFFFFF';
            
            let dateVal = '';
            let inVal = '';
            let outVal = '';
            let hrsVal = '';
            
            if (i < filteredEntries.length) {
                const e = filteredEntries[i];
                const dateObj = new Date(e.date + 'T00:00:00');
                const dtOpts = { month: 'short', day: 'numeric', year: 'numeric' };
                const dayOpts = { weekday: 'short' };
                const dtStr = dateObj.toLocaleDateString('en-US', dtOpts);
                const dayStr = dateObj.toLocaleDateString('en-US', dayOpts);
                dateVal = `${dtStr} (${dayStr})`;
                
                const formatTime = (timeStr) => {
                    if (!timeStr) return '';
                    let [h, m] = timeStr.split(':');
                    h = parseInt(h);
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    h = h % 12;
                    h = h ? h : 12;
                    return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
                };
                
                inVal = formatTime(e.timeIn);
                outVal = formatTime(e.timeOut);
                hrsVal = formatHM(e.hours);
            }
            
            row.getCell(2).value = i + 1;
            row.getCell(2).font = { name: 'Arial', size: 9, color: { argb: 'FF666666' } };
            row.getCell(2).alignment = { horizontal: 'center', vertical: 'center' };
            row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
            row.getCell(2).border = {
                top: { style: 'thin', color: { argb: colors.dataBorder } },
                bottom: { style: 'thin', color: { argb: colors.dataBorder } },
                left: { style: 'thin', color: { argb: colors.dataBorder } },
                right: { style: 'thin', color: { argb: colors.dataBorder } }
            };
            
            row.getCell(3).value = dateVal;
            row.getCell(3).alignment = { horizontal: 'left', vertical: 'center' };
            row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
            row.getCell(3).border = {
                top: { style: 'thin', color: { argb: colors.dataBorder } },
                bottom: { style: 'thin', color: { argb: colors.dataBorder } },
                left: { style: 'thin', color: { argb: colors.dataBorder } },
                right: { style: 'thin', color: { argb: colors.dataBorder } }
            };
            
            row.getCell(4).value = inVal;
            row.getCell(4).alignment = { horizontal: 'center', vertical: 'center' };
            row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
            row.getCell(4).border = {
                top: { style: 'thin', color: { argb: colors.dataBorder } },
                bottom: { style: 'thin', color: { argb: colors.dataBorder } },
                left: { style: 'thin', color: { argb: colors.dataBorder } },
                right: { style: 'thin', color: { argb: colors.dataBorder } }
            };
            
            row.getCell(5).value = outVal;
            row.getCell(5).alignment = { horizontal: 'center', vertical: 'center' };
            row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
            row.getCell(5).border = {
                top: { style: 'thin', color: { argb: colors.dataBorder } },
                bottom: { style: 'thin', color: { argb: colors.dataBorder } },
                left: { style: 'thin', color: { argb: colors.dataBorder } },
                right: { style: 'thin', color: { argb: colors.dataBorder } }
            };
            
            row.getCell(6).value = hrsVal;
            row.getCell(6).alignment = { horizontal: 'center', vertical: 'center' };
            row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
            row.getCell(6).border = {
                top: { style: 'thin', color: { argb: colors.dataBorder } },
                bottom: { style: 'thin', color: { argb: colors.dataBorder } },
                left: { style: 'thin', color: { argb: colors.dataBorder } },
                right: { style: 'thin', color: { argb: colors.dataBorder } }
            };
            
            row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
            row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5090' } };
        }
        
        // Row 35: Footer note
        row = worksheet.addRow(['', '* Hours rendered are computed net of 1-hour lunch break, capped at 8 hours/day.', '', '', '', '', '']);
        row.height = 21.8;
        row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
        row.getCell(2).font = { name: 'Arial', size: 8, italic: true, color: { argb: 'FF666666' } };
        row.getCell(2).alignment = { horizontal: 'left', vertical: 'center' };
        row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
        worksheet.mergeCells('B35:F35');
        
        // Row 36: Total
        row = worksheet.addRow(['', 'TOTAL HOURS RENDERED', '', '', '', formatHM(totalHours), '']);
        row.height = 21.8;
        row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
        
        for (let i = 2; i <= 6; i++) {
            row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.navy } };
            row.getCell(i).font = { name: 'Arial', size: 10, bold: true, color: { argb: colors.white } };
        }
        
        row.getCell(2).alignment = { horizontal: 'right', vertical: 'center' };
        row.getCell(3).alignment = { horizontal: 'center', vertical: 'center' };
        row.getCell(4).alignment = { horizontal: 'center', vertical: 'center' };
        row.getCell(5).alignment = { horizontal: 'center', vertical: 'center' };
        row.getCell(6).alignment = { horizontal: 'center', vertical: 'center' };
        
        row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
        worksheet.mergeCells('B36:E36');
        
        // Row 37: Empty
        row = worksheet.addRow(['', '', '', '', '', '', '']);
        row.height = 14.4;
        row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
        row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
        
        // Row 38: Empty
        row = worksheet.addRow(['', '', '', '', '', '', '']);
        row.height = 14.4;
        row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
        row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
        
        // Rows 39-40: Certified correct and empty
        row = worksheet.addRow(['', 'Certified Correct:', '', '', '', '', '']);
        row.height = 13.5;
        row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
        row.getCell(2).font = { name: 'Arial', size: 10, bold: true, color: { argb: colors.navy } };
        row.getCell(2).alignment = { horizontal: 'left', vertical: 'center' };
        row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
        
        // Row 40: Empty
        row = worksheet.addRow(['', '', '', '', '', '', '']);
        row.height = 13.5;
        row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
        row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
        
        // Row 41: Supervisor section
        row = worksheet.addRow(['', '', '', '', '', '', '']);
        row.height = 36;
        row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
        for (let i = 3; i <= 5; i++) {
            row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDEEAF1' } };
            row.getCell(i).border = {
                bottom: { style: 'medium', color: { argb: colors.navy } }
            };
        }
        row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
        
        // Row 42: Supervisor name
        row = worksheet.addRow(['', '', this.profileData.supervisor || '', '', '', '', '']);
        row.height = 13.5;
        row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
        row.getCell(3).value = this.profileData.supervisor || '';
        row.getCell(3).font = { name: 'Arial', size: 9, color: { argb: 'FF444444' } };
        row.getCell(3).alignment = { horizontal: 'center', vertical: 'center' };
        row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
        worksheet.mergeCells('C42:E42');
        
        // Row 43: Supervisor position
        row = worksheet.addRow(['', '', this.profileData.supervisorRole || 'OJT Supervisor / Immediate Head', '', '', '', '']);
        row.height = 13.5;
        row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
        row.getCell(3).value = this.profileData.supervisorRole || 'OJT Supervisor / Immediate Head';
        row.getCell(3).font = { name: 'Arial', size: 9, color: { argb: 'FF444444' } };
        row.getCell(3).alignment = { horizontal: 'center', vertical: 'center' };
        row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
        worksheet.mergeCells('C43:E43');
        
        // Row 44: OJT Supervisor label
        row = worksheet.addRow(['', '', 'OJT Supervisor / Immediate Head', '', '', '', '']);
        row.height = 18;
        row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
        row.getCell(3).value = 'OJT Supervisor / Immediate Head';
        row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };
        row.getCell(3).font = { name: 'Arial', size: 10, bold: true, color: { argb: colors.navy } };
        row.getCell(3).alignment = { horizontal: 'center', vertical: 'center' };
        row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
        worksheet.mergeCells('C44:E44');
        
        // Row 45: Date line
        row = worksheet.addRow(['', '', 'Date: ___________________________', '', '', '', '']);
        row.height = 13.5;
        row.getCell(1).border = { right: { style: 'medium', color: { argb: colors.navy } } };
        row.getCell(3).value = 'Date: ___________________________';
        row.getCell(3).font = { name: 'Arial', size: 9 };
        row.getCell(3).alignment = { horizontal: 'left', vertical: 'center' };
        row.getCell(7).border = { left: { style: 'medium', color: { argb: colors.navy } } };
        worksheet.mergeCells('C45:D45');
        
        // Bottom border
        row = worksheet.addRow(['', '', '', '', '', '', '']);
        row.height = 7.5;
        row.getCell(1).style = {};
        for (let i = 2; i <= 6; i++) {
            row.getCell(i).border = { 
                top: { style: 'medium', color: { argb: colors.navy } }
            };
        }
        row.getCell(7).style = {};
        
        // Generate Excel file
        try {
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Daily_Time_Report_${this.profileData.name || 'Report'}_${yearMonth}.xlsx`;
            link.click();
            window.URL.revokeObjectURL(url);
            
            this.notify('Excel file downloaded! ✓', 'success');
        } catch (err) {
            console.error('Export error:', err);
            this.notify('Error creating Excel file', 'error');
        }
    }

    // ====================================================================
    //  MODULE: WEEKLY REPORT — Form Management & Document Export
    // ====================================================================
    updateWeeklyDateRange() {
        const startEl = document.getElementById('wkStartDate');
        const endEl = document.getElementById('wkEndDate');
        const infoEl = document.getElementById('dateRangeInfo');
        if (!startEl || !endEl) return;
        
        const startVal = startEl.value;
        const endVal = endEl.value;
        
        if (!startVal || !endVal) {
            infoEl.textContent = 'Select both dates to set day limit';
            
            // Re-enable Add Day button and Total Hours when range is cleared
            const addDayBtn = document.getElementById('addDayRowBtn');
            if (addDayBtn) {
                addDayBtn.style.display = '';
            }
            const totalHoursEl = document.getElementById('wkTotalHours');
            if (totalHoursEl) {
                totalHoursEl.disabled = false;
            }
            
            return;
        }
        
        const start = new Date(startVal + 'T00:00:00');
        const end = new Date(endVal + 'T00:00:00');
        
        if (start > end) {
            infoEl.textContent = 'Start date must be before end date';
            return;
        }
        
        // Calculate days (inclusive)
        const diffMs = end - start;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
        
        // Enforce 7-day maximum
        if (diffDays > 7) {
            const maxEnd = new Date(start);
            maxEnd.setDate(maxEnd.getDate() + 6); // 7 days inclusive
            const maxEndStr = this.dateToInputStr(maxEnd);
            endEl.value = maxEndStr;
            infoEl.textContent = '⚠️ Maximum 7 days allowed. End date adjusted.';
            this.updateWeeklyDateRange(); // Recursively update with correct date
            return;
        }
        
        infoEl.textContent = `${diffDays} day${diffDays !== 1 ? 's' : ''} selected (Max: 7)`;
        
        // Recreate day rows based on selected date range
        this.updateDayRowsFromRange(startVal, endVal, diffDays);
        
        // Update holidays & absences summary
        this.updateHolidaysAndAbsences(startVal, endVal);
    }
    
    updateDayRowsFromRange(startDate, endDate, dayCount) {
        const container = document.getElementById('weeklyDaysContainer');
        if (!container) return;
        
        container.innerHTML = '';
        this._dayRowCount = 0;
        this._weeklyStartDate = startDate;
        this._weeklyEndDate = endDate;
        
        // Generate all dates in range and populate with entries/holidays/absences
        const startObj = new Date(startDate + 'T00:00:00');
        const datesData = []; // Array of { date, entry, holiday, isAbsent }
        let totalHours = 0;
        
        for (let i = 0; i < dayCount; i++) {
            const currentDate = new Date(startObj);
            currentDate.setDate(currentDate.getDate() + i);
            const dateStr = this.dateToInputStr(currentDate);
            
            // Find matching time entry for this date
            const entry = this.entries.find(e => e.date === dateStr);
            
            // Find matching holiday for this date
            const holiday = this.holidays.find(h => h.date === dateStr);
            
            // Determine if it's an absence (no entry, no holiday)
            const isAbsent = !entry && !holiday;
            
            // Accumulate total hours
            if (entry) totalHours += entry.hours || 0;
            
            datesData.push({ date: dateStr, entry, holiday, isAbsent });
        }
        
        // Create day rows with auto-populated data
        datesData.forEach(data => {
            this.addDayRow(true, data); // Pass day data to populate
        });
        
        // Auto-populate total hours and disable it
        const totalHoursEl = document.getElementById('wkTotalHours');
        if (totalHoursEl) {
            totalHoursEl.value = totalHours.toFixed(2);
            totalHoursEl.disabled = true;
        }
        
        // Hide Add Day button when date range is selected
        const addDayBtn = document.getElementById('addDayRowBtn');
        if (addDayBtn) {
            addDayBtn.style.display = 'none';
        }
        
        this.updateAddDayButtonState(); // Update once at the end
    }

    initWeeklyDays() {
        const container = document.getElementById('weeklyDaysContainer');
        if (!container) return; // Element doesn't exist yet (landing page still showing)
        container.innerHTML = '';
        this._dayRowCount = 0;
        this._weeklyStartDate = null;
        this._weeklyEndDate = null;
        for (let i = 0; i < 5; i++) this.addDayRow(true); // Skip button update during init
        this.updateAddDayButtonState(); // Update once at the end
        // Pre-fill student name from profile
        const nameEl = document.getElementById('wkStudentName');
        if (nameEl && !nameEl.value && this.profileData.name) nameEl.value = this.profileData.name;
        const supEl = document.getElementById('wkSupervisorName');
        if (supEl && !supEl.value && this.profileData.supervisor) supEl.value = this.profileData.supervisor;
        const roleEl = document.getElementById('wkSupervisorRole');
        if (roleEl && !roleEl.value && this.profileData.supervisorRole) roleEl.value = this.profileData.supervisorRole;
    }

    addDayRow(skipButtonUpdate = false, dayData = null) {
        const container = document.getElementById('weeklyDaysContainer');
        if (!container) return; // Element doesn't exist yet (landing page still showing)
        // Calculate the day number based on existing rows
        const currentCount = container.querySelectorAll('.weekly-day-row').length;
        
        // Prevent creating more than 7 days
        if (currentCount >= 7) {
            this.notify('Maximum 7 days allowed per week!', 'error');
            return;
        }
        
        const dayNumber = currentCount + 1;
        this._dayRowCount = Math.max(this._dayRowCount, dayNumber); // Track highest ID for unique element IDs
        const id = this._dayRowCount;
        const row = document.createElement('div');
        row.className = 'weekly-day-row';
        row.id = `dayRow-${id}`;
        row.setAttribute('data-day-number', dayNumber); // Store the display number
        
        // Build date input with constraints
        let dateInputAttrs = 'class="form-input"';
        if (this._weeklyStartDate) dateInputAttrs += ` min="${this._weeklyStartDate}"`;
        if (this._weeklyEndDate) dateInputAttrs += ` max="${this._weeklyEndDate}"`;
        // Disable when auto-populated from date range
        if (dayData) dateInputAttrs += ' disabled';
        
        // Prepare values for population
        const dateVal = dayData?.date || '';
        let timeVal = '';
        let timeInputAttrs = 'class="form-input"';
        // Disable when auto-populated from date range
        if (dayData) timeInputAttrs += ' disabled';
        
        if (dayData) {
            if (dayData.entry) {
                // Format time as military format: HH:MM - HH:MM
                timeVal = `${dayData.entry.timeIn} - ${dayData.entry.timeOut}`;
            } else if (dayData.holiday) {
                // Show HOLIDAY
                timeVal = `HOLIDAY`;
            } else if (dayData.isAbsent) {
                // Show ABSENT
                timeVal = `ABSENT`;
            }
        }
        
        // Hide delete button when auto-populated from date range
        const deleteButtonHtml = dayData ? '' : `<button class="weekly-day-remove" onclick="window.calculator.removeDayRow(${id})" title="Remove row"><i class="bi bi-x-lg"></i></button>`;
        
        row.innerHTML = `
            <div class="weekly-day-header">
                <span class="weekly-day-label">Day ${dayNumber}</span>
                ${deleteButtonHtml}
            </div>
            <div class="weekly-day-grid">
                <div class="form-group">
                    <label class="form-label">Date</label>
                    <input type="date" id="wkDate-${id}" ${dateInputAttrs} value="${dateVal}">
                </div>
                <div class="form-group">
                    <label class="form-label">Time-in / Time-out</label>
                    <input type="text" id="wkTime-${id}" placeholder="e.g. 8:04 - 17:00" ${timeInputAttrs} value="${timeVal}">
                </div>
                ${dayData && (dayData.holiday || dayData.isAbsent) ? '' : `
                <div class="form-group">
                    <label class="form-label">Task Performed / Key Accomplishments</label>
                    <textarea id="wkTask-${id}" class="form-input" placeholder="Describe tasks & accomplishments..."></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Skills Developed</label>
                    <textarea id="wkSkills-${id}" class="form-input" placeholder="e.g. Technical, Problem-Solving"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Problems / Challenges Encountered</label>
                    <textarea id="wkProblems-${id}" class="form-input" placeholder="Describe any issues encountered..."></textarea>
                </div>
                `}
            </div>`;
        container.appendChild(row);
        if (!skipButtonUpdate) this.updateAddDayButtonState();
    }

    updateAddDayButtonState() {
        const container = document.getElementById('weeklyDaysContainer');
        const addBtn = document.getElementById('addDayRowBtn');
        if (!container || !addBtn) return;
        
        const currentCount = container.querySelectorAll('.weekly-day-row').length;
        const isDisabled = currentCount >= 7;
        addBtn.disabled = isDisabled;
        addBtn.title = isDisabled ? 'Maximum 7 days allowed' : 'Add another day';
        addBtn.style.opacity = isDisabled ? '0.5' : '1';
    }

    removeDayRow(id) {
        document.getElementById(`dayRow-${id}`)?.remove();
        // Renumber all remaining day rows
        const container = document.getElementById('weeklyDaysContainer');
        if (!container) return;
        const rows = container.querySelectorAll('.weekly-day-row');
        rows.forEach((row, index) => {
            const dayNumber = index + 1;
            row.setAttribute('data-day-number', dayNumber);
            const labelEl = row.querySelector('.weekly-day-label');
            if (labelEl) labelEl.textContent = `Day ${dayNumber}`;
        });
        this.updateAddDayButtonState();
    }

    updateHolidaysAndAbsences(startDateStr, endDateStr) {
        const card = document.getElementById('wkHolidaysCard');
        const summary = document.getElementById('wkHolidaysSummary');
        if (!card || !summary) return;
        
        const start = new Date(startDateStr + 'T00:00:00');
        const end = new Date(endDateStr + 'T00:00:00');
        
        // Generate all dates in range
        const allDates = [];
        const current = new Date(start);
        while (current <= end) {
            const dateStr = this.dateToInputStr(current);
            allDates.push({ dateStr, date: new Date(current) });
            current.setDate(current.getDate() + 1);
        }
        
        // Categorize each date
        let holidays = [];
        let absences = [];
        
        allDates.forEach(({ dateStr, date }) => {
            const holiday = this.holidays.find(h => h.date === dateStr);
            const hasEntry = this.entries.some(e => e.date === dateStr);
            
            if (holiday) {
                holidays.push({ dateStr, name: holiday.name, date });
            } else if (!hasEntry) {
                absences.push({ dateStr, date });
            }
        });
        
        // Build summary HTML
        if (holidays.length === 0 && absences.length === 0) {
            card.style.display = 'none';
            return;
        }
        
        card.style.display = 'block';
        let html = '';
        
        if (holidays.length > 0) {
            html += '<div style="margin-bottom:12px;"><strong style="color:var(--green);">✓ Holidays/Days Off:</strong><br>';
            holidays.forEach(h => {
                const fmt = h.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
                html += `<span style="display:inline-block; margin:4px 8px 4px 0; padding:4px 8px; background:rgba(34,197,94,0.1); border-radius:4px;"><i class="bi bi-calendar-event"></i> ${fmt} – ${this.escHtml(h.name)}</span>`;
            });
            html += '</div>';
        }
        
        if (absences.length > 0) {
            html += '<div><strong style="color:var(--orange);">⚠ Absent:</strong><br>';
            absences.forEach(a => {
                const fmt = a.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
                html += `<span style="display:inline-block; margin:4px 8px 4px 0; padding:4px 8px; background:rgba(234,179,8,0.1); border-radius:4px;"><i class="bi bi-exclamation-triangle"></i> ${fmt}</span>`;
            });
            html += '</div>';
        }
        
        summary.innerHTML = html;
        
        // Store for export
        this._weeklyHolidays = holidays;
        this._weeklyAbsences = absences;
    }

    async saveWeeklyReport() {
        const studentName    = document.getElementById('wkStudentName').value.trim();
        const startDate      = document.getElementById('wkStartDate').value;
        const endDate        = document.getElementById('wkEndDate').value;
        const totalHours     = document.getElementById('wkTotalHours').value.trim();
        const supervisorName = document.getElementById('wkSupervisorName').value.trim();
        const supervisorRole = document.getElementById('wkSupervisorRole').value.trim();
        const dateSigned     = document.getElementById('wkDateSigned').value;

        if (!startDate || !endDate) { this.notify('Please select a date range!', 'error'); return; }

        const days = [];
        document.querySelectorAll('.weekly-day-row').forEach(row => {
            const id = row.id.split('-')[1];
            const date     = document.getElementById(`wkDate-${id}`)?.value || '';
            const time     = document.getElementById(`wkTime-${id}`)?.value.trim() || '';
            const task     = document.getElementById(`wkTask-${id}`)?.value.trim() || '';
            const skills   = document.getElementById(`wkSkills-${id}`)?.value.trim() || '';
            const problems = document.getElementById(`wkProblems-${id}`)?.value.trim() || '';
            if (date || task) days.push({ date, time, task, skills, problems });
        });

        if (!days.length) { this.notify('Please add at least one day entry!', 'error'); return; }

        // Format dates as "Feb 23–27, 2026"
        const inclusiveDates = this.formatDateRange(startDate, endDate);

        const report = {
            id: Date.now(),
            studentName: studentName || this.profileData.name,
            inclusiveDates,
            totalHours,
            supervisorName: supervisorName || this.profileData.supervisor,
            supervisorRole: supervisorRole || this.profileData.supervisorRole,
            dateSigned,
            days,
            holidays: this._weeklyHolidays || [],
            absences: this._weeklyAbsences || [],
            createdAt: new Date().toISOString()
        };

        this.weeklyReports.push(report);
        await this.saveToFirestore();
        this.renderWeeklyReportsList();
        this.notify('Weekly report saved!', 'success');

        // Reset form
        document.getElementById('wkStartDate').value = '';
        document.getElementById('wkEndDate').value = '';
        document.getElementById('wkTotalHours').value = '';
        document.getElementById('wkDateSigned').value = '';
        document.getElementById('dateRangeInfo').textContent = 'Select dates to set day limit';
        this.initWeeklyDays();
    }

    formatDateRange(startStr, endStr) {
        const start = new Date(startStr + 'T00:00:00');
        const end = new Date(endStr + 'T00:00:00');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const startMon = monthNames[start.getMonth()];
        const endMon = monthNames[end.getMonth()];
        const startDay = start.getDate();
        const endDay = end.getDate();
        const year = start.getFullYear();
        
        if (startMon === endMon) {
            return `${startMon} ${startDay}–${endDay}, ${year}`;
        } else {
            return `${startMon} ${startDay}–${endMon} ${endDay}, ${year}`;
        }
    }

    async deleteWeeklyReport(id) {
        if (!confirm('Delete this weekly report?')) return;
        this.weeklyReports = this.weeklyReports.filter(r => r.id !== id);
        await this.saveToFirestore();
        this.renderWeeklyReportsList();
        this.notify('Weekly report deleted!', 'success');
    }

    renderWeeklyReportsList() {
        const container = document.getElementById('weeklyReportsList');
        if (!container) return; // Element doesn't exist yet (landing page still showing)
        if (!this.weeklyReports.length) {
            container.innerHTML = '<div class="empty-weekly"><i class="bi bi-journal-x"></i><p>No weekly reports saved yet.</p></div>';
            return;
        }
        container.innerHTML = '';
        [...this.weeklyReports].reverse().forEach(report => {
            const item = document.createElement('div');
            item.className = 'weekly-report-item';
            const rows = report.days.map(d => `
                <tr>
                    <td>${d.date ? this.formatDateShort(d.date) : ''}</td>
                    <td>${this.escHtml(d.time)}</td>
                    <td class="td-text">${this.escHtml(d.task)}</td>
                    <td class="td-text">${this.escHtml(d.skills)}</td>
                    <td class="td-text">${this.escHtml(d.problems)}</td>
                </tr>`).join('');
            const dateSignedFmt = report.dateSigned ? new Date(report.dateSigned + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
            item.innerHTML = `
                <div class="weekly-report-item-header">
                    <div class="weekly-report-meta">
                        <span class="weekly-report-title">Week: ${this.escHtml(report.inclusiveDates)}</span>
                        <span class="weekly-report-subtitle">
                            ${report.studentName ? '<i class="bi bi-person"></i> ' + this.escHtml(report.studentName) + ' &nbsp;' : ''}
                            ${report.totalHours ? '&bull; Total: ' + this.escHtml(report.totalHours) + ' &nbsp;' : ''}
                            &bull; ${new Date(report.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    <div class="weekly-report-actions">
                        <button class="btn btn-sm btn-primary" onclick="window.calculator.exportWeeklyDocx(${report.id})">
                            <i class="bi bi-file-earmark-word"></i> Download .docx
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.calculator.deleteWeeklyReport(${report.id})">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </div>
                </div>
                <div class="weekly-report-table-wrap">
                    <table class="weekly-report-table">
                        <thead>
                            <tr>
                                <th>Date</th><th>Time-in/<br>Time-out</th>
                                <th>Task Performed/<br>Key Accomplishments</th>
                                <th>Skills<br>Developed</th>
                                <th>Problems/<br>Challenges Encountered</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                ${report.supervisorName ? `<div style="padding:12px 16px;border-top:1px solid var(--border);font-size:12px;color:var(--text-2);">
                    <i class="bi bi-patch-check" style="color:var(--red)"></i>
                    <strong>Verified by:</strong> ${this.escHtml(report.supervisorName)}
                    ${report.supervisorRole ? ' — ' + this.escHtml(report.supervisorRole) : ''}
                    ${dateSignedFmt ? ' &nbsp; | &nbsp; Date: ' + dateSignedFmt : ''}
                </div>` : ''}`;
            container.appendChild(item);
        });
    }

    escHtml(str) {
        return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // ====================================================================
    //  EXPORT WEEKLY REPORT → DOCX  (matches template + Verified By block)
    // ====================================================================
    async exportWeeklyDocx(reportId) {
        const report = this.weeklyReports.find(r => r.id === reportId);
        if (!report) { this.notify('Report not found!', 'error'); return; }

        if (!window.JSZip) {
            await this._loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
        }

        const name           = report.studentName || this.profileData.name || '';
        const inclusiveDates = report.inclusiveDates || '';
        const totalHours     = report.totalHours || '';
        const supervisorName = report.supervisorName || '';
        const supervisorRole = report.supervisorRole || '';
        const days           = report.days || [];
        const holidays       = report.holidays || [];
        const absences       = report.absences || [];

        // Format date signed
        let dateSignedDisplay = '';
        if (report.dateSigned) {
            const d = new Date(report.dateSigned + 'T00:00:00');
            dateSignedDisplay = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }

        // ── Table rows ──
        const tableRowsXml = days.map(d => {
            const dateTxt     = d.date ? this.formatDateShort(d.date) : '';
            const timeTxt     = this._xmlEsc(d.time || '');
            const taskTxt     = this._xmlEsc(d.task || '');
            const skillsTxt   = this._xmlEsc(d.skills || '');
            const problemsTxt = this._xmlEsc(d.problems || '');
            
            // Check if this day is a holiday or absence (check time field directly)
            const isHolidayOrAbsent = timeTxt === 'HOLIDAY' || timeTxt === 'ABSENT';
            
            let secondColumnContent = `<w:r><w:t>${timeTxt}</w:t></w:r>`;
            let thirdColumnContent = `<w:r><w:t xml:space="preserve">${taskTxt}</w:t></w:r>`;
            
            if (isHolidayOrAbsent) {
                secondColumnContent = `<w:r></w:r>`;
                if (timeTxt === 'HOLIDAY') {
                    // Find holiday name from holidays list
                    const dayDate = d.date;
                    const holiday = holidays.find(h => h.date === dayDate);
                    thirdColumnContent = `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>HOLIDAY</w:t></w:r>` + (holiday && holiday.name ? `<w:r><w:t> (${this._xmlEsc(holiday.name)})</w:t></w:r>` : '');
                } else {
                    thirdColumnContent = `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>ABSENT</w:t></w:r>`;
                }
            }
            
            return `
<w:tr>
  <w:trPr><w:trHeight w:val="1152"/></w:trPr>
  <w:tc><w:tcPr><w:tcW w:w="1263" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="8" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r><w:t>${dateTxt}</w:t></w:r></w:p>
  </w:tc>
  <w:tc><w:tcPr><w:tcW w:w="1276" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="8" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>${secondColumnContent}</w:p>
  </w:tc>
  <w:tc><w:tcPr><w:tcW w:w="3258" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="8" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>${thirdColumnContent}</w:p>
  </w:tc>
  <w:tc><w:tcPr><w:tcW w:w="2409" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="8" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r><w:t>${skillsTxt}</w:t></w:r></w:p>
  </w:tc>
  <w:tc><w:tcPr><w:tcW w:w="2564" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="8" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r><w:t xml:space="preserve">${problemsTxt}</w:t></w:r></w:p>
  </w:tc>
</w:tr>`;
        }).join('\n');

        // ── Holidays/absences section removed ──
        let holidaysAbsencesXml = '';

        const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  mc:Ignorable="w14">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:pPr>
      <w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Weekly Accomplishment Report</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t xml:space="preserve">Name: </w:t></w:r>
      <w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>${this._xmlEsc(name)}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t xml:space="preserve">Inclusive Dates: </w:t></w:r>
      <w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">${this._xmlEsc(inclusiveDates)}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t xml:space="preserve">Total Number of Hours: </w:t></w:r>
      <w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>${this._xmlEsc(totalHours)}</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="10800" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:left w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:bottom w:val="none"/>
          <w:right w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:insideH w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:insideV w:val="single" w:sz="8" w:space="0" w:color="000000"/>
        </w:tblBorders>
        <w:tblLayout w:type="fixed"/>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="1263"/><w:gridCol w:w="1276"/><w:gridCol w:w="3258"/>
        <w:gridCol w:w="2409"/><w:gridCol w:w="2564"/>
      </w:tblGrid>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="1263" w:type="dxa"/><w:tcBorders><w:bottom w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Date</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1276" w:type="dxa"/><w:tcBorders><w:bottom w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Time-in/ Time-out</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3258" w:type="dxa"/><w:tcBorders><w:bottom w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Task Performed/ Key Accomplishments</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2409" w:type="dxa"/><w:tcBorders><w:bottom w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Skills Developed</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2564" w:type="dxa"/><w:tcBorders><w:bottom w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Problems/ Challenges Encountered</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      ${tableRowsXml}
    </w:tbl>
    <w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>
    ${holidaysAbsencesXml}
    <w:p>
      <w:r><w:rPr><w:i/></w:rPr><w:t>Verified by:</w:t></w:r>
    </w:p>
    <w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>
    <w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="10800" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/>
          <w:left w:val="none"/>
          <w:bottom w:val="none"/>
          <w:right w:val="none"/>
          <w:insideH w:val="none"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
        <w:tblLayout w:type="fixed"/>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="5400"/><w:gridCol w:w="5400"/>
      </w:tblGrid>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="5400" w:type="dxa"/><w:tcBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders></w:tcPr>
          <w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">${this._xmlEsc(supervisorName)}</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcW w:w="5400" w:type="dxa"/><w:tcBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders></w:tcPr>
          <w:p><w:pPr><w:spacing w:after="0"/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>${this._xmlEsc(dateSignedDisplay)}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="5400" w:type="dxa"/><w:tcBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders></w:tcPr>
          <w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:t xml:space="preserve">Supervisor's Name over Signature</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcW w:w="5400" w:type="dxa"/><w:tcBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders></w:tcPr>
          <w:p><w:pPr><w:spacing w:after="0"/><w:jc w:val="right"/></w:pPr><w:r><w:t>Date</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
    ${supervisorRole ? `<w:p><w:r><w:t>${this._xmlEsc(supervisorRole)}</w:t></w:r></w:p>` : ''}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

        const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:style>
  <w:style w:type="table" w:styleId="a"><w:name w:val="Normal Table"/><w:tblPr><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
</w:styles>`;

        const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

        const relsRoot = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

        const relsDoc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

        const zip = new window.JSZip();
        zip.file('[Content_Types].xml', contentTypes);
        zip.folder('_rels').file('.rels', relsRoot);
        const wf = zip.folder('word');
        wf.file('document.xml', docXml);
        wf.file('styles.xml', stylesXml);
        wf.folder('_rels').file('document.xml.rels', relsDoc);

        const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeName = (name || 'report').replace(/\s+/g, '_').toUpperCase();
        a.href = url;
        a.download = `Weekly_Accomplishment_Report_${safeName}.docx`;
        a.click();
        URL.revokeObjectURL(url);
        this.notify('Weekly report downloaded!', 'success');
    }

    _xmlEsc(str) {
        return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
    }

    _loadScript(src) {
        return new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = src; s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
        });
    }

    notify(msg, type = 'info') {
        const notif = document.createElement('div');
        notif.className = `notification notification-${type}`;
        notif.textContent = msg;
        document.body.appendChild(notif);
        
        // Trigger animation on next frame
        requestAnimationFrame(() => {
            notif.classList.add('show');
        });
        
        // Stay visible for 6 seconds, then fade out over 0.5 seconds
        setTimeout(() => {
            notif.classList.remove('show');
        }, 6000);
        
        // Remove from DOM after fade completes
        setTimeout(() => notif.remove(), 6500);
    }

    // ====================================================================
    //  MODULE: HOLIDAYS — Holiday & Days Off Management
    // ====================================================================
    async addHoliday() {
        const dateEl = document.getElementById('holidayDate');
        const nameEl = document.getElementById('holidayName');
        
        const date = dateEl?.value;
        const name = nameEl?.value.trim();
        
        if (!date) {
            this.notify('Please select a date!', 'error');
            return;
        }
        
        if (!name) {
            this.notify('Please enter a holiday name!', 'error');
            return;
        }
        
        // Check for duplicate dates
        if (this.holidays.some(h => h.date === date)) {
            this.notify('A holiday already exists for this date!', 'error');
            return;
        }
        
        this.holidays.push({ id: Date.now(), date, name });
        this.holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        await this.saveToFirestore();
        this.renderHolidays();
        
        // Clear form
        dateEl.value = '';
        nameEl.value = '';
        this.notify('Holiday added!', 'success');
    }
    
    async deleteHoliday(id) {
        if (!confirm('Delete this holiday?')) return;
        
        this.holidays = this.holidays.filter(h => h.id !== id);
        await this.saveToFirestore();
        this.renderHolidays();
        this.notify('Holiday deleted!', 'success');
    }
    
    renderHolidays() {
        const tbody = document.getElementById('holidaysBody');
        if (!tbody) return; // Element doesn't exist yet
        
        tbody.innerHTML = '';
        
        if (!this.holidays.length) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="3"><i class="bi bi-inbox"></i> No holidays added yet.</td></tr>';
            return;
        }
        
        this.holidays.forEach(h => {
            const row = document.createElement('tr');
            const dateObj = new Date(h.date + 'T00:00:00');
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            
            row.innerHTML = `
                <td><strong>${dateStr}</strong></td>
                <td>${this.escHtml(h.name)}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="window.calculator.deleteHoliday(${h.id})">
                        <i class="bi bi-trash3"></i> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}



