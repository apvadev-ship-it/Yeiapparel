# Feed real de Instagram y TikTok en el home

Ya están las bases puestas: tablas en Supabase, código que sincroniza,
endpoint para probarlo a mano, tarea programada diaria y los dos
bloques en el home (Instagram a la izquierda, TikTok a la derecha).
Lo único que falta es pegar las credenciales reales. Esta guía es
justo ese "lo único que falta".

## Qué se agregó (para ubicarte)

| Archivo | Qué hace |
|---|---|
| `supabase/migrations/0009_social_feeds.sql` | Tablas `instagram_posts`, `instagram_reels`, `tiktok_posts`, `tiktok_oauth_state`. Lectura pública, escritura solo desde el servidor. |
| `src/lib/instagram-sync.ts` | Llama a la Instagram Graph API y guarda las publicaciones en Supabase. |
| `src/lib/tiktok-sync.ts` | Renueva el token de TikTok y guarda los videos en Supabase. |
| `src/lib/social-sync-endpoint.ts` | `POST /api/social/sync` — dispara ambas sincronizaciones a mano. |
| `src/server.ts` | Corre las dos sincronizaciones automáticamente una vez al día (mismo cron del boletín/catálogo, ver `wrangler.toml`). |
| `src/components/yei/InstagramSection.tsx` / `TikTokSection.tsx` | Leen las tablas de Supabase. Si están vacías, muestran publicaciones de ejemplo — nada se rompe mientras conectas todo esto. |

Aplica la migración antes de seguir (en el SQL Editor de Supabase, pega
el contenido de `0009_social_feeds.sql` y ejecútalo — o con la CLI de
Supabase si ya la usas para las demás migraciones de este proyecto).

---

## Parte 1 · Instagram

Instagram (Meta) solo entrega el feed por API para cuentas
**profesionales** (Business o Creator), y siempre a través de una
página de Facebook vinculada. No hay forma de leer un feed de
Instagram sin este vínculo — es una regla de Meta, no de este código.

### Paso a paso

1. **La cuenta de Instagram debe ser Business o Creator.**
   En la app de Instagram: Configuración → Cuenta → Cambiar a cuenta
   profesional (si ya lo es, sigue al paso 2).

2. **Vincúlala a una página de Facebook.**
   Puede ser una página nueva y vacía, solo para esto — no necesita
   contenido ni seguidores. Desde Instagram: Configuración → Cuenta →
   Compartir en otras apps → Facebook. O desde la propia página de
   Facebook: Configuración → Vinculación con Instagram.

