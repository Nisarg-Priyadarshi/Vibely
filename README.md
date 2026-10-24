<<<<<<< HEAD
# Vibely 🎵

A full-stack music streaming web application inspired by Spotify, featuring **Vibely Rooms** for real-time collaborative listening.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, JavaScript, React Router v7
- **Styling:** Tailwind CSS v4
- **Backend:** Node.js, Express (ES Modules)
- **Database:** MongoDB Atlas, Mongoose
- **Real-Time Communication:** Socket.IO
- **Authentication:** JWT, bcryptjs, HTTP-only Cookies
- **Icons:** Lucide React

---

## 📁 Project Structure

```text
music_area/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddToPlaylistModal.jsx  # Add to playlist dialog & quick create
│   │   │   ├── Navbar.jsx              # Navigation with Explore, Library, Profile
│   │   │   ├── PlayerBar.jsx           # Fixed bottom persistent audio player
│   │   │   └── SongCard.jsx            # Card with artwork, play indicator, add button
│   │   ├── context/
│   │   │   ├── AuthContext.jsx         # User session & HTTP-only auth state
│   │   │   ├── PlayerContext.jsx       # HTML5 Audio engine & queue manager
│   │   │   └── PlaylistContext.jsx     # User playlist state & actions
│   │   ├── pages/
│   │   │   ├── Home.jsx                # Explore catalogue, search, genre filter
│   │   │   ├── Library.jsx             # Your playlists collection & creation
│   │   │   ├── PlaylistDetail.jsx      # Playlist tracks, Play All, edit/delete
│   │   │   ├── Profile.jsx             # Profile details & display name update
│   │   │   ├── Login.jsx               # User login form
│   │   │   └── Register.jsx            # User registration form
│   │   ├── utils/
│   │   │   └── format.js               # mm:ss time formatting utility
│   │   ├── App.jsx                     # Route definitions & provider tree
│   │   └── main.jsx                    # React entry with BrowserRouter
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                   # Mongoose connection with sanitized logging
│   │   ├── controllers/
│   │   │   ├── authController.js       # Register, login, logout, me, profile
│   │   │   ├── healthController.js     # Health and readiness endpoints
│   │   │   ├── playlistController.js   # Playlist CRUD & track management
│   │   │   └── songController.js       # Paginated song catalogue & search
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js       # JWT verification via Cookie / Bearer
│   │   │   └── errorHandler.js         # Centralized error & 404 handler
│   │   ├── models/
│   │   │   ├── Playlist.js             # Mongoose Playlist model
│   │   │   ├── Song.js                 # Mongoose Song model with text index
│   │   │   ├── User.js                 # Mongoose User model with bcrypt hashing
│   │   │   └── index.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js           # /api/auth
│   │   │   ├── healthRoutes.js         # /api/health
│   │   │   ├── playlistRoutes.js       # /api/playlists
│   │   │   ├── songRoutes.js           # /api/songs
│   │   │   └── index.js
│   │   ├── scripts/
│   │   │   └── seedSongs.js            # Idempotent demo catalogue seeder
│   │   ├── sockets/
│   │   │   └── socket.js               # Socket.IO initialization
│   │   ├── app.js                      # Express configuration & cookie-parser
│   │   └── server.js                   # HTTP server startup & database connect
│   ├── tests/
│   │   ├── auth.test.js                # Auth test suite (33 tests)
│   │   ├── playlist.test.js            # Playlist test suite (36 tests)
│   │   └── song.test.js                # Song catalogue test suite (24 tests)
│   ├── .env.example
│   └── package.json
├── README.md
└── .gitignore
```

---

## 🚀 Running Locally

### 1. Backend Server

```bash
cd backend
npm install
npm run dev
```

*Runs at `http://localhost:5000`.*

### 2. Frontend Application

```bash
cd frontend
npm install
npm run dev
```

*Runs at `http://localhost:5173`.*

### 3. Seed Demo Catalogue (Idempotent)

```bash
cd backend
npm run seed
```

### 4. Run Test Suites

```bash
# Run all backend tests (Auth + Songs + Playlists = 93 tests)
cd backend
npm test

# Run frontend audio player unit tests (11 tests)
cd frontend
node src/tests/player.test.js
```

---

## 📡 API Reference Summary

### Authentication (`/api/auth`)
- `POST /register` — Register new user account.
- `POST /login` — Authenticate and receive HTTP-only session cookie.
- `POST /logout` — Invalidate session by clearing cookie.
- `GET /me` — Get current authenticated user profile *(Protected)*.
- `PATCH /profile` (or `PATCH /me`) — Update display name *(Protected)*.

### Music Catalogue (`/api/songs`)
- `GET /` — Paginated song listing (`page`, `limit`, `genre`, `q`).
- `GET /search?q=...` — Search across titles, artists, albums, and tags.
- `GET /genres` — List distinct genres.
- `GET /:id` — Song details by ID.

### Playlists (`/api/playlists` - All Protected)
- `POST /` — Create playlist.
- `GET /mine` — List current user's playlists.
- `GET /:id` — Get playlist details with populated tracks.
- `PATCH /:id` — Update playlist title, description, or visibility (Owner only).
- `DELETE /:id` — Delete playlist (Owner only).
- `POST /:id/songs` — Add song to playlist (Owner only, duplicate prevented).
- `DELETE /:id/songs/:songId` — Remove song from playlist (Owner only).
=======
# Music-Area
>>>>>>> origin/main
=======
# Vibely
>>>>>>> submission/main
