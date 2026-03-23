// ============================================================
//  FIREBASE CONFIG
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
    signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore, doc, setDoc, getDoc
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

// ============================================================
//  LANDING PAGE HELPERS
// ============================================================
window.landingTab = (tab) => {
    document.getElementById('landingLoginForm').classList.toggle('active', tab === 'login');
    document.getElementById('landingSignupForm').classList.toggle('active', tab === 'signup');
    document.getElementById('landingLoginForm').style.display = tab === 'login' ? 'flex' : 'none';
    document.getElementById('landingSignupForm').style.display = tab === 'signup' ? 'flex' : 'none';
    document.querySelectorAll('.landing-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll(`.landing-tab[onclick="landingTab('${tab}')"]`).forEach(t => t.classList.add('active'));
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
onAuthStateChanged(auth, async (user) => {
    showLoading(true);
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
        // Reset login button
        const lb = document.getElementById('lLoginBtn');
        const sb = document.getElementById('lSignupBtn');
        if (lb) { lb.disabled = false; lb.textContent = 'Sign In'; }
        if (sb) { sb.disabled = false; sb.textContent = 'Create Account'; }
    }
    showLoading(false);
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
            const snap = await getDoc(doc(db, 'users', this.userId));
            if (snap.exists()) {
                const d = snap.data();
                this.entries = (d.entries || []).map(e => ({ ...e, breakMins: Number(e.breakMins) || 0, hours: parseFloat(e.hours) || 0 }));
                this.hoursNeeded = d.hoursNeeded || 500;
                this.includeWeekends = d.includeWeekends ?? true;
                if (d.profileData) this.profileData = { ...this.profileData, ...d.profileData };
                this.weeklyReports = d.weeklyReports || [];
            }
        } catch (e) { console.error('Load error:', e); this.notify('Could not load data.', 'error'); }
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
        // Start with 5 day rows (Mon-Fri)
        for (let i = 0; i < 5; i++) this.addDayRow();
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
        const inclusiveDates = document.getElementById('wkInclusiveDates').value.trim();
        const totalHours = document.getElementById('wkTotalHours').value.trim();
        if (!inclusiveDates) { this.notify('Please enter inclusive dates!', 'error'); return; }

        const days = [];
        document.querySelectorAll('.weekly-day-row').forEach(row => {
            const id = row.id.split('-')[1];
            const date = document.getElementById(`wkDate-${id}`)?.value || '';
            const time = document.getElementById(`wkTime-${id}`)?.value.trim() || '';
            const task = document.getElementById(`wkTask-${id}`)?.value.trim() || '';
            const skills = document.getElementById(`wkSkills-${id}`)?.value.trim() || '';
            const problems = document.getElementById(`wkProblems-${id}`)?.value.trim() || '';
            // Only add row if at least date or task is filled
            if (date || task) days.push({ date, time, task, skills, problems });
        });

        if (!days.length) { this.notify('Please add at least one day entry!', 'error'); return; }

        const report = {
            id: Date.now(),
            name: this.profileData.name,
            inclusiveDates,
            totalHours,
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
            const rows = report.days.map((d, i) => `
                <tr>
                    <td>${d.date ? this.formatDateShort(d.date) : ''}</td>
                    <td>${this.escHtml(d.time)}</td>
                    <td class="td-text">${this.escHtml(d.task)}</td>
                    <td class="td-text">${this.escHtml(d.skills)}</td>
                    <td class="td-text">${this.escHtml(d.problems)}</td>
                </tr>`).join('');
            item.innerHTML = `
                <div class="weekly-report-item-header">
                    <div class="weekly-report-meta">
                        <span class="weekly-report-title">Week: ${this.escHtml(report.inclusiveDates)}</span>
                        <span class="weekly-report-subtitle">${report.totalHours ? 'Total: ' + this.escHtml(report.totalHours) : ''} &bull; ${new Date(report.createdAt).toLocaleDateString()}</span>
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
                                <th>Date</th>
                                <th>Time-in/<br>Time-out</th>
                                <th>Task Performed/<br>Key Accomplishments</th>
                                <th>Skills<br>Developed</th>
                                <th>Problems/<br>Challenges Encountered</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>`;
            container.appendChild(item);
        });
    }

    escHtml(str) {
        return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // ====================================================================
    //  EXPORT WEEKLY REPORT → DOCX
    //  Template exactly matches Weekly_Accomplishment_Report sample
    // ====================================================================
    async exportWeeklyDocx(reportId) {
        const report = this.weeklyReports.find(r => r.id === reportId);
        if (!report) { this.notify('Report not found!', 'error'); return; }

        // Load JSZip from CDN
        if (!window.JSZip) {
            await this._loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
        }

        const name = report.name || this.profileData.name || '';
        const inclusiveDates = report.inclusiveDates || '';
        const totalHours = report.totalHours || '';
        const days = report.days || [];

        // ── Build table rows XML ──
        const tableRowsXml = days.map(d => {
            const dateTxt = d.date ? this.formatDateShort(d.date) : '';
            const timeTxt = this._xmlEsc(d.time || '');
            const taskTxt = this._xmlEsc(d.task || '');
            const skillsTxt = this._xmlEsc(d.skills || '');
            const problemsTxt = this._xmlEsc(d.problems || '');
            return `
<w:tr>
  <w:trPr><w:trHeight w:val="1152"/></w:trPr>
  <w:tc>
    <w:tcPr>
      <w:tcW w:w="1260" w:type="dxa"/>
      <w:tcBorders><w:top w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders>
      <w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>
      <w:vAlign w:val="center"/>
    </w:tcPr>
    <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>
      <w:r><w:t>${dateTxt}</w:t></w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr>
      <w:tcW w:w="1545" w:type="dxa"/>
      <w:tcBorders><w:top w:val="single" w:sz="18" w:space="0" w:color="000000"/></w:tcBorders>
      <w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>
      <w:vAlign w:val="center"/>
    </w:tcPr>
    <w:p><w:pPr><w:widowControl w:val="0"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>
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
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr>
  </w:style>
  <w:style w:type="table" w:styleId="a">
    <w:name w:val="Normal Table"/>
    <w:tblPr>
      <w:tblCellMar>
        <w:top w:w="0" w:type="dxa"/>
        <w:left w:w="108" w:type="dxa"/>
        <w:bottom w:w="0" w:type="dxa"/>
        <w:right w:w="108" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>
  </w:style>
</w:styles>`;

        // ── [Content_Types].xml ──
        const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

        // ── _rels/.rels ──
        const relsRoot = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

        // ── word/_rels/document.xml.rels ──
        const relsDoc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

        // ── Package with JSZip ──
        const zip = new window.JSZip();
        zip.file('[Content_Types].xml', contentTypes);
        zip.folder('_rels').file('.rels', relsRoot);
        const wordFolder = zip.folder('word');
        wordFolder.file('document.xml', docXml);
        wordFolder.file('styles.xml', stylesXml);
        wordFolder.folder('_rels').file('document.xml.rels', relsDoc);

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

    // ====================================================================
    //  EXPORT DAILY TIME REPORT → XLSX  (using ExcelJS)
    // ====================================================================
    async exportToExcel() {
        if (!this.entries.length) { this.notify('No entries to export!', 'error'); return; }
        if (!window.ExcelJS) {
            await this._loadScript('https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js');
        }
        const workbook = new window.ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Daily Time Report');

        ws.columns = [
            { width: 5 }, { width: 22.14 }, { width: 18 },
            { width: 16 }, { width: 21.14 }, { width: 18 }, { width: 5 }
        ];

        const rh = {1:7.5,2:45,3:9.75,4:18,5:30.6,6:18,7:18,8:9.75,9:27.75,35:15.75,36:21.75,37:13.5,38:13.5,39:13.5,40:13.5,41:36,42:13.5,43:13.5,44:18,45:13.5,46:7.5};
        for (let i=10;i<=34;i++) rh[i]=18;
        Object.entries(rh).forEach(([r,h]) => { ws.getRow(Number(r)).height = h; });

        const fs = (argb) => ({ type:'pattern', pattern:'solid', fgColor:{argb} });
        const fn = (o={}) => ({ name:'Arial', size:o.size||10, bold:o.bold||false, italic:o.italic||false, color:o.color?{argb:o.color}:undefined });
        const al = (h,v,wrap) => ({ horizontal:h, vertical:v||'middle', wrapText:!!wrap });
        const thin = {style:'thin'}, med = {style:'medium'};
        const sb = (cell, t, b, l, r) => { const bd={}; if(t)bd.top=t; if(b)bd.bottom=b; if(l)bd.left=l; if(r)bd.right=r; cell.border=bd; };
        const NAVY='FF1F3864', BLUE='FF2E5090', LBLUE='FFDEEAF1', WHITE='FFFFFFFF', F2='FFF2F2F2', BDD='FFBDD7EE', GREY='FF666666', DG='FF444444';

        ws.mergeCells('B2:F2');
        const t2=ws.getCell('B2');
        t2.value={richText:[{text:'DAILY TIME REPORT',font:{name:'Arial',size:16,bold:true,color:{argb:'FFFFFFFF'}}},{text:'\nOn-the-Job Training',font:{name:'Arial',size:14,bold:true,color:{argb:'FFFFFFFF'}}}]};
        t2.fill=fs(NAVY); t2.alignment=al('center','middle',true); sb(t2,med,null,med,med);

        const p=this.profileData;
        ws.getCell('B4').value='Name:'; ws.getCell('B4').font=fn({bold:true,color:NAVY}); ws.getCell('B4').fill=fs(LBLUE); ws.getCell('B4').alignment=al('right'); sb(ws.getCell('B4'),med,thin,med,thin);
        ws.mergeCells('C4:D4'); ws.getCell('C4').value=p.name||''; ws.getCell('C4').font=fn(); ws.getCell('C4').fill=fs(WHITE); ws.getCell('C4').alignment=al('left'); sb(ws.getCell('C4'),null,thin,null,null);
        ws.getCell('E4').value='Required OJT Hours:'; ws.getCell('E4').font=fn({bold:true,color:NAVY}); ws.getCell('E4').fill=fs(LBLUE); ws.getCell('E4').alignment=al('right'); sb(ws.getCell('E4'),thin,thin,thin,thin);
        ws.getCell('F4').value=this.hoursNeeded; ws.getCell('F4').font=fn(); ws.getCell('F4').alignment=al('center'); sb(ws.getCell('F4'),null,thin,null,med);

        ws.getCell('B5').value='School / University:'; ws.getCell('B5').font=fn({bold:true,color:NAVY}); ws.getCell('B5').fill=fs(LBLUE); ws.getCell('B5').alignment=al('right'); sb(ws.getCell('B5'),thin,thin,med,thin);
        ws.mergeCells('C5:D5'); ws.getCell('C5').value=p.school||''; ws.getCell('C5').font=fn(); ws.getCell('C5').fill=fs(WHITE); ws.getCell('C5').alignment=al('left','middle',true); sb(ws.getCell('C5'),null,thin,null,null);
        ws.getCell('E5').value='Total Hours Rendered:'; ws.getCell('E5').font=fn({bold:true,color:NAVY}); ws.getCell('E5').fill=fs(LBLUE); ws.getCell('E5').alignment=al('right'); sb(ws.getCell('E5'),thin,thin,thin,thin);
        ws.getCell('F5').value={formula:'F36'}; ws.getCell('F5').font=fn({bold:true,color:NAVY}); ws.getCell('F5').alignment=al('center'); ws.getCell('F5').numFmt='[h]:mm'; sb(ws.getCell('F5'),null,thin,null,med);

        ws.getCell('B6').value='Company / Department:'; ws.getCell('B6').font=fn({bold:true,color:NAVY}); ws.getCell('B6').fill=fs(LBLUE); ws.getCell('B6').alignment=al('right'); sb(ws.getCell('B6'),thin,thin,med,thin);
        ws.mergeCells('C6:D6'); ws.getCell('C6').value=p.company||''; ws.getCell('C6').font=fn(); ws.getCell('C6').fill=fs(WHITE); ws.getCell('C6').alignment=al('left'); sb(ws.getCell('C6'),null,thin,null,null);
        ws.getCell('E6').fill=fs(LBLUE); sb(ws.getCell('E6'),thin,thin,thin,thin);

        ws.getCell('B7').value='Period Covered:'; ws.getCell('B7').font=fn({bold:true,color:NAVY}); ws.getCell('B7').fill=fs(LBLUE); ws.getCell('B7').alignment=al('right'); sb(ws.getCell('B7'),thin,thin,med,thin);
        ws.mergeCells('C7:D7'); ws.getCell('C7').value=p.period||''; ws.getCell('C7').font=fn(); ws.getCell('C7').fill=fs(WHITE); ws.getCell('C7').alignment=al('left'); sb(ws.getCell('C7'),null,thin,null,null);
        ws.getCell('E7').fill=fs(LBLUE); sb(ws.getCell('E7'),thin,thin,thin,thin);

        ['A9','B9','C9','D9','E9','F9','G9'].forEach(addr => { const c=ws.getCell(addr); c.font=fn({bold:true,color:'FFFFFFFF'}); c.fill=fs(BLUE); c.alignment=al('center'); sb(c,thin,thin,thin,thin); });
        ws.getCell('B9').value='No.'; ws.getCell('C9').value='Date'; ws.getCell('D9').value='Time In'; ws.getCell('E9').value='Time Out'; ws.getCell('F9').value='Hours Rendered';
        sb(ws.getCell('B9'),thin,thin,med,thin); sb(ws.getCell('F9'),thin,thin,thin,med);

        const em={};
        this.entries.forEach((e,i)=>{em[i+1]=e;});
        for(let rn=1;rn<=25;rn++){
            const r=9+rn, ev=rn%2===0, rf=ev?F2:WHITE;
            ws.getCell(`A${r}`).fill=fs(BLUE); sb(ws.getCell(`A${r}`),thin,thin,thin,thin);
            ws.getCell(`G${r}`).fill=fs(BLUE); sb(ws.getCell(`G${r}`),thin,thin,thin,thin);
            const bc=ws.getCell(`B${r}`); bc.value=rn; bc.font=fn({size:9,color:GREY}); bc.fill=fs(rf); bc.alignment=al('center'); sb(bc,thin,thin,med,thin);
            const e=em[rn];
            if(e){
                const cc=ws.getCell(`C${r}`); cc.value=new Date(e.date+'T12:00:00'); cc.font=fn(); cc.fill=fs(WHITE); cc.alignment=al('center'); cc.numFmt='mmm-dd-yyyy'; sb(cc,thin,thin,thin,thin);
                const dc=ws.getCell(`D${r}`); const[ih,im]=e.timeIn.split(':').map(Number); dc.value=(ih*60+im)/1440; dc.font=fn(); dc.fill=fs(WHITE); dc.alignment=al('center'); dc.numFmt='h:MM AM/PM'; sb(dc,thin,thin,thin,thin);
                const ec=ws.getCell(`E${r}`); const[oh,om]=e.timeOut.split(':').map(Number); ec.value=(oh*60+om)/1440; ec.font=fn(); ec.fill=fs(WHITE); ec.alignment=al('center'); ec.numFmt='h:MM AM/PM'; sb(ec,thin,thin,thin,thin);
            } else {
                ['C','D','E'].forEach(col=>{const c=ws.getCell(`${col}${r}`);c.fill=fs(rf);sb(c,thin,thin,thin,thin);});
            }
            const fc=ws.getCell(`F${r}`); fc.value={formula:`IF(AND(D${r}<>"",E${r}<>""),MIN(E${r}-D${r}-TIME(1,0,0),TIME(8,0,0)),"")`}; fc.font=fn(); fc.fill=fs(rf); fc.alignment=al('center'); fc.numFmt='[h]:mm'; sb(fc,thin,thin,thin,med);
        }

        ws.mergeCells('B35:F35'); const n35=ws.getCell('B35'); n35.value='* Hours rendered are computed net of 1-hour lunch break, capped at 8 hours/day.'; n35.font=fn({size:8,italic:true,color:GREY}); n35.alignment=al('left'); sb(n35,null,null,med,med);
        ws.mergeCells('B36:E36'); const b36=ws.getCell('B36'); b36.value='TOTAL HOURS RENDERED'; b36.font=fn({size:11,bold:true,color:'FFFFFFFF'}); b36.fill=fs(NAVY); b36.alignment=al('right'); sb(b36,null,null,med,null);
        const f36=ws.getCell('F36'); f36.value={formula:'SUM(F10:F34)'}; f36.font=fn({size:11,bold:true,color:'FFFFFFFF'}); f36.fill=fs(NAVY); f36.alignment=al('center'); f36.numFmt='[h]:mm'; sb(f36,thin,thin,thin,med);
        ws.mergeCells('B39:F39'); const b39=ws.getCell('B39'); b39.value='Certified Correct:'; b39.font=fn({bold:true,color:NAVY}); b39.alignment=al('left'); sb(b39,null,null,med,med);
        ws.mergeCells('C41:E41'); ws.getCell('C41').fill=fs(LBLUE); sb(ws.getCell('C41'),null,med,null,null);
        ws.mergeCells('C42:E42'); const c42=ws.getCell('C42'); c42.value=p.supervisor||''; c42.font=fn({size:9,color:DG}); c42.alignment=al('center');
        ws.mergeCells('C43:E43'); const c43=ws.getCell('C43'); c43.value=p.supervisorRole||''; c43.font=fn({size:9,color:DG}); c43.alignment=al('center');
        ws.mergeCells('C44:E44'); const c44=ws.getCell('C44'); c44.value='OJT Supervisor / Immediate Head'; c44.font=fn({bold:true,color:NAVY}); c44.fill=fs(BDD); c44.alignment=al('center');
        ws.mergeCells('C45:D45'); const c45=ws.getCell('C45'); c45.value='Date: ___________________________'; c45.font=fn({size:9,color:NAVY}); c45.alignment=al('left');

        const buf=await workbook.xlsx.writeBuffer();
        const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url; a.download=`daily_time_report_${(p.name||'export').replace(/\s+/g,'_').toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click(); URL.revokeObjectURL(url);
        this.notify('Exported to Excel!', 'success');
    }

    // ---- Notification ----
    notify(msg, type='info') {
        document.querySelector('.notification')?.remove();
        const n=document.createElement('div');
        n.className=`notification notification-${type}`; n.textContent=msg;
        document.body.appendChild(n);
        setTimeout(()=>n.classList.add('show'),10);
        setTimeout(()=>{n.classList.remove('show');setTimeout(()=>n.remove(),300);},3000);
    }
}
