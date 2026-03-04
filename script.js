// ============================================================
//  FIREBASE CONFIG — paste your own config here
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
//  AUTH HELPERS — exposed to window for onclick handlers
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

    if (!email || !password) {
        showAuthError('loginError', 'Please fill in all fields.');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Signing in...';
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
        showAuthError('loginError', friendlyError(e.code));
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
};

window.handleSignup = async () => {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const btn = document.getElementById('signupBtn');

    if (!name || !email || !password) {
        showAuthError('signupError', 'Please fill in all fields.');
        return;
    }

    // Password validation
    if (password.length < 6) {
        showAuthError('signupError', 'Password must be at least 6 characters.');
        return;
    }
    if (!/[a-z]/.test(password)) {
        showAuthError('signupError', 'Password must include at least 1 lowercase letter.');
        return;
    }
    if (!/[A-Z]/.test(password)) {
        showAuthError('signupError', 'Password must include at least 1 uppercase letter.');
        return;
    }
    if (!/[0-9]/.test(password)) {
        showAuthError('signupError', 'Password must include at least 1 number.');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating account...';
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
    } catch (e) {
        showAuthError('signupError', friendlyError(e.code));
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
};

window.checkPasswordStrength = (password) => {
    const setRule = (id, passed) => {
        const el = document.getElementById(id);
        if (!el) return;
        const icon = el.querySelector('i');
        if (icon) {
            icon.className = passed ? 'bi bi-check-circle' : 'bi bi-x-circle';
        }
        el.classList.toggle('rule-pass', passed);
    };
    setRule('rule-lower', /[a-z]/.test(password));
    setRule('rule-upper', /[A-Z]/.test(password));
    setRule('rule-number', /[0-9]/.test(password));
    setRule('rule-length', password.length >= 6);
};

window.handleForgotPassword = async () => {
    const email = document.getElementById('loginEmail').value.trim();
    if (!email) {
        showAuthError('loginError', 'Enter your email above first.');
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        showAuthError('loginError', 'Reset email sent! Check your inbox.', true);
    } catch (e) {
        showAuthError('loginError', friendlyError(e.code));
    }
};

window.handleLogout = async () => {
    if (window.calculator) window.calculator.saveDebounced();
    await signOut(auth);
};

function showAuthError(id, msg, isSuccess = false) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.style.color = isSuccess ? '#48bb78' : '#f56565';
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
        'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
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
        // Show app
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('appScreen').classList.remove('hidden');

        // Set user display
        const name = user.displayName || user.email.split('@')[0];
        document.getElementById('userDisplayName').textContent = name;
        document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();

        // Boot tracker
        window.calculator = new OJTCalculator(user.uid);
        await window.calculator.init();

        document.getElementById('logoutBtn').onclick = window.handleLogout;
    } else {
        // Show auth screen
        document.getElementById('authScreen').classList.remove('hidden');
        document.getElementById('appScreen').classList.add('hidden');
        window.calculator = null;

        // Reset buttons
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
        this._saveTimer = null;
    }

    async init() {
        await this.loadFromFirestore();
        this.initializeEventListeners();
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
                includeWeekends: this.includeWeekends
            });
        } catch (e) {
            console.error('Save error:', e);
            this.showNotification('Could not save data.', 'error');
        }
    }

    // Alias so logout can trigger save
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
            }
        } catch (e) {
            console.error('Load error:', e);
            this.showNotification('Could not load data from database.', 'error');
        }
    }

    // ---- Event Listeners ----
    initializeEventListeners() {
        document.getElementById('addBtn').addEventListener('click', () => this.addEntry());
        document.getElementById('duplicateBtn').addEventListener('click', () => this.duplicateEntry());
        document.getElementById('updateHours').addEventListener('click', () => this.updateHoursNeeded());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToCSV());
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
        return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    }

    convertTo12Hour(timeString) {
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

        if (!date || !timeIn || !timeOut) {
            this.showNotification('Please fill in all fields!', 'error'); return;
        }

        if (isNaN(breakMins) || breakMins < 0) {
            this.showNotification('Break time must be a valid number!', 'error'); return;
        }

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

    // ---- Duplicate (inline row) ----
    duplicateEntry() {
        if (this.entries.length === 0) {
            this.showNotification('No previous entry to duplicate!', 'error'); return;
        }

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
            <td><input type="date" class="table-input" id="pendingDate" value="${nextDateStr}"></td>
            <td><input type="time" class="table-input" id="pendingTimeIn" value="${lastEntry.timeIn}"></td>
            <td><input type="time" class="table-input" id="pendingTimeOut" value="${lastEntry.timeOut}"></td>
            <td><input type="number" class="table-input" id="pendingBreak" value="${lastBreak}" min="0" style="width:60px"></td>
            <td id="pendingGross">${this.calculateHoursQuiet(lastEntry.timeIn, lastEntry.timeOut, 0)}</td>
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
        const breakMins = breakMinsInput ? parseInt(breakMinsInput) : 0;

        if (!date || !timeIn || !timeOut) {
            this.showNotification('Please fill in all fields!', 'error'); return;
        }

        if (isNaN(breakMins) || breakMins < 0) {
            this.showNotification('Break time must be a valid number!', 'error'); return;
        }

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
        const row = document.getElementById('pendingRow');
        if (row) row.remove();
        if (this.entries.length === 0) {
            document.getElementById('tableBody').innerHTML =
                '<tr class="empty-state"><td colspan="7" class="text-center"><p><i class="bi bi-inbox"></i> No entries yet. Add your first entry!</p></td></tr>';
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
            <td><input type="date" class="table-input" id="editDate" value="${entry.date}"></td>
            <td><input type="time" class="table-input" id="editTimeIn" value="${entry.timeIn}"></td>
            <td><input type="time" class="table-input" id="editTimeOut" value="${entry.timeOut}"></td>
            <td><input type="number" class="table-input" id="editBreak" value="${breakMins}" min="0" style="width:60px"></td>
            <td id="editGrossPreview">${this.calculateHoursQuiet(entry.timeIn, entry.timeOut, 0)}</td>
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

        if (!date || !timeIn || !timeOut) {
            this.showNotification('Please fill in all fields!', 'error'); return;
        }

        if (isNaN(breakMins) || breakMins < 0) {
            this.showNotification('Break time must be a valid number!', 'error'); return;
        }

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
    render() {
        this.renderTable();
        this.updateStats();
    }

    renderTable() {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        if (this.entries.length === 0) {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="7" class="text-center"><p>No entries yet. Add your first entry!</p></td></tr>';
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

            // Gross hours = time diff with no break; net hours = after break
            const grossHours = this.calculateHoursQuiet(entry.timeIn, entry.timeOut, 0);
            const netHours = entry.hours;

            row.innerHTML = `
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

        const fill = document.getElementById('progressFill');
        if (progress < 50) fill.style.background = 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)';
        else if (progress < 80) fill.style.background = 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)';
        else fill.style.background = 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)';
    }

    // ---- Hours Needed ----
    async updateHoursNeeded() {
        const val = parseInt(document.getElementById('hoursNeeded').value);
        if (isNaN(val) || val <= 0) {
            this.showNotification('Enter a valid number > 0!', 'error'); return;
        }
        this.hoursNeeded = val;
        await this.saveToFirestore();
        this.render();
        this.showNotification(`Target updated to ${val} hours!`, 'success');
    }

    // ---- Export ----
    exportToCSV() {
        if (this.entries.length === 0) {
            this.showNotification('No entries to export!', 'error'); return;
        }
        let csv = 'Date,Time In,Time Out,Hours Rendered\n';
        this.entries.forEach(e => { csv += `${this.formatDate(e.date)},${e.timeIn},${e.timeOut},${e.hours}\n`; });
        csv += `\nSummary\nTotal Hours,${this.getTotalHours()}\nTarget,${this.hoursNeeded}\nRemaining,${this.getRemainingHours()}\nProgress,${this.getProgress()}%\n`;

        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        a.download = `ojt_tracker_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        this.showNotification('Exported to CSV!', 'success');
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
