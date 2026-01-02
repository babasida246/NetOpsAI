#!/bin/sh
# Wrapper entrypoint: start a session secret service (gnome-keyring) for keytar
set -e

# Try to start gnome-keyring-daemon for secrets and export DBUS env
if command -v gnome-keyring-daemon >/dev/null 2>&1; then
  eval "$(gnome-keyring-daemon --start --components=secrets 2>/dev/null || true)"
  export DBUS_SESSION_BUS_ADDRESS
fi

# If dbus-launch available, ensure a session bus exists (fallback)
if [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ] && command -v dbus-launch >/dev/null 2>&1; then
  eval "$(dbus-launch --sh-syntax)"
  export DBUS_SESSION_BUS_ADDRESS
fi

# Give gnome-keyring and DBUS a moment to initialize
echo "Starting keyring services..."
sleep 2
if ps aux | grep -q gnome-keyring-daemon && [ -n "${DBUS_SESSION_BUS_ADDRESS:-}" ]; then
  echo "Keyring daemon running."
else
  echo "Warning: keyring daemon may not be available; some features may be limited."
fi

# Exec the original RedisInsight entrypoint with the original image's command
# The upstream image Entrypoint is: ./docker-entry.sh node redisinsight/api/dist/src/main
if [ -x /usr/src/app/docker-entry.sh ]; then
  exec /usr/src/app/docker-entry.sh node redisinsight/api/dist/src/main "$@"
else
  exec node redisinsight/api/dist/src/main "$@"
fi
