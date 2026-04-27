# 🚀 Proyecto: API REST con Load Balancer (Docker + Node.js + MySQL + Nginx)

Aplicación backend construida con **Node.js + Express**, base de datos **MySQL 8**, y balanceo de carga con **Nginx** — todo orquestado mediante **Docker Compose**.

La arquitectura levanta **3 instancias del backend** y distribuye el tráfico entre ellas usando Nginx como reverse proxy / load balancer.

---

## 📁 Estructura del Proyecto

```
proyecto_local/
├── backend/
│   ├── index.js          # Servidor Express (rutas, JWT, CRUD)
│   ├── db.js             # Conexión y pool a MySQL
│   ├── Dockerfile        # Imagen Docker del backend
│   ├── package.json
│   └── .env              # Variables de entorno (JWT_SECRET)
├── nginx/
│   └── nginx.conf        # Configuración del load balancer
└── docker-compose.yml    # Orquestación de todos los servicios
```

---

## ⚙️ Requisitos Previos

Asegúrate de tener instalados los siguientes programas antes de continuar:

| Herramienta | Versión mínima | Verificar con        |
|-------------|---------------|----------------------|
| Docker      | 20.x o mayor  | `docker --version`   |
| Docker Compose | v2.x       | `docker compose version` |
| Git         | cualquiera    | `git --version`      |

> **Nota:** No necesitas tener Node.js instalado localmente. Todo corre dentro de Docker.

---

## 🛠️ Pasos para levantar el proyecto

### 1. Clonar el repositorio

```bash
git clone https://github.com/brui4n/lab07-dsn
```

### 2. (Opcional) Crear el archivo `.env` en la carpeta `backend/`

El proyecto funciona sin él, pero puedes personalizar el secreto JWT:

```bash
# backend/.env
JWT_SECRET=tu_secreto_personalizado
```

> Si no creas el archivo, el sistema usará el valor por defecto `"secreto123"`.

### 3. Construir y levantar todos los servicios

```bash
docker compose up --build
```

Este comando:
- Construye la imagen Docker del backend (`node:18-alpine`)
- Levanta **3 réplicas** del backend (`backend1`, `backend2`, `backend3`)
- Levanta **MySQL 8** en el puerto `3307`
- Levanta **Nginx** como load balancer en el puerto `80`
- Crea automáticamente la tabla `users` en la base de datos

> La primera vez puede tardar unos minutos mientras descarga las imágenes.

### 4. Verificar que todos los contenedores están corriendo

```bash
docker ps
```

Deberías ver **5 contenedores** activos:

| Nombre                   | Imagen              | Puerto         |
|--------------------------|---------------------|----------------|
| `proyecto_local-nginx-1` | `nginx:latest`      | `0.0.0.0:80`   |
| `backend1`               | `proyecto_local-backend1` | `8080`   |
| `backend2`               | `proyecto_local-backend2` | `8080`   |
| `backend3`               | `proyecto_local-backend3` | `8080`   |
| `mysql_db`               | `mysql:8`           | `0.0.0.0:3307` |

---

## 🌐 Endpoints disponibles

La API es accesible en `http://localhost` (puerto 80 de Nginx).

### Públicos (sin autenticación)

| Método | Ruta        | Descripción                                |
|--------|-------------|--------------------------------------------|
| GET    | `/`         | Ping — muestra el servidor que respondió   |
| POST   | `/register` | Registrar un nuevo usuario                 |
| POST   | `/login`    | Iniciar sesión y obtener token JWT         |

### Protegidos (requieren `Authorization: Bearer <token>`)

| Método | Ruta          | Descripción                     |
|--------|---------------|---------------------------------|
| GET    | `/users`      | Listar todos los usuarios       |
| POST   | `/users`      | Crear un usuario                |
| PUT    | `/users/:id`  | Actualizar un usuario por ID    |
| DELETE | `/users/:id`  | Eliminar un usuario por ID      |

---

## 🧪 Pruebas rápidas con `curl`

### Verificar balanceo de carga

Ejecuta varias veces para ver cómo cambia el servidor que responde:

```bash
curl http://localhost/
```

Respuesta esperada (el `servidor` cambiará entre peticiones):
```json
{ "message": "Servidor funcionando", "servidor": "backend1" }
```

### Registrar un usuario

```bash
curl -X POST http://localhost/register \
  -H "Content-Type: application/json" \
  -d '{"username": "alumno01", "password": "12345"}'
```

### Iniciar sesión y obtener token JWT

```bash
curl -X POST http://localhost/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alumno01", "password": "12345"}'
```

Guarda el `token` de la respuesta para usarlo en las siguientes peticiones.

### Listar usuarios (ruta protegida)

```bash
curl http://localhost/users \
  -H "Authorization: Bearer <TOKEN_AQUI>"
```

---

## 🔍 Verificar el Load Balancer

Para confirmar visualmente que Nginx distribuye las peticiones entre los 3 backends, ejecuta en tu terminal:

```bash
for i in {1..9}; do curl -s http://localhost/ | python3 -m json.tool; done
```

Deberías ver respuestas rotando entre `backend1`, `backend2` y `backend3`.

---

## 📋 Comandos útiles de Docker

```bash
# Ver logs de todos los servicios en tiempo real
docker compose logs -f

# Ver logs solo de un servicio específico
docker compose logs -f backend1

# Detener todos los contenedores (sin eliminar datos)
docker compose stop

# Detener y eliminar contenedores, redes y volúmenes
docker compose down -v

# Reconstruir desde cero (útil si modificas el código)
docker compose down -v
docker compose up --build
```

---

## 🗄️ Conexión directa a MySQL (opcional)

Si necesitas inspeccionar la base de datos directamente:

```bash
docker exec -it mysql_db mysql -u root -proot appdb
```

Dentro de MySQL:
```sql
SHOW TABLES;
SELECT id, username FROM users;
```

---

## 🏗️ Arquitectura

```
Cliente (navegador / curl / Postman)
        │
        ▼
   [Nginx :80]  ◄── load balancer (round-robin)
   /     |     \
  ▼      ▼      ▼
back1  back2  back3   (Node.js + Express :8080 c/u)
  \      |     /
   ▼     ▼    ▼
   [MySQL :3306]  ◄── base de datos compartida
```

---

## 📝 Notas

- La tabla `users` se crea automáticamente al iniciar el backend si no existe.
- El backend reintenta la conexión a MySQL cada 3 segundos hasta que esté disponible.
- El volumen `db_data` persiste los datos de MySQL entre reinicios. Usa `docker compose down -v` para limpiarlo.
