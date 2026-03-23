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
    const titles = { dashboard: 'Dashboard', entries: 'Time Entries', weekly: 'Weekly Report', profile: 'Report Information' };
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
        this._dayRowCount = 0;
    }

    async init() {
        await this.loadFromFirestore();
        this.initEventListeners();
        this.setupDatePicker();
        this.setupWeekendToggle();
        this.populateProfileForm();
        this.render();
        this.renderWeeklyReportsList();
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
                weeklyReports: this.weeklyReports
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

    // ---- Add Entry ----
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

    // ---- Duplicate ----
    duplicateEntry() {
        if (!this.entries.length) { this.notify('No previous entry to duplicate!', 'error'); return; }
        const ex = document.getElementById('pendingRow'); if (ex) ex.remove();
        const last = this.entries[this.entries.length - 1];
        const nextDate = this.dateToInputStr(this.getNextWorkDate(new Date(last.date + 'T00:00:00')));
        const tbody = document.getElementById('tableBody');
        tbody.querySelector('.empty-row')?.remove();
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
        tbody.appendChild(row);
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
        await this.saveToFirestore(); this.render(); this.notify('Entry saved!', 'success');
    }

    cancelPendingRow() {
        document.getElementById('pendingRow')?.remove();
        if (!this.entries.length) document.getElementById('tableBody').innerHTML = '<tr class="empty-row"><td colspan="8"><i class="bi bi-inbox"></i> No entries yet.</td></tr>';
    }

    async deleteEntry(index) {
        if (!confirm('Delete this entry?')) return;
        this.entries.splice(index, 1);
        await this.saveToFirestore(); this.render(); this.notify('Entry deleted!', 'success');
    }

    editRow(index) {
        document.getElementById('pendingRow')?.remove();
        const e = this.entries[index];
        const tbody = document.getElementById('tableBody');
        const row = tbody.querySelectorAll('tr[data-index]')[index];
        row.innerHTML = `
            <td>${index+1}</td>
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
        await this.saveToFirestore(); this.render(); this.notify('Entry updated!', 'success');
    }

    // ---- Stats ----
    totalHours() { return this.entries.reduce((s, e) => s + e.hours, 0).toFixed(2); }
    remainingHours() { return Math.max(0, this.hoursNeeded - parseFloat(this.totalHours())).toFixed(2); }
    remainingDays() { return (parseFloat(this.remainingHours()) / 8).toFixed(1); }
    progress() { return Math.round(Math.min(100, parseFloat(this.totalHours()) / this.hoursNeeded * 100)); }

    // ---- Render ----
    render() { this.renderTable(); this.renderRecent(); this.updateStats(); }

    renderTable() {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';
        if (!this.entries.length) { tbody.innerHTML = '<tr class="empty-row"><td colspan="8"><i class="bi bi-inbox"></i> No entries yet.</td></tr>'; return; }
        this.entries.forEach((e, i) => {
            const row = document.createElement('tr'); row.dataset.index = i;
            const brk = Number(e.breakMins) || 0;
            let bLbl = '—';
            if (brk > 0) { const h = Math.floor(brk/60), m = brk%60; bLbl = h>0&&m>0?`${h}h ${m}m`:h>0?`${h}h`:`${m}m`; }
            const gross = this.calcHoursQ(e.timeIn, e.timeOut, 0) || parseFloat((e.hours + brk/60).toFixed(2));
            row.innerHTML = `
                <td style="color:var(--text-3);font-size:12px">${i+1}</td>
                <td><strong>${this.formatDate(e.date)}</strong></td>
                <td>${this.to12h(e.timeIn)}</td><td>${this.to12h(e.timeOut)}</td>
                <td>${bLbl}</td><td>${gross}</td><td><strong>${e.hours}</strong></td>
                <td class="row-actions">
                    <button class="edit-btn" onclick="window.calculator.editRow(${i})">Edit</button>
                    <button class="delete-btn" onclick="window.calculator.deleteEntry(${i})">Delete</button>
                </td>`;
            tbody.appendChild(row);
        });
    }

    renderRecent() {
        const tbody = document.getElementById('recentBody');
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
        const total = this.totalHours(), rem = this.remainingHours(), days = this.remainingDays(), prog = this.progress();
        document.getElementById('totalHours').textContent = total;
        document.getElementById('hoursRendered').textContent = total;
        document.getElementById('remainingHours').textContent = rem;
        document.getElementById('remainingDays').textContent = days;
        document.getElementById('entriesCount').textContent = this.entries.length;
        document.getElementById('progressFill').style.width = prog + '%';
        document.getElementById('progressText').textContent = prog + '%';
        document.getElementById('hoursNeeded').value = this.hoursNeeded;
        document.getElementById('targetHoursLabel').textContent = this.hoursNeeded;
        document.getElementById('progressEndLabel').textContent = this.hoursNeeded + ' hrs';
        document.getElementById('progressMidLabel').textContent = (this.hoursNeeded / 2) + ' hrs';
        const msgs = ['Keep going — every hour counts!', "Solid progress!", "Halfway there!", "Almost done!", "OJT Complete! 🎉"];
        document.getElementById('progressMsg').textContent = msgs[prog < 25 ? 0 : prog < 50 ? 1 : prog < 75 ? 2 : prog < 100 ? 3 : 4];
        const fill = document.getElementById('progressFill');
        fill.style.background = prog < 50 ? 'linear-gradient(90deg,#3b82f6,#6366f1)' : prog < 80 ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : 'linear-gradient(90deg,#10b981,#059669)';
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

    // ---- Profile ----
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

    // ====================================================================
    //  WEEKLY REPORT
    // ====================================================================
    initWeeklyDays() {
        const container = document.getElementById('weeklyDaysContainer');
        container.innerHTML = '';
        this._dayRowCount = 0;
        for (let i = 0; i < 5; i++) this.addDayRow();
        // Pre-fill student name from profile
        const nameEl = document.getElementById('wkStudentName');
        if (nameEl && !nameEl.value && this.profileData.name) nameEl.value = this.profileData.name;
        const supEl = document.getElementById('wkSupervisorName');
        if (supEl && !supEl.value && this.profileData.supervisor) supEl.value = this.profileData.supervisor;
        const roleEl = document.getElementById('wkSupervisorRole');
        if (roleEl && !roleEl.value && this.profileData.supervisorRole) roleEl.value = this.profileData.supervisorRole;
    }

    addDayRow() {
        this._dayRowCount++;
        const id = this._dayRowCount;
        const container = document.getElementById('weeklyDaysContainer');
        const row = document.createElement('div');
        row.className = 'weekly-day-row';
        row.id = `dayRow-${id}`;
        row.innerHTML = `
            <div class="weekly-day-header">
                <span class="weekly-day-label">Day ${id}</span>
                <button class="weekly-day-remove" onclick="window.calculator.removeDayRow(${id})" title="Remove row">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
            <div class="weekly-day-grid">
                <div class="form-group">
                    <label class="form-label">Date</label>
                    <input type="date" id="wkDate-${id}" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Time-in / Time-out</label>
                    <input type="text" id="wkTime-${id}" placeholder="e.g. 8:04 - 17:00" class="form-input">
                </div>
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
            </div>`;
        container.appendChild(row);
    }

    removeDayRow(id) {
        document.getElementById(`dayRow-${id}`)?.remove();
    }

    async saveWeeklyReport() {
        const studentName    = document.getElementById('wkStudentName').value.trim();
        const inclusiveDates = document.getElementById('wkInclusiveDates').value.trim();
        const totalHours     = document.getElementById('wkTotalHours').value.trim();
        const supervisorName = document.getElementById('wkSupervisorName').value.trim();
        const supervisorRole = document.getElementById('wkSupervisorRole').value.trim();
        const dateSigned     = document.getElementById('wkDateSigned').value;

        if (!inclusiveDates) { this.notify('Please enter inclusive dates!', 'error'); return; }

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

        const report = {
            id: Date.now(),
            studentName: studentName || this.profileData.name,
            inclusiveDates,
            totalHours,
            supervisorName: supervisorName || this.profileData.supervisor,
            supervisorRole: supervisorRole || this.profileData.supervisorRole,
            dateSigned,
            days,
            createdAt: new Date().toISOString()
        };

        this.weeklyReports.push(report);
        await this.saveToFirestore();
        this.renderWeeklyReportsList();
        this.notify('Weekly report saved!', 'success');

        // Reset form
        document.getElementById('wkInclusiveDates').value = '';
        document.getElementById('wkTotalHours').value = '';
        document.getElementById('wkDateSigned').value = '';
        this.initWeeklyDays();
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
            return `
<w:tr>
  <w:trPr><w:trHeight w:val="1152"/></w:trPr>
  <w:tc><w:tcPr><w:tcW w:w="1260" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r><w:t>${dateTxt}</w:t></w:r></w:p>
  </w:tc>
  <w:tc><w:tcPr><w:tcW w:w="1545" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r><w:t>${timeTxt}</w:t></w:r></w:p>
  </w:tc>
  <w:tc><w:tcPr><w:tcW w:w="3675" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r><w:t xml:space="preserve">${taskTxt}</w:t></w:r></w:p>
  </w:tc>
  <w:tc><w:tcPr><w:tcW w:w="2310" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r><w:t>${skillsTxt}</w:t></w:r></w:p>
  </w:tc>
  <w:tc><w:tcPr><w:tcW w:w="2010" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r><w:t xml:space="preserve">${problemsTxt}</w:t></w:r></w:p>
  </w:tc>
</w:tr>`;
        }).join('\n');

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
      <w:r><w:t>_____________________________________</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t xml:space="preserve">Inclusive Dates: </w:t></w:r>
      <w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">${this._xmlEsc(inclusiveDates)}  </w:t></w:r>
      <w:r><w:t>___________________________</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t xml:space="preserve">Total Number of Hours: </w:t></w:r>
      <w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>${this._xmlEsc(totalHours)}</w:t></w:r>
      <w:r><w:t>______________________</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="10800" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:left w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:right w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:insideH w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:insideV w:val="single" w:sz="8" w:space="0" w:color="000000"/>
        </w:tblBorders>
        <w:tblLayout w:type="fixed"/>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="1260"/><w:gridCol w:w="1545"/><w:gridCol w:w="3675"/>
        <w:gridCol w:w="2310"/><w:gridCol w:w="2010"/>
      </w:tblGrid>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="1260" w:type="dxa"/><w:tcBorders><w:bottom w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Date</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1545" w:type="dxa"/><w:tcBorders><w:bottom w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Time-in/ Time-out</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3675" w:type="dxa"/><w:tcBorders><w:bottom w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Task Performed/ Key Accomplishments</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2310" w:type="dxa"/><w:tcBorders><w:bottom w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Skills Developed</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2010" w:type="dxa"/><w:tcBorders><w:bottom w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Problems/ Challenges Encountered</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
      ${tableRowsXml}
    </w:tbl>
    <w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>
    <w:p>
      <w:r><w:rPr><w:i/></w:rPr><w:t>Verified by:</w:t></w:r>
    </w:p>
    <w:p><w:pPr><w:spacing w:after="720"/></w:pPr></w:p>
    <w:p>
      <w:r>
        <w:rPr><w:u w:val="single"/></w:rPr>
        <w:t xml:space="preserve">${this._xmlEsc(supervisorName)}                    </w:t>
      </w:r>
      <w:r><w:t xml:space="preserve">         </w:t></w:r>
      <w:r>
        <w:rPr><w:u w:val="single"/></w:rPr>
        <w:t xml:space="preserve">${this._xmlEsc(dateSignedDisplay)}          </w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r><w:t xml:space="preserve">(Name of ojt supervisor)       </w:t></w:r>
      <w:r><w:t xml:space="preserve">         Date</w:t></w:r>
    </w:p>
    ${supervisorRole ? `<w:p><w:r><w:t>${this._xmlEsc(supervisorRole)}</w:t></w:r></w:p>` : ''}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
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

      <w:r><w:t>${timeTxt}</w:t></w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr>
      <w:tcW w:w="3675" w:type="dxa"/>
      <w:tcBorders><w:top w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders>
      <w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>
      <w:vAlign w:val="center"/>
    </w:tcPr>
    <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>
      <w:r><w:t xml:space="preserve">${taskTxt}</w:t></w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr>
      <w:tcW w:w="2310" w:type="dxa"/>
      <w:tcBorders><w:top w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders>
      <w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>
      <w:vAlign w:val="center"/>
    </w:tcPr>
    <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>
      <w:r><w:t>${skillsTxt}</w:t></w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr>
      <w:tcW w:w="2010" w:type="dxa"/>
      <w:tcBorders><w:top w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders>
      <w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>
      <w:vAlign w:val="center"/>
    </w:tcPr>
    <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>
      <w:r><w:t xml:space="preserve">${problemsTxt}</w:t></w:r>
    </w:p>
  </w:tc>
</w:tr>`;
        }).join('\n');

        // ── document.xml ──
        const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  mc:Ignorable="w14">
  <w:body>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
        <w:t>Weekly Accomplishment Report</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r><w:t xml:space="preserve">Name: </w:t></w:r>
      <w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>${this._xmlEsc(name)}</w:t></w:r>
      <w:r><w:t>_____________________________________</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t xml:space="preserve">Inclusive Dates: </w:t></w:r>
      <w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">${this._xmlEsc(inclusiveDates)}  </w:t></w:r>
      <w:r><w:t>___________________________</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t xml:space="preserve">Total Number of Hours: </w:t></w:r>
      <w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>${this._xmlEsc(totalHours)}</w:t></w:r>
      <w:r><w:t>______________________</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="10800" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:left w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:right w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:insideH w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:insideV w:val="single" w:sz="8" w:space="0" w:color="000000"/>
        </w:tblBorders>
        <w:tblLayout w:type="fixed"/>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="1260"/>
        <w:gridCol w:w="1545"/>
        <w:gridCol w:w="3675"/>
        <w:gridCol w:w="2310"/>
        <w:gridCol w:w="2010"/>
      </w:tblGrid>
      <!-- HEADER ROW -->
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1260" w:type="dxa"/>
            <w:tcBorders><w:bottom w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders>
            <w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/></w:rPr></w:pPr>
            <w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Date</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1545" w:type="dxa"/>
            <w:tcBorders><w:bottom w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders>
            <w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/></w:rPr></w:pPr>
            <w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Time-in/ Time-out</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="3675" w:type="dxa"/>
            <w:tcBorders><w:bottom w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders>
            <w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/></w:rPr></w:pPr>
            <w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Task Performed/ Key Accomplishments</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2310" w:type="dxa"/>
            <w:tcBorders><w:bottom w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders>
            <w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/></w:rPr></w:pPr>
            <w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Skills Developed</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2010" w:type="dxa"/>
            <w:tcBorders><w:bottom w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders>
            <w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/></w:rPr></w:pPr>
            <w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>Problems/ Challenges Encountered</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
      ${tableRowsXml}
    </w:tbl>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

        // ── styles.xml (minimal) ──
        const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"