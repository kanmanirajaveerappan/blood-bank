# LIFELINK AI
## Complete Full-Stack Application Development Specification
**AI-Powered Emergency Blood Donor Matching Using KNN and Geospatial Analysis with Agentic AI Coordination**

> *"Connecting the right help, when every second matters."*

---

### 1. Project Vision
* Build a modern, scalable emergency blood donor coordination platform that helps authorized hospitals coordinate emergency blood requirements by identifying potentially suitable and available donors using deterministic compatibility rules, availability, geospatial analysis, KNN ranking, intelligent notifications, real-time tracking, Agentic AI workflows, blood-bank inventory, analytics, and Excel/CSV processing.
* AI must not independently diagnose, prescribe, determine treatment, or override validated medical compatibility rules. AI/ML and Agentic AI are used for candidate ranking, operational prioritization, workflow coordination, search expansion, notification orchestration, data processing, and analytics.

---

### 2. User Roles
* **Donor**: registration, profile, availability, location freshness, emergency requests, responses, notifications, donation history and privacy.
* **Hospital**: emergency request creation, matching center, live map, candidate monitoring, notifications, request tracking and reports.
* **Blood Bank**: inventory management, emergency support, low-stock monitoring, expiry monitoring and reports.
* **Admin**: user management, hospital/blood-bank verification, emergency monitoring, AI monitoring, Excel imports, analytics, audit logs and system configuration.

---

### 3. Recommended Technology Stack (Tools Required)
* **Frontend**: React.js, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, TanStack Query, Zustand, React Hook Form, Zod, Lucide React, Framer Motion, Recharts, Leaflet and React Leaflet.
* **Backend**: Python, **Flask**, Flask-CORS, Pydantic / Marshmallow, Flask-SQLAlchemy (SQLAlchemy) and Flask-Migrate (Alembic).
* **Database**: PostgreSQL with PostGIS.
* **AI/ML**: Python, Scikit-learn, Pandas and NumPy.
* **Agentic AI**: LangGraph with a configurable LLM provider and controlled tool-based workflows.
* **Notifications**: Firebase Cloud Messaging, email-provider abstraction and SMS-provider abstraction.
* **Cache/background work**: Redis and Celery / background worker task queue.
* **Testing**: Pytest, Vitest, React Testing Library and Playwright.
* **Deployment**: Docker, Docker Compose, Git, GitHub and GitHub Actions.

---

### 4. Professional Interactive UI Theme
* Use a premium Healthcare + AI + Emergency Command Center visual language.
* Primary visual palette: deep navy, professional blue, cyan/teal, white, light blue-gray, green for success, amber for warning, and red only for emergency/critical status.
* Use Inter or Manrope typography. Use subtle Framer Motion transitions, card hover effects, button states, skeleton loaders, toast notifications, animated statistics, interactive charts and responsive drawers/modals.
* Support complete Light Mode and Dark Mode. Ensure charts, maps, tables, forms, dialogs, navigation and notifications work correctly in both themes.
* Support desktop, laptop, tablet and mobile. Emergency actions must remain easy to access.
* Implement keyboard navigation, focus indicators, ARIA labels, readable validation messages and suitable contrast.

---

### 5. Public Website Pages
* `/`, `/about`, `/how-it-works`, `/for-donors`, `/for-hospitals`, `/for-blood-banks`, `/contact`, `/faq`, `/privacy`, `/terms`.
* **Landing page sections**: Hero, Problem, Solution, How It Works, AI Matching, Geospatial Matching, Donor Network, Hospital Workflow, Blood-Bank Integration, Statistics, Security, FAQ, CTA and Footer.
* **Hero CTA**: Request Emergency Blood. **Secondary CTA**: Become a Donor.

---

### 6. Authentication Pages
* `/login`, `/register`, `/register/donor`, `/register/hospital`, `/register/blood-bank`, `/forgot-password`, `/reset-password`, `/verify-account`.
* Implement secure password hashing, JWT authentication, refresh tokens, role-based authorization, account verification, password reset and logout.

---

### 7. Donor Application
* **Pages**: `/donor/dashboard`, `/donor/profile`, `/donor/availability`, `/donor/location`, `/donor/emergency-requests`, `/donor/emergency-requests/:id`, `/donor/notifications`, `/donor/donation-history`, `/donor/request-history`, `/donor/privacy`, `/donor/settings`.
* Dashboard should emphasize availability, last location update, emergency alerts, recent requests, profile completion and donation history.
* **Availability states**: `AVAILABLE`, `UNAVAILABLE` and `STALE`.
* **Location freshness states**: `FRESH`, `RECENT`, `STALE` and `UNKNOWN`.
* Do not unnecessarily expose exact donor coordinates or private contact information.

---

