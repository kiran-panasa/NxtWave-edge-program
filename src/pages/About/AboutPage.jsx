// ─────────────────────────────────────────────────────────────────────────────
// AboutPage.jsx
// Keep this file updated whenever a new feature or page is shipped.
// Sections to update: HOW_STEPS, PAGE_CARDS, CONCEPTS, ROLES.
// ─────────────────────────────────────────────────────────────────────────────

const LAST_UPDATED = 'June 2026'

// ── Print helpers ─────────────────────────────────────────────────────────────

function injectPrintCSS() {
  const id = 'about-print-css'
  if (document.getElementById(id)) { window.print(); return }
  const style = document.createElement('style')
  style.id = id
  style.textContent = `
    @media print {
      body > * { display: none !important; }
      #about-print-root { display: block !important; }
      #about-print-root .print-hide { display: none !important; }
      #about-print-root { padding: 24px; font-family: sans-serif; color: #111; }
      @page { margin: 20mm; }
    }
  `
  document.head.appendChild(style)
  window.print()
}

// ── Helper components ─────────────────────────────────────────────────────────

function Section({ title, subtitle, children, className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function HowStep({ n, color, title, desc }) {
  const COLORS = {
    indigo:  'bg-indigo-500',
    violet:  'bg-violet-500',
    teal:    'bg-teal-500',
    amber:   'bg-amber-500',
    blue:    'bg-blue-500',
    emerald: 'bg-emerald-500',
    rose:    'bg-rose-500',
  }
  return (
    <div className="flex gap-4">
      <div className={`w-8 h-8 rounded-full ${COLORS[color] ?? 'bg-gray-400'} text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5`}>
        {n}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

function PageCard({ title, path, children, note }) {
  return (
    <div className="border border-gray-100 rounded-xl p-5 space-y-2 bg-white">
      <div className="flex items-baseline gap-2">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {path && <code className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{path}</code>}
      </div>
      <div className="text-sm text-gray-600 space-y-1.5">{children}</div>
      {note && (
        <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
          {note}
        </div>
      )}
    </div>
  )
}

function Bullet({ children }) {
  return (
    <div className="flex gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 shrink-0" />
      <p>{children}</p>
    </div>
  )
}

function ConceptCard({ term, children }) {
  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-white">
      <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-1">{term}</p>
      <p className="text-sm text-gray-600">{children}</p>
    </div>
  )
}

function TechCard({ title, items }) {
  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-white space-y-2">
      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-600 flex gap-2">
            <span className="text-gray-300">—</span>{item}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div id="about-print-root" className="space-y-10 max-w-4xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edge Program — Admin Guide</h1>
          <p className="text-sm text-gray-400 mt-1">NxtWave Internal Tool · Last updated {LAST_UPDATED}</p>
        </div>
        <button
          onClick={injectPrintCSS}
          className="print-hide flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Print / PDF
        </button>
      </div>

      {/* ── What is this ── */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-sm text-gray-700 leading-relaxed space-y-3">
        <p>
          <strong>Edge Program</strong> is NxtWave's internal operations tool for managing the full college recruitment lifecycle — from initial outreach and drive scheduling to student imports, audit reviews, interview tracking, and final selection.
        </p>
        <p>
          Access is role-gated. An admin approves every new user and assigns them a role that controls which pages they can see. All data lives in Firestore; the app is built on React + Vite and deployed on Vercel.
        </p>
      </div>

      {/* ── How it works ── */}
      <Section title="How it works" subtitle="The end-to-end journey from college outreach to student selection.">
        <div className="space-y-5">
          <HowStep n={1} color="indigo" title="Add Colleges & Schedule Drives"
            desc="The onboarding team lists target colleges, logs contact details, and creates drive requests with a proposed date and student count. Requests go to the admin for approval." />
          <HowStep n={2} color="violet" title="Admin Approves the Drive"
            desc="Admin reviews pending drives on the calendar, approves with a field team assignment, or suggests an alternate date. The onboarding team then confirms with the college." />
          <HowStep n={3} color="teal" title="Fill Infrastructure Details"
            desc="Once the college confirms, the team fills in lab count, system type, accommodation, and invigilator support. Every edit is logged with a changelog." />
          <HowStep n={4} color="amber" title="Import Assessment Results"
            desc="After the drive, the team uploads the XLSX from the assessment tool. Students are created in bulk and tagged to the college and drive they appeared in." />
          <HowStep n={5} color="blue" title="Audit & Interview"
            desc="Students move through a stage pipeline — Assessment Imported → Shortlisted → Interview Scheduled → Interviewed. The auditing team reviews and progresses batches." />
          <HowStep n={6} color="emerald" title="Selection & Expenses"
            desc="Selected students are marked and logged. Drive expenses (food, transport, accommodation) are filed, submitted for approval, and tracked per college." />
        </div>
      </Section>

      {/* ── Page-by-page guide ── */}
      <Section title="Page-by-Page Guide" subtitle="What each page does and how to use it.">
        <div className="space-y-4">

          <PageCard title="Dashboard" path="/">
            <p>Funnel view of all students across stages — imported, shortlisted, interviewed, selected. Cards show live counts. Use this for a quick health check of the pipeline.</p>
          </PageCard>

          <PageCard title="Colleges" path="/colleges">
            <Bullet>Table of all colleges with outreach status badges (Contacted → Agreed → Assessment Scheduled → Assessment Done).</Bullet>
            <Bullet>Click any college to open its detail page with Drives, Students, Assessments, and Expenses tabs.</Bullet>
            <Bullet>Use <strong>Bulk Upload</strong> to import many colleges at once from an XLSX. Existing colleges matched by name are updated, new ones created.</Bullet>
            <Bullet>Each college gets a <strong>College ID</strong> on creation — format is <code className="bg-gray-100 px-1 rounded">SHORTCODE-AY-SEQ</code> (e.g. JNTUH-2627-001). The short code is set once and never changes.</Bullet>
          </PageCard>

          <PageCard title="College Detail — Drives tab" path="/colleges/:id → Drives">
            <Bullet>Lists all drives for the college grouped by academic year.</Bullet>
            <Bullet>Click <strong>+ New Drive Request</strong> to create a drive. Fill in the proposed date, time slot, expected student count, and notes. Save as Draft or Submit for Approval.</Bullet>
            <Bullet>Drive status machine: <code className="bg-gray-100 px-1 rounded text-xs">Draft → Pending Approval → Approved → College Confirmed → Completed</code>. Admin can also suggest an alternate date which puts it into <code className="bg-gray-100 px-1 rounded text-xs">Changes Requested</code> — the team resubmits after updating.</Bullet>
            <Bullet>Once college confirms, an <strong>Infrastructure Details</strong> panel unlocks. Fill labs, system type, accommodation, etc. Every save is logged in the change history.</Bullet>
            <Bullet>Approved/Confirmed/Completed drives appear on the <strong>Calendar</strong> page.</Bullet>
          </PageCard>

          <PageCard title="Students" path="/students">
            <p>Full searchable list of all students across all colleges with stage filters. Click a student to see their full profile, stage history, audit records, and interview records.</p>
          </PageCard>

          <PageCard title="Import" path="/import">
            <Bullet>Upload an XLSX from the external assessment tool. Required columns: <code className="bg-gray-100 px-1 rounded text-xs">name, email</code>. Optional: <code className="bg-gray-100 px-1 rounded text-xs">phone, uid</code>.</Bullet>
            <Bullet>Select the college first, then optionally link the import to a specific drive. Students are tagged with <code className="bg-gray-100 px-1 rounded text-xs">driveId</code> and <code className="bg-gray-100 px-1 rounded text-xs">driveDate</code> for analytics.</Bullet>
            <Bullet>All imported students start at stage <strong>Assessment Imported</strong>. College outreach status is auto-updated to <strong>Assessment Done</strong>.</Bullet>
          </PageCard>

          <PageCard title="Audit Queue" path="/audit">
            <p>Students pending audit review are shown here. The auditing team reviews each student and moves them through sub-stages (Post Assessment, Shortlisted, etc.). Bulk stage updates are supported.</p>
          </PageCard>

          <PageCard title="Interviews" path="/interviews">
            <p>Tracks students who have been scheduled for or have completed interviews. Records interview type, outcome, and notes per student.</p>
          </PageCard>

          <PageCard title="Selection" path="/selection">
            <p>Final stage — students who passed interviews are marked selected here. Used as the source of truth for offer decisions.</p>
          </PageCard>

          <PageCard title="Expenses" path="/expenses">
            <Bullet>Expense records for all drives across colleges — Food, Transport, Accommodation line items.</Bullet>
            <Bullet>Status flow: <code className="bg-gray-100 px-1 rounded text-xs">Draft → Submitted → Approved / Rejected</code>.</Bullet>
            <Bullet>Can also be filed from within a college's Expenses tab for per-college tracking.</Bullet>
          </PageCard>

          <PageCard title="Calendar" path="/calendar">
            <Bullet>Month grid showing all approved, college-confirmed, and completed drives as colour-coded chips.</Bullet>
            <Bullet>Blue = Approved · Purple = College Confirmed · Green = Completed.</Bullet>
            <Bullet>Click any chip to jump to that college's page. Upcoming drives for the month are listed below the grid.</Bullet>
            <Bullet>Visible to Admin, Onboarding Team, and Field Team.</Bullet>
          </PageCard>

          <PageCard title="Settings — Users" path="/settings → Users">
            <Bullet>Approve or reject pending signups. Activate / deactivate existing users.</Bullet>
            <Bullet>Change any user's role using the inline dropdown in the table — saves immediately.</Bullet>
            <Bullet>Generate invite links (one-time use) for colleagues to bypass the approval flow.</Bullet>
            <Bullet>Add users directly with the <strong>+ Add User</strong> button.</Bullet>
          </PageCard>

          <PageCard title="Settings — Permissions" path="/settings → Permissions">
            <Bullet>Permission matrix: rows = pages, columns = roles. Toggle checkboxes to grant or revoke access.</Bullet>
            <Bullet>Add new roles with custom names. Remove roles that are no longer needed.</Bullet>
            <Bullet>Click <strong>Save changes</strong> — this updates Firestore and immediately syncs the dropdown options in the Users tab without a page refresh.</Bullet>
            <Bullet>Admin always has full access; that column is locked.</Bullet>
          </PageCard>

          <PageCard title="Settings — General" path="/settings → General">
            <Bullet>Shows the College ID format reference (<code className="bg-gray-100 px-1 rounded text-xs">SHORTCODE-AY-SEQ</code>).</Bullet>
            <Bullet>Toggle <strong>Guest Access</strong> — when on, anyone can browse the app structure without an account (no data is shown).</Bullet>
          </PageCard>

        </div>
      </Section>

      {/* ── Roles & Access ── */}
      <Section title="Roles & Access" subtitle="What each role can see by default. Admins can change permissions from Settings.">
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Default Pages</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Typical User</th>
              </tr>
            </thead>
            <tbody>
              {[
                { role: 'Admin', pages: 'All pages + Settings', who: 'Operations lead / manager', color: 'bg-brand-100 text-brand-700' },
                { role: 'Onboarding Team', pages: 'Dashboard, Colleges, Students, Import, Expenses, Calendar', who: 'College outreach coordinators', color: 'bg-blue-100 text-blue-700' },
                { role: 'Auditing Team', pages: 'Dashboard, Audit Queue, Interviews, Selection', who: 'Student review team', color: 'bg-purple-100 text-purple-700' },
                { role: 'Field Team', pages: 'Dashboard, Calendar, Colleges', who: 'On-ground drive execution', color: 'bg-teal-100 text-teal-700' },
                { role: 'Auditor', pages: 'Dashboard, Colleges, Students, Import, Audit, Interviews, Selection, Expenses', who: 'Senior cross-functional reviewer', color: 'bg-amber-100 text-amber-700' },
              ].map(r => (
                <tr key={r.role} className="border-b border-gray-50">
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.color}`}>{r.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.pages}</td>
                  <td className="px-4 py-3 text-gray-500">{r.who}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400">Roles (except Admin) can be added, renamed, or removed from Settings → Permissions. Page access is fully configurable.</p>
      </Section>

      {/* ── Key Concepts ── */}
      <Section title="Key Concepts" subtitle="Terms used throughout the app.">
        <div className="grid grid-cols-2 gap-4">
          <ConceptCard term="College ID">
            Auto-generated on college creation. Format: <code className="bg-gray-100 px-1 rounded">SHORTCODE-AY-SEQ</code>. The short code is set once (e.g. JNTUH) and never changes. AY is the two-digit academic year pair (e.g. 2627 = 2026-27). Sequence resets each year per college.
          </ConceptCard>
          <ConceptCard term="Drive">
            A scheduled campus recruitment event at a college. Has a full status lifecycle from Draft to Completed. Linked to students imported from that event and to expenses filed for it.
          </ConceptCard>
          <ConceptCard term="Academic Year">
            Displayed as YYYY-YY (e.g. 2026-27). Auto-computed: June onwards = new academic year. Used to group drives and tag imported students.
          </ConceptCard>
          <ConceptCard term="Drive Status">
            Draft → Pending Approval → Changes Requested (if admin suggests alt date) → Approved → College Confirmed → Completed. Any status can move to Cancelled. Infra details unlock after College Confirmed.
          </ConceptCard>
          <ConceptCard term="Student Stage">
            The pipeline step a student is currently in — Assessment Imported, Shortlisted, Interview Scheduled, Interviewed, Selected. Every stage change is logged with a timestamp.
          </ConceptCard>
          <ConceptCard term="Outreach Status">
            College-level status: Contacted → Agreed → Assessment Scheduled → Assessment Done. Auto-updated to Assessment Done when an import is processed for that college.
          </ConceptCard>
          <ConceptCard term="Pending Approval (user)">
            Users who sign up without an invite link start as Pending. They see a waiting screen until an admin approves them. Invited users are auto-approved.
          </ConceptCard>
          <ConceptCard term="Guest Access">
            Anonymous Firebase login that shows the full app structure (tabs, headers, navigation) but hides all data. Useful for demos. Toggled from Settings → General.
          </ConceptCard>
        </div>
      </Section>

      {/* ── Architecture ── */}
      <Section title="Architecture & Tech Stack">
        <div className="grid grid-cols-2 gap-4">
          <TechCard title="Frontend" items={[
            'React 19 + Vite 8 (SPA)',
            'React Router v6 for client-side routing',
            'Tailwind CSS for styling',
            'Vercel for hosting (vercel.json rewrites for SPA routing)',
          ]} />
          <TechCard title="Auth & Database" items={[
            'Firebase Authentication — email/password + anonymous (guest)',
            'Cloud Firestore for all app data',
            'Firestore transactions for atomic College ID generation',
            'arrayUnion for drive history and infra changelog (concurrency-safe)',
          ]} />
          <TechCard title="Firestore Collections" items={[
            'users — profiles, roles, status',
            'colleges — outreach data, shortCode, collegeId',
            'drives — full lifecycle, history, infra, assignedTeam',
            'students — stage, stageHistory, driveId',
            'audits, interviews, assessments, driveExpenses',
            'config/app — guest toggle',
            'config/permissions — role → pages map',
            'config/roles — dynamic role definitions',
            'config/counters — per-college-per-year ID counters',
            'invites — one-time signup tokens',
          ]} />
          <TechCard title="Role-Based Access" items={[
            'Permissions stored in Firestore config/permissions',
            'Loaded into AuthContext on login',
            'canAccess(pageKey) checked at route level (ProtectedRoute) and nav level (Sidebar)',
            'refreshRoles() syncs context after Permissions tab saves — no page reload needed',
          ]} />
        </div>
      </Section>

    </div>
  )
}
