# Travel Manager

[![CI](https://github.com/rknall/travelmanager/actions/workflows/ci.yml/badge.svg)](https://github.com/rknall/travelmanager/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/rknall/travelmanager)](https://github.com/rknall/travelmanager/releases/latest)
[![License](https://img.shields.io/badge/license-GPL--2.0--only-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ghcr.io-blue)](https://github.com/rknall/travelmanager/pkgs/container/travelmanager)

A self-hosted web application for managing business trips, expenses, and travel documentation with powerful integrations.

## What is Travel Manager?

Travel Manager is a comprehensive solution for organizing business travel from start to finish. Whether you're managing trips for yourself or a team, Travel Manager helps you:

- **Plan Events**: Track business trips with dates, locations, and companies
- **Manage Expenses**: Record and categorize all trip-related expenses
- **Store Documents**: Integrate with Paperless-ngx to automatically link receipts and invoices
- **Organize Photos**: Connect to Immich to display event photos based on location and date
- **Generate Reports**: Create detailed Excel expense reports with attachments
- **Share Results**: Email reports directly to finance teams or clients

Perfect for consultants, sales teams, field engineers, or anyone who travels frequently for work.

## ✨ Key Features

### Event Management
- Create events for business trips with dates and locations
- Beautiful cover images from Unsplash or your Immich photo library
- Location autocomplete with city, country, and coordinates
- Breadcrumb navigation and timeline views

### Expense Tracking
- Record expenses with categories, payment types, and currencies
- Link expenses to Paperless documents automatically
- Side-by-side document preview when creating expenses
- Excel report generation with all receipts bundled in ZIP

### Integrations
- **Paperless-ngx**: Automatic document retrieval and storage
- **Immich**: Display event photos based on location and time
- **Unsplash**: Professional cover images for events
- **SMTP**: Email reports directly from the application

### User Experience
- First-run setup wizard for easy onboarding
- Regional settings with browser auto-detection
- Customizable email templates
- Backup and restore functionality
- Dark-themed sidebar with breadcrumb navigation

## 🚀 Quick Start

### First-Time Setup

The easiest way to get started is with Docker:

1. **Generate a secret key:**
   ```bash
   echo "SECRET_KEY=$(python -c 'import secrets; print(secrets.token_urlsafe(32))')" > .env
   ```

2. **Start the application:**
   ```bash
   docker run -d \
     --name travel-manager \
     -p 8000:8000 \
     -v $(pwd)/data:/app/data \
     --env-file .env \
     ghcr.io/rknall/travelmanager:latest
   ```

3. **Open your browser:**

   Navigate to http://localhost:8000

   You'll see a setup wizard to create your admin account.

4. **Create your first company:**

   After logging in, go to Settings → Companies and add at least one company (your employer or client).

5. **Create your first event:**

   Now you can create events and start tracking expenses!

### Docker Compose (Recommended)

For a more permanent setup, use Docker Compose:

1. **Create a `docker-compose.yml` file:**
   ```yaml
   services:
     travel-manager:
       image: ghcr.io/rknall/travelmanager:latest
       container_name: travel-manager
       ports:
         - "8000:8000"
       volumes:
         - ./data:/app/data
       environment:
         - SECRET_KEY=${SECRET_KEY}
       restart: unless-stopped
   ```

2. **Create `.env` file:**
   ```bash
   echo "SECRET_KEY=$(python -c 'import secrets; print(secrets.token_urlsafe(32))')" > .env
   ```

3. **Start:**
   ```bash
   docker compose up -d
   ```

### Optional: Configure Integrations

After initial setup, you can connect external services in **Settings → Integrations**:

- **Paperless-ngx**: Link your document management system for automatic expense receipts
- **Immich**: Connect your photo server to display event photos
- **Unsplash**: Enable cover image search (requires free API key)
- **SMTP**: Configure email for sending expense reports

## 📸 Screenshots

*Coming soon: Screenshots of the dashboard, event detail page, and expense tracking.*

## 🛠️ Development

### Local Development (without Docker)

**Backend:**
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn src.main:app --reload
```

**Frontend (separate terminal):**
```bash
cd frontend
npm install
npm run dev
```

Access at http://localhost:5173 (frontend) and http://localhost:8000 (backend)

### Docker Development

```bash
# Set secret key
export SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")

# Build and run
docker compose up --build
```

Access at http://localhost:8000

## 📦 Deployment

### Production with Docker

The application is available as a multi-architecture Docker image supporting `linux/amd64` and `linux/arm64`.

**Pull the latest release:**
```bash
docker pull ghcr.io/rknall/travelmanager:v0.2.0
```

**Or use `latest` tag:**
```bash
docker pull ghcr.io/rknall/travelmanager:latest
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | ✅ Yes | - | Encryption key (min 32 chars) |
| `DATABASE_URL` | ❌ No | SQLite | Database connection string |

> **Note**: Only `SECRET_KEY` is required. All other configuration (integrations, SMTP, etc.) is managed through the web UI.

### Using PostgreSQL (Optional)

For production use with PostgreSQL:

```bash
docker compose -f docker-compose.prod.yml up -d
```

Update `.env` to include:
```
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:password@postgres:5432/travelmanager
```

## 💾 Backup & Restore

### Create Backup

**From running container:**
```bash
./scripts/docker-backup.sh travel-manager ./backups
```

**Or via UI:**

Go to Settings → Backup/Restore and click "Download Backup"

### Restore Backup

```bash
./scripts/restore.sh ./backups/travel_manager_backup_YYYYMMDD_HHMMSS.tar.gz
```

Backups include:
- SQLite database
- User avatars
- All configuration

## 🗄️ Database Management

### Automatic Migrations

Database migrations run automatically on container startup. No manual intervention needed!

### Reset Database

**Development (SQLite):**
```bash
rm -f data/travel_manager.db
source .venv/bin/activate
alembic upgrade head
```

**Docker:**
```bash
docker compose down
rm -rf data/
docker compose up
```

After reset, visit the application to run through the setup wizard again.

## 📚 Documentation

- [Release Notes](RELEASENOTES.md) - Full changelog
- [Development Guide](CLAUDE.md) - Architecture and development instructions

## 🐛 Issues & Support

Found a bug or have a feature request? Please [open an issue](https://github.com/rknall/travelmanager/issues/new).

## 📄 License

This project is licensed under the **GNU General Public License v2.0 only (GPL-2.0-only)**.

See [LICENSE](LICENSE) for the full license text.

```
SPDX-License-Identifier: GPL-2.0-only
```

---

**Made with ❤️ for business travelers**