### 8. Hospital Application
* **Pages**: `/hospital/dashboard`, `/hospital/emergency-requests`, `/hospital/emergency-requests/create`, `/hospital/emergency-requests/:id`, `/hospital/matching/:id`, `/hospital/live-map/:id`, `/hospital/notifications`, `/hospital/history`, `/hospital/reports`, `/hospital/profile`, `/hospital/settings`.
* Create an emergency request wizard: Blood Requirement → Urgency → Hospital/Location → Required-by Time → Review → Submit.
* Emergency Command Center should show request status, compatibility, availability, geospatial search, KNN ranking, notification progress, candidates, responses, accepted donors, search radius and live timeline.

---

### 9. Blood Bank Application
* **Pages**: `/blood-bank/dashboard`, `/blood-bank/inventory`, `/blood-bank/inventory/:group`, `/blood-bank/requests`, `/blood-bank/emergency-support`, `/blood-bank/low-stock`, `/blood-bank/expiry`, `/blood-bank/reports`, `/blood-bank/profile`, `/blood-bank/settings`.
* Track A+, A-, B+, B-, AB+, AB-, O+ and O- with available units, reserved units, low-stock status, critical status and expiry information.

---

### 10. Admin Application
* **Pages**: `/admin/dashboard`, `/admin/users`, `/admin/donors`, `/admin/hospitals`, `/admin/blood-banks`, `/admin/emergency-requests`, `/admin/matching`, `/admin/ai-monitor`, `/admin/notifications`, `/admin/excel-import`, `/admin/analytics`, `/admin/audit-logs`, `/admin/settings`, `/admin/security`.
* **Dashboard metrics**: total users, active/available donors, hospitals, blood banks, active/critical emergencies, successful matches, average matching time and response rate.
* **AI Monitor** should show KNN model status/version, training date, dataset size, inference time, evaluation metrics and matching statistics.

---

### 11. Excel/CSV Intelligence
* Create `/admin/excel-import` with drag-and-drop upload for `.xlsx` and `.csv`.
* **Workflow**: Upload → Analyze → Validate → Clean → Preview → Confirm Import.
* Show total records, valid records, invalid records, duplicates and missing values. Provide an error report and require administrator confirmation before import.
* Use Pandas and OpenPyXL. AI may assist with data understanding but must not silently alter records.

---

### 12. Database Design
* Use PostgreSQL + PostGIS.
* **Core tables**: `users`, `roles`, `donors`, `hospitals`, `blood_banks`, `blood_inventory`, `locations`, `blood_requests`, `matching_runs`, `matching_results`, `notifications`, `notification_attempts`, `donor_responses`, `donation_history`, `consents`, `excel_import_jobs`, `excel_import_errors`, `agent_runs`, `agent_actions`, `audit_logs` and `system_settings`.
* Use UUIDs, foreign keys, unique constraints, check constraints, timestamps and proper indexes. Use PostGIS spatial indexes for geographic searches.

---

### 13. Backend Architecture
* **Flask application & service blueprints**: AuthService, DonorService, HospitalService, BloodBankService, EmergencyRequestService, CompatibilityService, GeospatialService, KNNMatchingService, NotificationService, ExcelService, AnalyticsService, AuditService and AgentService.
* **Suggested folders**: `backend/app/api` (Flask Blueprints), `models`, `schemas`, `services`, `ai`, `agents`, `workers`, `core` and `tests`; plus `migrations`, `requirements.txt`, `Dockerfile` and `.env.example`.

---

### 14. Compatibility, KNN and Geospatial Intelligence
* Compatibility must be deterministic, explicit, testable, versioned and reviewable. Create `validate_blood_group()`, `check_compatibility()` and `get_compatible_candidates()`.
* **KNN pipeline**: compatibility filtering → availability filtering → location freshness → geospatial search → feature engineering → KNN → candidate ranking → explanation.
* Operational features may include distance, availability freshness and activity recency. Avoid irrelevant or discriminatory personal features.
* Use PostGIS functions for distance calculation, nearby search and configurable radius expansion such as 5 km, 10 km, 20 km and 50 km.

---

### 15. Agentic AI
* Create an Emergency Coordination Agent using LangGraph or a controlled equivalent.
* **Workflow**: Emergency Created → Validate → Compatibility → Availability → Geospatial Search → KNN Matching → Candidate Ranking → Notification → Monitor Responses → Resolve or Expand Search.
* **Controlled tools**: `find_eligible_donors()`, `find_nearby_donors()`, `calculate_distance()`, `run_knn_matching()`, `send_notification()`, `check_donor_responses()`, `expand_search_radius()` and `update_request_status()`.
* The agent must not diagnose, prescribe, determine treatment, override compatibility rules, expose unauthorized information or autonomously modify medical rules. Log important agent actions.

---

### 16. Notifications and Real-Time System
* Use Firebase Cloud Messaging for push notifications and support in-app, email and SMS abstraction.
* **Notification states**: `PENDING`, `SENT`, `DELIVERED`, `VIEWED`, `ACCEPTED`, `REJECTED`, `FAILED` and `EXPIRED`.
* Use staged notification batches, retry handling, delivery tracking and rate limiting.
* Use WebSockets / SSE / Socket.IO for `request.created`, `matching.started`, `matching.updated`, `candidate.found`, `notification.sent`, `donor.response` and `request.resolved`.

