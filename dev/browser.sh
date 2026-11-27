#!/bin/zsh
# Dev only: launches Playwright's Chromium with the unpacked extension and a CDP port for automated checks.
CHR="$(ls -d ~/Library/Caches/ms-playwright/chromium-*/chrome-mac*/*.app/Contents/MacOS/* | tail -1)"
EXT="$(cd "$(dirname $0)/../extension" && pwd)"
exec "$CHR" --user-data-dir="$HOME/.cart-dev-profile" --remote-debugging-port=9333 --load-extension="$EXT" --disable-extensions-except="$EXT" --no-first-run --window-size=1440,900 "$@"
