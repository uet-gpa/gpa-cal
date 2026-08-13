# UET GPA Calculator

**UET GPA Calculator** is a fast, private, client‑side web application that helps students calculate their **SGPA** (Semester Grade Point Average) and **CGPA** (Cumulative Grade Point Average) directly in the browser.

> ⚠️ **UET GPA Calculator is an independent student utility and is not an official university website.** Verify the grading scale and any academic policies against your official university documentation before relying on the results.

---

## Features

- **SGPA Calculator** — add unlimited subjects, enter credit hours, select grades, and compute semester GPA.
- **Live quality points** — grade points and quality points update instantly as you type.
- **Academic remarks** — configurable performance remarks (Outstanding, Excellent, … Poor).
- **Improvement Advisor** — identifies the lowest‑grade subject and the subject with the greatest upside.
- **What‑If Calculator** — test a new grade for any subject and see the projected SGPA.
- **CGPA Calculator** — add previous semesters and compute the credit‑weighted cumulative GPA.
- **CGPA Target Calculator** — enter your current standing and a target to find the average you still need — with impossible‑target detection.
- **Validation** — friendly inline errors for empty/invalid names, credit hours, grades, and SGPA.
- **Persistence** — calculations are saved in your browser's `localStorage` and restored on refresh.
- **Export** — print a professional result or download it as a text file.
- **Dark / Light / System** theme, fully responsive, and accessible.
- **SEO** — semantic HTML, meta tags, Open Graph, `robots.txt`, and `sitemap.xml`.

## Technologies

| Area | Tool |
|------|------|
| Markup | HTML5 (semantic) |
| Styles | CSS3 (custom properties, responsive grid, print stylesheet) |
| Scripts | Vanilla JavaScript (no frameworks) |
| Persistence | Browser `localStorage` |
| Hosting | Static — works on GitHub Pages with **no server** |

No PHP, Node.js, React, Vue, database, login, or backend is used.

## Project Structure

```
UET-GPA-Calculator/
├── index.html            # Single-page markup (all sections)
├── css/
│   └── style.css          # Design system, layout, print, dark mode
├── js/
│   ├── gpa.js             # Grades, remarks, all calculations & validation (single source of truth)
│   ├── storage.js         # localStorage wrapper
│   └── app.js             # DOM, navigation, theme, UI orchestration
├── assets/
│   ├── icons/gpa-icon.svg # Logo icon
│   └── images/gpa-og.svg  # Open Graph social image
├── favicon/
│   └── favicon.svg        # Favicon
├── robots.txt             # Search-engine crawler rules
├── sitemap.xml            # Sitemap for SEO
└── README.md
```

> The project folder and website brand both use the name **UET GPA Calculator**.

## How to Run Locally

No server or build step is required. Simply open the file:

1. Download / clone the project.
2. Open `index.html` directly in a modern browser (Chrome, Edge, Firefox, Safari).
   - *Tip:* double‑clicking `index.html` works. For the `localStorage` and theme features to behave naturally, open it via `http://localhost` (e.g. `python -m http.server`).

That's it — the calculator works entirely offline in your browser.


## How GPA Is Calculated

**SGPA** is the credit‑weighted average of grade points for one semester:

```
For each subject:  Quality Points = Credit Hours × Grade Point
SGPA = Total Quality Points ÷ Total Credit Hours
```

The displayed result is rounded to **two decimal places**, but intermediate math uses full precision.

**CGPA** is the credit‑weighted average across all semesters (it is **not** a simple average of semester GPAs):

```
CGPA = Σ (SGPA × Semester Credit Hours) ÷ Σ (Semester Credit Hours)
```

**CGPA Target Calculator** solves for the average GPA you must earn on remaining credits:

```
Required GPA = (Target × (Completed + Remaining) − Current × Completed) ÷ Remaining
```

If `Required GPA > 4.00` (the configured maximum), the target is flagged as **not mathematically achievable**.

### Worked Example (SGPA)

| Subject    | Credits | Grade | Grade Point | Quality Points |
|------------|---------|-------|-------------|----------------|
| Programming| 3       | A     | 4.00        | 12.00          |
| Calculus   | 3       | B+    | 3.33        | 9.99           |
| Physics    | 4       | A−    | 3.67        | 14.68          |

- Total Credit Hours = 10
- Total Quality Points = 36.67
- SGPA = 36.67 ÷ 10 = **3.667 → displayed as 3.67**

## Grading Scale (Default)

| Grade | Point | | Grade | Point |
|-------|-------|-|-------|-------|
| A+    | 4.00  | | C+    | 2.33  |
| A     | 4.00  | | C     | 2.00  |
| A−    | 3.67  | | C−    | 1.67  |
| B+    | 3.33  | | D+    | 1.33  |
| B     | 3.00  | | D     | 1.00  |
| B−    | 2.67  | | F     | 0.00  |

### How to Customize the Grading Scale

All grade values live in **one place** — `js/gpa.js` (the `GRADES` constant), along with `MAX_GPA` and `REMARK_RULES`. To change the scale:

1. Open `js/gpa.js`.
2. Edit the `GRADES` array (e.g., add `P`/`NP` grades, or change `A` to 3.9).
3. Edit `MAX_GPA` if your scale uses a different maximum.
4. Edit `REMARK_RULES` to adjust or translate the academic remarks.
5. Re‑open `index.html`.

Because the UI reads grades **only** from `GPA.GRADES`, no other file needs to be touched.

## How localStorage Works

- Subjects, semester data, the theme preference, and target‑calculator inputs are stored under namespaced keys (`uet_gpa_*`).
- Data is saved to the browser and restored automatically after a refresh.
- **Nothing is sent to a server.** Clear your browser data to erase it, or use the "Reset Calculator" buttons.

## How to Deploy to GitHub Pages

1. Push the repository to GitHub (e.g., `your-username/uet-gpa-calculator`).
2. In the repo, go to **Settings → Pages → Build and deployment**.
3. Set **Source** to the `main` (or `gh-pages`) branch and `/ (root)` folder.
4. GitHub Pages serves the static site automatically in ~1–2 minutes.

Before publishing, edit these placeholders to your real URL:

- `index.html` → `<link rel="canonical" href="...">`
- `index.html` → `<meta property="og:url" content="...">`
- `robots.txt` → `Sitemap:` line
- `sitemap.xml` → `<loc>` URL

## Important Assumptions

- The default 4.0 scale is a **student‑chosen default**, not necessarily your university's official scale.
- Credit hours may be whole or half values (e.g., `0.5`, `1.5`); any positive number is accepted.
- SGPA/CGPA values in the CGPA calculator are entered manually (they are assumed to already be valid semester GPAs).
- Improvements shown are projections; retaking or grade‑replacement policies differ by university.

## Disclaimer

> **UET GPA Calculator is an independent student utility and is not an official university website.** It is provided "as is" without warranties of any kind. Verify all results, grading scales, and academic policies with your official university documentation.


