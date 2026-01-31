# User Test Script — Live Testing

Use this script when running a live user test. It includes an app-wide audit, step-by-step scenarios, observation questions, and a stability check.

**Full UX script:** For a complete walkthrough of every function with task prompts and UX questions (focused on intuitive use without a tutorial), use [docs/UX_TESTING_SCRIPT.md](docs/UX_TESTING_SCRIPT.md). Do Part 1 below first, then run that script with your tester.

---

## Part 1: App-Wide Audit (Do This First)

Run this audit yourself before the live test to confirm the build is ready.

**Core navigation routes**

- **`/launchpad`** — Should show the A&R Launchpad (no sidebar): workspace selector, Add submission, Settings, Logout. ☐
- **`/personal/dashboard`** — Should show Personal Dashboard with sidebar. User must have at least one membership; otherwise they get redirected to `/launchpad`. ☐
- **`/labels/[org_id]`** — Should show that label’s dashboard. Only if the user has membership for that org; otherwise redirect to `/launchpad`. ☐

**Global Intake Dropdown & Copy Link**

- The “Add submission” dropdown should be visible on: Launchpad (header), Personal Dashboard (header), Label Dashboard (header). ☐
- Open the dropdown. Under “PERSONAL INBOX” you should see “Personal Submission Portal” and a URL. Each row (personal + each label under “LABEL PORTALS”) should have a copy button. Click copy — you should see “Copied!” and the URL in your clipboard. ☐

**Manage tab**

- For any user with at least one membership, the “Manager” nav item should appear in the sidebar. ☐
- That same “Manager” item should appear in both Personal view and Label view (it persists across workspaces). ☐

**Logo & Alpha Pricing banners**

- Logo: Sidebar shows “SoundPath” + Zap icon (when collapsed, Zap only). Landing header: Zap + app name. Mobile header: “SoundPath”. ☐
- Alpha: Landing pricing has the Alpha Status banner and Alpha Pricing container. Sign Up has “ALPHA ONLY” on non-free plan cards. Billing has Alpha banner and container. ☐

---

## Part 2: Workflow Script (Follow With Tester)

### Scenario A — Onboarding

**Goal:** Can the user sign up and see Alpha Pricing urgency?

1. From Landing, click **Sign Up** (or go to `/signup`).
2. Complete sign-up: name, email, password, plan selection.
3. Check: On Sign Up, paid plan cards show the **“ALPHA ONLY”** tag (top-right of card).
4. Check: After sign-up, user is sent to launchpad or onboarding as you expect.
5. Optional: On Landing pricing, confirm the Alpha Status banner and Alpha Pricing area are visible and readable.

**Questions to ask (pick 2–3):**

- Does this feel like a professional audio/tool sign-up, or more like a generic website?
- Is it clear that your current price is a limited-time Alpha rate?
- What would you expect to happen after clicking “Sign Up”—where would you land?

---

### Scenario B — Personal Office: Upload Demo

**Goal:** Can the user upload a demo to their personal inbox?

1. Get the user into Personal context (e.g. from Launchpad choose “Personal Dashboard” or go to `/personal/dashboard`).
2. On Personal Dashboard, find the **“Add submission”** dropdown in the header.
3. Use **“+ Manually Add Submission”** from the dropdown.
4. Fill required fields (artist name, link, notes, etc.) and submit.
5. Check: A new submission shows up in the personal inbox / dashboard.

**Questions to ask (pick 2–3):**

- Was it obvious where to add a demo to **your** inbox (not a label)?
- Does this view feel like a professional audio tool or more like a generic website?
- After adding, could you find the track you just added?

---

### Scenario C — Label Switching

**Goal:** Can the user “Enter” a label and see a different set of tracks?

1. From **Launchpad**, under “Your Workspaces,” click **Enter** on a label card (or use the sidebar to go to a label).
2. Check: URL becomes `/labels/[org_id]` and the dashboard shows that label’s name/context.
3. Check: The tracks shown are for that organization, not the personal inbox.
4. Switch to another label (or back to Personal) and confirm the track list changes.

