from app.database.connection import engine
from sqlalchemy import text

with engine.begin() as conn:
    v = conn.execute(text('select version_num from alembic_version')).scalar()
    print('alembic_version =', v)
    cnt = conn.execute(text("SELECT count(*) FROM information_schema.columns WHERE table_name='users' AND column_name='worker_type'"))
    print('users.worker_type exists:', bool(list(cnt)[0][0]))
