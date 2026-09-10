# Migration: Workspace Limit untuk Akun Demo

## Perubahan

### Backend

1. **Model User** (`backend/app/models/user.py`)
   - Menambahkan field `is_demo: bool` (default: False)
   - Akun dengan `is_demo=True` dibatasi maksimal 1 workspace
   - Akun regular dibatasi maksimal 3 workspace

2. **Workspaces API** (`backend/app/api/v1/workspaces.py`)
   - `GET /workspaces`: Return `max_workspaces` dinamis (1 atau 3)
   - `POST /workspaces`: Validasi limit berdasarkan `user.is_demo`
   - Error message berbeda untuk demo vs regular account

3. **Auth API** (`backend/app/api/v1/auth.py`)
   - `GET /auth/profile`: Return `max_workspaces` dinamis

4. **Schema** (`backend/app/schemas/auth.py`)
   - `UserResponse`: Menambahkan field `is_demo`

5. **Seed Script** (`backend/scripts/seed_demo_account.py`)
   - User `analyst_pro` otomatis di-set sebagai demo account (`is_demo=True`)

## Cara Apply Migration

### Opsi 1: Jalankan Script Python Migration

```bash
cd backend
python -m scripts.migrate_add_is_demo
```

### Opsi 2: Jalankan SQL Manual

```bash
# SQLite
sqlite3 backend/storage/app.db < backend/migrations/add_is_demo_to_users.sql

# PostgreSQL
psql -d your_database < backend/migrations/add_is_demo_to_users.sql
```

### Opsi 3: Drop & Recreate (Development Only)

```bash
# Hapus database lama
rm backend/storage/app.db

# Jalankan seed untuk create database dengan schema baru
cd backend
python -m scripts.seed_demo_account
```

## Testing

### 1. Test Demo Account (Max 1 Workspace)

```bash
# Login sebagai analyst_pro
# Email: analyst@example.com
# Password: Password123!

# Coba create workspace kedua - harus error:
# "Maksimum 1 workspace untuk akun demo telah tercapai"
```

### 2. Test Regular Account (Max 3 Workspace)

```bash
# Register akun baru atau login dengan akun non-demo

# Buat workspace 1 - berhasil
# Buat workspace 2 - berhasil
# Buat workspace 3 - berhasil
# Buat workspace 4 - error:
# "Maksimum 3 workspace per pengguna telah tercapai"
```

### 3. Verify max_workspaces di Response

```bash
# GET /api/v1/workspaces
# Demo account response: { "max_workspaces": 1 }
# Regular account response: { "max_workspaces": 3 }

# GET /api/v1/auth/profile
# Demo account: stats.max_workspaces = 1
# Regular account: stats.max_workspaces = 3
```

## Rollback

Jika perlu rollback:

```sql
ALTER TABLE users DROP COLUMN is_demo;
```

## Notes

- Akun demo: `analyst_pro` (analyst@example.com)
- Field `is_demo` default = `False` untuk backward compatibility
- Akun yang sudah ada (non-demo) tidak terpengaruh dan tetap dapat create 3 workspace
- Frontend akan otomatis menerima `max_workspaces` dari API response
