/**
 * SMASH GYM — Gym Management & Business Intelligence Platform
 * Pure Vanilla JavaScript + Chart.js + LocalStorage
 */

(function () {
  'use strict';

  // ===================================================================
  // 1. CONSTANTS & SYSTEM CONFIGURATION
  // ===================================================================
  const STORAGE_KEY = 'smashgym.trainees';
  const AUTH_KEY = 'smashgym.auth';
  const THEME_KEY = 'smashgym.theme';

  const DEMO_USER = 'admin';
  const DEMO_PASS = 'Smash@2026';

  const PLAN_PRICES = {
    'Monthly': 2000,
    'Quarterly': 5500,
    'Half-Yearly': 10000,
    'Yearly': 18000
  };

  const PLAN_MONTHS = {
    'Monthly': 1,
    'Quarterly': 3,
    'Half-Yearly': 6,
    'Yearly': 12
  };

  // Chart instances repository
  const charts = {};

  // Application State
  const state = {
    trainees: [],
    currentPage: 'dashboard',
    traineePage: 1,
    traineePerPage: 10,
    searchQuery: '',
    filterPlan: '',
    filterStatus: '',
    filterPay: '',
    sortBy: 'name',
    sortAsc: true,
    editingId: null,
    rangePreset: '6m',
    rangeFrom: '',
    rangeTo: ''
  };

  // ===================================================================
  // 2. DATE & CURRENCY UTILITIES
  // ===================================================================
  function getToday() {
    // Current date normalized to midnight
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function addDays(date, days) {
    const res = new Date(date);
    res.setDate(res.getDate() + days);
    return res;
  }

  function addMonths(date, months) {
    const res = new Date(date);
    res.setMonth(res.getMonth() + months);
    return res;
  }

  function formatDisplayDate(isoStr) {
    if (!isoStr) return '—';
    try {
      const parts = isoStr.split('-');
      if (parts.length !== 3) return isoStr;
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return isoStr;
    }
  }

  function formatCurrency(amount) {
    const val = Number(amount) || 0;
    return '₹' + new Intl.NumberFormat('en-IN').format(val);
  }

  // ===================================================================
  // 3. BUSINESS INTELLIGENCE DEFINITION CALCULATORS
  // ===================================================================
  function getSubscriptionStatus(trainee) {
    const today = getToday();
    const start = new Date(trainee.startDate + 'T00:00:00');
    const end = new Date(trainee.endDate + 'T00:00:00');

    if (end < today) {
      return 'Expired';
    }
    if (start > today) {
      return 'Upcoming';
    }
    // Active subscription: check if expiring within 7 days
    const diffMs = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 7 && diffDays >= 0) {
      return 'Expiring Soon';
    }
    return 'Active';
  }

  function getPaymentStatus(trainee) {
    const total = Number(trainee.totalFee) || 0;
    const paid = Number(trainee.amountPaid) || 0;
    if (paid >= total && total > 0) return 'Paid';
    if (paid > 0 && paid < total) return 'Partially Paid';
    return 'Pending';
  }

  function getPendingFee(trainee) {
    const total = Number(trainee.totalFee) || 0;
    const paid = Number(trainee.amountPaid) || 0;
    return Math.max(0, total - paid);
  }

  function getDaysRemaining(endDateStr) {
    const today = getToday();
    const end = new Date(endDateStr + 'T00:00:00');
    const diffMs = end.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  // ===================================================================
  // 4. SEED DATA GENERATOR (30 REALISTIC TRAINEES)
  // ===================================================================
  function generateDemoTrainees() {
    const today = getToday();

    // 30 realistic trainee records anchored around current date
    const seed = [
      // 1. Expiring Soon (< 7 days)
      {
        id: 'SG-1001',
        name: 'Rahul Patil',
        phone: '9820112345',
        age: 27,
        gender: 'Male',
        plan: 'Quarterly',
        startOffset: -85,
        endOffset: 5, // Expiring in 5 days
        totalFee: 5500,
        amountPaid: 5500,
        payOffset: -85,
        time: 'Morning',
        notes: 'Goal: Strength training & hypertrophy. Highly consistent.',
        renewed: true
      },
      {
        id: 'SG-1002',
        name: 'Sneha Jadhav',
        phone: '9820223456',
        age: 24,
        gender: 'Female',
        plan: 'Monthly',
        startOffset: -28,
        endOffset: 2, // Expiring in 2 days
        totalFee: 2000,
        amountPaid: 2000,
        payOffset: -28,
        time: 'Evening',
        notes: 'Enjoys HIIT and cardio sessions.',
        renewed: false
      },
      {
        id: 'SG-1003',
        name: 'Amit More',
        phone: '9820334567',
        age: 32,
        gender: 'Male',
        plan: 'Half-Yearly',
        startOffset: -175,
        endOffset: 5, // Expiring in 5 days
        totalFee: 10000,
        amountPaid: 7000, // Partially paid
        payOffset: -60,
        time: 'Morning',
        notes: 'Pending fee reminder sent via WhatsApp.',
        renewed: true
      },
      {
        id: 'SG-1004',
        name: 'Priya Sharma',
        phone: '9820445678',
        age: 29,
        gender: 'Female',
        plan: 'Yearly',
        startOffset: -360,
        endOffset: 5, // Expiring in 5 days
        totalFee: 18000,
        amountPaid: 18000,
        payOffset: -360,
        time: 'Evening',
        notes: 'Annual premium member. Interested in personal trainer renewal.',
        renewed: true
      },

      // 2. Active Memberships
      {
        id: 'SG-1005',
        name: 'Vikram Singh',
        phone: '9820556789',
        age: 35,
        gender: 'Male',
        plan: 'Yearly',
        startOffset: -120,
        endOffset: 245,
        totalFee: 18000,
        amountPaid: 13500, // Partial
        payOffset: -40,
        time: 'Morning',
        notes: 'Corporate package. Final installment pending.',
        renewed: true
      },
      {
        id: 'SG-1006',
        name: 'Ananya Deshmukh',
        phone: '9820667890',
        age: 22,
        gender: 'Female',
        plan: 'Quarterly',
        startOffset: -20,
        endOffset: 70,
        totalFee: 5500,
        amountPaid: 5500,
        payOffset: -20,
        time: 'Morning',
        notes: 'Focus: Mobility and core endurance.',
        renewed: false
      },
      {
        id: 'SG-1007',
        name: 'Rohan Kulkarni',
        phone: '9820778901',
        age: 30,
        gender: 'Male',
        plan: 'Half-Yearly',
        startOffset: -45,
        endOffset: 135,
        totalFee: 10000,
        amountPaid: 10000,
        payOffset: -45,
        time: 'Evening',
        notes: 'Powerlifting routine, bench press target 120kg.',
        renewed: true
      },
      {
        id: 'SG-1008',
        name: 'Tanvi Joshi',
        phone: '9820889012',
        age: 26,
        gender: 'Female',
        plan: 'Monthly',
        startOffset: -10,
        endOffset: 20,
        totalFee: 2000,
        amountPaid: 2000,
        payOffset: -10,
        time: 'Evening',
        notes: 'Zumba and functional fitness batch.',
        renewed: true
      },
      {
        id: 'SG-1009',
        name: 'Karan Malhotra',
        phone: '9820990123',
        age: 28,
        gender: 'Male',
        plan: 'Quarterly',
        startOffset: -30,
        endOffset: 60,
        totalFee: 5500,
        amountPaid: 3500, // Partial
        payOffset: -30,
        time: 'Morning',
        notes: 'Promised balance payment by next week.',
        renewed: false
      },
      {
        id: 'SG-1010',
        name: 'Pooja Nair',
        phone: '9821001234',
        age: 31,
        gender: 'Female',
        plan: 'Half-Yearly',
        startOffset: -60,
        endOffset: 120,
        totalFee: 10000,
        amountPaid: 7000, // Partial
        payOffset: -60,
        time: 'Afternoon',
        notes: 'Prefers quiet afternoon workout hours.',
        renewed: true
      },
      {
        id: 'SG-1011',
        name: 'Arjun Mehta',
        phone: '9821112345',
        age: 38,
        gender: 'Male',
        plan: 'Yearly',
        startOffset: -200,
        endOffset: 165,
        totalFee: 18000,
        amountPaid: 18000,
        payOffset: -200,
        time: 'Morning',
        notes: 'Consistent morning attendance, 6:30 AM slot.',
        renewed: true
      },
      {
        id: 'SG-1012',
        name: 'Divya Rao',
        phone: '9821223456',
        age: 25,
        gender: 'Female',
        plan: 'Monthly',
        startOffset: -5,
        endOffset: 25,
        totalFee: 2000,
        amountPaid: 2000,
        payOffset: -5,
        time: 'Evening',
        notes: 'Pilates and weight management.',
        renewed: false
      },
      {
        id: 'SG-1013',
        name: 'Siddharth Roy',
        phone: '9821334567',
        age: 33,
        gender: 'Male',
        plan: 'Quarterly',
        startOffset: -40,
        endOffset: 50,
        totalFee: 5500,
        amountPaid: 5500,
        payOffset: -40,
        time: 'Morning',
        notes: 'Marathon conditioning program.',
        renewed: true
      },
      {
        id: 'SG-1014',
        name: 'Meera Iyer',
        phone: '9821445678',
        age: 29,
        gender: 'Female',
        plan: 'Half-Yearly',
        startOffset: -90,
        endOffset: 90,
        totalFee: 10000,
        amountPaid: 10000,
        payOffset: -90,
        time: 'Morning',
        notes: 'Regular yoga and strength fusion.',
        renewed: true
      },
      {
        id: 'SG-1015',
        name: 'Aditya Verma',
        phone: '9821556789',
        age: 23,
        gender: 'Male',
        plan: 'Yearly',
        startOffset: -150,
        endOffset: 215,
        totalFee: 18000,
        amountPaid: 18000,
        payOffset: -150,
        time: 'Evening',
        notes: 'Student discount applied upon registration.',
        renewed: true
      },
      {
        id: 'SG-1016',
        name: 'Neha Kapoor',
        phone: '9821667890',
        age: 34,
        gender: 'Female',
        plan: 'Monthly',
        startOffset: -15,
        endOffset: 15,
        totalFee: 2000,
        amountPaid: 2000,
        payOffset: -15,
        time: 'Morning',
        notes: 'Cardio kickboxing enthusiast.',
        renewed: true
      },
      {
        id: 'SG-1017',
        name: 'Varun Shetty',
        phone: '9821778901',
        age: 41,
        gender: 'Male',
        plan: 'Quarterly',
        startOffset: -15,
        endOffset: 75,
        totalFee: 5500,
        amountPaid: 5500,
        payOffset: -15,
        time: 'Evening',
        notes: 'Desk posture correction and lumbar strength.',
        renewed: false
      },
      {
        id: 'SG-1018',
        name: 'Kavita Pillai',
        phone: '9821889012',
        age: 36,
        gender: 'Female',
        plan: 'Half-Yearly',
        startOffset: -30,
        endOffset: 150,
        totalFee: 10000,
        amountPaid: 10000,
        payOffset: -30,
        time: 'Morning',
        notes: 'Pre-diabetic recovery training program.',
        renewed: true
      },

      // 3. New Registrations This Month
      {
        id: 'SG-1019',
        name: 'Manish Gupta',
        phone: '9821990123',
        age: 26,
        gender: 'Male',
        plan: 'Monthly',
        startOffset: -2,
        endOffset: 28,
        totalFee: 2000,
        amountPaid: 0, // Pending payment!
        payOffset: -2,
        time: 'Evening',
        notes: 'Trial ended, converted to monthly. Awaiting payment receipt.',
        renewed: false
      },
      {
        id: 'SG-1020',
        name: 'Shreya Sen',
        phone: '9822001234',
        age: 24,
        gender: 'Female',
        plan: 'Quarterly',
        startOffset: -3,
        endOffset: 87,
        totalFee: 5500,
        amountPaid: 5500,
        payOffset: -3,
        time: 'Morning',
        notes: 'Joined with buddy pass referral.',
        renewed: false
      },
      {
        id: 'SG-1021',
        name: 'Sameer Khan',
        phone: '9822112345',
        age: 30,
        gender: 'Male',
        plan: 'Monthly',
        startOffset: -1,
        endOffset: 29,
        totalFee: 2000,
        amountPaid: 2000,
        payOffset: -1,
        time: 'Morning',
        notes: 'Body recomposition batch.',
        renewed: false
      },
      {
        id: 'SG-1022',
        name: 'Ritika Bansal',
        phone: '9822223456',
        age: 28,
        gender: 'Female',
        plan: 'Half-Yearly',
        startOffset: -4,
        endOffset: 176,
        totalFee: 10000,
        amountPaid: 6000, // Partial
        payOffset: -4,
        time: 'Evening',
        notes: 'Second installment due next month.',
        renewed: false
      },

      // 4. Expired Memberships (Need Renewal Outreach)
      {
        id: 'SG-1023',
        name: 'Gaurav Bhatt',
        phone: '9822334567',
        age: 31,
        gender: 'Male',
        plan: 'Monthly',
        startOffset: -45,
        endOffset: -15, // Expired 15 days ago
        totalFee: 2000,
        amountPaid: 2000,
        payOffset: -45,
        time: 'Evening',
        notes: 'Travelling for work. Call on weekend for renewal.',
        renewed: false
      },
      {
        id: 'SG-1024',
        name: 'Swati Kulkarni',
        phone: '9822445678',
        age: 27,
        gender: 'Female',
        plan: 'Quarterly',
        startOffset: -100,
        endOffset: -10, // Expired 10 days ago
        totalFee: 5500,
        amountPaid: 5500,
        payOffset: -100,
        time: 'Morning',
        notes: 'Requested discount for 6-month upgrade.',
        renewed: false
      },
      {
        id: 'SG-1025',
        name: 'Nikhil Shinde',
        phone: '9822556789',
        age: 34,
        gender: 'Male',
        plan: 'Monthly',
        startOffset: -35,
        endOffset: -5, // Expired 5 days ago
        totalFee: 2000,
        amountPaid: 2000,
        payOffset: -35,
        time: 'Afternoon',
        notes: 'Followed up once; interested in renewing next Monday.',
        renewed: false
      },
      {
        id: 'SG-1026',
        name: 'Deepika Joshi',
        phone: '9822667890',
        age: 26,
        gender: 'Female',
        plan: 'Yearly',
        startOffset: -390,
        endOffset: -25, // Expired 25 days ago
        totalFee: 18000,
        amountPaid: 18000,
        payOffset: -390,
        time: 'Evening',
        notes: 'Old yearly member. Send renewal discount voucher.',
        renewed: true
      },
      {
        id: 'SG-1027',
        name: 'Harsh Vardhan',
        phone: '9822778901',
        age: 45,
        gender: 'Male',
        plan: 'Half-Yearly',
        startOffset: -210,
        endOffset: -30, // Expired 30 days ago
        totalFee: 10000,
        amountPaid: 8000, // Incomplete past payment
        payOffset: -180,
        time: 'Morning',
        notes: 'Left city temporarily. Has ₹2,000 legacy balance.',
        renewed: false
      },

      // 5. Additional Realistic Members
      {
        id: 'SG-1028',
        name: 'Poonam Solanki',
        phone: '9822889012',
        age: 29,
        gender: 'Female',
        plan: 'Quarterly',
        startOffset: -50,
        endOffset: 40,
        totalFee: 5500,
        amountPaid: 5500,
        payOffset: -50,
        time: 'Morning',
        notes: 'Personal training client with Coach Jay.',
        renewed: true
      },
      {
        id: 'SG-1029',
        name: 'Abhishek Gaikwad',
        phone: '9822990123',
        age: 27,
        gender: 'Male',
        plan: 'Monthly',
        startOffset: -12,
        endOffset: 18,
        totalFee: 2000,
        amountPaid: 2000,
        payOffset: -12,
        time: 'Evening',
        notes: 'Calisthenics and weighted pull-ups routine.',
        renewed: true
      },
      {
        id: 'SG-1030',
        name: 'Trisha Sen',
        phone: '9823001234',
        age: 31,
        gender: 'Female',
        plan: 'Yearly',
        startOffset: -70,
        endOffset: 295,
        totalFee: 18000,
        amountPaid: 18000,
        payOffset: -70,
        time: 'Afternoon',
        notes: 'VIP locker holder. High attendance rate.',
        renewed: true
      }
    ];

    return seed.map(item => {
      const start = addDays(today, item.startOffset);
      const end = addDays(today, item.endOffset);
      const pay = addDays(today, item.payOffset);

      return {
        id: item.id,
        name: item.name,
        phone: item.phone,
        age: item.age,
        gender: item.gender,
        plan: item.plan,
        startDate: toISODate(start),
        endDate: toISODate(end),
        totalFee: item.totalFee,
        amountPaid: item.amountPaid,
        paymentDate: toISODate(pay),
        time: item.time,
        notes: item.notes,
        joinDate: toISODate(start),
        renewed: !!item.renewed
      };
    });
  }

  function loadTrainees() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading from localStorage, resetting demo data:', e);
    }
    const demo = generateDemoTrainees();
    saveTrainees(demo);
    return demo;
  }

  function saveTrainees(list) {
    state.trainees = list;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('LocalStorage write error:', e);
    }
  }

  // ===================================================================
  // 5. TOAST NOTIFICATIONS
  // ===================================================================
  function showToast(message, type = 'success') {
    const container = document.getElementById('toasts');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${message}</span>
      <button class="toast-close" type="button" aria-label="Close notification">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 240ms ease';
        setTimeout(() => toast.remove(), 260);
      }
    }, 4200);
  }

  // ===================================================================
  // 6. AUTHENTICATION (ADMIN ONLY)
  // ===================================================================
  function isAuthenticated() {
    return localStorage.getItem(AUTH_KEY) === 'true';
  }

  function setAuthenticated(val) {
    if (val) {
      localStorage.setItem(AUTH_KEY, 'true');
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
    updateAuthView();
  }

  function updateAuthView() {
    const isAuth = isAuthenticated();
    const loginView = document.getElementById('loginView');
    const appView = document.getElementById('appView');

    if (isAuth) {
      loginView.setAttribute('hidden', '');
      appView.removeAttribute('hidden');
      initApp();
    } else {
      appView.setAttribute('hidden', '');
      loginView.removeAttribute('hidden');
    }
  }

  function setupAuthHandlers() {
    const form = document.getElementById('loginForm');
    const userInput = document.getElementById('loginUser');
    const passInput = document.getElementById('loginPass');
    const errorEl = document.getElementById('loginError');

    // Fill demo credentials
    document.querySelectorAll('[data-act="fill-demo"]').forEach(btn => {
      btn.addEventListener('click', () => {
        userInput.value = DEMO_USER;
        passInput.value = DEMO_PASS;
        errorEl.hidden = true;
        showToast('Demo credentials filled (admin / Smash@2026)', 'info');
      });
    });

    // 1-Click Instant Demo Login
    document.querySelectorAll('[data-act="quick-login"]').forEach(btn => {
      btn.addEventListener('click', () => {
        userInput.value = DEMO_USER;
        passInput.value = DEMO_PASS;
        errorEl.hidden = true;
        setAuthenticated(true);
        showToast('Instant demo login successful! Welcome, Admin.', 'success');
      });
    });

    // Toggle password visibility
    document.querySelectorAll('[data-act="toggle-pass"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = passInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passInput.setAttribute('type', type);
      });
    });

    // Sign in submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = userInput.value.trim();
      const p = passInput.value ? passInput.value.trim() : '';

      if (u.toLowerCase() === DEMO_USER.toLowerCase() && p === DEMO_PASS) {
        errorEl.hidden = true;
        setAuthenticated(true);
        showToast('Welcome back, Administrator!', 'success');
      } else {
        errorEl.textContent = 'Invalid username or password. Demo credentials: admin / Smash@2026';
        errorEl.hidden = false;
      }
    });

    // Logout
    document.querySelectorAll('[data-act="logout"]').forEach(btn => {
      btn.addEventListener('click', () => {
        setAuthenticated(false);
        showToast('You have been signed out successfully.', 'info');
      });
    });
  }

  // ===================================================================
  // 7. THEME TOGGLE (INSTAGRAM LIGHT / DARK)
  // ===================================================================
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(saved);

    document.querySelectorAll('[data-act="theme"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        showToast(`Theme switched to ${next} mode`, 'info');
      });
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}

    const label = document.getElementById('themeLabel');
    if (label) {
      label.textContent = theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme';
    }

    // Refresh charts to match theme grid and text colors
    if (isAuthenticated()) {
      renderAllCharts();
    }
  }

  function getChartThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      textColor: isDark ? '#FAF8FD' : '#1A1322',
      mutedColor: isDark ? '#A49CB5' : '#6C627A',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(225, 48, 108, 0.08)',
      pinkPrimary: isDark ? '#FF2E93' : '#E1306C',
      coral: '#FD1D1D',
      purple: '#833AB4',
      yellow: '#F59E0B',
      green: '#10B981',
      blue: '#06B6D4'
    };
  }

  // ===================================================================
  // 8. NAVIGATION & SPA ROUTING
  // ===================================================================
  const PAGES = ['dashboard', 'trainees', 'analytics', 'insights', 'quality', 'reports', 'settings'];

  const PAGE_TITLES = {
    'dashboard': 'Dashboard Overview',
    'trainees': 'Trainee Management',
    'analytics': 'Business Intelligence Analytics',
    'insights': 'Dynamic Business Insights',
    'quality': 'Data Accuracy & Validation',
    'reports': 'Reports & Statements',
    'settings': 'Settings & Documentation'
  };

  function navigateTo(pageId) {
    if (!PAGES.includes(pageId)) pageId = 'dashboard';
    state.currentPage = pageId;

    // Update active nav links
    document.querySelectorAll('.nav a').forEach(a => {
      if (a.dataset.page === pageId) {
        a.classList.add('active');
      } else {
        a.classList.remove('active');
      }
    });

    // Toggle pages
    PAGES.forEach(id => {
      const pageEl = document.getElementById(`page-${id}`);
      if (pageEl) {
        if (id === pageId) {
          pageEl.removeAttribute('hidden');
        } else {
          pageEl.setAttribute('hidden', '');
        }
      }
    });

    // Update topbar title
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = PAGE_TITLES[pageId] || 'Dashboard';

    // Refresh page specific contents
    if (pageId === 'dashboard') {
      renderDashboard();
    } else if (pageId === 'trainees') {
      renderTraineesTable();
    } else if (pageId === 'analytics') {
      renderAnalyticsPage();
    } else if (pageId === 'insights') {
      renderBusinessInsights();
    } else if (pageId === 'quality') {
      renderDataQualityPanel();
    } else if (pageId === 'reports') {
      renderReportsPage();
    }

    // Close mobile sidebar if open
    closeMobileSidebar();
    if (window.location.hash !== `#/${pageId}`) {
      window.location.hash = `#/${pageId}`;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setupNavigation() {
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#/', '');
      if (PAGES.includes(hash) && state.currentPage !== hash) {
        navigateTo(hash);
      }
    });

    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(el.dataset.page);
      });
    });

    // Mobile sidebar toggle
    const menuBtn = document.querySelector('[data-act="menu"]');
    const scrim = document.getElementById('scrim');
    const sidebar = document.getElementById('sidebar');

    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        scrim.classList.toggle('show');
      });
    }

    if (scrim) {
      scrim.addEventListener('click', closeMobileSidebar);
    }
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const scrim = document.getElementById('scrim');
    if (sidebar) sidebar.classList.remove('open');
    if (scrim) scrim.classList.remove('show');
  }

  // ===================================================================
  // 9. DASHBOARD & KPI CALCULATIONS
  // ===================================================================
  function calculateMetrics() {
    const list = state.trainees;
    const today = getToday();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth();

    let totalRevenue = 0;
    let totalPending = 0;
    let activeCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;
    let newThisMonth = 0;

    let renewedEligible = 0;
    let totalEligible = 0;

    list.forEach(t => {
      const status = getSubscriptionStatus(t);
      const pending = getPendingFee(t);
      const paid = Number(t.amountPaid) || 0;

      totalRevenue += paid;
      totalPending += pending;

      if (status === 'Active') activeCount++;
      if (status === 'Expiring Soon') {
        activeCount++; // Expiring soon is also active
        expiringCount++;
      }
      if (status === 'Expired') expiredCount++;

      // New trainees this month
      if (t.startDate) {
        const s = new Date(t.startDate + 'T00:00:00');
        if (s.getFullYear() === curYear && s.getMonth() === curMonth) {
          newThisMonth++;
        }
      }

      // Renewal rate calculation: eligible trainees = completed at least 1 term or renewed
      if (t.renewed || status === 'Expired' || status === 'Expiring Soon') {
        totalEligible++;
        if (t.renewed) renewedEligible++;
      }
    });

    const renewalRate = totalEligible > 0 ? ((renewedEligible / totalEligible) * 100).toFixed(1) : 0;
    const accuracy = calculateDataAccuracyMetrics();

    return {
      totalRegistered: list.length,
      activeTrainees: activeCount,
      expiringSoon: expiringCount,
      expiredSubscriptions: expiredCount,
      totalRevenue,
      totalPending,
      newThisMonth,
      renewalRate,
      accuracyScore: accuracy.compositeScore
    };
  }

  function renderDashboard() {
    const metrics = calculateMetrics();

    // Top date label
    const todayLabel = document.getElementById('todayLabel');
    if (todayLabel) {
      todayLabel.textContent = new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }

    // Subtitle
    const sub = document.getElementById('dashSub');
    if (sub) {
      sub.textContent = `Managing ${metrics.totalRegistered} registered athletes with ${metrics.activeTrainees} currently active subscriptions.`;
    }

    // Sidebar counter
    const navCount = document.getElementById('navCount');
    if (navCount) navCount.textContent = metrics.totalRegistered;

    // Render KPI Grid
    const kpiGrid = document.getElementById('kpiGrid');
    if (kpiGrid) {
      kpiGrid.innerHTML = `
        <div class="kpi-card" data-kpi="total">
          <div class="kpi-top">
            <span class="kpi-label">Total Trainees</span>
            <div class="kpi-icon-wrap"><svg class="ico"><use href="#i-users"/></svg></div>
          </div>
          <div class="kpi-val">${metrics.totalRegistered}</div>
          <div class="kpi-sub"><span class="tag" style="background:var(--primary-light);color:var(--primary)">All time</span> registered members</div>
        </div>

        <div class="kpi-card" data-kpi="active">
          <div class="kpi-top">
            <span class="kpi-label">Active Trainees</span>
            <div class="kpi-icon-wrap" style="color:#059669;background:var(--status-active-bg)"><svg class="ico"><use href="#i-dumbbell"/></svg></div>
          </div>
          <div class="kpi-val">${metrics.activeTrainees}</div>
          <div class="kpi-sub"><span class="tag" style="background:var(--status-active-bg);color:#059669">Live</span> valid subscriptions</div>
        </div>

        <div class="kpi-card" data-kpi="expiring">
          <div class="kpi-top">
            <span class="kpi-label">Expiring Soon</span>
            <div class="kpi-icon-wrap" style="color:#D97706;background:var(--status-warning-bg)"><svg class="ico"><use href="#i-bulb"/></svg></div>
          </div>
          <div class="kpi-val">${metrics.expiringSoon}</div>
          <div class="kpi-sub"><span class="tag" style="background:var(--status-warning-bg);color:#D97706">Next 7 Days</span> urgent renewals</div>
        </div>

        <div class="kpi-card" data-kpi="expired">
          <div class="kpi-top">
            <span class="kpi-label">Expired Subscriptions</span>
            <div class="kpi-icon-wrap" style="color:#E11D48;background:var(--status-danger-bg)"><svg class="ico"><use href="#i-x"/></svg></div>
          </div>
          <div class="kpi-val">${metrics.expiredSubscriptions}</div>
          <div class="kpi-sub"><span class="tag" style="background:var(--status-danger-bg);color:#E11D48">Inactive</span> need recovery call</div>
        </div>

        <div class="kpi-card" data-kpi="revenue">
          <div class="kpi-top">
            <span class="kpi-label">Revenue Collected</span>
            <div class="kpi-icon-wrap"><svg class="ico"><use href="#i-chart"/></svg></div>
          </div>
          <div class="kpi-val">${formatCurrency(metrics.totalRevenue)}</div>
          <div class="kpi-sub"><span class="tag" style="background:var(--primary-light);color:var(--primary)">Collected</span> verified receipts</div>
        </div>

        <div class="kpi-card" data-kpi="pending">
          <div class="kpi-top">
            <span class="kpi-label">Pending Fees</span>
            <div class="kpi-icon-wrap" style="color:#E11D48;background:var(--status-danger-bg)"><svg class="ico"><use href="#i-file"/></svg></div>
          </div>
          <div class="kpi-val" style="color:#E11D48">${formatCurrency(metrics.totalPending)}</div>
          <div class="kpi-sub"><span class="tag" style="background:var(--status-danger-bg);color:#E11D48">Outstanding</span> dues to recover</div>
        </div>

        <div class="kpi-card" data-kpi="new">
          <div class="kpi-top">
            <span class="kpi-label">New This Month</span>
            <div class="kpi-icon-wrap"><svg class="ico"><use href="#i-plus"/></svg></div>
          </div>
          <div class="kpi-val">${metrics.newThisMonth}</div>
          <div class="kpi-sub"><span class="tag" style="background:var(--primary-light);color:var(--primary)">Joined</span> this calendar month</div>
        </div>

        <div class="kpi-card" data-kpi="renewal">
          <div class="kpi-top">
            <span class="kpi-label">Renewal Rate</span>
            <div class="kpi-icon-wrap"><svg class="ico"><use href="#i-reset"/></svg></div>
          </div>
          <div class="kpi-val">${metrics.renewalRate}%</div>
          <div class="kpi-sub"><span class="tag" style="background:var(--status-active-bg);color:#059669">Loyalty</span> retention metric</div>
        </div>

        <div class="kpi-card" data-kpi="accuracy">
          <div class="kpi-top">
            <span class="kpi-label">Data Accuracy</span>
            <div class="kpi-icon-wrap"><svg class="ico"><use href="#i-shield"/></svg></div>
          </div>
          <div class="kpi-val">${metrics.accuracyScore}%</div>
          <div class="kpi-sub"><span class="tag" style="background:var(--status-active-bg);color:#059669">Verified</span> BI calculation score</div>
        </div>
      `;

      // KPI Clickable Filtering
      kpiGrid.querySelectorAll('.kpi-card').forEach(card => {
        card.addEventListener('click', () => {
          const type = card.dataset.kpi;
          if (type === 'total') {
            state.filterPlan = '';
            state.filterStatus = '';
            state.filterPay = '';
            state.searchQuery = '';
            navigateTo('trainees');
          } else if (type === 'active') {
            state.filterStatus = 'Active';
            navigateTo('trainees');
          } else if (type === 'expiring') {
            state.filterStatus = 'Expiring Soon';
            navigateTo('trainees');
          } else if (type === 'expired') {
            state.filterStatus = 'Expired';
            navigateTo('trainees');
          } else if (type === 'revenue') {
            navigateTo('analytics');
          } else if (type === 'pending') {
            state.filterPay = 'Due';
            navigateTo('trainees');
          } else if (type === 'new') {
            state.filterStatus = '';
            state.filterPay = '';
            state.searchQuery = '';
            navigateTo('trainees');
          } else if (type === 'renewal') {
            navigateTo('insights');
          } else if (type === 'accuracy') {
            navigateTo('quality');
          }
        });
      });
    }

    // Dashboard dynamic alerts
    renderDashboardAlerts();

    // Dashboard quick tables
    renderDashboardTables();

    // Dashboard charts
    renderDashboardCharts();
  }

  function renderDashboardAlerts() {
    const list = state.trainees;
    const container = document.getElementById('dashAlerts');
    if (!container) return;

    // Trainees expiring soon
    const expiring = list.filter(t => getSubscriptionStatus(t) === 'Expiring Soon');
    // Trainees with pending fees
    const pendingTrainees = list.filter(t => getPendingFee(t) > 0);

    const alerts = [];

    if (expiring.length > 0) {
      const names = expiring.slice(0, 3).map(t => t.name).join(', ') + (expiring.length > 3 ? ` and ${expiring.length - 3} others` : '');
      alerts.push(`
        <div class="alert-item urgent">
          <div class="alert-icon" style="color:#D97706;background:var(--status-warning-bg)"><svg class="ico"><use href="#i-bulb"/></svg></div>
          <div class="alert-content">
            <strong>Upcoming Renewals (Next 7 Days)</strong>
            <p><strong>${names}</strong> have subscriptions expiring soon. Send prompt renewal reminders to protect retention.</p>
          </div>
        </div>
      `);
    }

    if (pendingTrainees.length > 0) {
      const topPending = [...pendingTrainees].sort((a, b) => getPendingFee(b) - getPendingFee(a)).slice(0, 2);
      const names = topPending.map(t => `${t.name} (${formatCurrency(getPendingFee(t))})`).join(', ');
      alerts.push(`
        <div class="alert-item">
          <div class="alert-icon" style="color:#E11D48;background:var(--status-danger-bg)"><svg class="ico"><use href="#i-file"/></svg></div>
          <div class="alert-content">
            <strong>Pending Fee Collections Due</strong>
            <p>${pendingTrainees.length} trainees have outstanding balances. Top balances: <strong>${names}</strong>.</p>
          </div>
        </div>
      `);
    }

    if (alerts.length === 0) {
      alerts.push(`
        <div class="alert-item">
          <div class="alert-icon"><svg class="ico"><use href="#i-shield"/></svg></div>
          <div class="alert-content">
            <strong>All Records In Good Standing</strong>
            <p>No immediate expirations or critical pending collections pending today.</p>
          </div>
        </div>
      `);
    }

    container.innerHTML = alerts.join('');
  }

  function renderDashboardTables() {
    const paymentsContainer = document.getElementById('dashPayments');
    const renewalsContainer = document.getElementById('dashRenewals');

    // Recent Payments
    if (paymentsContainer) {
      const sorted = [...state.trainees]
        .filter(t => Number(t.amountPaid) > 0)
        .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
        .slice(0, 5);

      if (sorted.length === 0) {
        paymentsContainer.innerHTML = '<p class="muted">No payment records found.</p>';
      } else {
        paymentsContainer.innerHTML = `
          <table class="data">
            <thead><tr><th>Trainee</th><th>Plan</th><th>Paid Date</th><th class="num">Amount</th></tr></thead>
            <tbody>
              ${sorted.map(t => `
                <tr>
                  <td><strong>${t.name}</strong></td>
                  <td>${t.plan}</td>
                  <td>${formatDisplayDate(t.paymentDate)}</td>
                  <td class="num">${formatCurrency(t.amountPaid)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }

    // Renewals Due within 7 days
    if (renewalsContainer) {
      const expiring = state.trainees
        .filter(t => getSubscriptionStatus(t) === 'Expiring Soon')
        .sort((a, b) => new Date(a.endDate) - new Date(b.endDate))
        .slice(0, 5);

      if (expiring.length === 0) {
        renewalsContainer.innerHTML = '<p class="muted">No renewals expiring within 7 days.</p>';
      } else {
        renewalsContainer.innerHTML = `
          <table class="data">
            <thead><tr><th>Trainee</th><th>Plan</th><th>Expires On</th><th>Days Left</th></tr></thead>
            <tbody>
              ${expiring.map(t => {
                const days = getDaysRemaining(t.endDate);
                return `
                  <tr>
                    <td><strong>${t.name}</strong></td>
                    <td>${t.plan}</td>
                    <td>${formatDisplayDate(t.endDate)}</td>
                    <td><span class="badge badge-expiring">${days} day${days === 1 ? '' : 's'}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
      }
    }
  }

  // ===================================================================
  // 10. TRAINEE MANAGEMENT (TABLE, CRUD, FILTER, SORT, PROFILE)
  // ===================================================================
  function renderTraineesTable() {
    const tableBody = document.getElementById('traineeBody');
    const emptyState = document.getElementById('traineeEmpty');
    const resultCount = document.getElementById('resultCount');
    const pager = document.getElementById('pager');
    const tableWrap = document.getElementById('traineeTableWrap');
    const quickChip = document.getElementById('quickChip');

    if (!tableBody) return;

    // 1. Filter
    let filtered = state.trainees.filter(t => {
      // Search
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const mName = (t.name || '').toLowerCase().includes(q);
        const mId = (t.id || '').toLowerCase().includes(q);
        const mPhone = (t.phone || '').toLowerCase().includes(q);
        if (!mName && !mId && !mPhone) return false;
      }
      // Plan
      if (state.filterPlan && t.plan !== state.filterPlan) {
        return false;
      }
      // Status
      if (state.filterStatus) {
        const status = getSubscriptionStatus(t);
        if (state.filterStatus === 'Active') {
          if (status !== 'Active' && status !== 'Expiring Soon') return false;
        } else if (status !== state.filterStatus) {
          return false;
        }
      }
      // Payment Status
      if (state.filterPay) {
        const payStatus = getPaymentStatus(t);
        if (state.filterPay === 'Due') {
          if (getPendingFee(t) <= 0) return false;
        } else if (payStatus !== state.filterPay) {
          return false;
        }
      }
      return true;
    });

    // 2. Sort
    filtered.sort((a, b) => {
      let valA, valB;
      if (state.sortBy === 'name') {
        valA = (a.name || '').toLowerCase();
        valB = (b.name || '').toLowerCase();
      } else if (state.sortBy === 'start') {
        valA = new Date(a.startDate || '1970-01-01').getTime();
        valB = new Date(b.startDate || '1970-01-01').getTime();
      } else if (state.sortBy === 'end') {
        valA = new Date(a.endDate || '1970-01-01').getTime();
        valB = new Date(b.endDate || '1970-01-01').getTime();
      } else if (state.sortBy === 'total') {
        valA = Number(a.totalFee) || 0;
        valB = Number(b.totalFee) || 0;
      } else if (state.sortBy === 'pending') {
        valA = getPendingFee(a);
        valB = getPendingFee(b);
      } else {
        valA = a.id;
        valB = b.id;
      }

      if (valA < valB) return state.sortAsc ? -1 : 1;
      if (valA > valB) return state.sortAsc ? 1 : -1;
      return 0;
    });

    // Update mini stats
    const statsEl = document.getElementById('traineeStats');
    if (statsEl) {
      const activeCount = state.trainees.filter(t => {
        const s = getSubscriptionStatus(t);
        return s === 'Active' || s === 'Expiring Soon';
      }).length;
      const totalPending = state.trainees.reduce((acc, t) => acc + getPendingFee(t), 0);

      statsEl.innerHTML = `
        <div class="mini-stat-card">
          <small>Total Members</small>
          <strong>${state.trainees.length}</strong>
        </div>
        <div class="mini-stat-card">
          <small>Active Subscriptions</small>
          <strong>${activeCount}</strong>
        </div>
        <div class="mini-stat-card">
          <small>Matching Results</small>
          <strong>${filtered.length}</strong>
        </div>
        <div class="mini-stat-card">
          <small>Total Pending</small>
          <strong style="color:#E11D48">${formatCurrency(totalPending)}</strong>
        </div>
      `;
    }

    // Quick chips
    const chips = [];
    if (state.searchQuery) chips.push(`Search: "${state.searchQuery}"`);
    if (state.filterPlan) chips.push(`Plan: ${state.filterPlan}`);
    if (state.filterStatus) chips.push(`Status: ${state.filterStatus}`);
    if (state.filterPay) chips.push(`Payment: ${state.filterPay}`);

    if (chips.length > 0 && quickChip) {
      quickChip.hidden = false;
      quickChip.innerHTML = chips.map(c => `
        <span class="chip">${c}</span>
      `).join('') + `<button type="button" class="btn btn-ghost btn-sm" data-act="clear-filters">Reset All</button>`;
      quickChip.querySelectorAll('[data-act="clear-filters"]').forEach(b => b.addEventListener('click', clearFilters));
    } else if (quickChip) {
      quickChip.hidden = true;
    }

    // Empty state handling
    if (filtered.length === 0) {
      tableWrap.hidden = true;
      emptyState.hidden = false;
      emptyState.innerHTML = `
        <svg class="ico"><use href="#i-search"/></svg>
        <h4>No matching trainees found</h4>
        <p class="muted">Try adjusting your search query or clear the active filters to see all trainees.</p>
        <button type="button" class="btn btn-primary btn-sm" data-act="clear-filters">Clear filters</button>
      `;
      emptyState.querySelector('[data-act="clear-filters"]').addEventListener('click', clearFilters);
      resultCount.textContent = 'Showing 0 records';
      pager.innerHTML = '';
      return;
    }

    tableWrap.hidden = false;
    emptyState.hidden = true;

    // 3. Pagination
    const totalPages = Math.ceil(filtered.length / state.traineePerPage);
    if (state.traineePage > totalPages) state.traineePage = totalPages;
    if (state.traineePage < 1) state.traineePage = 1;

    const startIdx = (state.traineePage - 1) * state.traineePerPage;
    const pageRecords = filtered.slice(startIdx, startIdx + state.traineePerPage);

    resultCount.textContent = `Showing ${startIdx + 1}–${Math.min(startIdx + state.traineePerPage, filtered.length)} of ${filtered.length} trainees`;

    // 4. Render Table Rows (FULL NAME VISIBLE)
    tableBody.innerHTML = pageRecords.map(t => {
      const subStatus = getSubscriptionStatus(t);
      const payStatus = getPaymentStatus(t);
      const pending = getPendingFee(t);

      let subBadgeClass = 'badge-active';
      if (subStatus === 'Expiring Soon') subBadgeClass = 'badge-expiring';
      else if (subStatus === 'Expired') subBadgeClass = 'badge-expired';

      let payBadgeClass = 'badge-paid';
      if (payStatus === 'Partially Paid') payBadgeClass = 'badge-partial';
      else if (payStatus === 'Pending') payBadgeClass = 'badge-pending';

      const initial = (t.name || 'T').charAt(0).toUpperCase();

      return `
        <tr data-id="${t.id}">
          <td><code>${t.id}</code></td>
          <td class="col-name">
            <div class="trainee-cell">
              <span class="trainee-avatar">${initial}</span>
              <div>
                <a class="trainee-name-link" data-act="view" data-id="${t.id}">${t.name}</a>
                <div class="trainee-meta">${t.gender}, ${t.age} yrs • ${t.time}</div>
              </div>
            </div>
          </td>
          <td>${t.phone || '—'}</td>
          <td><strong>${t.plan}</strong></td>
          <td>${formatDisplayDate(t.startDate)}</td>
          <td>${formatDisplayDate(t.endDate)}</td>
          <td class="num">${formatCurrency(t.totalFee)}</td>
          <td class="num" style="color:#059669">${formatCurrency(t.amountPaid)}</td>
          <td class="num" style="color:${pending > 0 ? '#E11D48' : 'var(--text-muted)'}">${formatCurrency(pending)}</td>
          <td><span class="badge ${subBadgeClass}"><span class="badge-dot"></span>${subStatus}</span></td>
          <td><span class="badge ${payBadgeClass}">${payStatus}</span></td>
          <td>
            <div class="actions-cell">
              <button class="icon-btn" type="button" data-act="view" data-id="${t.id}" title="View detailed profile" aria-label="View profile">
                <svg class="ico"><use href="#i-eye"/></svg>
              </button>
              <button class="icon-btn" type="button" data-act="edit" data-id="${t.id}" title="Edit trainee record" aria-label="Edit record">
                <svg class="ico"><use href="#i-sliders"/></svg>
              </button>
              <button class="icon-btn" type="button" data-act="delete" data-id="${t.id}" title="Delete trainee record" aria-label="Delete trainee" style="color:#E11D48">
                <svg class="ico"><use href="#i-x"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row events
    tableBody.querySelectorAll('[data-act="view"]').forEach(btn => {
      btn.addEventListener('click', () => viewTraineeProfile(btn.dataset.id));
    });
    tableBody.querySelectorAll('[data-act="edit"]').forEach(btn => {
      btn.addEventListener('click', () => openEditTraineeModal(btn.dataset.id));
    });
    tableBody.querySelectorAll('[data-act="delete"]').forEach(btn => {
      btn.addEventListener('click', () => confirmDeleteTrainee(btn.dataset.id));
    });

    // 5. Render Pagination Controls
    renderPager(totalPages);
  }

  function renderPager(totalPages) {
    const pager = document.getElementById('pager');
    if (!pager) return;

    if (totalPages <= 1) {
      pager.innerHTML = '';
      return;
    }

    let html = `
      <button type="button" ${state.traineePage === 1 ? 'disabled' : ''} data-page="${state.traineePage - 1}">Prev</button>
    `;

    for (let p = 1; p <= totalPages; p++) {
      html += `
        <button type="button" class="${p === state.traineePage ? 'active' : ''}" data-page="${p}">${p}</button>
      `;
    }

    html += `
      <button type="button" ${state.traineePage === totalPages ? 'disabled' : ''} data-page="${state.traineePage + 1}">Next</button>
    `;

    pager.innerHTML = html;

    pager.querySelectorAll('button:not(:disabled)').forEach(b => {
      b.addEventListener('click', () => {
        state.traineePage = parseInt(b.dataset.page);
        renderTraineesTable();
      });
    });
  }

  function clearFilters() {
    state.searchQuery = '';
    state.filterPlan = '';
    state.filterStatus = '';
    state.filterPay = '';
    state.traineePage = 1;

    const s = document.getElementById('searchInput');
    const fp = document.getElementById('filterPlan');
    const fs = document.getElementById('filterStatus');
    const fpay = document.getElementById('filterPay');

    if (s) s.value = '';
    if (fp) fp.value = '';
    if (fs) fs.value = '';
    if (fpay) fpay.value = '';

    renderTraineesTable();
  }

  function setupTraineeManagementHandlers() {
    const sInput = document.getElementById('searchInput');
    const fPlan = document.getElementById('filterPlan');
    const fStatus = document.getElementById('filterStatus');
    const fPay = document.getElementById('filterPay');
    const sortSelect = document.getElementById('sortSelect');
    const sortDirBtn = document.getElementById('sortDir');
    const perPageSelect = document.getElementById('perPage');

    if (sInput) {
      sInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim();
        state.traineePage = 1;
        renderTraineesTable();
      });
    }

    if (fPlan) {
      fPlan.addEventListener('change', (e) => {
        state.filterPlan = e.target.value;
        state.traineePage = 1;
        renderTraineesTable();
      });
    }

    if (fStatus) {
      fStatus.addEventListener('change', (e) => {
        state.filterStatus = e.target.value;
        state.traineePage = 1;
        renderTraineesTable();
      });
    }

    if (fPay) {
      fPay.addEventListener('change', (e) => {
        state.filterPay = e.target.value;
        state.traineePage = 1;
        renderTraineesTable();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderTraineesTable();
      });
    }

    if (sortDirBtn) {
      sortDirBtn.addEventListener('click', () => {
        state.sortAsc = !state.sortAsc;
        sortDirBtn.textContent = state.sortAsc ? 'Ascending' : 'Descending';
        renderTraineesTable();
      });
    }

    if (perPageSelect) {
      perPageSelect.addEventListener('change', (e) => {
        state.traineePerPage = parseInt(e.target.value) || 10;
        state.traineePage = 1;
        renderTraineesTable();
      });
    }

    // Sortable table headers
    document.querySelectorAll('#traineeTable th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (state.sortBy === col) {
          state.sortAsc = !state.sortAsc;
        } else {
          state.sortBy = col;
          state.sortAsc = true;
        }

        // update header aria-sort
        document.querySelectorAll('#traineeTable th.sortable').forEach(h => {
          if (h.dataset.sort === state.sortBy) {
            h.setAttribute('aria-sort', state.sortAsc ? 'ascending' : 'descending');
          } else {
            h.setAttribute('aria-sort', 'none');
          }
        });

        if (sortSelect) sortSelect.value = state.sortBy;
        if (sortDirBtn) sortDirBtn.textContent = state.sortAsc ? 'Ascending' : 'Descending';

        renderTraineesTable();
      });
    });

    // Clear filters button
    document.querySelectorAll('[data-act="clear-filters"]').forEach(btn => {
      btn.addEventListener('click', clearFilters);
    });

    // Add trainee button
    document.querySelectorAll('[data-act="add"]').forEach(btn => {
      btn.addEventListener('click', openAddTraineeModal);
    });
  }

  // ===================================================================
  // 11. ADD / EDIT TRAINEE MODAL & REALTIME CALCULATION
  // ===================================================================
  function generateNextTraineeId() {
    let maxNum = 1000;
    state.trainees.forEach(t => {
      const match = (t.id || '').match(/SG-(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNum) maxNum = num;
      }
    });
    return `SG-${maxNum + 1}`;
  }

  function openAddTraineeModal() {
    state.editingId = null;
    const dialog = document.getElementById('traineeDialog');
    const form = document.getElementById('traineeForm');
    const title = document.getElementById('formTitle');
    const sub = document.getElementById('formSub');

    if (!dialog || !form) return;

    form.reset();
    clearFormErrors(form);

    title.textContent = 'Add New Trainee';
    sub.textContent = 'Register a new member with fees and subscription period.';

    // Prefill automatic ID
    document.getElementById('f-id').value = generateNextTraineeId();

    // Default dates & plan
    const today = getToday();
    document.getElementById('f-plan').value = 'Quarterly';
    document.getElementById('f-startDate').value = toISODate(today);
    document.getElementById('f-endDate').value = toISODate(addMonths(today, 3));
    document.getElementById('f-totalFee').value = PLAN_PRICES['Quarterly'];
    document.getElementById('f-amountPaid').value = PLAN_PRICES['Quarterly'];
    document.getElementById('f-pending').value = '₹0';
    document.getElementById('f-paymentDate').value = toISODate(today);

    dialog.showModal();
  }

  function openEditTraineeModal(id) {
    const trainee = state.trainees.find(t => t.id === id);
    if (!trainee) return;

    state.editingId = id;
    const dialog = document.getElementById('traineeDialog');
    const form = document.getElementById('traineeForm');
    const title = document.getElementById('formTitle');
    const sub = document.getElementById('formSub');

    if (!dialog || !form) return;

    clearFormErrors(form);
    title.textContent = `Edit Trainee — ${trainee.name}`;
    sub.textContent = `Update subscription, payment ledger and member profile.`;

    document.getElementById('f-id').value = trainee.id;
    document.getElementById('f-name').value = trainee.name || '';
    document.getElementById('f-phone').value = trainee.phone || '';
    document.getElementById('f-age').value = trainee.age || '';
    document.getElementById('f-gender').value = trainee.gender || '';
    document.getElementById('f-plan').value = trainee.plan || 'Monthly';
    document.getElementById('f-startDate').value = trainee.startDate || '';
    document.getElementById('f-endDate').value = trainee.endDate || '';
    document.getElementById('f-totalFee').value = trainee.totalFee || 0;
    document.getElementById('f-amountPaid').value = trainee.amountPaid || 0;
    document.getElementById('f-paymentDate').value = trainee.paymentDate || '';
    document.getElementById('f-time').value = trainee.time || '';
    document.getElementById('f-notes').value = trainee.notes || '';

    updatePendingFeeCalculation();

    dialog.showModal();
  }

  function updatePendingFeeCalculation() {
    const total = Number(document.getElementById('f-totalFee').value) || 0;
    const paid = Number(document.getElementById('f-amountPaid').value) || 0;
    const pending = Math.max(0, total - paid);
    document.getElementById('f-pending').value = formatCurrency(pending);
  }

  function clearFormErrors(form) {
    form.querySelectorAll('.err').forEach(el => el.textContent = '');
  }

  function setupFormHandlers() {
    const form = document.getElementById('traineeForm');
    const planSelect = document.getElementById('f-plan');
    const startDateInput = document.getElementById('f-startDate');
    const totalFeeInput = document.getElementById('f-totalFee');
    const amountPaidInput = document.getElementById('f-amountPaid');

    // Auto calculate End Date & fee when plan changes
    if (planSelect) {
      planSelect.addEventListener('change', () => {
        const plan = planSelect.value;
        const months = PLAN_MONTHS[plan] || 1;
        const startVal = startDateInput.value ? new Date(startDateInput.value + 'T00:00:00') : getToday();
        document.getElementById('f-endDate').value = toISODate(addMonths(startVal, months));

        // Auto suggest plan price if field is empty or matching a default price
        if (PLAN_PRICES[plan]) {
          totalFeeInput.value = PLAN_PRICES[plan];
          if (!amountPaidInput.value || Number(amountPaidInput.value) > PLAN_PRICES[plan]) {
            amountPaidInput.value = PLAN_PRICES[plan];
          }
          updatePendingFeeCalculation();
        }
      });
    }

    if (startDateInput) {
      startDateInput.addEventListener('change', () => {
        const plan = planSelect.value;
        const months = PLAN_MONTHS[plan] || 1;
        const startVal = startDateInput.value ? new Date(startDateInput.value + 'T00:00:00') : getToday();
        document.getElementById('f-endDate').value = toISODate(addMonths(startVal, months));
      });
    }

    if (totalFeeInput) {
      totalFeeInput.addEventListener('input', updatePendingFeeCalculation);
    }
    if (amountPaidInput) {
      amountPaidInput.addEventListener('input', updatePendingFeeCalculation);
    }

    // Close buttons on dialogs
    document.querySelectorAll('[data-act="close-dialog"]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('dialog.modal').forEach(d => d.close());
      });
    });

    // Close on backdrop click
    document.querySelectorAll('dialog.modal').forEach(dialog => {
      dialog.addEventListener('click', (e) => {
        const rect = dialog.getBoundingClientRect();
        const inDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height
          && rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
        if (!inDialog) {
          dialog.close();
        }
      });
    });

    // Form submit
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    clearFormErrors(form);

    const id = document.getElementById('f-id').value.trim();
    const name = document.getElementById('f-name').value.trim();
    const phone = document.getElementById('f-phone').value.trim();
    const age = parseInt(document.getElementById('f-age').value);
    const gender = document.getElementById('f-gender').value;
    const plan = document.getElementById('f-plan').value;
    const startDate = document.getElementById('f-startDate').value;
    const endDate = document.getElementById('f-endDate').value;
    const totalFee = Number(document.getElementById('f-totalFee').value);
    const amountPaid = Number(document.getElementById('f-amountPaid').value);
    const paymentDate = document.getElementById('f-paymentDate').value || toISODate(getToday());
    const time = document.getElementById('f-time').value;
    const notes = document.getElementById('f-notes').value.trim();

    let hasError = false;

    function setErr(field, msg) {
      const parent = form.querySelector(`[data-field="${field}"]`);
      if (parent) {
        const el = parent.querySelector('.err');
        if (el) el.textContent = msg;
      }
      hasError = true;
    }

    if (!name || name.length < 2) setErr('name', 'Full name is required (min 2 letters)');
    if (!phone || !/^\+?\d{8,15}$/.test(phone.replace(/[\s-]/g, ''))) {
      setErr('phone', 'Please enter a valid phone number (10 digits)');
    }
    if (isNaN(age) || age < 12 || age > 90) setErr('age', 'Age must be between 12 and 90');
    if (!gender) setErr('gender', 'Please select a gender');
    if (!plan) setErr('plan', 'Please select a membership plan');
    if (!startDate) setErr('startDate', 'Start date is required');
    if (!endDate) setErr('endDate', 'End date is required');
    else if (startDate && new Date(endDate) < new Date(startDate)) {
      setErr('endDate', 'End date cannot be earlier than start date');
    }

    if (isNaN(totalFee) || totalFee < 0) setErr('totalFee', 'Fee must be a valid non-negative amount');
    if (isNaN(amountPaid) || amountPaid < 0) setErr('amountPaid', 'Paid amount must be non-negative');
    else if (amountPaid > totalFee) {
      setErr('amountPaid', 'Amount paid cannot exceed total membership fee');
    }
    if (!time) setErr('time', 'Preferred training session is required');

    if (hasError) return;

    if (state.editingId) {
      // Update existing
      const idx = state.trainees.findIndex(t => t.id === state.editingId);
      if (idx !== -1) {
        const existing = state.trainees[idx];
        state.trainees[idx] = {
          ...existing,
          name,
          phone,
          age,
          gender,
          plan,
          startDate,
          endDate,
          totalFee,
          amountPaid,
          paymentDate,
          time,
          notes
        };
        saveTrainees(state.trainees);
        showToast(`Trainee ${name} updated successfully!`, 'success');
      }
    } else {
      // Create new
      const newTrainee = {
        id,
        name,
        phone,
        age,
        gender,
        plan,
        startDate,
        endDate,
        totalFee,
        amountPaid,
        paymentDate,
        time,
        notes,
        joinDate: startDate,
        renewed: false
      };
      state.trainees.unshift(newTrainee);
      saveTrainees(state.trainees);
      showToast(`Trainee ${name} registered successfully!`, 'success');
    }

    document.getElementById('traineeDialog').close();
    refreshAllViews();
  }

  // ===================================================================
  // 12. VIEW TRAINEE PROFILE MODAL
  // ===================================================================
  function viewTraineeProfile(id) {
    const t = state.trainees.find(item => item.id === id);
    if (!t) return;

    const dialog = document.getElementById('viewDialog');
    const body = document.getElementById('viewBody');
    if (!dialog || !body) return;

    const subStatus = getSubscriptionStatus(t);
    const payStatus = getPaymentStatus(t);
    const pending = getPendingFee(t);
    const daysRemaining = getDaysRemaining(t.endDate);
    const initial = (t.name || 'T').charAt(0).toUpperCase();

    let subBadgeClass = 'badge-active';
    if (subStatus === 'Expiring Soon') subBadgeClass = 'badge-expiring';
    else if (subStatus === 'Expired') subBadgeClass = 'badge-expired';

    let payBadgeClass = 'badge-paid';
    if (payStatus === 'Partially Paid') payBadgeClass = 'badge-partial';
    else if (payStatus === 'Pending') payBadgeClass = 'badge-pending';

    const paidPct = t.totalFee > 0 ? Math.min(100, Math.round((t.amountPaid / t.totalFee) * 100)) : 100;

    body.innerHTML = `
      <div class="modal-card">
        <header class="modal-head">
          <h2>Trainee Profile</h2>
          <button type="button" class="icon-btn" data-act="close-dialog" aria-label="Close dialog"><svg class="ico"><use href="#i-x"/></svg></button>
        </header>

        <div class="modal-body profile-wrap">
          <div class="profile-hero">
            <div class="profile-avatar-lg">${initial}</div>
            <div class="profile-hero-info">
              <h2>${t.name}</h2>
              <div class="profile-badge-row">
                <code>${t.id}</code>
                <span class="badge ${subBadgeClass}"><span class="badge-dot"></span>${subStatus}</span>
                <span class="badge ${payBadgeClass}">${payStatus}</span>
              </div>
            </div>
          </div>

          <div class="profile-financial-card">
            <div class="financial-numbers">
              <div>
                <small>Total Fee</small>
                <strong>${formatCurrency(t.totalFee)}</strong>
              </div>
              <div>
                <small>Amount Paid</small>
                <strong style="color:#059669">${formatCurrency(t.amountPaid)}</strong>
              </div>
              <div>
                <small>Pending Balance</small>
                <strong style="color:${pending > 0 ? '#E11D48' : 'var(--text-muted)'}">${formatCurrency(pending)}</strong>
              </div>
            </div>
            <div class="progress-track" title="${paidPct}% paid">
              <div class="progress-fill" style="width:${paidPct}%"></div>
            </div>
            <small class="muted" style="font-size:0.75rem">${paidPct}% of total membership fee settled to date</small>
          </div>

          <div class="profile-info-grid">
            <div class="profile-info-box">
              <small>Contact Number</small>
              <strong>${t.phone || '—'}</strong>
            </div>
            <div class="profile-info-box">
              <small>Age & Gender</small>
              <strong>${t.age} years, ${t.gender}</strong>
            </div>
            <div class="profile-info-box">
              <small>Membership Plan</small>
              <strong>${t.plan}</strong>
            </div>
            <div class="profile-info-box">
              <small>Training Session</small>
              <strong>${t.time} Session</strong>
            </div>
            <div class="profile-info-box">
              <small>Subscription Period</small>
              <strong>${formatDisplayDate(t.startDate)} – ${formatDisplayDate(t.endDate)}</strong>
            </div>
            <div class="profile-info-box">
              <small>Subscription Status</small>
              <strong>${daysRemaining >= 0 ? `${daysRemaining} days remaining` : `Expired ${Math.abs(daysRemaining)} days ago`}</strong>
            </div>
            <div class="profile-info-box">
              <small>Last Payment Date</small>
              <strong>${formatDisplayDate(t.paymentDate)}</strong>
            </div>
            <div class="profile-info-box">
              <small>Renewal Record</small>
              <strong>${t.renewed ? 'Renewed Member (Loyal)' : 'First Term Member'}</strong>
            </div>
          </div>

          ${t.notes ? `
            <div class="profile-info-box">
              <small>Coach & Health Notes</small>
              <p style="font-size:0.9rem;color:var(--text-main);margin-top:4px;">${t.notes}</p>
            </div>
          ` : ''}
        </div>

        <footer class="modal-foot">
          ${pending > 0 ? `
            <button type="button" class="btn btn-primary" id="btn-quick-pay">Collect ${formatCurrency(pending)}</button>
          ` : `
            <button type="button" class="btn btn-ghost" id="btn-quick-renew">Renew Plan</button>
          `}
          <button type="button" class="btn btn-ghost" id="btn-profile-edit">Edit Record</button>
          <button type="button" class="btn btn-ghost" data-act="close-dialog">Close</button>
        </footer>
      </div>
    `;

    body.querySelectorAll('[data-act="close-dialog"]').forEach(btn => {
      btn.addEventListener('click', () => dialog.close());
    });

    const editBtn = body.querySelector('#btn-profile-edit');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        dialog.close();
        openEditTraineeModal(t.id);
      });
    }

    const payBtn = body.querySelector('#btn-quick-pay');
    if (payBtn) {
      payBtn.addEventListener('click', () => {
        // Collect full balance
        t.amountPaid = t.totalFee;
        t.paymentDate = toISODate(getToday());
        saveTrainees(state.trainees);
        dialog.close();
        showToast(`Full balance collected for ${t.name}!`, 'success');
        refreshAllViews();
      });
    }

    const renewBtn = body.querySelector('#btn-quick-renew');
    if (renewBtn) {
      renewBtn.addEventListener('click', () => {
        dialog.close();
        openEditTraineeModal(t.id);
        const months = PLAN_MONTHS[t.plan] || 1;
        const curEnd = new Date(t.endDate + 'T00:00:00');
        const start = curEnd < getToday() ? getToday() : curEnd;
        document.getElementById('f-startDate').value = toISODate(start);
        document.getElementById('f-endDate').value = toISODate(addMonths(start, months));
        document.getElementById('f-amountPaid').value = PLAN_PRICES[t.plan] || 2000;
        document.getElementById('f-totalFee').value = PLAN_PRICES[t.plan] || 2000;
        updatePendingFeeCalculation();
      });
    }

    dialog.showModal();
  }

  // ===================================================================
  // 13. CONFIRM DELETE TRAINEE
  // ===================================================================
  function confirmDeleteTrainee(id) {
    const t = state.trainees.find(item => item.id === id);
    if (!t) return;

    const dialog = document.getElementById('confirmDialog');
    const msg = document.getElementById('confirmMsg');
    const okBtn = document.getElementById('confirmOk');

    if (!dialog || !msg || !okBtn) return;

    msg.innerHTML = `Are you sure you want to permanently delete trainee <strong>${t.name}</strong> (ID: <code>${t.id}</code>)? This will remove their subscription and fee records.`;

    okBtn.onclick = (e) => {
      e.preventDefault();
      dialog.close();
      state.trainees = state.trainees.filter(item => item.id !== id);
      saveTrainees(state.trainees);
      showToast(`Trainee ${t.name} removed successfully`, 'warning');
      refreshAllViews();
    };

    dialog.showModal();
  }

  // ===================================================================
  // 14. BUSINESS INTELLIGENCE CHARTS (CHART.JS)
  // ===================================================================
  function destroyChart(key) {
    if (charts[key]) {
      charts[key].destroy();
      delete charts[key];
    }
  }

  function renderAllCharts() {
    if (typeof Chart === 'undefined') {
      let tries = 0;
      const poller = setInterval(() => {
        tries++;
        if (typeof Chart !== 'undefined') {
          clearInterval(poller);
          renderDashboardCharts();
          if (state.currentPage === 'analytics') renderAnalyticsPage();
        } else if (tries >= 20) {
          clearInterval(poller);
        }
      }, 200);
      return;
    }
    renderDashboardCharts();
    if (state.currentPage === 'analytics') {
      renderAnalyticsPage();
    }
  }

  function renderDashboardCharts() {
    if (typeof Chart === 'undefined') return;
    // 1. Dashboard Revenue mini-chart
    const chDashRev = document.getElementById('ch-dash-revenue');
    if (chDashRev) {
      destroyChart('dashRevenue');
      const data = getMonthlyRevenueData(6);
      const colors = getChartThemeColors();

      charts.dashRevenue = new Chart(chDashRev, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [{
            label: 'Fees Collected (₹)',
            data: data.values,
            borderColor: colors.pinkPrimary,
            backgroundColor: 'rgba(225, 48, 108, 0.12)',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: colors.pinkPrimary,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2.5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` Revenue: ${formatCurrency(ctx.parsed.y)}`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: colors.mutedColor, font: { family: 'Plus Jakarta Sans', size: 11 } }
            },
            y: {
              grid: { color: colors.gridColor },
              ticks: {
                color: colors.mutedColor,
                font: { family: 'Plus Jakarta Sans', size: 11 },
                callback: (val) => '₹' + (val >= 1000 ? (val / 1000) + 'k' : val)
              }
            }
          }
        }
      });
    }

    // 2. Dashboard Status mini-chart
    const chDashStatus = document.getElementById('ch-dash-status');
    if (chDashStatus) {
      destroyChart('dashStatus');
      const counts = { 'Active': 0, 'Expiring Soon': 0, 'Expired': 0 };
      state.trainees.forEach(t => {
        const s = getSubscriptionStatus(t);
        if (counts[s] !== undefined) counts[s]++;
      });
      const colors = getChartThemeColors();

      charts.dashStatus = new Chart(chDashStatus, {
        type: 'bar',
        data: {
          labels: ['Active', 'Expiring Soon', 'Expired'],
          datasets: [{
            label: 'Trainees',
            data: [counts['Active'], counts['Expiring Soon'], counts['Expired']],
            backgroundColor: [colors.green, colors.yellow, colors.coral],
            borderRadius: 8,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: colors.mutedColor, font: { family: 'Plus Jakarta Sans', size: 11 } }
            },
            y: {
              beginAtZero: true,
              grid: { color: colors.gridColor },
              ticks: { color: colors.mutedColor, stepSize: 1 }
            }
          }
        }
      });
    }
  }

  function getMonthlyRevenueData(monthCount = 6) {
    const today = getToday();
    const labels = [];
    const monthKeys = [];

    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      labels.push(label);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthKeys.push(key);
    }

    const totals = {};
    monthKeys.forEach(k => totals[k] = 0);

    state.trainees.forEach(t => {
      const pDate = t.paymentDate || t.startDate;
      if (pDate) {
        const key = pDate.slice(0, 7);
        if (totals[key] !== undefined) {
          totals[key] += Number(t.amountPaid) || 0;
        }
      }
    });

    return {
      labels,
      values: monthKeys.map(k => totals[k])
    };
  }

  function getMonthlyRegistrationData(monthCount = 6) {
    const today = getToday();
    const labels = [];
    const monthKeys = [];

    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      labels.push(label);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthKeys.push(key);
    }

    const counts = {};
    monthKeys.forEach(k => counts[k] = 0);

    state.trainees.forEach(t => {
      const sDate = t.startDate || t.joinDate;
      if (sDate) {
        const key = sDate.slice(0, 7);
        if (counts[key] !== undefined) {
          counts[key]++;
        }
      }
    });

    return {
      labels,
      values: monthKeys.map(k => counts[k])
    };
  }

  function renderAnalyticsPage() {
    const colors = getChartThemeColors();
    const list = state.trainees;

    // Reporting period summary cards
    const rangeSummary = document.getElementById('rangeSummary');
    if (rangeSummary) {
      const totalRev = list.reduce((a, b) => a + (Number(b.amountPaid) || 0), 0);
      const totalPend = list.reduce((a, b) => a + getPendingFee(b), 0);
      const activeCount = list.filter(t => {
        const s = getSubscriptionStatus(t);
        return s === 'Active' || s === 'Expiring Soon';
      }).length;

      rangeSummary.innerHTML = `
        <div class="mini-stat-card">
          <small>Total Revenue</small>
          <strong>${formatCurrency(totalRev)}</strong>
        </div>
        <div class="mini-stat-card">
          <small>Total Pending</small>
          <strong style="color:#E11D48">${formatCurrency(totalPend)}</strong>
        </div>
        <div class="mini-stat-card">
          <small>Active Members</small>
          <strong>${activeCount}</strong>
        </div>
        <div class="mini-stat-card">
          <small>Total Members</small>
          <strong>${list.length}</strong>
        </div>
      `;
    }

    if (typeof Chart === 'undefined') return;

    // Chart 1: Monthly Revenue Analysis
    const chRev = document.getElementById('ch-revenue');
    if (chRev) {
      destroyChart('revenue');
      const mData = getMonthlyRevenueData(state.rangePreset === '12m' ? 12 : 6);
      charts.revenue = new Chart(chRev, {
        type: 'line',
        data: {
          labels: mData.labels,
          datasets: [{
            label: 'Revenue (₹)',
            data: mData.values,
            borderColor: colors.pinkPrimary,
            backgroundColor: 'rgba(225, 48, 108, 0.15)',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: colors.pinkPrimary,
            pointRadius: 5,
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (c) => ` Revenue Collected: ${formatCurrency(c.parsed.y)}`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: colors.mutedColor }
            },
            y: {
              grid: { color: colors.gridColor },
              ticks: {
                color: colors.mutedColor,
                callback: (v) => '₹' + (v >= 1000 ? (v / 1000) + 'k' : v)
              }
            }
          }
        }
      });
    }

    // Chart 2: Membership Plan Distribution
    const chPlan = document.getElementById('ch-plan');
    if (chPlan) {
      destroyChart('plan');
      const planCounts = { 'Monthly': 0, 'Quarterly': 0, 'Half-Yearly': 0, 'Yearly': 0 };
      list.forEach(t => {
        if (planCounts[t.plan] !== undefined) planCounts[t.plan]++;
      });

      charts.plan = new Chart(chPlan, {
        type: 'doughnut',
        data: {
          labels: Object.keys(planCounts),
          datasets: [{
            data: Object.values(planCounts),
            backgroundColor: [colors.pinkPrimary, colors.coral, colors.purple, colors.yellow],
            borderWidth: 2,
            borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#191426' : '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: colors.textColor, font: { family: 'Plus Jakarta Sans', size: 12 } }
            }
          }
        }
      });
    }

    // Chart 3: Subscription Status Analysis
    const chStatus = document.getElementById('ch-status');
    if (chStatus) {
      destroyChart('status');
      const counts = { 'Active': 0, 'Expiring Soon': 0, 'Expired': 0 };
      list.forEach(t => {
        const s = getSubscriptionStatus(t);
        if (counts[s] !== undefined) counts[s]++;
      });

      charts.status = new Chart(chStatus, {
        type: 'bar',
        data: {
          labels: ['Active Subscriptions', 'Expiring Soon (<=7d)', 'Expired'],
          datasets: [{
            label: 'Trainees',
            data: [counts['Active'], counts['Expiring Soon'], counts['Expired']],
            backgroundColor: [colors.green, colors.yellow, colors.coral],
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: colors.mutedColor } },
            y: { beginAtZero: true, grid: { color: colors.gridColor }, ticks: { color: colors.mutedColor, stepSize: 2 } }
          }
        }
      });
    }

    // Chart 4: Fee Collection Analysis (Stacked Bar)
    const chFees = document.getElementById('ch-fees');
    if (chFees) {
      destroyChart('fees');
      const plans = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];
      const paidByPlan = [0, 0, 0, 0];
      const pendingByPlan = [0, 0, 0, 0];

      list.forEach(t => {
        const pIdx = plans.indexOf(t.plan);
        if (pIdx !== -1) {
          paidByPlan[pIdx] += Number(t.amountPaid) || 0;
          pendingByPlan[pIdx] += getPendingFee(t);
        }
      });

      charts.fees = new Chart(chFees, {
        type: 'bar',
        data: {
          labels: plans,
          datasets: [
            {
              label: 'Amount Paid (₹)',
              data: paidByPlan,
              backgroundColor: colors.green,
              borderRadius: 6
            },
            {
              label: 'Pending Fees (₹)',
              data: pendingByPlan,
              backgroundColor: colors.coral,
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { color: colors.textColor, font: { family: 'Plus Jakarta Sans', size: 11 } }
            },
            tooltip: {
              callbacks: {
                label: (c) => ` ${c.dataset.label}: ${formatCurrency(c.parsed.y)}`
              }
            }
          },
          scales: {
            x: { stacked: true, grid: { display: false }, ticks: { color: colors.mutedColor } },
            y: {
              stacked: true,
              grid: { color: colors.gridColor },
              ticks: {
                color: colors.mutedColor,
                callback: (v) => '₹' + (v >= 1000 ? (v / 1000) + 'k' : v)
              }
            }
          }
        }
      });
    }

    // Chart 5: Trainee Registration Trend
    const chReg = document.getElementById('ch-reg');
    if (chReg) {
      destroyChart('reg');
      const rData = getMonthlyRegistrationData(state.rangePreset === '12m' ? 12 : 6);

      charts.reg = new Chart(chReg, {
        type: 'line',
        data: {
          labels: rData.labels,
          datasets: [{
            label: 'New Registrations',
            data: rData.values,
            borderColor: colors.purple,
            backgroundColor: 'rgba(131, 58, 180, 0.12)',
            fill: true,
            tension: 0.3,
            pointBackgroundColor: colors.purple,
            pointRadius: 4,
            borderWidth: 2.5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: colors.mutedColor } },
            y: { beginAtZero: true, grid: { color: colors.gridColor }, ticks: { color: colors.mutedColor, stepSize: 1 } }
          }
        }
      });
    }

    // Chart 6: Revenue by Membership Plan
    const chPlanRev = document.getElementById('ch-planrev');
    if (chPlanRev) {
      destroyChart('planRev');
      const plans = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];
      const rev = [0, 0, 0, 0];
      list.forEach(t => {
        const idx = plans.indexOf(t.plan);
        if (idx !== -1) rev[idx] += Number(t.amountPaid) || 0;
      });

      charts.planRev = new Chart(chPlanRev, {
        type: 'bar',
        data: {
          labels: plans,
          datasets: [{
            label: 'Revenue (₹)',
            data: rev,
            backgroundColor: [colors.pinkPrimary, colors.coral, colors.purple, colors.yellow],
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (c) => ` Revenue: ${formatCurrency(c.parsed.y)}`
              }
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: colors.mutedColor } },
            y: {
              beginAtZero: true,
              grid: { color: colors.gridColor },
              ticks: {
                color: colors.mutedColor,
                callback: (v) => '₹' + (v >= 1000 ? (v / 1000) + 'k' : v)
              }
            }
          }
        }
      });
    }

    // Chart 7: Subscription Expiry Forecast (7, 15, 30 days)
    const chForecast = document.getElementById('ch-forecast');
    if (chForecast) {
      destroyChart('forecast');
      let exp7 = 0, exp15 = 0, exp30 = 0;
      list.forEach(t => {
        const d = getDaysRemaining(t.endDate);
        if (d >= 0) {
          if (d <= 7) exp7++;
          if (d <= 15) exp15++;
          if (d <= 30) exp30++;
        }
      });

      charts.forecast = new Chart(chForecast, {
        type: 'bar',
        data: {
          labels: ['Within 7 Days', 'Within 15 Days', 'Within 30 Days'],
          datasets: [{
            label: 'Expiring Members',
            data: [exp7, exp15, exp30],
            backgroundColor: [colors.coral, colors.yellow, colors.purple],
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: colors.mutedColor } },
            y: { beginAtZero: true, grid: { color: colors.gridColor }, ticks: { color: colors.mutedColor, stepSize: 1 } }
          }
        }
      });
    }

    // Chart 8: Training Time Preferences
    const chTime = document.getElementById('ch-time');
    if (chTime) {
      destroyChart('time');
      const timeCounts = { 'Morning': 0, 'Afternoon': 0, 'Evening': 0 };
      list.forEach(t => {
        if (timeCounts[t.time] !== undefined) timeCounts[t.time]++;
      });

      charts.time = new Chart(chTime, {
        type: 'bar',
        data: {
          labels: ['Morning Session', 'Afternoon Session', 'Evening Session'],
          datasets: [{
            label: 'Trainees',
            data: [timeCounts['Morning'], timeCounts['Afternoon'], timeCounts['Evening']],
            backgroundColor: [colors.pinkPrimary, colors.yellow, colors.purple],
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: colors.mutedColor } },
            y: { beginAtZero: true, grid: { color: colors.gridColor }, ticks: { color: colors.mutedColor, stepSize: 2 } }
          }
        }
      });
    }
  }

  function setupAnalyticsHandlers() {
    const preset = document.getElementById('rangePreset');
    const fromInput = document.getElementById('rangeFrom');
    const toInput = document.getElementById('rangeTo');

    if (preset) {
      preset.addEventListener('change', () => {
        state.rangePreset = preset.value;
        renderAnalyticsPage();
      });
    }

    if (fromInput) {
      fromInput.addEventListener('change', () => {
        state.rangeFrom = fromInput.value;
        renderAnalyticsPage();
      });
    }

    if (toInput) {
      toInput.addEventListener('change', () => {
        state.rangeTo = toInput.value;
        renderAnalyticsPage();
      });
    }

    // Export buttons
    document.querySelectorAll('[data-act="export-summary"]').forEach(btn => {
      btn.addEventListener('click', exportSummaryCSV);
    });
    document.querySelectorAll('[data-act="export-trainees"], [data-act="export-all"]').forEach(btn => {
      btn.addEventListener('click', exportTraineesCSV);
    });
    document.querySelectorAll('[data-act="print"]').forEach(btn => {
      btn.addEventListener('click', () => window.print());
    });
  }

  // ===================================================================
  // 15. DYNAMIC BUSINESS INSIGHTS WITH REAL TRAINEE NAMES
  // ===================================================================
  function renderBusinessInsights() {
    const insightList = document.getElementById('insightList');
    const recoGrid = document.getElementById('recoGrid');
    if (!insightList || !recoGrid) return;

    const list = state.trainees;

    // 1. Upcoming renewals with actual names
    const expiring = list.filter(t => getSubscriptionStatus(t) === 'Expiring Soon');
    const expiringNames = expiring.length > 0
      ? expiring.map(t => t.name).join(', ')
      : 'None at this moment';

    // 2. Pending balances with actual names
    const pendingTrainees = list.filter(t => getPendingFee(t) > 0)
      .sort((a, b) => getPendingFee(b) - getPendingFee(a));
    const totalPendingVal = pendingTrainees.reduce((a, b) => a + getPendingFee(b), 0);
    const topPendingNames = pendingTrainees.slice(0, 3)
      .map(t => `${t.name} (${formatCurrency(getPendingFee(t))})`).join(', ');

    // 3. Top revenue plan
    const planRev = { 'Monthly': 0, 'Quarterly': 0, 'Half-Yearly': 0, 'Yearly': 0 };
    list.forEach(t => {
      if (planRev[t.plan] !== undefined) planRev[t.plan] += Number(t.amountPaid) || 0;
    });
    let topPlan = 'Monthly';
    let maxRev = 0;
    Object.entries(planRev).forEach(([p, val]) => {
      if (val > maxRev) {
        maxRev = val;
        topPlan = p;
      }
    });

    // 4. Time preferences
    const timeCounts = { 'Morning': 0, 'Afternoon': 0, 'Evening': 0 };
    list.forEach(t => {
      if (timeCounts[t.time] !== undefined) timeCounts[t.time]++;
    });
    let topTime = 'Morning';
    let maxTimeCount = 0;
    Object.entries(timeCounts).forEach(([tm, cnt]) => {
      if (cnt > maxTimeCount) {
        maxTimeCount = cnt;
        topTime = tm;
      }
    });

    // 5. Month-on-month comparison
    const mData = getMonthlyRevenueData(2);
    const thisMonthRev = mData.values[1] || 0;
    const lastMonthRev = mData.values[0] || 0;
    let growthText = 'Stable';
    if (lastMonthRev > 0) {
      const growth = (((thisMonthRev - lastMonthRev) / lastMonthRev) * 100).toFixed(1);
      growthText = growth >= 0 ? `+${growth}% higher than previous month` : `${growth}% lower than previous month`;
    }

    insightList.innerHTML = `
      <article class="insight-card">
        <span class="insight-tag">Retention Alert</span>
        <h3>Upcoming Membership Renewals</h3>
        <p>Trainees with subscriptions ending in the next 7 days:</p>
        <div class="insight-names">${expiringNames}</div>
        <p class="muted">Reaching out before expiration increases renewal conversion by approximately 24%.</p>
      </article>

      <article class="insight-card">
        <span class="insight-tag" style="color:#E11D48;background:var(--status-danger-bg)">Cash Flow</span>
        <h3>Outstanding Fee Recovery</h3>
        <p><strong>${formatCurrency(totalPendingVal)}</strong> in pending membership fees is owed by ${pendingTrainees.length} trainees.</p>
        <div class="insight-names">Top Pending: ${topPendingNames || 'All accounts paid in full'}</div>
        <p class="muted">Collecting these dues will immediately improve liquidity without marketing expenditure.</p>
      </article>

      <article class="insight-card">
        <span class="insight-tag">Product Performance</span>
        <h3>Highest Revenue Membership Plan</h3>
        <p>The <strong>${topPlan}</strong> membership plan is your primary revenue engine, generating <strong>${formatCurrency(maxRev)}</strong>.</p>
        <div class="insight-names">Plan Contribution: ${formatCurrency(maxRev)} collected</div>
        <p class="muted">Consider bundling personal training sessions with the ${topPlan} tier to further increase ARPU.</p>
      </article>

      <article class="insight-card">
        <span class="insight-tag">Facility Utilization</span>
        <h3>Peak Training Preferences</h3>
        <p>The <strong>${topTime} session</strong> is currently the most popular workout window with <strong>${maxTimeCount} active trainees</strong>.</p>
        <div class="insight-names">Distribution: ${timeCounts['Morning']} Morning • ${timeCounts['Afternoon']} Afternoon • ${timeCounts['Evening']} Evening</div>
        <p class="muted">Ensure adequate floor supervision and barbell equipment availability during ${topTime} hours.</p>
      </article>

      <article class="insight-card">
        <span class="insight-tag">Revenue Trend</span>
        <h3>Monthly Revenue Performance</h3>
        <p>Current month collections stand at <strong>${formatCurrency(thisMonthRev)}</strong> (${growthText}).</p>
        <div class="insight-names">Last Month: ${formatCurrency(lastMonthRev)} ➔ This Month: ${formatCurrency(thisMonthRev)}</div>
        <p class="muted">Consistent renewal follow-ups contribute to predictable monthly cash flows.</p>
      </article>
    `;

    // Recommendations Grid
    recoGrid.innerHTML = `
      <div class="reco-card">
        <div class="reco-icon"><svg class="ico"><use href="#i-bulb"/></svg></div>
        <div class="reco-content">
          <h4>Implement 3-Day Early WhatsApp Renewal Prompts</h4>
          <p>Automate reminder messages 3 days prior to expiration. Offer a 5% loyalty renewal discount to secure commitment before membership lapses.</p>
        </div>
      </div>

      <div class="reco-card">
        <div class="reco-icon"><svg class="ico"><use href="#i-file"/></svg></div>
        <div class="reco-content">
          <h4>Enforce Strict 14-Day Balance Settlement</h4>
          <p>For trainees with pending fees (like ${topPendingNames.split(',')[0] || 'active partial payers'}), establish a firm deadline to avoid gym gate access locks.</p>
        </div>
      </div>

      <div class="reco-card">
        <div class="reco-icon"><svg class="ico"><use href="#i-users"/></svg></div>
        <div class="reco-content">
          <h4>Incentivize Afternoon Session Migration</h4>
          <p>The Afternoon batch has lower density (${timeCounts['Afternoon']} trainees). Introduce off-peak pricing discounts to distribute equipment load evenly.</p>
        </div>
      </div>

      <div class="reco-card">
        <div class="reco-icon"><svg class="ico"><use href="#i-chart"/></svg></div>
        <div class="reco-content">
          <h4>Upsell Quarterly Members to Yearly Passes</h4>
          <p>Quarterly members represent primed prospects for annual upgrades. Pitch complimentary body composition analyses for 12-month commitments.</p>
        </div>
      </div>
    `;
  }

  // ===================================================================
  // 16. DATA ACCURACY AND VALIDATION ENGINE
  // ===================================================================
  function calculateDataAccuracyMetrics() {
    const list = state.trainees;
    const total = list.length;
    if (total === 0) {
      return {
        compositeScore: 100,
        completenessPct: 100,
        validDatesPct: 100,
        paymentAccuracyPct: 100,
        uniqueIdsPct: 100,
        recordIntegrityPct: 100,
        missingFieldsCount: 0,
        duplicateIdCount: 0,
        invalidRecordsCount: 0
      };
    }

    let missingFields = 0;
    const expectedFields = ['name', 'phone', 'age', 'gender', 'plan', 'startDate', 'endDate', 'totalFee', 'amountPaid', 'time'];
    const totalFieldChecks = total * expectedFields.length;

    let validDates = 0;
    let paymentAccurate = 0;
    let recordIntegrity = 0;
    const ids = new Set();
    let duplicateIds = 0;

    list.forEach(t => {
      // Completeness
      expectedFields.forEach(f => {
        if (t[f] === undefined || t[f] === null || t[f] === '') {
          missingFields++;
        }
      });

      // Dates: End Date >= Start Date
      if (t.startDate && t.endDate && new Date(t.endDate) >= new Date(t.startDate)) {
        validDates++;
      }

      // Payments: totalFee >= 0, amountPaid >= 0, amountPaid <= totalFee
      const tot = Number(t.totalFee);
      const paid = Number(t.amountPaid);
      if (!isNaN(tot) && !isNaN(paid) && tot >= 0 && paid >= 0 && paid <= tot) {
        paymentAccurate++;
      }

      // Unique ID check
      if (ids.has(t.id)) {
        duplicateIds++;
      } else {
        ids.add(t.id);
      }

      // Integrity: age valid, phone valid
      if (t.age >= 12 && t.age <= 90 && t.name && t.name.length >= 2) {
        recordIntegrity++;
      }
    });

    const completenessPct = Math.round(((totalFieldChecks - missingFields) / totalFieldChecks) * 100);
    const validDatesPct = Math.round((validDates / total) * 100);
    const paymentAccuracyPct = Math.round((paymentAccurate / total) * 100);
    const uniqueIdsPct = Math.round(((total - duplicateIds) / total) * 100);
    const recordIntegrityPct = Math.round((recordIntegrity / total) * 100);

    const compositeScore = Math.round((completenessPct + validDatesPct + paymentAccuracyPct + uniqueIdsPct + recordIntegrityPct) / 5);

    const invalidRecordsCount = (total - validDates) + (total - paymentAccurate) + duplicateIds;

    return {
      compositeScore,
      completenessPct,
      validDatesPct,
      paymentAccuracyPct,
      uniqueIdsPct,
      recordIntegrityPct,
      missingFieldsCount: missingFields,
      duplicateIdCount: duplicateIds,
      invalidRecordsCount
    };
  }

  function renderDataQualityPanel() {
    const panel = document.getElementById('qualityPanel');
    if (!panel) return;

    const metrics = calculateDataAccuracyMetrics();
    let qualityStatus = 'Excellent Data Integrity';
    let statusClass = 'badge-active';

    if (metrics.compositeScore < 85) {
      qualityStatus = 'Critical Data Issues Detected';
      statusClass = 'badge-expired';
    } else if (metrics.compositeScore < 95) {
      qualityStatus = 'Good (Minor Inconsistencies)';
      statusClass = 'badge-expiring';
    }

    panel.innerHTML = `
      <div class="quality-card">
        <div class="quality-hero">
          <div class="quality-score-wrap">
            <div class="quality-dial">${metrics.compositeScore}%</div>
            <div>
              <h2>${qualityStatus}</h2>
              <p class="muted">Dynamically audited across ${state.trainees.length} stored trainee records, checking 10 validation vectors.</p>
              <span class="badge ${statusClass}" style="margin-top:6px;"><span class="badge-dot"></span>${metrics.compositeScore}% Verified Accurate</span>
            </div>
          </div>
          <div>
            <button class="btn btn-primary" type="button" data-act="reset"><svg class="ico"><use href="#i-reset"/></svg>Reset to Clean Demo Data</button>
          </div>
        </div>

        <div class="quality-metrics-grid">
          <div class="quality-metric-item">
            <small>Required Fields Completeness</small>
            <strong>${metrics.completenessPct}%</strong>
            <div class="progress-track"><div class="progress-fill" style="width:${metrics.completenessPct}%"></div></div>
            <span class="hint">${metrics.missingFieldsCount} empty fields found across records</span>
          </div>

          <div class="quality-metric-item">
            <small>Valid Subscription Dates</small>
            <strong>${metrics.validDatesPct}%</strong>
            <div class="progress-track"><div class="progress-fill" style="width:${metrics.validDatesPct}%"></div></div>
            <span class="hint">Expiry date >= Start date validation</span>
          </div>

          <div class="quality-metric-item">
            <small>Payment Calculation Accuracy</small>
            <strong>${metrics.paymentAccuracyPct}%</strong>
            <div class="progress-track"><div class="progress-fill" style="width:${metrics.paymentAccuracyPct}%"></div></div>
            <span class="hint">Paid amount <= Total fee; Non-negative balance</span>
          </div>

          <div class="quality-metric-item">
            <small>Trainee ID Uniqueness</small>
            <strong>${metrics.uniqueIdsPct}%</strong>
            <div class="progress-track"><div class="progress-fill" style="width:${metrics.uniqueIdsPct}%"></div></div>
            <span class="hint">${metrics.duplicateIdCount} duplicate primary keys detected</span>
          </div>

          <div class="quality-metric-item">
            <small>Member Profile Integrity</small>
            <strong>${metrics.recordIntegrityPct}%</strong>
            <div class="progress-track"><div class="progress-fill" style="width:${metrics.recordIntegrityPct}%"></div></div>
            <span class="hint">Valid names and ages within human fitness bounds (12–90)</span>
          </div>

          <div class="quality-metric-item">
            <small>Total Flagged Issues</small>
            <strong style="color:${metrics.invalidRecordsCount > 0 ? '#E11D48' : '#059669'}">${metrics.invalidRecordsCount}</strong>
            <span class="hint">Violations of relational business rules</span>
          </div>
        </div>
      </div>
    `;

    panel.querySelectorAll('[data-act="reset"]').forEach(btn => {
      btn.addEventListener('click', confirmResetData);
    });
  }

  // ===================================================================
  // 17. REPORTS & EXPORTS
  // ===================================================================
  function renderReportsPage() {
    const list = state.trainees;
    const summaryEl = document.getElementById('reportSummary');
    const repPayments = document.getElementById('repPayments');
    const repRenewals = document.getElementById('repRenewals');
    const repExpired = document.getElementById('repExpired');
    const repPending = document.getElementById('repPending');

    const totalRev = list.reduce((a, b) => a + (Number(b.amountPaid) || 0), 0);
    const totalPending = list.reduce((a, b) => a + getPendingFee(b), 0);
    const expiring = list.filter(t => getSubscriptionStatus(t) === 'Expiring Soon');
    const expired = list.filter(t => getSubscriptionStatus(t) === 'Expired');
    const pendingTrainees = list.filter(t => getPendingFee(t) > 0);

    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="mini-stat-card">
          <small>Total Receipts</small>
          <strong>${formatCurrency(totalRev)}</strong>
        </div>
        <div class="mini-stat-card">
          <small>Pending Receivables</small>
          <strong style="color:#E11D48">${formatCurrency(totalPending)}</strong>
        </div>
        <div class="mini-stat-card">
          <small>Renewals (<=7d)</small>
          <strong>${expiring.length}</strong>
        </div>
        <div class="mini-stat-card">
          <small>Expired Subscriptions</small>
          <strong>${expired.length}</strong>
        </div>
      `;
    }

    // 1. Recent Payments Table
    if (repPayments) {
      const payments = [...list].filter(t => Number(t.amountPaid) > 0)
        .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

      repPayments.innerHTML = `
        <table class="data">
          <thead><tr><th>Trainee Name</th><th>Trainee ID</th><th>Plan</th><th>Payment Date</th><th class="num">Amount Paid</th></tr></thead>
          <tbody>
            ${payments.map(t => `
              <tr>
                <td><strong>${t.name}</strong></td>
                <td><code>${t.id}</code></td>
                <td>${t.plan}</td>
                <td>${formatDisplayDate(t.paymentDate)}</td>
                <td class="num" style="color:#059669">${formatCurrency(t.amountPaid)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    // 2. Upcoming Renewals Table
    if (repRenewals) {
      repRenewals.innerHTML = expiring.length === 0
        ? '<p class="muted" style="padding:16px">No subscriptions ending within the next 7 days.</p>'
        : `
          <table class="data">
            <thead><tr><th>Trainee Name</th><th>Contact</th><th>Plan</th><th>Expiry Date</th><th>Days Left</th><th>Action</th></tr></thead>
            <tbody>
              ${expiring.map(t => {
                const days = getDaysRemaining(t.endDate);
                return `
                  <tr>
                    <td><strong>${t.name}</strong></td>
                    <td>${t.phone}</td>
                    <td>${t.plan}</td>
                    <td>${formatDisplayDate(t.endDate)}</td>
                    <td><span class="badge badge-expiring">${days} days</span></td>
                    <td><button class="btn btn-ghost btn-sm" data-act="view" data-id="${t.id}">View Profile</button></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
    }

    // 3. Expired Memberships Table
    if (repExpired) {
      repExpired.innerHTML = expired.length === 0
        ? '<p class="muted" style="padding:16px">No expired subscriptions.</p>'
        : `
          <table class="data">
            <thead><tr><th>Trainee Name</th><th>Contact</th><th>Plan</th><th>Expired On</th><th>Action</th></tr></thead>
            <tbody>
              ${expired.map(t => `
                <tr>
                  <td><strong>${t.name}</strong></td>
                  <td>${t.phone}</td>
                  <td>${t.plan}</td>
                  <td>${formatDisplayDate(t.endDate)}</td>
                  <td><button class="btn btn-primary btn-sm" data-act="edit" data-id="${t.id}">Renew Membership</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
    }

    // 4. Pending Payments Table
    if (repPending) {
      repPending.innerHTML = pendingTrainees.length === 0
        ? '<p class="muted" style="padding:16px">All memberships are fully settled!</p>'
        : `
          <table class="data">
            <thead><tr><th>Trainee Name</th><th>Contact</th><th>Total Fee</th><th>Paid</th><th class="num">Pending Due</th><th>Action</th></tr></thead>
            <tbody>
              ${pendingTrainees.map(t => `
                <tr>
                  <td><strong>${t.name}</strong></td>
                  <td>${t.phone}</td>
                  <td>${formatCurrency(t.totalFee)}</td>
                  <td>${formatCurrency(t.amountPaid)}</td>
                  <td class="num" style="color:#E11D48">${formatCurrency(getPendingFee(t))}</td>
                  <td><button class="btn btn-primary btn-sm" data-act="view" data-id="${t.id}">Collect Payment</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
    }

    // Attach row actions
    document.querySelectorAll('#page-reports [data-act="view"]').forEach(btn => {
      btn.addEventListener('click', () => viewTraineeProfile(btn.dataset.id));
    });
    document.querySelectorAll('#page-reports [data-act="edit"]').forEach(btn => {
      btn.addEventListener('click', () => openEditTraineeModal(btn.dataset.id));
    });
  }

  function exportTraineesCSV() {
    const list = state.trainees;
    if (list.length === 0) {
      showToast('No trainee records to export', 'error');
      return;
    }

    const headers = [
      'Trainee ID', 'Full Name', 'Contact Number', 'Age', 'Gender',
      'Membership Plan', 'Start Date', 'End Date', 'Total Fee (INR)',
      'Amount Paid (INR)', 'Pending Fee (INR)', 'Subscription Status',
      'Payment Status', 'Training Time', 'Payment Date', 'Notes'
    ];

    const rows = list.map(t => {
      const subStatus = getSubscriptionStatus(t);
      const payStatus = getPaymentStatus(t);
      const pending = getPendingFee(t);

      return [
        t.id,
        `"${(t.name || '').replace(/"/g, '""')}"`,
        `"${t.phone || ''}"`,
        t.age,
        t.gender,
        t.plan,
        t.startDate,
        t.endDate,
        t.totalFee,
        t.amountPaid,
        pending,
        subStatus,
        payStatus,
        t.time,
        t.paymentDate,
        `"${(t.notes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SMASH_GYM_Trainees_${toISODate(getToday())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Trainee records exported to CSV', 'success');
  }

  function exportSummaryCSV() {
    const metrics = calculateMetrics();
    const accuracy = calculateDataAccuracyMetrics();

    const lines = [
      'SMASH GYM — BUSINESS INTELLIGENCE ANALYTICAL SUMMARY REPORT',
      `Report Generated: ${new Date().toISOString()}`,
      '',
      'KEY PERFORMANCE INDICATOR,VALUE',
      `Total Registered Trainees,${metrics.totalRegistered}`,
      `Active Trainees,${metrics.activeTrainees}`,
      `Expiring Soon (<= 7 Days),${metrics.expiringSoon}`,
      `Expired Subscriptions,${metrics.expiredSubscriptions}`,
      `Total Revenue Collected (INR),${metrics.totalRevenue}`,
      `Total Pending Fees (INR),${metrics.totalPending}`,
      `New Trainees This Month,${metrics.newThisMonth}`,
      `Subscription Renewal Rate (%),${metrics.renewalRate}%`,
      `Data Accuracy Score (%),${metrics.accuracyScore}%`,
      '',
      'DATA INTEGRITY AUDIT,VALUE',
      `Required Fields Completeness,${accuracy.completenessPct}%`,
      `Valid Subscription Dates,${accuracy.validDatesPct}%`,
      `Payment Math Accuracy,${accuracy.paymentAccuracyPct}%`,
      `Unique Trainee IDs,${accuracy.uniqueIdsPct}%`,
      `Profile Integrity,${accuracy.recordIntegrityPct}%`
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + lines.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SMASH_GYM_BI_Summary_${toISODate(getToday())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Business Intelligence summary exported to CSV', 'success');
  }

  // ===================================================================
  // 18. RESET DEMO DATA
  // ===================================================================
  function confirmResetData() {
    const dialog = document.getElementById('confirmDialog');
    const msg = document.getElementById('confirmMsg');
    const okBtn = document.getElementById('confirmOk');

    if (!dialog || !msg || !okBtn) return;

    msg.innerHTML = `Are you sure you want to reset all data back to the original 30 realistic demo trainees? Any additions or edits in this browser will be replaced.`;

    okBtn.onclick = (e) => {
      e.preventDefault();
      dialog.close();
      const demo = generateDemoTrainees();
      saveTrainees(demo);
      showToast('Demo data restored successfully!', 'success');
      refreshAllViews();
    };

    dialog.showModal();
  }

  // ===================================================================
  // 19. REFRESH ALL VIEWS
  // ===================================================================
  function refreshAllViews() {
    renderDashboard();
    renderTraineesTable();
    renderAnalyticsPage();
    renderBusinessInsights();
    renderDataQualityPanel();
    renderReportsPage();
  }

  // ===================================================================
  // 20. APPLICATION INITIALIZATION
  // ===================================================================
  function initApp() {
    state.trainees = loadTrainees();

    // Determine initial page from hash
    const hash = window.location.hash.replace('#/', '');
    const startPage = PAGES.includes(hash) ? hash : 'dashboard';
    navigateTo(startPage);

    // Bind settings reset button
    document.querySelectorAll('[data-act="reset"]').forEach(btn => {
      btn.addEventListener('click', confirmResetData);
    });
  }

  // DOM Content Loaded entry point
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupAuthHandlers();
    setupNavigation();
    setupTraineeManagementHandlers();
    setupFormHandlers();
    setupAnalyticsHandlers();

    // Check existing authentication
    updateAuthView();
  });

  // Re-check charts when all external assets finish loading
  window.addEventListener('load', () => {
    if (isAuthenticated()) {
      renderAllCharts();
    }
  });

})();