3. **Crea una app en Meta for Developers.**
   Entra a [developers.facebook.com](https://developers.facebook.com/apps) →
   "Crear app" → tipo **Negocios**. Dentro de la app, agrega el
   producto **Instagram Graph API** (no el de "Instagram Basic
   Display", que está descontinuado para feeds de negocio).

4. **Genera un token de acceso con permiso `instagram_basic`.**
   La forma más simple: en el panel de la app, ve a
   **Herramientas → Explorador de la API Graph**, selecciona tu app,
   selecciona la página de Facebook vinculada como "Usuario o Página",
   y marca el permiso `instagram_basic` (y `pages_show_list` si te lo
   pide). Genera el token.

   Ese token de ahí dura ~1 hora. Cámbialo por uno de **larga
   duración** (60 días, y se puede volver a extender antes de que
   caduque) con esta llamada, reemplazando `TOKEN_CORTO`, `APP_ID` y
   `APP_SECRET` (estos dos últimos están en Configuración → Básica de
   la app):

   ```bash
   curl -i -X GET "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=TOKEN_CORTO"
   ```

   La respuesta trae `access_token` — ese es tu `INSTAGRAM_ACCESS_TOKEN`.

   Para no tener que repetir esto cada 60 días: activa el **modo Live**
   de la app (Meta → Panel de la app → cambia de "En desarrollo" a
   "Activo") y usa una cuenta de sistema o programa la renovación; en
   la práctica, para una sola tienda basta con recalendar este paso
   cada dos meses o automatizarlo aparte si crece el volumen.

5. **Consigue el ID de la cuenta de Instagram (no el @usuario).**
   Con el mismo token:

   ```bash
   curl -i -X GET "https://graph.facebook.com/v21.0/me/accounts?access_token=TOKEN_LARGO"
   ```

   Eso da el `id` de tu página de Facebook. Con ese id:

   ```bash
   curl -i -X GET "https://graph.facebook.com/v21.0/ID_DE_LA_PAGINA?fields=instagram_business_account&access_token=TOKEN_LARGO"
   ```

   El número que devuelve en `instagram_business_account.id` es tu
   `INSTAGRAM_BUSINESS_ACCOUNT_ID`.

6. **Pon las dos variables en producción** (Cloudflare) y en tu `.env`
   local:

   ```
   INSTAGRAM_ACCESS_TOKEN=el_token_largo_del_paso_4
   INSTAGRAM_BUSINESS_ACCOUNT_ID=el_id_del_paso_5
   ```

Con eso, Instagram queda listo. No hace falta tocar código.

---

## Parte 2 · TikTok

TikTok es un poco más largo porque usa OAuth completo (no hay un
"generador de token" de un clic como el Explorador de Meta), y el
access token vence cada 24 horas — por eso el código ya trae renovación
automática (`tiktok-sync.ts`), pero necesita un **refresh token
inicial** conseguido una sola vez a mano.

### Paso a paso

1. **Crea una app en TikTok for Developers.**
   Entra a [developers.tiktok.com](https://developers.tiktok.com/) →
   Manage apps → Create an app. Agrega el producto **Login Kit**.
   En "Scopes", activa `user.info.basic` y `video.list`.

   Copia el **Client key** y el **Client secret** — esos son
   `TIKTOK_CLIENT_KEY` y `TIKTOK_CLIENT_SECRET`.

2. **Registra una redirect URI.**
   En la configuración del producto Login Kit, agrega:
   `https://tudominio.com/tiktok-callback` (puede ser cualquier ruta
   de tu sitio; solo se usa una vez, para recibir el `code` del paso
   siguiente — no hace falta que exista de verdad como página).

3. **Autoriza la app con la cuenta @yei.apparel, una sola vez.**
   Abre esta URL en el navegador (reemplaza `CLIENT_KEY` y la
   redirect URI, y usa la misma que registraste):

   ```
   https://www.tiktok.com/v2/auth/authorize/?client_key=CLIENT_KEY&scope=user.info.basic,video.list&response_type=code&redirect_uri=https://tudominio.com/tiktok-callback&state=setup
   ```

   Inicia sesión con la cuenta de TikTok de la marca y autoriza. TikTok
   redirige a tu `redirect_uri` con `?code=...` en la URL — cópialo (no
   hace falta que la página cargue nada, basta con mirar la barra de
   direcciones del navegador).

4. **Cambia ese código por un access token + refresh token:**

   ```bash
   curl -X POST https://open.tiktokapis.com/v2/oauth/token/ \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_key=CLIENT_KEY" \
     -d "client_secret=CLIENT_SECRET" \
     -d "code=EL_CODE_DEL_PASO_3" \
     -d "grant_type=authorization_code" \
     -d "redirect_uri=https://tudominio.com/tiktok-callback"
   ```

   La respuesta trae `refresh_token` (dura ~1 año, y se renueva solo
   cada vez que se usa) y `access_token` (dura 24 horas — no hace
   falta guardarlo, el código lo renueva solo).

5. **Guarda ese refresh token en Supabase, una sola vez.**
   En el SQL Editor de Supabase:

   ```sql
   insert into tiktok_oauth_state (id, access_token, refresh_token, expires_at)
   values ('main', '', 'EL_REFRESH_TOKEN_DEL_PASO_4', now() - interval '1 day')
   on conflict (id) do update set
     refresh_token = excluded.refresh_token,
     expires_at = excluded.expires_at;
   ```

   (El `access_token` se deja vacío y `expires_at` en el pasado a
   propósito: eso fuerza a que la primera sincronización pida uno
   nuevo, en vez de intentar usar uno vacío.)

6. **Pon las dos variables** (`TIKTOK_CLIENT_KEY`,
   `TIKTOK_CLIENT_SECRET`) en producción y en tu `.env` local.

**Nota sobre revisión de la app:** mientras la app de TikTok esté en
modo "Sandbox"/desarrollo, `video.list` solo trae videos de las
cuentas que agregues como "testers" en el panel de TikTok (agrega ahí
la cuenta de la marca). Para que traiga el feed público sin ese límite
hace falta que TikTok apruebe la app (revisión que se pide desde el
mismo panel, tarda unos días) — no bloquea nada de lo de aquí, solo
limita el alcance mientras la app no está aprobada.

---

## Probarlo

Con las variables puestas (en local, en tu `.env`, o ya desplegado),
dispara la sincronización a mano en vez de esperar al cron diario:

```bash
curl -X POST https://tudominio.com/api/social/sync \
  -H "Authorization: Bearer TU_SOCIAL_SYNC_ADMIN_TOKEN"
```

Responde con el resultado de cada red (`instagram`, `tiktok`),
incluyendo el motivo si alguna falló. Si todo salió bien, entra al
home: la grilla de la izquierda (Instagram) y la de la derecha
(TikTok) ya muestran contenido real.

De ahí en adelante no hay que hacer nada más: la tarea programada de
Cloudflare (`wrangler.toml`, sección `[triggers]`) sincroniza ambas
redes una vez al día, sola.
