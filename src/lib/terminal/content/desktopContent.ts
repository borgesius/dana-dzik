export const DESKTOP_FILE_CONTENT: Partial<Record<string, string>> = {
    "Internet Explorer.lnk":
        "[InternetShortcut]\nURL=file:///3:/Programme/Internet Explorer/iexplore.exe",
    "about_me.doc": `=== ABOUT DANA ===

Hi, my name is Dana.
I'm a software engineer who lives in San Francisco.

Interests:
- Running
- Cycling
- Technology
- Literature
- Philosophy

Cat: Felix Ramon Vanderbilt

[Use 'open about_me.doc' to view full profile]`,
    "cool_projects.zip": `Archive: cool_projects.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
     1337  2026-02-05 12:00   this-website/
     2048  2026-02-05 12:00   secret-projects/
---------                     -------
     3385                     2 files

[Use 'open cool_projects.zip' to extract and view]`,
    "resume.pdf": `%PDF-1.4
================================
        DANA DZIK
================================

EXPERIENCE
----------
Senior Software Engineer
Volley - San Francisco, CA
2021 - Present

EDUCATION
---------
University of Chicago
B.A. with Honors in Mathematics and Philosophy

[Use 'open resume.pdf' to view full document]`,
    "bookmarks.url": `[InternetShortcut]
URL=about:bookmarks
IconIndex=0`,
}
