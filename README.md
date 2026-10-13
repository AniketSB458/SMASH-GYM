# SMASH GYM — Gym Management & Business Intelligence Platform

> **"Train Hard. Track Smart. Grow Strong."**  
> A gym management and business intelligence dashboard built with HTML5, CSS3, vanilla JavaScript, and Chart.js. Uses browser `localStorage` for complete data persistence.

---

## 🌟 Live Demo & Credentials

To explore the admin platform:

- **Demo Username**: `admin`
- **Demo Password**: `Smash@2026`
- **Quick Access**: Click the **"⚡ 1-Click Demo Login"** button on the sign-in screen.

---

## 🚀 Key Features

### 1. 👥 Trainee Management (Full Visibility)
- **Visible Trainee Names**: Displays full names with stylized avatar badges (never hidden or replaced with IDs).
- **30 Seeded Demo Trainees**: Realistic dataset with active, expiring, and expired memberships across varied tiers.
- **12 Data Columns**:
  - Trainee ID, Full Name, Contact, Membership Plan, Start Date, End Date, Total Fee (₹), Amount Paid (₹), Pending Fee (₹), Subscription Status, Payment Status, Actions.
- **Interactive Operations**:
  - Instant search across name, ID, and phone number.
  - Multi-criteria filters (Plan, Subscription Status, Payment Status).
  - Multi-column sorting (Name, Start Date, End Date, Total Fees, Pending Fees).
  - Add / Edit Trainee modal with auto-generated IDs (`SG-1031`) and real-time pending fee calculation (`Total Fee - Amount Paid`).
  - Detailed Trainee Profile modal with financial progress bar and 1-click balance settlement/renewals.
  - Delete record with confirmation dialog.

### 2. 📊 Real-Time KPI Dashboard
Dynamic metrics calculated directly from stored records:
1. **Total Registered Trainees**
2. **Active Trainees**
3. **Expiring Soon** (Within next 7 days)
4. **Expired Subscriptions**
5. **Total Revenue Collected** (₹)
6. **Total Pending Fees** (₹)
7. **New Trainees This Month**
8. **Subscription Renewal Rate** (%)
9. **Data Accuracy Score** (%)

*Clicking any KPI card automatically filters the trainee directory or navigates to the relevant report.*

### 3. 📈 8 Interactive Chart.js Graphs
- **Graph 1**: Monthly Revenue Analysis (Area spline line chart)
- **Graph 2**: Membership Plan Distribution (Doughnut chart)
- **Graph 3**: Subscription Status Analysis (Active vs. Expiring Soon vs. Expired bar chart)
- **Graph 4**: Fee Collection Analysis (Stacked bar chart: Paid vs. Pending by plan)
- **Graph 5**: Trainee Registration Trend (Sign-up trajectory line chart)
- **Graph 6**: Revenue by Membership Plan (Bar chart in ₹)
- **Graph 7**: Subscription Expiry Forecast (Upcoming expiries in 7, 15, and 30 days)
- **Graph 8**: Training Time Preferences (Morning vs. Afternoon vs. Evening batches)
- **Reporting Period Selector**: Last 6 Months, Last 12 Months, Financial Year, Year-to-Date, and Custom Range.

### 4. 💡 Dynamic Business Insights
- Automatically detects upcoming renewals and lists **actual trainee names** (e.g. *“Upcoming Renewals: Rahul Patil, Sneha Jadhav, and Amit More”*).
- Identifies pending balances and highest revenue plans.
- Actionable strategic recommendations for gym owners.

### 5. 🛡️ Data Accuracy Engine
Live audits across stored records:
- Required-field completeness %
- Valid subscription date % (End Date ≥ Start Date)
- Payment math calculation accuracy (No overpayments; Non-negative balance)
- Trainee ID uniqueness audit
- Member profile integrity

### 6. 📱 Mobile First & Instagram Aesthetic
- Styled in an **Instagram-inspired Pink & White theme** with sunset gradients (`#FD1D1D` → `#E1306C` → `#C13584`), frosted glassmorphism, and dark/light mode toggle.
- **Mobile Bottom Tab Bar**: Native app-like tab bar for 1-thumb navigation on phones.
- **Horizontal Swipe Hint**: Tables allow smooth horizontal touch scrolling without truncating data.
- **iOS Safari Optimization**: Input sizes locked to 16px to prevent auto-zooming.

---

## 🛠️ Tech Stack

- **HTML5**: Semantic document structure, native `<dialog>` modals, SVG symbols.
- **CSS3**: CSS Custom Properties, Glassmorphism, CSS Grid, Flexbox, Keyframe animations, Print media queries.
- **Vanilla JavaScript (ES6+)**: Zero external frameworks, responsive event listeners, local storage management.
- **Chart.js (v4.4.1)**: Interactive vector charts with responsive resizing.

---

## 🌐 Deploying to GitHub Pages

Since this is a client-side web application (HTML, CSS, JS), it can be deployed on **GitHub Pages**:

1. Create a new repository on [GitHub](https://github.com/new) named `smash-gym` (or any name you prefer).
2. Connect your local repository and push:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<REPO_NAME>.git
   git branch -M main
   git push -u origin main
   ```
3. In your GitHub repository:
   - Go to **Settings** → **Pages**.
   - Under **Build and deployment** → **Source**, select **Deploy from a branch**.
   - Select branch `main` and folder `/ (root)`, then click **Save**.
4. In about 1 minute, your site will be live at:
   `https://<YOUR_GITHUB_USERNAME>.github.io/<REPO_NAME>/`

---

## 📄 Academic Project Attribution

Built for academic demonstration in **Business Intelligence & Web Development**.
Gym Owner: **SHUBHAM POWAR (SP)**.
