# Vibely 🎵

A full-stack, real-time collaborative music streaming platform inspired by modern digital audio workstations and social listening services. Vibely pairs an audio streaming engine with synchronized **Vibely Rooms**, live social messaging, playlist curation, and profile personalization.

---

## 📑 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Visual Assets & Interface](#visual-assets--interface)
- [Project Directory Structure](#project-directory-structure)
- [Prerequisites](#prerequisites)
- [Installation & Local Setup](#installation--local-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [API Reference](#api-reference)
- [Socket.IO Real-Time Events](#socketio-real-time-events)
- [Security Considerations](#security-considerations)
- [Credits & Acknowledgments](#credits--acknowledgments)

---

## 🌟 Overview

**Vibely** delivers a seamless digital audio experience with real-time social interaction. Listeners can explore an expansive catalogue, filter by genre, build and organize playlists, bookmark tracks into dedicated Favorites and Play Later queues, and connect with other users via an integrated friendship and direct messaging system.

At the core of Vibely is **Vibely Rooms**: an interactive virtual listening room engine powered by Socket.IO. Room hosts can stream and control tracks in real time, with playback commands instantly mirrored across all joined members. Listeners can chat in real time, submit track and playback requests to the host, and invite friends directly into their room.

---

## ✨ Key Features

### 🎧 Audio Playback Engine
- **Persistent Global Audio Player:** Audio persists seamlessly across page navigation without interruption.
- **Full Playback Controls:** Play, pause, skip forward/backward, scrub timeline, and adjust volume.
- **Dynamic Track Queue:** Track sequencing with automatic playback progression and index wrap-around.
- **Duration & State Formatting:** Accurate elapsed/total time rendering (`mm:ss`) with defensive handling for edge cases (`NaN`, null, negative bounds).

### 🔍 Catalogue & Discovery
- **Search Engine:** Text index querying across song titles, artists, albums, and genre tags.
- **Genre Filtering:** Dynamic genre aggregations for one-click catalog exploration.
- **Detailed Song Insights:** Dedicated song overview displaying track metadata, album art, audio duration, and quick-add actions.

### 🌐 Vibely Rooms (Synchronized Collaborative Listening)
- **Host Room Management:** Create custom listening rooms with unique 6-character room codes.
- **Playback Synchronization:** Host play, pause, and seek events are broadcast with millisecond precision to all room participants.
- **Member Action Requests:** Listeners can request playback actions (play, pause, change track) that the host can approve or reject in real time.
- **In-Room Live Chat:** Real-time chat feed scoped to the room session.
- **Session Resilience:** Graceful disconnection handling, host migration alerts, and automatic room closure when the host terminates the session.

### 👥 Social Network & Direct Messaging
- **User Discovery:** Search users by display name or email.
- **Friend Request Lifecycle:** Send, accept, reject, and cancel pending friend requests, with unfriend support.
- **Private 1-on-1 Chat:** Secure, real-time direct messaging restricted strictly to verified friends.
- **Live Room Invitations:** Send instant room invites to online friends with one-click acceptance modals.

### 📚 Playlists & Personal Collections
- **Custom Playlists:** Full CRUD support for personal playlists with custom titles, descriptions, and cover image URLs.
- **Track Management:** Add and remove songs with duplicate-entry prevention.
- **Privacy Controls:** Toggle playlist visibility between public and private.
- **Favorites & Play Later:** One-click track bookmarking backed by dedicated library collections.

### 🔐 Authentication & Profile Customization
- **Dual Authentication:** Traditional email/password authentication (bcrypt-hashed) alongside Google OAuth 2.0 / Google Identity Services (GIS).
- **Session Security:** JWT authentication with HTTP-only, SameSite-protected cookies and Bearer token fallback.
- **Profile Customization:** Update display name and upload custom profile avatars backed by Cloudinary with MIME-type and magic-byte security checks.

---

## 🛠️ Architecture & Tech Stack

Vibely follows a decoupled client-server architecture. The frontend communicates with the backend via RESTful HTTP endpoints for persistence and state hydration, alongside a bidirectional WebSocket connection via Socket.IO for synchronized playback, chat, and notification events.

```text
┌────────────────────────────────────────────────────────┐
│               Frontend (React 19 + Vite)               │
│  - React Router v7   - Tailwind CSS v4   - Context API │
└───────────────▲────────────────────────▲───────────────┘
                │ REST API (HTTP)        │ WebSockets (Socket.IO)
                │ (Credentials/JWT)      │ (Handshake Auth)
┌───────────────▼────────────────────────▼───────────────┐
│               Backend (Node.js + Express)              │
│  - Express REST Router   - Socket.IO Gateway Engine    │
│  - Auth & Upload Layers  - In-Memory Room Service      │
└───────────────▲────────────────────────▲───────────────┘
                │ Mongoose               │ Cloudinary API
┌───────────────▼────────┐      ┌────────▼───────────────┐
│   MongoDB Atlas (DB)   │      │ Cloudinary Media CDN   │
└────────────────────────┘      └────────────────────────┘
```

### Stack Breakdown

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19, Vite 8, React Router DOM v7 |
| **Frontend Styling** | Tailwind CSS v4, Lucide React Icons |
| **Backend Runtime** | Node.js (ES Modules), Express v4 |
| **Real-Time Engine** | Socket.IO v4 (server & client) |
| **Database & ODM** | MongoDB Atlas, Mongoose v8 |
| **Authentication** | JWT (`jsonwebtoken`), `bcryptjs`, `cookie-parser`, `google-auth-library` |
| **Media & File Storage** | Cloudinary v2, Multer v2 |
| **Tooling & Quality** | Nodemon, Oxlint |

---

## 🖼️ Visual Assets & Interface

Visual identity assets included in the repository:
- **Application Logo:** `frontend/public/vibely-logo.png`
- **Hero Illustration:** `frontend/src/assets/hero.png`
- **Application Favicon & SVGs:** `frontend/public/favicon.svg`, `frontend/public/icons.svg`

### Application Layout Overview

| View | Primary Purpose | Key Features |
| :--- | :--- | :--- |
| **Home (`/`)** | Discover and stream music | Search bar, genre chips, song catalogue, add-to-playlist modal |
| **Rooms (`/rooms`)** | Collaborative listening hub | Active room browser, 6-character room code joiner, room creator |
| **Room Session (`/rooms/:code`)** | Synchronized listening session | Synchronized audio player, member list, host request queue, live chat |
| **Social (`/social`)** | Community and messaging | User search, friend requests, real-time 1-on-1 private messaging |
| **Library (`/library`)** | Playlist manager | Create playlist modal, custom playlist grid, public/private indicators |
| **Favorites (`/favorites`)** | Saved audio library | Quick-play all favorites, remove track, track duration table |
| **Play Later (`/play-later`)** | Watch later track queue | Quick queue access, track removal, sequential playback |
| **Profile (`/profile`)** | User settings | Avatar image upload (Cloudinary), display name editor, stats |

---

## 📁 Project Directory Structure

```text
Music-Area/
├── backend/
│   ├── scripts/
│   │   └── seedSongs.js              # Idempotent demo music catalogue seeder
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # Mongoose connection with URI credential masking
│   │   ├── controllers/
│   │   │   ├── authController.js     # User registration, login, profile, Google OAuth, avatar
│   │   │   ├── chatController.js     # 1-on-1 direct message history and overview
│   │   │   ├── friendController.js   # User search, friend request operations, unfriend
│   │   │   ├── healthController.js   # API health and database readiness endpoints
│   │   │   ├── playlistController.js # Playlist CRUD and track management
│   │   │   ├── roomController.js     # Active room retrieval and code lookup
│   │   │   ├── roomInviteController.js # Room invitations to friends
│   │   │   └── songController.js     # Catalogue querying, search, favorites, play later
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js     # JWT verification from HTTP-only cookies and Bearer headers
│   │   │   ├── errorHandler.js       # Centralized error handler and 404 response formatter
│   │   │   └── uploadMiddleware.js   # Multer file upload parser with magic-byte validation
│   │   ├── models/
│   │   │   ├── Friendship.js         # Bidirectional friendship model
│   │   │   ├── Message.js            # 1-on-1 direct message schema
│   │   │   ├── Playlist.js           # Playlist schema with track references
│   │   │   ├── RoomInvitation.js     # Room invite tracking schema
│   │   │   ├── Song.js               # Song schema with text search index
│   │   │   ├── User.js               # User schema with bcrypt password hashing
│   │   │   └── index.js              # Model exports
│   │   ├── routes/
│   │   │   ├── authRoutes.js         # /api/auth routes
│   │   │   ├── chatRoutes.js         # /api/chat and /api/messages routes
│   │   │   ├── favoriteRoutes.js     # /api/favorites routes
│   │   │   ├── friendRoutes.js       # /api/friends routes
│   │   │   ├── healthRoutes.js       # /api/health routes
│   │   │   ├── playLaterRoutes.js    # /api/play-later routes
│   │   │   ├── playlistRoutes.js     # /api/playlists routes
│   │   │   ├── roomRoutes.js         # /api/rooms routes
│   │   │   ├── songRoutes.js         # /api/songs routes
│   │   │   └── index.js              # Central API router aggregator
│   │   ├── services/
│   │   │   ├── authService.js        # JWT generation and token verification utilities
│   │   │   ├── cloudinaryService.js  # Profile avatar upload and asset destruction
│   │   │   ├── roomService.js        # In-memory synchronized room state machine
│   │   │   └── index.js              # Service exports
│   │   ├── sockets/
│   │   │   └── socket.js             # Socket.IO connection handler, auth middleware, and events
│   │   ├── app.js                    # Express application configuration and CORS setup
│   │   └── server.js                 # HTTP server bootstrap and port listener
│   ├── tests/
│   │   ├── auth.test.js              # Authentication and session tests
│   │   ├── avatar.test.js            # Profile avatar upload and validation tests
│   │   ├── favoritesAndPlayLater.test.js # Favorites and Play Later collection tests
│   │   ├── googleAuth.test.js        # Google OAuth flow and token tests
│   │   ├── playlist.test.js          # Playlist management tests
│   │   ├── room.test.js              # Real-time room lifecycle and sync tests
│   │   ├── social.test.js            # Friends and direct messaging tests
│   │   └── song.test.js              # Music catalogue and search tests
│   ├── .env.example                  # Backend environment variable template
│   └── package.json                  # Backend dependencies and scripts
├── frontend/
│   ├── public/
│   │   ├── favicon.svg               # Application browser icon
│   │   ├── icons.svg                 # SVG sprite sheet
│   │   └── vibely-logo.png           # Vibely brand logo asset
│   ├── src/
│   │   ├── assets/
│   │   │   ├── hero.png              # Homepage hero illustration
│   │   │   ├── react.svg
│   │   │   └── vite.svg
│   │   ├── components/
│   │   │   ├── AddToPlaylistModal.jsx # Modal to add tracks to existing or new playlists
│   │   │   ├── LoadingScreen.jsx      # Animated loading placeholder
│   │   │   ├── Navbar.jsx             # Main navigation bar with user menu
│   │   │   ├── PlayerBar.jsx          # Bottom persistent HTML5 audio player
│   │   │   └── SongCard.jsx           # Individual song card with artwork and quick actions
│   │   ├── context/
│   │   │   ├── AuthContext.jsx        # Current user authentication and session state
│   │   │   ├── PlayerContext.jsx      # Audio playback state, volume, scrubber, and queue
│   │   │   ├── PlaylistContext.jsx    # User playlist cache and mutation operations
│   │   │   ├── RoomContext.jsx        # Socket.IO connection, room sync, and chat state
│   │   │   └── SongListContext.jsx    # Global catalogue caching
│   │   ├── pages/
│   │   │   ├── Favorites.jsx          # Favorited songs view
│   │   │   ├── Home.jsx               # Main music catalogue, search, and genre filters
│   │   │   ├── Library.jsx            # User playlists gallery
│   │   │   ├── Login.jsx              # User login and Google OAuth portal
│   │   │   ├── PlayLater.jsx          # Queued "play later" songs view
│   │   │   ├── PlaylistDetail.jsx     # Detailed playlist view with track listing
│   │   │   ├── Profile.jsx            # Profile editor and Cloudinary avatar management
│   │   │   ├── Register.jsx           # Account creation form
│   │   │   ├── RoomDetail.jsx         # Live synchronized room session
│   │   │   ├── Rooms.jsx              # Rooms directory and creation interface
│   │   │   ├── Social.jsx             # Friends directory, user search, and private chat
│   │   │   └── SongDetail.jsx         # Individual track details page
│   │   ├── tests/
│   │   │   ├── hostLeavesRoom.test.js # Room teardown and host disconnect tests
│   │   │   ├── player.test.js         # Player formatting and queue logic unit tests
│   │   │   └── roomPlayback.test.js   # Room playback synchronization unit tests
│   │   ├── utils/
│   │   │   └── format.js              # Time formatting helper functions
│   │   ├── App.css                    # Global application styles
│   │   ├── App.jsx                    # Root router and Context provider composition
│   │   ├── index.css                  # Tailwind CSS root stylesheet
│   │   └── main.jsx                   # React DOM application entry point
│   ├── .env.example                  # Frontend environment variable template
│   ├── package.json                  # Frontend dependencies and scripts
│   └── vite.config.js                # Vite build and development configuration
├── README.md                         # Project documentation
└── .gitignore                        # Git ignore patterns
```

---

## 📋 Prerequisites

Before setting up Vibely locally, ensure you have the following installed:

1. **Node.js:** `v18.x` or `v20.x` (LTS recommended).
2. **npm:** `v9.x` or higher (bundled with Node.js).
3. **MongoDB:** A free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster connection URI, or a locally running MongoDB instance (`mongodb://localhost:27017/vibely`).
4. **Google Cloud Console Credentials (Optional for Google OAuth):** An OAuth 2.0 Client ID and Secret configured with authorized redirect URI `http://localhost:5000/api/auth/google/callback` and JavaScript origin `http://localhost:5173`.
5. **Cloudinary Account (Optional for Avatar Uploads):** Cloud Name, API Key, and API Secret from your [Cloudinary Console](https://cloudinary.com/).

---

## ⚙️ Installation & Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Nisarg-Priyadarshi/Vibely.git
cd Vibely
```

### 2. Backend Setup

Open a terminal and navigate to the `backend` directory:

```bash
cd backend
npm install
```

Create your `.env` configuration file by copying the template:

```bash
# On Linux/macOS
cp .env.example .env

# On Windows (PowerShell)
Copy-Item .env.example .env
```

Open `backend/.env` and configure your MongoDB connection string and secrets.

#### Seed Demo Songs

Vibely includes an idempotent seed script to populate your database with initial tracks:

```bash
npm run seed
```

### 3. Frontend Setup

Open a second terminal and navigate to the `frontend` directory:

```bash
cd frontend
npm install
```

Create your `.env` configuration file by copying the template:

```bash
# On Linux/macOS
cp .env.example .env

# On Windows (PowerShell)
Copy-Item .env.example .env
```

Ensure `VITE_API_BASE_URL` points to your backend instance (default: `http://localhost:5000/api`).

---

## 🔐 Environment Configuration

> [!IMPORTANT]
> Never commit actual `.env` files or hardcode production credentials in version control. All secrets should be configured via environment variables.

### Backend (`backend/.env`)

| Variable Name | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `PORT` | No | `5000` | Port number on which the Express server listens. |
| `NODE_ENV` | No | `development` | Runtime environment (`development`, `production`, `test`). |
| `CLIENT_URL` | Yes | `http://localhost:5173` | Allowed frontend origin for CORS and Socket.IO handshakes. |
| `MONGODB_URI` | Yes | `mongodb+srv://<user>:<pwd>@cluster.mongodb.net/vibely` | MongoDB Atlas or local connection string. |
| `DNS_SERVERS` | No | `8.8.8.8,8.8.4.4,1.1.1.1` | Optional custom DNS servers to resolve MongoDB Atlas SRV records. |
| `JWT_SECRET` | Yes | `your_jwt_secret_key_change_in_production` | Cryptographic secret key used to sign and verify JWT tokens. |
| `JWT_EXPIRES_IN` | No | `7d` | Token lifetime (e.g., `7d`, `24h`). |
| `GOOGLE_CLIENT_ID` | Optional | `your_client_id.apps.googleusercontent.com` | Google OAuth 2.0 Web Client ID. |
| `GOOGLE_CLIENT_SECRET` | Optional | `your_google_client_secret` | Google OAuth 2.0 Web Client Secret. |
| `GOOGLE_CALLBACK_URL` | Optional | `http://localhost:5000/api/auth/google/callback` | Server callback URL registered in Google Cloud Console. |
| `CLOUDINARY_CLOUD_NAME` | Optional | `your_cloudinary_cloud_name` | Cloudinary account cloud identifier for avatar storage. |
| `CLOUDINARY_API_KEY` | Optional | `your_cloudinary_api_key` | Cloudinary API access key. |
| `CLOUDINARY_API_SECRET` | Optional | `your_cloudinary_api_secret` | Cloudinary API secret key. |

### Frontend (`frontend/.env`)

| Variable Name | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | Yes | `http://localhost:5000/api` | Base HTTP endpoint for backend REST API requests. |
| `VITE_SOCKET_URL` | Yes | `http://localhost:5000` | Base URL for the Socket.IO WebSocket server. |
| `VITE_GOOGLE_CLIENT_ID` | Optional | `your_client_id.apps.googleusercontent.com` | Google Identity Services client ID for frontend sign-in button. |

---

## 🚀 Running the Application

### Running Locally (Development Mode)

1. **Start the Backend Server:**
   ```bash
   cd backend
   npm run dev
   ```
   *The backend starts with `nodemon` at `http://localhost:5000`.*

2. **Start the Frontend Application:**
   ```bash
   cd frontend
   npm run dev
   ```
   *The Vite development server runs at `http://localhost:5173`.*

3. Open your browser and navigate to `http://localhost:5173`.

### Running in Production Mode

1. **Backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm run build
   npm run preview
   ```

---

## 🧪 Testing & Quality Assurance

Vibely maintains comprehensive automated test suites across both the backend API and frontend client.

### Backend Automated Tests

The backend test suite executes 8 test modules covering authentication, Google OAuth, avatar uploads, social networking, songs, playlists, rooms, and favorites:

```bash
cd backend
npm test
```

Test coverage includes:
- `tests/auth.test.js`: User registration, password hashing, session cookies, `/api/auth/me`, and validation errors.
- `tests/googleAuth.test.js`: Google Identity token exchange and OAuth redirect handling.
- `tests/avatar.test.js`: Multer memory buffer ingestion, magic-byte image validation, Cloudinary mocks, and deletion.
- `tests/social.test.js`: User search, friend request workflows, and friend-restricted messaging.
- `tests/song.test.js`: Text search, genre aggregation, pagination, and track details.
- `tests/playlist.test.js`: Playlist CRUD, track deduplication, and ownership authorization.
- `tests/room.test.js`: Room creation, room code lookups, listener join/leave mechanics, and host controls.
- `tests/favoritesAndPlayLater.test.js`: Track bookmarking, idempotent operations, and removal.

### Frontend Unit & Integration Tests

The frontend test suites validate audio formatting, playback queue operations, synchronized room behavior, and host disconnection handling:

```bash
cd frontend
npm test
```

Test coverage includes:
- `src/tests/player.test.js`: Formatting edge-case assertions (`mm:ss`, bounds, invalid inputs) and queue index wrapping.
- `src/tests/roomPlayback.test.js`: Host pause/play synchronization, avoiding outbound event echo loops, and audio promise rejection handling.
- `src/tests/hostLeavesRoom.test.js`: Host session teardown, listeners playback cutoff, and state cleanup.

### Frontend Linting & Build Verification

```bash
cd frontend

# Code style and quality check via Oxlint
npm run lint

# Production bundle compilation via Vite
npm run build
```

---

## 📡 API Reference

All REST endpoints are rooted at `/api`. Protected routes require a valid JWT issued via HTTP-only cookie or `Authorization: Bearer <token>` header.

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user account. |
| `POST` | `/api/auth/login` | Public | Authenticate user credentials and issue HTTP-only cookie. |
| `POST` | `/api/auth/logout` | Public | Invalidate current session and clear cookie. |
| `GET` | `/api/auth/me` | Protected | Retrieve profile of the currently authenticated user. |
| `PATCH` | `/api/auth/profile` | Protected | Update user profile display name or upload avatar. |
| `POST` | `/api/auth/google` | Public | Exchange Google OAuth ID token for a Vibely session. |
| `GET` | `/api/auth/google` | Public | Initiate Google OAuth redirect. |
| `GET` | `/api/auth/google/callback` | Public | Handle Google OAuth authentication callback. |
| `POST` | `/api/auth/avatar` | Protected | Upload or replace user profile avatar image. |
| `DELETE` | `/api/auth/avatar` | Protected | Remove avatar and revert to default profile icon. |

### Music Catalogue (`/api/songs`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/songs` | Public | Paginated songs listing (`page`, `limit`, `genre`, `q`). |
| `GET` | `/api/songs/search` | Public | Search catalogue by keyword across title, artist, album, and tags. |
| `GET` | `/api/songs/genres` | Public | Retrieve list of all unique song genres. |
| `GET` | `/api/songs/:id` | Public | Retrieve metadata for a single track by ID. |
| `GET` | `/api/songs/favorites/mine` | Protected | Get the authenticated user's favorited songs. |
| `POST` | `/api/songs/:id/favorite` | Protected | Add a track to personal favorites. |
| `DELETE` | `/api/songs/:id/favorite` | Protected | Remove a track from personal favorites. |
| `GET` | `/api/songs/play-later/mine` | Protected | Get the authenticated user's play-later queue. |
| `POST` | `/api/songs/:id/play-later` | Protected | Add a track to play-later collection. |
| `DELETE` | `/api/songs/:id/play-later` | Protected | Remove a track from play-later collection. |

### Playlists (`/api/playlists`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/playlists/mine` | Protected | List all playlists created by the authenticated user. |
| `POST` | `/api/playlists` | Protected | Create a new playlist. |
| `GET` | `/api/playlists/:id` | Protected | Retrieve playlist details with populated song documents. |
| `PATCH` | `/api/playlists/:id` | Protected | Update playlist title, description, or visibility (Owner only). |
| `DELETE` | `/api/playlists/:id` | Protected | Delete a playlist (Owner only). |
| `POST` | `/api/playlists/:id/songs` | Protected | Add a song to a playlist (Owner only, prevents duplicates). |
| `DELETE` | `/api/playlists/:id/songs/:songId` | Protected | Remove a song from a playlist (Owner only). |

### Collaborative Rooms (`/api/rooms`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/rooms` | Protected | List all currently active listening rooms. |
| `GET` | `/api/rooms/:code` | Protected | Look up active room details by 6-character room code. |
| `GET` | `/api/rooms/invitations` | Protected | List pending room invitations sent to the user. |
| `POST` | `/api/rooms/invitations` | Protected | Send an invitation to join a room to an accepted friend. |
| `POST` | `/api/rooms/invitations/:invitationId/respond` | Protected | Accept or decline a room invitation. |

### Social & Friends (`/api/friends`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/friends` | Protected | Retrieve user's accepted friends list. |
| `GET` | `/api/friends/requests` | Protected | List incoming and outgoing pending friend requests. |
| `GET` | `/api/friends/search` | Protected | Search registered users by name or email. |
| `POST` | `/api/friends/requests` | Protected | Send a friend request to another user. |
| `POST` | `/api/friends/requests/:id/accept` | Protected | Accept a pending friend request. |
| `POST` | `/api/friends/requests/:id/reject` | Protected | Reject an incoming friend request. |
| `DELETE` | `/api/friends/requests/:id` | Protected | Cancel an outgoing friend request. |
| `DELETE` | `/api/friends/:friendId` | Protected | Remove an established friendship. |

### Direct Messages (`/api/chat` or `/api/messages`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/chat/conversations` | Protected | Retrieve overview of all active direct conversations. |
| `GET` | `/api/chat/:friendId` | Protected | Retrieve chronological chat history with a friend. |
| `POST` | `/api/chat/:friendId` | Protected | Send a direct message to a friend (Friendship required). |

### System Health (`/api/health`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Basic service liveness check. |
| `GET` | `/api/health/ready` | Public | Readiness check verifying MongoDB connectivity. |

---

## ⚡ Socket.IO Real-Time Events

Real-time interactions are authenticated during the Socket.IO handshake via HTTP-only cookie or auth token.

### Room Events
| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `room:create` | Client → Server | `{ name, description }` | Create a new room and join as host. |
| `room:join` | Client → Server | `{ code }` | Join an existing room with code. |
| `room:leave` | Client → Server | `{ code }` | Leave current room session. |
| `room:host_control` | Client → Server | `{ code, action, payload }` | Host broadcast: `play`, `pause`, `seek`, `change_song`. |
| `room:request_action` | Client → Server | `{ code, action, payload }` | Member request to the host. |
| `room:respond_request` | Client → Server | `{ code, requestId, approved }` | Host response to member request. |
| `room:sync_request` | Client → Server | `{ code }` | Fetch current room state snapshot. |
| `room:chat_send` | Client → Server | `{ code, text }` | Send a live chat message to room members. |
| `room:state_updated` | Server → Client | `{ state, action }` | Broadcast updated playback state to all members. |
| `room:members_updated` | Server → Client | `{ members, hostId }` | Updated active room participant roster. |
| `room:chat_message` | Server → Client | `{ id, user, text, createdAt }` | Inbound live chat message for room feed. |
| `room:closed` | Server → Client | `{ reason, code }` | Emitted to members when room is closed or host leaves. |

### Social & Messaging Events
| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `chat:send` | Client → Server | `{ recipientId, content }` | Send direct message (validated against friendships). |
| `chat:message` | Server → Client | `{ id, sender, recipient, content, createdAt }` | Delivered live to recipient's private user room. |
| `room:invitation_received`| Server → Client | `{ invitationId, roomCode, roomName, sender }` | Real-time notification of room invite. |

---

## 🔒 Security Considerations

Vibely implements robust security practices suitable for enterprise and company submissions:

1. **HTTP-Only Session Cookies:** Authentication JWTs are stored in `httpOnly`, `sameSite: 'lax'` cookies with `secure: true` in production, protecting against Cross-Site Scripting (XSS) token theft.
2. **Password Cryptography:** User passwords are encrypted with `bcryptjs` using salted rounds. Password hashes are excluded from Mongoose queries by default (`select: false`).
3. **Cross-Origin Resource Sharing (CORS):** The backend strictly whitelists the frontend client origin (`CLIENT_URL`) with `credentials: true`.
4. **WebSocket Handshake Authentication:** The Socket.IO server authenticates connections during handshake using verified JWTs before allowing socket connections or room joins.
5. **Server-Side Authorization Checks:** All sensitive operations (playlist modification, room playback controls, direct messaging) perform server-side ownership and friendship validation, preventing unauthorized mutations.
6. **Upload MIME & Magic-Byte Validation:** Avatar uploads are validated in memory using both MIME-type assertions and binary magic-byte inspection to prevent arbitrary code execution before uploading to Cloudinary.
7. **Credential Sanitization in Logs:** Database connection strings are scrubbed of credentials before logging connection statuses to server output.

---

## 👥 Credits & Acknowledgments

- Built and maintained by [Nisarg Priyadarshi](https://github.com/Nisarg-Priyadarshi).
- Music metadata and audio streams configured via open-source audio samples.
- Modern iconography provided by [Lucide Icons](https://lucide.dev/).
- Frameworks & libraries: React 19, Vite, Tailwind CSS v4, Express, Socket.IO, Mongoose, and Cloudinary.

---

*For issues, inquiries, or contributions, please open an issue in the [Vibely repository](https://github.com/Nisarg-Priyadarshi/Vibely).*
