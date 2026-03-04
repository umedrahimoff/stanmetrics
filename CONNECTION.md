# Подключение к БД

## Vercel: переменные окружения

В Project Settings → Environment Variables добавь:

```
DB_HOST=46.62.224.75
DB_PORT=5432
DB_NAME=stanbase_prod_double
DB_USER=thisisumed
DB_PASSWORD=U84Wht0kTE8fKcG9s6O5
```

Или одной строкой:
```
DATABASE_URL=postgresql://thisisumed:U84Wht0kTE8fKcG9s6O5@46.62.224.75:5432/stanbase_prod_double
```

Если БД требует SSL:
```
DATABASE_URL=postgresql://thisisumed:U84Wht0kTE8fKcG9s6O5@46.62.224.75:5432/stanbase_prod_double?sslmode=require
```

## Сервер БД (46.62.224.75)

Проверь на сервере:

1. **postgresql.conf** — `listen_addresses = '*'` (не только 127.0.0.1)
2. **pg_hba.conf** — добавь строку для внешних подключений:
   ```
   host    stanbase_prod_double    thisisumed    0.0.0.0/0    md5
   ```
3. **Firewall** — порт 5432 открыт для входящих:
   ```bash
   sudo ufw allow 5432/tcp
   sudo ufw reload
   ```

После изменений: `sudo systemctl restart postgresql`
