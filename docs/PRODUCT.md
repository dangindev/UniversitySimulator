# University Simulator — 2026.v1

University Simulator is a free, Vietnamese-language university learning game. The fictional university offers IT (125 credits) and CS (126 credits), with eight-semester recommended paths and flexible credit registration. Existing public source visibility is preserved; no open-source or content-reuse license is granted by this document.

## Product decisions

- Beginner audience; top-down pixel-art campus; accessible HTML learning screens; PC-first, mobile reading and planning.
- Login before character creation; production Google/email authentication through Supabase. Local authentication is an explicit, loopback-only development capability.
- NPC friends, lecturers, clubs and relationships; no multiplayer or live AI tutor in phase 1.
- Simulated calendar advances only through learner actions. Real-time optional activities cannot block graduation.
- C++/Python entry tracks satisfy the same 4-credit introductory course. Bridge modules carry no extra credit.
- English 1/2/3 are 4 credits each; consecutive placement levels can exempt all three. Exempt credits count toward graduation and are excluded from GPA. Technical English is mandatory, 3 credits.
- Physical education, national-defense awareness and office skills are noncredit completion requirements in the fictional simulation.
- Standard grades: attendance 10%, practice 30%, midterm 20%, final 40%; pass requires overall >=5/10 and final >=4/10. Project milestones: 20/30/50. All grading runs on the server.
- Virtual records identify the game and only claim verified results. Unrestricted essay/speaking assessment is outside automatic scoring.

## Milestones and release policy

M0: catalog, credit/prerequisite graph, design, persistence and interfaces. M1: complete and review the introductory learning loop in both tracks. M2: full internal semester. M3: all offered content, electives, internship and capstone. M4: learner trials plus security/load/cost/recovery validation. M5: public phase 1 release.

One-course/one-semester builds are internal milestones. Public phase 1 requires the entire two-degree journey. A catalog entry or one starter lesson is not a complete course. Current content is explicitly draft/partial. Production startup checks an external reviewed-content manifest and private assessment bank rather than treating sample questions as official tests.

## Capacity and economics

Initial targets: 100 concurrent learners, at most 10 concurrent execution jobs and one running job per learner. Monthly design cap: 10 million VND, including a 4 million VND execution allocation. Capacity, learning outcomes and cost are acceptance targets to measure, not results already achieved.

## Reference programs

The catalog adapts public program structures into a fictional curriculum, rather than representing or awarding a degree from these institutions:

- UIT IT, cohort 2024: https://daa.uit.edu.vn/content/cu-nhan-nganh-cong-nghe-thong-tin-ap-dung-tu-khoa-19-2024
- UIT CS, cohort 2024: https://daa.uit.edu.vn/content/cu-nhan-nganh-khoa-hoc-may-tinh-ap-dung-tu-khoa-19-2024
- HUST K68 update: https://soict.hust.edu.vn/thong-bao-cap-nhat-khung-chuong-trinh-va-ke-hoach-hoc-tap-chuan-cho-cac-ctdt.html

Phase 2 adds other majors through versioned curriculum records; it must preserve existing achievements.
