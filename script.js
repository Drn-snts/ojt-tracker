// ============================================================
//  FIREBASE CONFIG
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc
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
//  AUTH HELPERS
// ============================================================
window.switchTab = (tab) => {
    document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
    document.getElementById('signupForm').classList.toggle('hidden', tab !== 'signup');
    document.getElementById('loginTab').classList.toggle('active', tab === 'login');
    document.getElementById('signupTab').classList.toggle('active', tab === 'signup');
    clearAuthErrors();
};

window.handleLogin = async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    if (!email || !password) { showAuthError('loginError', 'Please fill in all fields.'); return; }
    btn.disabled = true; btn.textContent = 'Signing in...';
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
        showAuthError('loginError', friendlyError(e.code));
        btn.disabled = false; btn.textContent = 'Sign In';
    }
};

window.handleSignup = async () => {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const btn = document.getElementById('signupBtn');
    if (!name || !email || !password) { showAuthError('signupError', 'Please fill in all fields.'); return; }
    if (password.length < 6) { showAuthError('signupError', 'Password must be at least 6 characters.'); return; }
    if (!/[a-z]/.test(password)) { showAuthError('signupError', 'Password must include at least 1 lowercase letter.'); return; }
    if (!/[A-Z]/.test(password)) { showAuthError('signupError', 'Password must include at least 1 uppercase letter.'); return; }
    if (!/[0-9]/.test(password)) { showAuthError('signupError', 'Password must include at least 1 number.'); return; }
    btn.disabled = true; btn.textContent = 'Creating account...';
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
    } catch (e) {
        showAuthError('signupError', friendlyError(e.code));
        btn.disabled = false; btn.textContent = 'Create Account';
    }
};

window.checkPasswordStrength = (password) => {
    const setRule = (id, passed) => {
        const el = document.getElementById(id);
        if (!el) return;
        const icon = el.querySelector('i');
        if (icon) icon.className = passed ? 'bi bi-check-circle' : 'bi bi-x-circle';
        el.classList.toggle('rule-pass', passed);
    };
    setRule('rule-lower', /[a-z]/.test(password));
    setRule('rule-upper', /[A-Z]/.test(password));
    setRule('rule-number', /[0-9]/.test(password));
    setRule('rule-length', password.length >= 6);
};

window.handleForgotPassword = async () => {
    const email = document.getElementById('loginEmail').value.trim();
    if (!email) { showAuthError('loginError', 'Enter your email above first.'); return; }
    try {
        await sendPasswordResetEmail(auth, email);
        showAuthError('loginError', 'Reset email sent! Check your inbox.', true);
    } catch (e) { showAuthError('loginError', friendlyError(e.code)); }
};

window.handleLogout = async () => {
    if (window.calculator) window.calculator.saveDebounced();
    await signOut(auth);
};

function showAuthError(id, msg, isSuccess = false) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.style.color = isSuccess ? '#48bb78' : '#f1948a';
}

function clearAuthErrors() {
    ['loginError', 'signupError'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
    });
}

function friendlyError(code) {
    const map = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/popup-closed-by-user': 'Sign-in was cancelled.',
        'auth/invalid-credential': 'Invalid email or password.',
    };
    return map[code] || 'Something went wrong. Please try again.';
}

