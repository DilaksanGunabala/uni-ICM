from app.database import engine
from sqlalchemy import text

conn = engine.connect()
result = conn.execute(text('SELECT email, first_name, last_name, is_active FROM users LIMIT 10'))
print('Users in database:')
for row in result:
    print(f'  - {row.email}: {row.first_name} {row.last_name} (active: {row.is_active})')
conn.close()
