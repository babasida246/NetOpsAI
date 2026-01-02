import sqlite3
conn=sqlite3.connect('/var/lib/pgadmin/pgadmin4.db')
cur=conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
print('tables:', cur.fetchall())
for t in ['servergroup','server','sharedserver','user']:
    try:
        cur.execute(f"SELECT * FROM {t} LIMIT 20")
        print('\nTABLE',t,':')
        cols = [d[0] for d in cur.description]
        print('COLUMNS:', cols)
        rows = cur.fetchall()
        for row in rows:
            print(row)
        if not rows:
            print('(no rows)')
    except Exception as e:
        print('no table',t,e)
conn.close()