**Questions to ask (pick 2–3):**

- Was it clear you were inside a **label** and seeing that label’s submissions?
- Where would you go right now to find a track you **denied yesterday**?
- How would you get back to your personal inbox vs. a label inbox?

---

### Scenario D — Intake: Find and Copy Submission Link

**Goal:** Can the user find and copy their submission link from the dropdown?

1. From **Launchpad** or **Personal Dashboard** (or Label Dashboard), find the **“Add submission”** button and open the dropdown.
2. Check: Under “PERSONAL INBOX” you see **Personal Submission Portal** and a URL.
3. Click the **Copy** (clipboard) button next to the personal URL.
4. Check: “Copied!” appears; paste in another tab and confirm it’s the submission form (e.g. `/submit/user/...`).
5. If the user has labels: under “LABEL PORTALS,” each label has a Copy button; copy one and confirm it opens that label’s submission form.

**Questions to ask (pick 2–3):**

- Was it obvious where to find **your** submission link to send to artists?
- Is it clear which link is for you (personal) vs. a label?
- Would you use this link to share with artists, or look for it somewhere else?

---

### Scenario E — Mobile: Sidebar

**Goal:** On a phone, does the sidebar open and close smoothly?

1. Have the user open the app on their **phone** (same account or share a link).
2. Log in if needed; go to a page that has the sidebar (e.g. `/personal/dashboard` or `/labels/[org_id]`).
3. Check: On mobile, the sidebar is **hidden** by default; a **hamburger** (menu) icon is in the header.
4. Tap the **menu** icon — sidebar opens as a drawer.
5. Tap a nav item or close — sidebar closes.
6. Check: No big layout jump or freeze; open/close feels smooth.

**Questions to ask (pick 2–3):**

- Did the menu open and close in a way that felt natural on your phone?
- Was it clear that the hamburger icon opens the main navigation?
- Would you use this app on mobile to check submissions, or mainly on desktop?

---

## Part 3: Observation Questions (Quick List)

**Onboarding** — Does this feel like a professional audio tool or just a website? Is it clear your price is a limited-time Alpha rate? What would you expect after signing up?

**Personal Office** — Was it obvious where to add a demo to your personal inbox? Does this view feel like a professional audio tool? Could you find the track you just added?

**Label switching** — Was it clear you were in a label and seeing that label’s submissions? Where would you go to find a track you denied yesterday? How would you get back to personal vs. label?

**Intake / Copy link** — Was it obvious where to find your submission link? Is it clear which link is personal vs. label? Would you use this to share with artists?

**Mobile** — Did the menu open/close feel natural? Was it clear the hamburger opens main navigation? Would you use this on mobile for submissions?

---

## Part 4: Stability Check — Session Persistence

**Goal:** Confirm the app stays logged in when opening a new tab or refreshing.

1. Log in and go to any authenticated page (e.g. `/launchpad` or `/personal/dashboard`).
2. **New tab:** Open a new tab, paste the same app URL (e.g. `/launchpad`), press Enter. Expected: still logged in, same context.
3. **Refresh:** In the same tab, press F5 or refresh. Expected: still logged in, no redirect to login.
4. **Optional:** Leave the tab in the background for a few minutes, then switch back. Expected: session still valid.

If the user gets logged out unexpectedly, note what they did (new tab vs. refresh vs. background) and for how long.

---

## Pre-Test Checklist

- [ ] App-wide audit (Part 1) done; any blocking issues fixed.
- [ ] Test account(s) ready (with and without memberships if you’re testing the Manager tab).
- [ ] Alpha pricing and banners look right on Landing / Sign Up / Billing.
- [ ] Copy-link and manual-add flows work on your side.
- [ ] Phone or responsive mode ready for Scenario E.
- [ ] This script open so you can use the observation questions.

Good luck with your live test.
