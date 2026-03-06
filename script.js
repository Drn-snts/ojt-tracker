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

        // Load ExcelJS (supports full styling)
        if (!window.ExcelJS) {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
                s.onload = resolve; s.onerror = reject;
                document.head.appendChild(s);
            });
        }

        const workbook = new window.ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Daily Time Report');

        // ── Column widths (exact from sample) ──
        ws.columns = [
            { width: 5    }, // A
            { width: 22.14}, // B
            { width: 18   }, // C
            { width: 16   }, // D
            { width: 21.14}, // E
            { width: 18   }, // F
            { width: 5    }, // G
        ];

        // ── Row heights ──
        const rowHeights = {1:7.5,2:45,3:9.75,4:18,5:30.6,6:18,7:18,8:9.75,9:27.75,
            35:15.75,36:21.75,37:13.5,38:13.5,39:13.5,40:13.5,41:36,42:13.5,43:13.5,44:18,45:13.5,46:7.5};
        for (let i=10;i<=34;i++) rowHeights[i]=18;
        Object.entries(rowHeights).forEach(([r,h]) => { ws.getRow(Number(r)).height = h; });

        // ── Style helpers ──
        const fillSolid = (argb) => ({ type:'pattern', pattern:'solid', fgColor:{argb} });
        const font = (opts={}) => ({
            name: 'Arial', size: opts.size||10,
            bold: opts.bold||false, italic: opts.italic||false,
            color: opts.color ? {argb: opts.color} : undefined
        });
        const align = (h,v,wrap) => ({ horizontal:h, vertical:v||'middle', wrapText:!!wrap });
        const thin   = { style:'thin' };
        const medium = { style:'medium' };

        const setBorder = (cell, top, bottom, left, right) => {
            const b = {};
            if (top)    b.top    = top;
            if (bottom) b.bottom = bottom;
            if (left)   b.left   = left;
            if (right)  b.right  = right;
            cell.border = b;
        };

        // ── Colors ──
        const NAVY='FF1F3864', BLUE='FF2E5090', LBLUE='FFDEEAF1';
        const WHITE='FFFFFFFF', F2='FFF2F2F2', BDD='FFBDD7EE';
        const GREY='FF666666', DGREY='FF444444';

        // ── ROW 1: spacer ──
        // ── ROW 2: Title ──
        ws.mergeCells('B2:F2');
        const titleCell = ws.getCell('B2');
        titleCell.value = 'DAILY TIME REPORT\nOn-the-Job Training';
        titleCell.font = font({size:16, bold:true, color:'FFFFFFFF'});
        titleCell.fill = fillSolid(NAVY);
        titleCell.alignment = align('center','middle',true);
        setBorder(titleCell, medium, null, medium, medium);

        // ── ROW 4 ──
        const r4 = [
            ['B4','Name:',                 true,  LBLUE, 'right', NAVY,  medium,thin,medium,thin],
            ['E4','Required OJT Hours:',   true,  LBLUE, 'right', NAVY,  thin,  thin, thin,  thin],
        ];
        r4.forEach(([addr,val,bold,bg,h,color,top,bot,left,right]) => {
            const c = ws.getCell(addr);
            c.value = val; c.font = font({bold,color});
            c.fill = fillSolid(bg); c.alignment = align(h);
            setBorder(c, top, bot, left, right);
        });

        ws.mergeCells('C4:D4');
        const c4 = ws.getCell('C4');
        c4.value = this.info.name || '';
        c4.font = font(); c4.fill = fillSolid(WHITE);
        c4.alignment = align('left'); setBorder(c4, null, thin, null, null);

        const f4 = ws.getCell('F4');
        f4.value = this.hoursNeeded; f4.font = font();
        f4.alignment = align('center'); setBorder(f4, null, thin, null, medium);

        // ── ROW 5 ──
        ws.getCell('B5').value = 'School / University:';
        ws.getCell('B5').font = font({bold:true, color:NAVY});
        ws.getCell('B5').fill = fillSolid(LBLUE); ws.getCell('B5').alignment = align('right');
        setBorder(ws.getCell('B5'), thin, thin, medium, thin);

        ws.mergeCells('C5:D5');
        ws.getCell('C5').value = this.info.school || '';
        ws.getCell('C5').font = font(); ws.getCell('C5').fill = fillSolid(WHITE);
        ws.getCell('C5').alignment = align('left','middle',true);
        setBorder(ws.getCell('C5'), null, thin, null, null);

        ws.getCell('E5').value = 'Total Hours Rendered:';
        ws.getCell('E5').font = font({bold:true, color:NAVY});
        ws.getCell('E5').fill = fillSolid(LBLUE); ws.getCell('E5').alignment = align('right');
        setBorder(ws.getCell('E5'), thin, thin, thin, thin);

        ws.getCell('F5').value = { formula: 'F36' };
        ws.getCell('F5').font = font({bold:true, color:NAVY});
        ws.getCell('F5').alignment = align('center');
        ws.getCell('F5').numFmt = '[h]:mm';
        setBorder(ws.getCell('F5'), null, thin, null, medium);

        // ── ROW 6 ──
        ws.getCell('B6').value = 'Company / Department:';
        ws.getCell('B6').font = font({bold:true,color:NAVY}); ws.getCell('B6').fill = fillSolid(LBLUE);
        ws.getCell('B6').alignment = align('right'); setBorder(ws.getCell('B6'), thin,thin,medium,thin);

        ws.mergeCells('C6:D6');
        ws.getCell('C6').value = this.info.company || '';
        ws.getCell('C6').font = font(); ws.getCell('C6').fill = fillSolid(WHITE);
        ws.getCell('C6').alignment = align('left'); setBorder(ws.getCell('C6'), null, thin, null, null);

        ws.getCell('E6').font = font({bold:true,color:NAVY}); ws.getCell('E6').fill = fillSolid(LBLUE);
        setBorder(ws.getCell('E6'), thin,thin,thin,thin);

        // ── ROW 7 ──
        ws.getCell('B7').value = 'Period Covered:';
        ws.getCell('B7').font = font({bold:true,color:NAVY}); ws.getCell('B7').fill = fillSolid(LBLUE);
        ws.getCell('B7').alignment = align('right'); setBorder(ws.getCell('B7'), thin,thin,medium,thin);

        ws.mergeCells('C7:D7');
        ws.getCell('C7').value = this.info.period || '';
        ws.getCell('C7').font = font(); ws.getCell('C7').fill = fillSolid(WHITE);
        ws.getCell('C7').alignment = align('left'); setBorder(ws.getCell('C7'), null, thin, null, null);

        ws.getCell('E7').font = font({bold:true,color:NAVY}); ws.getCell('E7').fill = fillSolid(LBLUE);
        setBorder(ws.getCell('E7'), thin,thin,thin,thin);

        // ── ROW 9: Column headers ──
        const hdrLabels = {A9:'',B9:'No.',C9:'Date',D9:'Time In',E9:'Time Out',F9:'Hours Rendered',G9:''};
        const hdrBdrs   = {
            A9:[thin,thin,thin,thin], B9:[thin,thin,medium,thin],
            C9:[thin,thin,thin,thin], D9:[thin,thin,thin,thin],
            E9:[thin,thin,thin,thin], F9:[thin,thin,thin,medium], G9:[thin,thin,thin,thin]
        };
        Object.entries(hdrLabels).forEach(([addr, val]) => {
            const c = ws.getCell(addr);
            if (val) c.value = val;
            c.font = font({bold:true, color:'FFFFFFFF'});
            c.fill = fillSolid(BLUE); c.alignment = align('center');
            const [t,b,l,r] = hdrBdrs[addr];
            setBorder(c, t, b, l, r);
        });

        // ── ROWS 10-34: 25 data rows ──
        const entryMap = {};
        this.entries.forEach((e,i) => { entryMap[i+1] = e; });

        for (let rowNum = 1; rowNum <= 25; rowNum++) {
            const r = 9 + rowNum;
            const even = rowNum % 2 === 0;
            const rFill = even ? F2 : WHITE;

            // A and G: blue sidebar
            ws.getCell(`A${r}`).fill = fillSolid(BLUE);
            setBorder(ws.getCell(`A${r}`), thin,thin,thin,thin);
            ws.getCell(`G${r}`).fill = fillSolid(BLUE);
            setBorder(ws.getCell(`G${r}`), thin,thin,thin,thin);

            // B: No.
            const bCell = ws.getCell(`B${r}`);
            bCell.value = rowNum; bCell.font = font({size:9, color:GREY});
            bCell.fill = fillSolid(rFill); bCell.alignment = align('center');
            setBorder(bCell, thin, thin, medium, thin);

            const e = entryMap[rowNum];
            if (e) {
                // C: Date
                const cCell = ws.getCell(`C${r}`);
                cCell.value = new Date(e.date + 'T00:00:00');
                cCell.font = font(); cCell.fill = fillSolid(WHITE);
                cCell.alignment = align('center'); cCell.numFmt = 'mmm-dd-yyyy';
                setBorder(cCell, thin,thin,thin,thin);

                // D: Time In
                const dCell = ws.getCell(`D${r}`);
                const [ih,im] = e.timeIn.split(':').map(Number);
                dCell.value = new Date(1899,11,30, ih, im, 0);
                dCell.font = font(); dCell.fill = fillSolid(WHITE);
                dCell.alignment = align('center'); dCell.numFmt = 'h:MM AM/PM';
                setBorder(dCell, thin,thin,thin,thin);

                // E: Time Out
                const eCell = ws.getCell(`E${r}`);
                const [oh,om] = e.timeOut.split(':').map(Number);
                eCell.value = new Date(1899,11,30, oh, om, 0);
                eCell.font = font(); eCell.fill = fillSolid(WHITE);
                eCell.alignment = align('center'); eCell.numFmt = 'h:MM AM/PM';
                setBorder(eCell, thin,thin,thin,thin);
            } else {
                ['C','D','E'].forEach(col => {
                    const c = ws.getCell(`${col}${r}`);
                    c.fill = fillSolid(even ? F2 : WHITE);
                    setBorder(c, thin,thin,thin,thin);
                });
            }

            // F: Hours formula
            const fCell = ws.getCell(`F${r}`);
            fCell.value = { formula: `IF(AND(D${r}<>"",E${r}<>""),MIN(E${r}-D${r}-TIME(1,0,0),TIME(8,0,0)),"")` };
            fCell.font = font(); fCell.fill = fillSolid(rFill);
            fCell.alignment = align('center'); fCell.numFmt = '[h]:mm';
            setBorder(fCell, thin,thin,thin,medium);
        }

        // ── ROW 35: Footnote ──
        ws.mergeCells('B35:F35');
        const n35 = ws.getCell('B35');
        n35.value = '* Hours rendered are computed net of 1-hour lunch break, capped at 8 hours/day.';
        n35.font = font({size:8, italic:true, color:GREY});
        n35.alignment = align('left');
        setBorder(n35, null, null, medium, medium);

        // ── ROW 36: Total ──
        ws.mergeCells('B36:E36');
        const b36 = ws.getCell('B36');
        b36.value = 'TOTAL HOURS RENDERED';
        b36.font = font({size:11, bold:true, color:'FFFFFFFF'});
        b36.fill = fillSolid(NAVY); b36.alignment = align('right');
        setBorder(b36, null, null, medium, null);

        const f36 = ws.getCell('F36');
        f36.value = { formula: 'SUM(F10:F34)' };
        f36.font = font({size:11, bold:true, color:'FFFFFFFF'});
        f36.fill = fillSolid(NAVY); f36.alignment = align('center');
        f36.numFmt = '[h]:mm';
        setBorder(f36, thin,thin,thin,medium);

        // ── ROW 39: Certified Correct ──
        ws.mergeCells('B39:F39');
        const b39 = ws.getCell('B39');
        b39.value = 'Certified Correct:';
        b39.font = font({bold:true, color:NAVY}); b39.alignment = align('left');
        setBorder(b39, null, null, medium, medium);

        // ── ROW 41: Signature line ──
        ws.mergeCells('C41:E41');
        const c41 = ws.getCell('C41');
        c41.fill = fillSolid(LBLUE); setBorder(c41, null, medium, null, null);

        // ── ROW 42: Supervisor name ──
        ws.mergeCells('C42:E42');
        const c42 = ws.getCell('C42');
        c42.value = this.info.supervisor || '';
        c42.font = font({size:9, color:DGREY}); c42.alignment = align('center');

        // ── ROW 43: Supervisor title ──
        ws.mergeCells('C43:E43');
        const c43 = ws.getCell('C43');
        c43.value = this.info.supervisorTitle || '';
        c43.font = font({size:9, color:DGREY}); c43.alignment = align('center');

        // ── ROW 44: Role label ──
        ws.mergeCells('C44:E44');
        const c44 = ws.getCell('C44');
        c44.value = 'OJT Supervisor / Immediate Head';
        c44.font = font({bold:true, color:NAVY}); c44.fill = fillSolid(BDD);
        c44.alignment = align('center');

        // ── ROW 45: Date ──
        ws.mergeCells('C45:D45');
        const c45 = ws.getCell('C45');
        c45.value = 'Date: ___________________________';
        c45.font = font({size:9, color:NAVY}); c45.alignment = align('left');

        // ── Download ──
        const buf = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = `daily_time_report_${(this.info.name||'export').replace(/\s+/g,'_').toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        this.showNotification('Exported to Excel!', 'success');
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
