#!/usr/bin/env bash
set -euo pipefail

if [ "${EAS_BUILD_PLATFORM:-}" != "ios" ]; then
  exit 0
fi

export GEM_HOME="${GEM_HOME:-$HOME/.gem}"
export PATH="$GEM_HOME/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods executable not found; installing CocoaPods for EAS iOS build."
  gem install --user-install cocoapods -v 1.16.2 --no-document
fi

if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods is still unavailable after install. PATH=$PATH"
  exit 1
fi

if [ -n "${EAS_BUILD_WORKINGDIR:-}" ]; then
  EAS_BIN_DIR="$(dirname "$EAS_BUILD_WORKINGDIR")/bin"
  mkdir -p "$EAS_BIN_DIR"
  ln -sf "$(command -v pod)" "$EAS_BIN_DIR/pod"
fi

pod --version
