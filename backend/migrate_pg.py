import sys
from app.database.session import engine
from sqlalchemy import text, inspect

def run_migration():
    print("Connecting to PostgreSQL...")
    with engine.begin() as conn:
        # Check pg enums
        res = conn.execute(text("SELECT typname FROM pg_type WHERE typtype = 'e';"))
        enums = [r[0] for r in res.fetchall()]
        print("Existing Postgres Enum Types:", enums)

        # 1. users.phone_number
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(30);"))
        print("Migrated: users.phone_number")

        # 2. clubs.status
        # If clubstatus enum doesn't exist, create it or use VARCHAR
        if 'clubstatus' not in enums:
            try:
                conn.execute(text("CREATE TYPE clubstatus AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');"))
                print("Created type clubstatus")
            except Exception as e:
                print("Type clubstatus note:", e)
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clubs' AND column_name='status') THEN
                    ALTER TABLE clubs ADD COLUMN status clubstatus NOT NULL DEFAULT 'ACTIVE';
                END IF;
            END $$;
        """))
        print("Migrated: clubs.status")

        # 3. club_memberships.status
        if 'membershipstatus' not in enums:
            try:
                conn.execute(text("CREATE TYPE membershipstatus AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');"))
                print("Created type membershipstatus")
            except Exception as e:
                print("Type membershipstatus note:", e)
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='club_memberships' AND column_name='status') THEN
                    ALTER TABLE club_memberships ADD COLUMN status membershipstatus NOT NULL DEFAULT 'ACTIVE';
                END IF;
            END $$;
        """))
        print("Migrated: club_memberships.status")

        # 4. events.min_volunteers_required & skill_requirements
        conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS min_volunteers_required INTEGER NOT NULL DEFAULT 1;"))
        conn.execute(text("ALTER TABLE events ADD COLUMN IF NOT EXISTS skill_requirements JSON NOT NULL DEFAULT '[]'::json;"))
        print("Migrated: events.min_volunteers_required, events.skill_requirements")

        # 5. tasks columns
        if 'taskcreatedsource' not in enums:
            try:
                conn.execute(text("CREATE TYPE taskcreatedsource AS ENUM ('MANUAL', 'AI_GENERATED', 'SYSTEM');"))
                print("Created type taskcreatedsource")
            except Exception as e:
                print("Type taskcreatedsource note:", e)

        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='created_source') THEN
                    ALTER TABLE tasks ADD COLUMN created_source taskcreatedsource NOT NULL DEFAULT 'MANUAL';
                END IF;
            END $$;
        """))
        conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS required_skill_id VARCHAR(36);"))
        conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id VARCHAR(36);"))
        conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_datetime TIMESTAMP WITHOUT TIME ZONE;"))
        print("Migrated: tasks columns")

    print("\nVerifying all models against PostgreSQL schema...")
    from app.database.session import Base
    import app.models
    insp = inspect(engine)
    missing = {}
    for table_name, table in Base.metadata.tables.items():
        if not insp.has_table(table_name):
            missing[table_name] = 'TABLE_MISSING'
            continue
        db_cols = {c['name'] for c in insp.get_columns(table_name)}
        model_cols = {c.name for c in table.columns}
        diff = model_cols - db_cols
        if diff:
            missing[table_name] = diff
    print("Remaining Missing Columns:", missing)
    if not missing:
        print("SUCCESS! Database schema is 100% in sync with SQLAlchemy models!")

if __name__ == "__main__":
    run_migration()