---

### 17. Security and Privacy
* Implement JWT, secure password hashing, RBAC, input validation, rate limiting, CORS, secure headers, file validation, API authorization, environment secrets and audit logging.
* Protect donor data using consent management, data minimization, approximate location, role-based access and secure API access. Never unnecessarily expose exact donor location or personal contact details.

---

### 18. Analytics
* Create analytics for emergency requests over time, blood-group demand, donor availability, response rate, average matching time, notification success, geographic demand and request resolution.
* Use Recharts with filters for date range, blood group, urgency and status.

---

### 19. Testing and Quality
* Create backend unit/integration/API tests, frontend component/form/state tests and Playwright end-to-end tests.
* Test authentication, authorization, compatibility, distance calculation, KNN, emergency requests, notifications, Excel validation, Agentic AI workflow, radius expansion and privacy.
* Evaluate Distance-only matching versus KNN versus KNN + Geospatial + Availability using candidate coverage, average distance, ranking quality, response rate, matching time and inference time.

---

### 20. Project Folder Structure
* `lifecycle-ai/frontend`, `backend`, `ml`, `agent`, `database`, `docs`, `tests`, `docker` and `scripts`.
* **Frontend**: `src/components`, `features`, `pages`, `layouts`, `hooks`, `services`, `api`, `store`, `types` and `utils`.
* **ML**: `datasets`, `notebooks`, `src`, `models` and `evaluation`.
* **Docs**: `architecture`, `api`, `database`, `ai`, `deployment` and `security`.

---

### 21. Development Phases
* Phase 1: architecture. Phase 2: database. Phase 3: backend foundation. Phase 4: authentication. Phase 5: design system. Phase 6: public website. Phase 7: donor app. Phase 8: hospital app. Phase 9: blood-bank app. Phase 10: admin app. Phase 11: emergency requests. Phase 12: compatibility engine. Phase 13: geospatial engine. Phase 14: KNN. Phase 15: notifications. Phase 16: WebSockets. Phase 17: Agentic AI. Phase 18: Excel processing. Phase 19: analytics. Phase 20: security. Phase 21: testing. Phase 22: Docker. Phase 23: deployment. Phase 24: optimization.

---

### 22. AI Coding Agent Rules
* Before modifying code, inspect the existing repository, understand the architecture, identify dependencies, APIs and database structures, then make an implementation plan.
* Implement incrementally. After every phase, show changed files, explain implementation, run tests, fix errors, verify existing functionality and proceed to the next phase.
* Do not overwrite working functionality unnecessarily.

---

### 23. Definition of Done
* A feature is complete only when frontend, backend, database integration, validation, authorization, error handling, loading state, empty state, responsive UI, accessibility, tests and documentation are completed.

---

### 24. Final Product Standard
* The final product must feel like a real healthcare technology platform rather than a basic college CRUD project. It should communicate trust, speed, intelligence, safety and reliability.
* **Required product characteristics**: separate role-based pages, interactive dashboards, real-time emergency monitoring, interactive maps, AI matching visualization, analytics, dark/light theme, responsive design, micro-interactions, secure authentication, KNN + geospatial matching, controlled Agentic AI, notifications, Excel intelligence, audit logs, testing and Docker deployment.

---

### 25. Master AI Coding Prompt
* ACT AS A SENIOR SOFTWARE ARCHITECT, FULL-STACK DEVELOPER, AI/ML ENGINEER, AGENTIC AI ENGINEER, UI/UX DESIGNER, DATABASE ARCHITECT, DEVOPS ENGINEER, SECURITY ENGINEER AND QA ENGINEER.
* Build LifeLink AI as a complete production-oriented application using the architecture and requirements in this document. Do not immediately generate the entire source code. First inspect the existing repository if one exists, then produce the architecture, database design, API specification, page map, workflows, AI/KNN architecture, geospatial architecture, Agentic AI architecture, notification architecture, security architecture and development roadmap. Implement phase by phase, test each phase, fix errors and preserve working functionality.

---

### Final Application Checklist
* [x] Professional interactive UI
* [x] Light/Dark mode
* [x] Responsive desktop/tablet/mobile design
* [x] Separate Donor, Hospital, Blood Bank and Admin applications
* [x] Secure authentication and RBAC
* [x] Emergency request workflow
* [x] Deterministic compatibility engine
* [x] KNN candidate ranking
* [x] PostGIS geospatial matching
* [x] Agentic AI coordination
* [x] Push/in-app/email/SMS notification abstraction
* [x] Real-time WebSockets / SSE
* [x] Excel/CSV intelligent import
* [x] Analytics and dashboards
* [x] Audit logging
* [x] Privacy controls
* [x] Automated tests
* [x] Docker deployment
* [x] Complete technical documentation