// ============================================================
//  AUTH STATE OBSERVER
// ============================================================
onAuthStateChanged(auth, async (user) => {
    showLoading(true);
    if (user) {
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('appScreen').classList.remove('hidden');
        const name = user.displayName || user.email.split('@')[0];
        document.getElementById('userDisplayName').textContent = name;
        document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();
        window.calculator = new OJTCalculator(user.uid);
        await window.calculator.init();
        document.getElementById('logoutBtn').onclick = window.handleLogout;
    } else {
        document.getElementById('authScreen').classList.remove('hidden');
        document.getElementById('appScreen').classList.add('hidden');
        window.calculator = null;
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'Sign In'; }
        if (signupBtn) { signupBtn.disabled = false; signupBtn.textContent = 'Create Account'; }
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
        this.info = { name: '', school: '', company: '', period: '', supervisor: '', supervisorTitle: '' };
        this._saveTimer = null;
    }

    async init() {
        await this.loadFromFirestore();
        this.initializeEventListeners();
        this.setupInfoFields();
        this.setupDatePicker();
        this.setupWeekendToggle();
        this.render();
    }

    // ---- Firestore ----
    async saveToFirestore() {
        try {
            await setDoc(doc(db, 'users', this.userId), {
                entries: this.entries,
                hoursNeeded: this.hoursNeeded,
                includeWeekends: this.includeWeekends,
                info: this.info
            });
        } catch (e) {
            console.error('Save error:', e);
            this.showNotification('Could not save data.', 'error');
        }
    }

    saveDebounced() {
        clearTimeout(this._saveTimer);
        return this.saveToFirestore();
    }

    async loadFromFirestore() {
        try {
            const snap = await getDoc(doc(db, 'users', this.userId));
            if (snap.exists()) {
                const data = snap.data();
                this.entries = (data.entries || []).map(e => ({
                    ...e,
                    breakMins: Number(e.breakMins) || 0,
                    hours: parseFloat(e.hours) || 0
                }));
                this.hoursNeeded = data.hoursNeeded || 500;
                this.includeWeekends = data.includeWeekends ?? true;
                this.info = data.info || { name: '', school: '', company: '', period: '', supervisor: '', supervisorTitle: '' };
            }
        } catch (e) {
            console.error('Load error:', e);
            this.showNotification('Could not load data from database.', 'error');
        }
    }

    // ---- Info Fields ----
    setupInfoFields() {
        const fields = ['infoName', 'infoSchool', 'infoCompany', 'infoPeriod', 'infoSupervisor', 'infoSupervisorTitle'];
        const keys   = ['name', 'school', 'company', 'period', 'supervisor', 'supervisorTitle'];

        fields.forEach((id, i) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.value = this.info[keys[i]] || '';
            el.addEventListener('input', () => {
                this.info[keys[i]] = el.value;
                clearTimeout(this._saveTimer);
                this._saveTimer = setTimeout(() => this.saveToFirestore(), 1200);
            });
        });
    }

    // ---- Event Listeners ----
    initializeEventListeners() {
        document.getElementById('addBtn').addEventListener('click', () => this.addEntry());
        document.getElementById('duplicateBtn').addEventListener('click', () => this.duplicateEntry());
        document.getElementById('updateHours').addEventListener('click', () => this.updateHoursNeeded());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToExcel());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAll());
        document.getElementById('timeOut').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addEntry();
        });
    }

    // ---- Weekend Toggle ----
    setupWeekendToggle() {
        const toggle = document.getElementById('weekendToggle');
        toggle.checked = this.includeWeekends;
        toggle.addEventListener('change', async () => {
            this.includeWeekends = toggle.checked;
            await this.saveToFirestore();
            this.showNotification(toggle.checked ? 'Weekends included' : 'Weekends excluded', 'success');
        });
    }

    // ---- Date Helpers ----
    setupDatePicker() {
        const dateInput = document.getElementById('date');
        const today = new Date();
        const str = this.formatDateForInput(today);
        dateInput.value = str;
        dateInput.max = str;
    }

    getNextWorkDate(fromDate) {
        const date = new Date(fromDate);
        date.setDate(date.getDate() + 1);
        if (!this.includeWeekends) {
            const d = date.getDay();
            if (d === 6) date.setDate(date.getDate() + 2);
            else if (d === 0) date.setDate(date.getDate() + 1);
        }
        return date;
    }

    formatDateForInput(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        return `${month}-${day}-${year}`;
    }

    // Returns a JS Date object (for Excel serial date)
    parseDate(dateString) {
        return new Date(dateString + 'T00:00:00');
    }

    convertTo12Hour(timeString) {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        let hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        if (hour > 12) hour -= 12;
        if (hour === 0) hour = 12;
        return `${hour}:${minutes} ${ampm}`;
    }

    // ---- Hour Calculation ----
    calculateHours(timeIn, timeOut, breakMins = 0) {
        try {
            let diff = this._minuteDiff(timeIn, timeOut);
            if (diff <= 0) { this.showNotification('Time out must be after time in!', 'error'); return 0; }
            if (diff > 1440) { this.showNotification('Hours cannot exceed 24!', 'error'); return 0; }
            diff = Math.max(0, diff - Number(breakMins));
            return parseFloat((diff / 60).toFixed(2));
        } catch { this.showNotification('Error calculating hours.', 'error'); return 0; }
    }

    calculateHoursQuiet(timeIn, timeOut, breakMins = 0) {
        try {
            let diff = this._minuteDiff(timeIn, timeOut);
            if (diff <= 0 || diff > 1440) return 0;
            diff = Math.max(0, diff - Number(breakMins));
            return parseFloat((diff / 60).toFixed(2));
        } catch { return 0; }
    }

    _minuteDiff(timeIn, timeOut) {
        const [ih, im] = timeIn.split(':').map(Number);
        const [oh, om] = timeOut.split(':').map(Number);
        return (oh * 60 + om) - (ih * 60 + im);
    }

    // ---- Add Entry ----
    async addEntry() {
        const date = document.getElementById('date').value;
        const timeIn = document.getElementById('timeIn').value;
        const timeOut = document.getElementById('timeOut').value;
        const breakTimeInput = document.getElementById('breakTime').value;
        const breakMins = breakTimeInput ? Number(parseInt(breakTimeInput)) : 0;

        if (!date || !timeIn || !timeOut) { this.showNotification('Please fill in all fields!', 'error'); return; }
        if (isNaN(breakMins) || breakMins < 0) { this.showNotification('Break time must be a valid number!', 'error'); return; }

        const hours = this.calculateHours(timeIn, timeOut, breakMins);
        if (hours === 0) return;

        const existingIndex = this.entries.findIndex(e => e.date === date);
        if (existingIndex !== -1) {
            this.entries[existingIndex] = { date, timeIn, timeOut, breakMins, hours };
            this.showNotification('Entry updated!', 'success');
        } else {
            this.entries.push({ date, timeIn, timeOut, breakMins, hours });
            this.showNotification('Entry added!', 'success');
        }

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
        if (this.entries.length === 0) { this.showNotification('No previous entry to duplicate!', 'error'); return; }

        const existing = document.getElementById('pendingRow');
        if (existing) existing.remove();

        const lastEntry = this.entries[this.entries.length - 1];
        const nextDate = this.getNextWorkDate(new Date(lastEntry.date + 'T00:00:00'));
        const nextDateStr = this.formatDateForInput(nextDate);
        const lastBreak = lastEntry.breakMins || 0;

        const tbody = document.getElementById('tableBody');
        const emptyRow = tbody.querySelector('.empty-state');
        if (emptyRow) emptyRow.remove();

        const row = document.createElement('tr');
        row.id = 'pendingRow';
        row.classList.add('pending-row');
        row.innerHTML = `
            <td>—</td>
            <td><input type="date" class="table-input" id="pendingDate" value="${nextDateStr}"></td>
            <td><input type="time" class="table-input" id="pendingTimeIn" value="${lastEntry.timeIn}"></td>
            <td><input type="time" class="table-input" id="pendingTimeOut" value="${lastEntry.timeOut}"></td>
            <td><input type="number" class="table-input" id="pendingBreak" value="${lastBreak}" min="0" style="width:60px"></td>
            <td id="pendingGross">${this.calculateHoursQuiet(lastEntry.timeIn, lastEntry.timeOut, 0) || parseFloat((parseFloat(lastEntry.hours) + (Number(lastEntry.breakMins) / 60)).toFixed(2))}</td>
            <td id="pendingHours">${lastEntry.hours}</td>
            <td class="pending-actions">
                <button class="save-btn" onclick="window.calculator.savePendingRow()"><i class="bi bi-check-lg"></i> Save</button>
                <button class="cancel-btn" onclick="window.calculator.cancelPendingRow()"><i class="bi bi-x-lg"></i></button>
            </td>
        `;
        tbody.appendChild(row);

        const updatePreview = () => {
            const tin = document.getElementById('pendingTimeIn').value;
            const tout = document.getElementById('pendingTimeOut').value;
            const brk = parseInt(document.getElementById('pendingBreak').value) || 0;
            if (tin && tout) {
                const gross = this.calculateHoursQuiet(tin, tout, 0);
                const net = this.calculateHoursQuiet(tin, tout, brk);
                document.getElementById('pendingGross').textContent = gross > 0 ? gross : '—';
                document.getElementById('pendingHours').textContent = net > 0 ? net : '—';
            }
        };
        document.getElementById('pendingTimeIn').addEventListener('change', updatePreview);
        document.getElementById('pendingTimeOut').addEventListener('change', updatePreview);
        document.getElementById('pendingBreak').addEventListener('input', updatePreview);
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.getElementById('pendingDate').focus();
        this.showNotification('Edit the row then click Save', 'info');
    }

    async savePendingRow() {
        const date = document.getElementById('pendingDate').value;
        const timeIn = document.getElementById('pendingTimeIn').value;
        const timeOut = document.getElementById('pendingTimeOut').value;
        const breakMinsInput = document.getElementById('pendingBreak').value;
        const breakMins = breakMinsInput ? Number(parseInt(breakMinsInput)) : 0;

        if (!date || !timeIn || !timeOut) { this.showNotification('Please fill in all fields!', 'error'); return; }

        const hours = this.calculateHours(timeIn, timeOut, breakMins);
        if (hours === 0) return;

        const existingIndex = this.entries.findIndex(e => e.date === date);
        if (existingIndex !== -1) {
            this.entries[existingIndex] = { date, timeIn, timeOut, breakMins, hours };
        } else {
            this.entries.push({ date, timeIn, timeOut, breakMins, hours });
        }
        this.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
        await this.saveToFirestore();
        this.render();
        this.showNotification('Entry saved!', 'success');
    }

    cancelPendingRow() {
        const pending = document.getElementById('pendingRow');
        if (pending) pending.remove();
        if (this.entries.length === 0) {
            document.getElementById('tableBody').innerHTML =
                '<tr class="empty-state"><td colspan="8"><i class="bi bi-inbox"></i><br>No entries yet. Add your first entry!</td></tr>';
        }
    }

    // ---- Delete ----
    async deleteEntry(index) {
        if (confirm('Delete this entry? This cannot be undone.')) {
            this.entries.splice(index, 1);
            await this.saveToFirestore();
            this.render();
            this.showNotification('Entry deleted!', 'success');
        }
    }

    // ---- Edit Row ----
    editRow(index) {
        const pending = document.getElementById('pendingRow');
        if (pending) pending.remove();

        const entry = this.entries[index];
        const tbody = document.getElementById('tableBody');
        const rows = tbody.querySelectorAll('tr[data-index]');
        const row = rows[index];
        const breakMins = entry.breakMins || 0;

        row.innerHTML = `
            <td>${index + 1}</td>
            <td><input type="date" class="table-input" id="editDate" value="${entry.date}"></td>
            <td><input type="time" class="table-input" id="editTimeIn" value="${entry.timeIn}"></td>
            <td><input type="time" class="table-input" id="editTimeOut" value="${entry.timeOut}"></td>
            <td><input type="number" class="table-input" id="editBreak" value="${breakMins}" min="0" style="width:60px"></td>
            <td id="editGrossPreview">${this.calculateHoursQuiet(entry.timeIn, entry.timeOut, 0) || parseFloat((parseFloat(entry.hours) + (Number(entry.breakMins) / 60)).toFixed(2))}</td>
            <td id="editHoursPreview">${entry.hours}</td>
            <td class="pending-actions">
                <button class="save-btn" onclick="window.calculator.saveEditRow(${index})"><i class="bi bi-check-lg"></i> Save</button>
                <button class="cancel-btn" onclick="window.calculator.render()"><i class="bi bi-x-lg"></i></button>
            </td>
        `;

        const updatePreview = () => {
            const tin = document.getElementById('editTimeIn').value;
            const tout = document.getElementById('editTimeOut').value;
            const brk = parseInt(document.getElementById('editBreak').value) || 0;
            if (tin && tout) {
                const gross = this.calculateHoursQuiet(tin, tout, 0);
                const net = this.calculateHoursQuiet(tin, tout, brk);
                document.getElementById('editGrossPreview').textContent = gross > 0 ? gross : '—';
                document.getElementById('editHoursPreview').textContent = net > 0 ? net : '—';
            }
        };
        document.getElementById('editTimeIn').addEventListener('change', updatePreview);
        document.getElementById('editTimeOut').addEventListener('change', updatePreview);
        document.getElementById('editBreak').addEventListener('input', updatePreview);
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async saveEditRow(index) {
        const date = document.getElementById('editDate').value;
        const timeIn = document.getElementById('editTimeIn').value;
        const timeOut = document.getElementById('editTimeOut').value;
        const breakMinsInput = document.getElementById('editBreak').value;
        const breakMins = breakMinsInput ? Number(parseInt(breakMinsInput)) : 0;

        if (!date || !timeIn || !timeOut) { this.showNotification('Please fill in all fields!', 'error'); return; }
        if (isNaN(breakMins) || breakMins < 0) { this.showNotification('Break time must be a valid number!', 'error'); return; }

        const hours = this.calculateHours(timeIn, timeOut, breakMins);
        if (hours === 0) return;

        this.entries[index] = { date, timeIn, timeOut, breakMins, hours };
        this.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
        await this.saveToFirestore();
        this.render();
        this.showNotification('Entry updated!', 'success');
    }

    // ---- Stats ----
    getTotalHours() { return this.entries.reduce((s, e) => s + e.hours, 0).toFixed(2); }
    getRemainingHours() { return Math.max(0, this.hoursNeeded - parseFloat(this.getTotalHours())).toFixed(2); }
    getRemainingDays() { return (parseFloat(this.getRemainingHours()) / 8).toFixed(1); }
    getProgress() { return Math.round(Math.min(100, parseFloat(this.getTotalHours()) / this.hoursNeeded * 100)); }

    // ---- Render ----
    render() { this.renderTable(); this.updateStats(); }

    renderTable() {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        if (this.entries.length === 0) {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="8"><i class="bi bi-inbox"></i><br>No entries yet. Add your first entry!</td></tr>';
            return;
        }

        this.entries.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            const breakMins = Number(entry.breakMins) || 0;
            let breakLabel = '—';
            if (breakMins > 0) {
                const h = Math.floor(breakMins / 60);
                const m = breakMins % 60;
                if (h > 0 && m > 0) breakLabel = `${h} hr ${m} mins`;
                else if (h > 0) breakLabel = `${h} hr`;
                else breakLabel = `${m} mins`;
            }

            const grossHours = this.calculateHoursQuiet(entry.timeIn, entry.timeOut, 0)
                || parseFloat((parseFloat(entry.hours) + (Number(entry.breakMins) / 60)).toFixed(2));
            const netHours = entry.hours;

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${this.formatDate(entry.date)}</td>
                <td>${this.convertTo12Hour(entry.timeIn)}</td>
                <td>${this.convertTo12Hour(entry.timeOut)}</td>
                <td>${breakLabel}</td>
                <td>${grossHours}</td>
                <td>${netHours}</td>
                <td class="row-actions">
                    <button class="edit-btn" onclick="window.calculator.editRow(${index})">Edit</button>
                    <button class="delete-btn" onclick="window.calculator.deleteEntry(${index})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateStats() {
        const total = this.getTotalHours();
        const remaining = this.getRemainingHours();
        const days = this.getRemainingDays();
        const progress = this.getProgress();

        document.getElementById('totalHours').textContent = total;
        document.getElementById('hoursRendered').textContent = total;
        document.getElementById('remainingHours').textContent = remaining;
        document.getElementById('remainingDays').textContent = days;
        document.getElementById('progressFill').style.width = progress + '%';
        document.getElementById('progressText').textContent = progress + '%';
        document.getElementById('hoursNeeded').value = this.hoursNeeded;
    }

    // ---- Hours Needed ----
    async updateHoursNeeded() {
        const val = parseInt(document.getElementById('hoursNeeded').value);
        if (isNaN(val) || val <= 0) { this.showNotification('Enter a valid number > 0!', 'error'); return; }
        this.hoursNeeded = val;
        await this.saveToFirestore();
        this.render();
        this.showNotification(`Target updated to ${val} hours!`, 'success');
    }

    // ---- Export to Excel (SheetJS — pixel-perfect match to sample) ----
    async exportToExcel() {
        if (this.entries.length === 0) { this.showNotification('No entries to export!', 'error'); return; }

        if (!window.XLSX) {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
                s.onload = resolve; s.onerror = reject;
                document.head.appendChild(s);
            });
        }

        const X = window.XLSX;
        const wb = X.utils.book_new();
        const ws = {};

        // ── Color constants (exact from sample) ──
        const NAVY  = '1F3864', BLUE = '2E5090', LBLUE = 'DEEAF1';
        const WHITE = 'FFFFFF', F2   = 'F2F2F2', BDD   = 'BDD7EE';
        const GREY  = '666666', DGREY= '444444';

        // ── Border styles ──
        const T  = { style: 'thin'   };
        const M  = { style: 'medium' };
        const bdr = (t,b,l,r) => ({ top:t||null, bottom:b||null, left:l||null, right:r||null });

        // ── Fill ──
        const fx = (rgb) => rgb ? { patternType:'solid', fgColor:{ rgb } } : undefined;

        // ── Font ──
        const ft = (sz=10, bold=false, italic=false, color=null) => {
            const f = { name:'Arial', sz, bold, italic };
            if (color) f.color = { rgb: color };
            return f;
        };

        // ── Alignment ──
        const al = (h='left', v='center', wrap=false) => ({ horizontal:h, vertical:v, wrapText:wrap });

        // ── Cell builder ──
        const sc = (addr, v, opts = {}) => {
            const { font, fill, align, border, numFmt, formula } = opts;
            const t = formula ? 'n' : (typeof v === 'number' ? 'n' : (v instanceof Date ? 'n' : 's'));
            const cell = formula ? { f: formula, t:'n' } : { v, t };
            cell.s = {};
            if (font)   cell.s.font = font;
            if (fill)   cell.s.fill = fill;
            if (align)  cell.s.alignment = align;
            if (border) cell.s.border = border;
            if (numFmt) cell.s.numFmt = numFmt;
            if (v instanceof Date) { cell.t = 'n'; cell.v = this._dateSerial(v); }
            ws[addr] = cell;
        };

        // ── Sidebar blue cells for A and G columns (data rows 9-34) ──
        for (let r = 9; r <= 34; r++) {
            ws[`A${r}`] = { v: null, t:'s', s:{ font: ft(11), fill: fx(BLUE), border: bdr(T,T,T,T) } };
            ws[`G${r}`] = { v: null, t:'s', s:{ font: ft(11), fill: fx(BLUE), border: bdr(T,T,T,T) } };
        }

        // ── ROW 2: Title ──
        sc('B2', 'DAILY TIME REPORT\nOn-the-Job Training', {
            font: ft(16, true, false, WHITE), fill: fx(NAVY),
            align: al('center','center',true), border: bdr(M,null,M,M)
        });

        // ── ROW 4 ──
        sc('B4','Name:',{font:ft(10,true,false,NAVY),fill:fx(LBLUE),align:al('right'),border:bdr(T,T,M,T)});
        sc('C4', this.info.name||'', {font:ft(),fill:fx(WHITE),align:al('left'),border:bdr(null,T,null,null)});
        sc('E4','Required OJT Hours:',{font:ft(10,true,false,NAVY),fill:fx(LBLUE),align:al('right'),border:bdr(T,T,T,T)});
        sc('F4', this.hoursNeeded, {font:ft(),align:al('center'),border:bdr(null,T,null,M)});

        // ── ROW 5 ──
        sc('B5','School / University:',{font:ft(10,true,false,NAVY),fill:fx(LBLUE),align:al('right'),border:bdr(T,T,M,T)});
        sc('C5', this.info.school||'', {font:ft(),fill:fx(WHITE),align:al('left','center',true),border:bdr(null,T,null,null)});
        sc('E5','Total Hours Rendered:',{font:ft(10,true,false,NAVY),fill:fx(LBLUE),align:al('right'),border:bdr(T,T,T,T)});
        ws['F5'] = { f:'F36', t:'n', s:{ font:ft(10,true,false,NAVY), alignment:al('center'), border:bdr(null,T,null,M), numFmt:'[h]:mm' } };

        // ── ROW 6 ──
        sc('B6','Company / Department:',{font:ft(10,true,false,NAVY),fill:fx(LBLUE),align:al('right'),border:bdr(T,T,M,T)});
        sc('C6', this.info.company||'', {font:ft(),fill:fx(WHITE),align:al('left'),border:bdr(null,T,null,null)});
        sc('E6', null, {font:ft(10,true,false,NAVY),fill:fx(LBLUE),align:al('right'),border:bdr(T,T,T,T)});

        // ── ROW 7 ──
        sc('B7','Period Covered:',{font:ft(10,true,false,NAVY),fill:fx(LBLUE),align:al('right'),border:bdr(T,T,M,T)});
        sc('C7', this.info.period||'', {font:ft(),fill:fx(WHITE),align:al('left'),border:bdr(null,T,null,null)});
        sc('E7', null, {font:ft(10,true,false,NAVY),fill:fx(LBLUE),align:al('right'),border:bdr(T,T,T,T)});

        // ── ROW 9: Column headers ──
        const hdrs = { A9:'', B9:'No.', C9:'Date', D9:'Time In', E9:'Time Out', F9:'Hours Rendered', G9:'' };
        const hdrBdrs = {
            A9:bdr(T,T,T,T), B9:bdr(T,T,M,T), C9:bdr(T,T,T,T),
            D9:bdr(T,T,T,T), E9:bdr(T,T,T,T), F9:bdr(T,T,T,M), G9:bdr(T,T,T,T)
        };
        Object.entries(hdrs).forEach(([addr, val]) => {
            sc(addr, val||null, { font:ft(10,true,false,WHITE), fill:fx(BLUE), align:al('center'), border:hdrBdrs[addr] });
        });

        // ── ROWS 10–34: 25 data rows ──
        const entryMap = {};
        this.entries.forEach((e, i) => { entryMap[i+1] = e; });

        for (let rowNum = 1; rowNum <= 25; rowNum++) {
            const r = 9 + rowNum;
            const even = rowNum % 2 === 0;
            const rFill = even ? F2 : WHITE;

            // B: No.
            sc(`B${r}`, rowNum, { font:ft(9,false,false,GREY), fill:fx(rFill), align:al('center'), border:bdr(T,T,M,T) });

            const e = entryMap[rowNum];
            if (e) {
                // C: Date
                const d = new Date(e.date + 'T00:00:00');
                ws[`C${r}`] = { v: this._dateSerial(d), t:'n', s:{ font:ft(), fill:fx(WHITE), alignment:al('center'), border:bdr(T,T,T,T), numFmt:'mmm\-dd\-yyyy' } };

                // D: Time In
                const [ih,im] = e.timeIn.split(':').map(Number);
                ws[`D${r}`] = { v: (ih*60+im)/1440, t:'n', s:{ font:ft(), fill:fx(WHITE), alignment:al('center'), border:bdr(T,T,T,T), numFmt:'h:MM AM/PM' } };

                // E: Time Out
                const [oh,om] = e.timeOut.split(':').map(Number);
                ws[`E${r}`] = { v: (oh*60+om)/1440, t:'n', s:{ font:ft(), fill:fx(WHITE), alignment:al('center'), border:bdr(T,T,T,T), numFmt:'h:MM AM/PM' } };
            } else {
                const eF = even ? F2 : WHITE;
                ['C','D','E'].forEach(col => {
                    ws[`${col}${r}`] = { v:'', t:'s', s:{ font:ft(), fill:fx(eF), alignment:al('center'), border:bdr(T,T,T,T) } };
                });
            }

            // F: Hours formula
            ws[`F${r}`] = { f:`IF(AND(D${r}<>"",E${r}<>""),MIN(E${r}-D${r}-TIME(1,0,0),TIME(8,0,0)),"")`, t:'n',
                s:{ font:ft(), fill:fx(rFill), alignment:al('center'), border:bdr(T,T,T,M), numFmt:'[h]:mm' } };
        }

        // ── ROW 35: Footnote ──
        sc('B35', '* Hours rendered are computed net of 1-hour lunch break, capped at 8 hours/day.',
            { font:ft(8,false,true,GREY), align:al('left'), border:bdr(null,null,M,M) });

        // ── ROW 36: Total ──
        sc('B36', 'TOTAL HOURS RENDERED', { font:ft(11,true,false,WHITE), fill:fx(NAVY), align:al('right'), border:bdr(null,null,M,null) });
        ws['F36'] = { f:'SUM(F10:F34)', t:'n', s:{ font:ft(11,true,false,WHITE), fill:fx(NAVY), alignment:al('center'), border:bdr(T,T,T,M), numFmt:'[h]:mm' } };

        // ── ROW 39: Certified Correct ──
        sc('B39', 'Certified Correct:', { font:ft(10,true,false,NAVY), align:al('left'), border:bdr(null,null,M,M) });

        // ── ROW 41: Signature box ──
        ws['C41'] = { v:'', t:'s', s:{ fill:fx(LBLUE), border:bdr(null,M,null,null) } };

        // ── ROW 42: Supervisor name ──
        sc('C42', this.info.supervisor||'', { font:ft(9,false,false,DGREY), align:al('center') });

        // ── ROW 43: Supervisor title ──
        sc('C43', this.info.supervisorTitle||'', { font:ft(9,false,false,DGREY), align:al('center') });

        // ── ROW 44: Role label ──
        sc('C44', 'OJT Supervisor / Immediate Head', { font:ft(10,true,false,NAVY), fill:fx(BDD), align:al('center') });

        // ── ROW 45: Date ──
        sc('C45', 'Date: ___________________________', { font:ft(9,false,false,NAVY), align:al('left') });

        // ── Merges (exact from sample) ──
        ws['!merges'] = [
            {s:{r:1,c:1},e:{r:1,c:5}},   // B2:F2
            {s:{r:3,c:2},e:{r:3,c:3}},   // C4:D4
            {s:{r:4,c:2},e:{r:4,c:3}},   // C5:D5
            {s:{r:5,c:2},e:{r:5,c:3}},   // C6:D6
            {s:{r:6,c:2},e:{r:6,c:3}},   // C7:D7
            {s:{r:34,c:1},e:{r:34,c:5}}, // B35:F35
            {s:{r:35,c:1},e:{r:35,c:4}}, // B36:E36
            {s:{r:38,c:1},e:{r:38,c:5}}, // B39:F39
            {s:{r:40,c:2},e:{r:40,c:4}}, // C41:E41
            {s:{r:41,c:2},e:{r:41,c:4}}, // C42:E42
            {s:{r:42,c:2},e:{r:42,c:4}}, // C43:E43
            {s:{r:43,c:2},e:{r:43,c:4}}, // C44:E44
            {s:{r:44,c:2},e:{r:44,c:3}}, // C45:D45
        ];

        // ── Column widths (exact from sample) ──
        ws['!cols'] = [
            {wch:5},{wch:22.14},{wch:18},{wch:16},{wch:21.14},{wch:18},{wch:5}
        ];

        // ── Row heights (exact from sample) ──
        ws['!rows'] = [
            {hpt:7.5},{hpt:45},{hpt:9.75},{hpt:18},{hpt:30.6},
            {hpt:18},{hpt:18},{hpt:9.75},{hpt:27.75}
        ];
        for (let i = 0; i < 25; i++) ws['!rows'].push({hpt:18});
        ws['!rows'].push({hpt:15.75},{hpt:21.75},{hpt:13.5},{hpt:13.5},
            {hpt:13.5},{hpt:13.5},{hpt:36},{hpt:13.5},{hpt:13.5},{hpt:18},{hpt:13.5},{hpt:7.5});

        ws['!ref'] = 'A1:G46';

        X.utils.book_append_sheet(wb, ws, 'Daily Time Report');
        const filename = `daily_time_report_${(this.info.name||'export').replace(/\s+/g,'_').toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`;
        X.writeFile(wb, filename, { bookType:'xlsx', type:'binary', cellStyles:true });
        this.showNotification('Exported to Excel!', 'success');
    }

    _dateSerial(date) {
        const epoch = new Date(1899, 11, 30);
        return (date - epoch) / 86400000;
    }

        // ---- Clear All ----
    async clearAll() {
        if (confirm('Delete ALL entries? This cannot be undone.')) {
            this.entries = [];
            await this.saveToFirestore();
            this.render();
            this.showNotification('All entries cleared!', 'success');
        }
    }

    // ---- Notification ----
    showNotification(message, type = 'info') {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        const n = document.createElement('div');
        n.className = `notification notification-${type}`;
        n.textContent = message;
        document.body.appendChild(n);
        setTimeout(() => n.classList.add('show'), 10);
        setTimeout(() => { n.classList.remove('show'); setTimeout(() => n.remove(), 300); }, 3000);
    }
}