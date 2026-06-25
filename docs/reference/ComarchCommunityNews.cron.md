# ComarchCommunityNews Cron

This is the operator-ready cron workflow for periodic refresh of the public
`ComarchCommunityNews` KB.

## Wrapper

Use:

- `scripts/cron_refresh_comarch_community_news.sh`

Behavior:

1. validates current OpenSPG cookie
2. refreshes cookie through `openspg_login.mjs` if needed
3. downloads latest public community news snapshot
4. exports CSV staging
5. submits OpenSPG build jobs for project `11` by default

Default environment:

- `OPENSPG_API_BASE=http://10.10.254.42:8887`
- `OPENSPG_PROJECT_ID=11`
- `OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie`
- `OPENSPG_LOGIN_FILE=/etc/erp-kb-openspg-login.env`
- `COMMUNITY_NEWS_MAX_POSTS=200`
- `COMMUNITY_NEWS_FORCE=1`
- `OPENSPG_BUILD=1`

## Cron examples

Edit crontab:

```bash
crontab -e
```

Daily refresh at 05:15:

```cron
15 5 * * * /usr/bin/env bash /docker/openspg/scripts/cron_refresh_comarch_community_news.sh >> /docker/openspg/logs/community_news_refresh.log 2>&1
```

Every 6 hours:

```cron
15 */6 * * * /usr/bin/env bash /docker/openspg/scripts/cron_refresh_comarch_community_news.sh >> /docker/openspg/logs/community_news_refresh.log 2>&1
```

Local-only refresh without OpenSPG build:

```cron
15 4 * * * OPENSPG_BUILD=0 /usr/bin/env bash /docker/openspg/scripts/cron_refresh_comarch_community_news.sh >> /docker/openspg/logs/community_news_refresh_local.log 2>&1
```

## Recommendations

- For public news, daily refresh is usually enough.
- If this KB is used for operational communication, every 6 hours is a sane upper bound.
- Keep logs outside `/tmp` so the failure trail survives reboots.

## Preconditions

The login file must exist and contain:

```text
OPENSPG_LOGIN_ACCOUNT=<login>
OPENSPG_LOGIN_PASSWORD=<password>
```

Suggested setup:

```bash
sudo install -m 600 -o root -g root /dev/null /etc/erp-kb-openspg-login.env
sudoedit /etc/erp-kb-openspg-login.env
```

The first manual smoke test before enabling cron:

```bash
cd /docker/openspg
/usr/bin/env bash scripts/cron_refresh_comarch_community_news.sh
```
