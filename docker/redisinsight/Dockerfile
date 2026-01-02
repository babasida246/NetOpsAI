FROM redislabs/redisinsight:latest

# Ensure we run as root to install system packages
USER root

# Install libsecret and gnome-keyring runtime (no build tools to keep image lean)
RUN if command -v apk > /dev/null 2>&1; then \
    apk update && apk add --no-cache libsecret dbus dbus-x11 gnome-keyring && rm -rf /var/cache/apk/*; \
    elif command -v apt-get > /dev/null 2>&1; then \
    apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    libsecret-1-0 dbus-x11 gnome-keyring && \
    rm -rf /var/lib/apt/lists/*; \
    else \
    echo "No supported package manager found; libsecret/gnome-keyring may be missing"; \
    fi

# Copy wrapper entrypoint and make it executable
COPY entrypoint.sh /usr/local/bin/redisinsight-entrypoint.sh
RUN chmod +x /usr/local/bin/redisinsight-entrypoint.sh

# Restore default user if image defines one (most official images expect non-root runtime)
USER 1000

# Use our wrapper as entrypoint so the keyring daemon runs before the app
ENTRYPOINT ["/usr/local/bin/redisinsight-entrypoint.sh"]

