# Database Migrations

This directory contains database migration files for the FeeDLooP project.

## Structure

```
database/
├── migrations/          # SQL migration files
│   ├── 001_create_users.sql
│   ├── 002_create_projects.sql
│   └── ...
└── README.md           # This file
```

## Migration Files

Migration files should follow the naming convention:
`{number}_{description}.sql`

## Current Database Setup

The complete database setup is available in:
`product_documentation/DATABASE_DOCUMENTATION.sql`

This file contains:
- All table definitions
- Enum types
- RLS policies
- Indexes
- Triggers
- Constraints

## Usage

1. Run the complete setup script in Supabase SQL Editor:
   - Execute `product_documentation/DATABASE_DOCUMENTATION.sql`

2. For incremental changes, create new migration files in this directory

## Tables Created

- `fl_users` - User accounts
- `fl_projects` - Project containers
- `fl_project_invitations` - Team access management
- `fl_reports` - Feedback submissions
- `fl_attachments` - File attachments