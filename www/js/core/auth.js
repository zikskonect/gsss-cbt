// auth.js - Authentication Functions
// Login, registration, and logout handlers

// --- LOGIN/REGISTRATION HANDLERS ---
async function handleTeacherRegistration(event) {
    event.preventDefault();

    const name = document.getElementById('register-name').value.trim();
    const phone = document.getElementById('register-phone').value.trim();
    const password = document.getElementById('register-password').value;

    if (!name || !phone || !password) {
        showAlert('Please fill all fields', 'error');
        return;
    }

    try {
        const existing = await getUserByPhone(phone);
        if (existing) {
            showAlert('Phone number already registered. Please use a different number.', 'error');
            return;
        }

        const hashedPassword = await hashPassword(password);

        await saveUserToDB({
            name,
            phone_number: phone,
            password: hashedPassword,
            role: 'teacher'
        });

        showAlert('Registration successful! You can now log in.', 'success');
        setPage('teacher-login');
    } catch (err) {
        console.error('Registration error:', err);
        showAlert('Registration failed. Please try again.', 'error');
    }
}

async function handleTeacherLogin(event) {
    event.preventDefault();

    const phoneInput = document.getElementById('teacher-phone');
    const passwordInput = document.getElementById('teacher-password');
    
    if (!phoneInput || !passwordInput) {
        console.error('Form inputs not found');
        return;
    }

    const phone = phoneInput.value.trim();
    const password = passwordInput.value;

    console.log('Login attempt:', { phone, passwordLength: password.length });

    if (!phone || !password) {
        showAlert('Please enter phone and password', 'error');
        return;
    }

    try {
        const user = await getUserByPhone(phone);
        console.log('User lookup result:', user ? 'Found' : 'Not found');
        
        if (!user) {
            showAlert('No account found with this phone number.', 'error');
            return;
        }
        
        if (user.role !== 'teacher') {
            showAlert('This account is not a teacher account.', 'error');
            return;
        }

        const hashedInput = await hashPassword(password);
        console.log('Password check:', hashedInput === user.password ? 'Match' : 'No match');
        
        if (hashedInput !== user.password) {
            showAlert('Incorrect password.', 'error');
            return;
        }

        state.user = user;
        state.isTeacher = true;
        state.isAuthenticated = true;
        
        await loadExams();
        await loadResults();
        
        showAlert('Login successful!', 'success');
        
        setTimeout(() => {
            setPage('teacher');
        }, 500);
        
    } catch (err) {
        console.error('Login error:', err);
        showAlert('Login failed: ' + err.message, 'error');
    }
}

async function handleExamOfficeRegistration(event) {
    event.preventDefault();

    const schoolName = document.getElementById('exam-office-school-name').value.trim();
    const adminName = document.getElementById('exam-office-admin-name').value.trim();
    const phone = document.getElementById('exam-office-phone').value.trim();
    const email = document.getElementById('exam-office-email').value.trim();
    const password = document.getElementById('exam-office-password').value;

    if (!schoolName || !adminName || !phone || !email || !password) {
        showAlert('Please fill all fields', 'error');
        return;
    }

    try {
        const existing = await getUserByPhone(phone);
        if (existing) {
            showAlert('Phone number already registered. Please use a different number.', 'error');
            return;
        }

        const hashedPassword = await hashPassword(password);

        await saveUserToDB({
            name: adminName,
            phone_number: phone,
            email: email,
            school_name: schoolName,
            password: hashedPassword,
            role: 'exam_office'
        });

        showAlert('School registration successful! You can now log in.', 'success');
        setPage('exam-office-login');
    } catch (err) {
        console.error('Exam Office Registration error:', err);
        showAlert('Registration failed. Please try again.', 'error');
    }
}

async function handleExamOfficeLogin(event) {
    event.preventDefault();

    const phoneInput = document.getElementById('exam-office-login-phone');
    const passwordInput = document.getElementById('exam-office-login-password');
    
    if (!phoneInput || !passwordInput) {
        console.error('Form inputs not found');
        return;
    }

    const phone = phoneInput.value.trim();
    const password = passwordInput.value;

    console.log('Exam Office Login attempt:', { phone, passwordLength: password.length });

    if (!phone || !password) {
        showAlert('Please enter phone and password', 'error');
        return;
    }

    try {
        const user = await getUserByPhone(phone);
        console.log('User lookup result:', user ? 'Found' : 'Not found');
        
        if (!user) {
            showAlert('No account found with this phone number.', 'error');
            return;
        }
        
        if (user.role !== 'exam_office') {
            showAlert('This account is not an exam office account.', 'error');
            return;
        }

        const hashedInput = await hashPassword(password);
        console.log('Password check:', hashedInput === user.password ? 'Match' : 'No match');
        
        if (hashedInput !== user.password) {
            showAlert('Incorrect password.', 'error');
            return;
        }

        state.user = user;
        state.isExamOffice = true;
        state.isAuthenticated = true;
        
        await loadExams();
        await loadResults();
        
        
        showAlert('Login successful!', 'success');
        
        setTimeout(() => {
            setPage('exam-office-dashboard');
        }, 500);
        
    } catch (err) {
        console.error('Exam Office Login error:', err);
        showAlert('Login failed: ' + err.message, 'error');
    }
}

function logout() {
    console.log('🔴 [LOGOUT] Clearing all state...');
    
    state.isAuthenticated = false;
    state.isTeacher = false;
    state.isExamOffice = false;
    state.user = null;
    state.studentInfo = { name: '', class: '', arms: '' };
    state.selectedExam = null;
    state.shuffledExam = null;
    state.studentAnswers = {};
    state.formSubmitted = false;
    state.currentQuestionIndex = 0;
    state.timeRemaining = 0;
    state.examStarted = false;
    state.examSubmitted = false;
    state.editingExamId = null;
    state.editingQuestionId = null;
    state.currentExamData = null;
    state.recentUploads = [];
    state.showResultModal = false;
    state.caExams = [];              
    state.todayExams = [];           
    state.studentTab = 'ca';
    
    if (state.examTimer) {
        clearInterval(state.examTimer);
        state.examTimer = null;
    }
    
    const sidebar = document.getElementById('teacherSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.add('sidebar-hidden');
    if (overlay) overlay.classList.add('hidden');
    
    console.log('✅ [LOGOUT] State cleared:', JSON.stringify({isTeacher: state.isTeacher, isAuthenticated: state.isAuthenticated}));
    
    state.currentPage = 'home';
    loadExams().then(() => {
        console.log('✅ [LOGOUT] Exams reloaded, rendering home page');
        render();
    }).catch(err => {
        console.error('❌ [LOGOUT] Error reloading exams:', err);
        render();
    });
}

// Export to global scope
window.handleTeacherLogin = handleTeacherLogin;
window.handleTeacherRegistration = handleTeacherRegistration;
window.handleExamOfficeLogin = handleExamOfficeLogin;
window.handleExamOfficeRegistration = handleExamOfficeRegistration;
window.logout = logout;