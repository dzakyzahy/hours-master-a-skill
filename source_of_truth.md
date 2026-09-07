# Hours Master - Source of Truth

This document serves as the central source of truth for AI agents and developers working on the Hours Master project. Please read this entirely before making modifications.

## 1. Project Overview
**Hours Master** is a cross-platform time tracking and mastery app (Web, Desktop via Electron, Mobile via Capacitor). 
- **Tech Stack**: React 18, TypeScript, Vite, Zustand (State Management), Tailwind CSS, Supabase (PostgreSQL, Realtime, Auth), WebRTC (for meetings), Electron, Capacitor (Android).

## 2. Completed Milestones (Tahap 1-7)
The core functionalities have been implemented:
1. **Repository & Electron Setup**: Vite + Electron builder.
2. **Multi-User Auth & Profiles**: Simple username-based fallback for local dev, plus Supabase integration.
3. **Database Schema**: Chat, Friends, Recycle Bin (`timer_state` and `projects` etc).
4. **Chat & Friends UI**: Live messaging and user search.
5. **Meeting Room**: WebRTC Peer-to-Peer video, audio, and screen sharing. (Recently refactored by Diky into `MeetingControls.tsx` and `VideoTile.tsx`).
6. **Project Management & Recycle Bin**: Ability to edit project phases, add manual time, soft delete projects, and restore them from the Recycle Bin in the Home page.
7. **Live Timer Sync**: Timer state is pushed to Supabase `timer_state` so Web and Desktop users see the timer running simultaneously.

## 3. Past Mistakes & "Gotchas" to Avoid
When modifying the codebase, please learn from these past mistakes:
- **TypeScript Strictness during Electron Build**: The `npm run build:electron` command enforces very strict TypeScript checks (via `tsc -b`). Do **not** leave unused variables (e.g., `import { X, Trash2 }` where `Trash2` is unused, or destructured variables like `const { activeProjectId } = useStore()` that are never used). It will break the build.
- **Modal Component Overwrites**: When fixing TS errors, do not aggressively remove modals (like `<EditProjectModal />` or `<ManualProjectModal />`) from the `return ()` statement just because the variables seem "unused". Modals depend on state (e.g., `editProject !== null`). Ensure `isOpen` props are passed and handled correctly.
- **Git Conflicts**: Multiple agents/developers (e.g., Diky) are working on this repository. Always do a `git fetch` and `git pull` (or stash and pop) before making large architectural changes. Recently, Diky added Capacitor and refactored WebRTC, which caused merge conflicts.
- **Electron .exe Updates**: If you make a UI change, the user running the installed `.exe` on Desktop will **not** see it unless you rebuild the executable (`npm run build:electron`) and distribute it.
- **Ghost Sessions (Auth)**: The `logout` function MUST call `await supabase.auth.signOut()`. Previously, it only cleared local Zustand state, leaving a "ghost session" in Supabase. This caused the app to fetch the wrong user's profile (`dzakyzr3`) when logging in as another user (`diky`) if the new sign-in failed.
- **Database Environments**: The correct, primary Supabase project is `mcqdqluxprpmrgofynaa`. The database connection string is `postgresql://postgres.mcqdqluxprpmrgofynaa:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`. Do not confuse this with the old abandoned project (`ovxx...`). If spinning up a new environment, ensure all schema tables (`profiles`, `friend_requests`, `chat_rooms`, etc.) and Realtime publications are manually recreated, as Supabase projects start empty.


## 4. Current State & Pending Tasks
Diky recently updated the repository with:
- Android Configurations (Capacitor/Gradle).
- Extracted documentation into the `docs/` folder.
- Refactored `MeetingRoom.tsx` into smaller components.

### Next Steps for the AI Agent:
1. **Review Diky's Roadmap**: Check `docs/diky_upgrade_roadmap.md` and `docs/development_guide.md` for the latest architectural plans.
2. **UI Sophistication**: Enhance the visual design to be more premium (Glassmorphism, animations, responsive design).
3. **Android APK Deployment**: Finalize the GitHub Actions workflow to build and release the APK automatically.
4. **Auto-updater Testing**: Ensure the desktop app can pull the latest `.exe` from GitHub Releases.
