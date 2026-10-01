#!/usr/bin/env bash
# Version helpers shared by the CI workflows. Source it, then call:
#   latest_release        -> 0.2.0   (newest vX.Y.Z tag, empty if none)
#   next_version <bump>   -> 0.2.1   (bump = patch | minor | major)
#   version_code 1.2.3    -> 10203   (Android versionCode)
#
# Releases are numbered from git tags, so nothing has to be committed back to
# main. package.json only sets the starting point: if its version is ahead of
# the next computed one (e.g. you set 1.0.0 for a big launch), it wins.

latest_release() {
  git tag -l 'v*' --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -n1 | sed 's/^v//' || true
}

package_version() {
  node -p "require('./package.json').version"
}

# Largest of two versions (semver core only).
max_version() {
  printf '%s\n%s\n' "$1" "$2" | sort -V | tail -n1
}

next_version() {
  local bump="${1:-patch}" latest pkg next major minor patch
  latest="$(latest_release)"
  pkg="$(package_version)"
  if [ -z "$latest" ]; then
    echo "$pkg"
    return
  fi
  IFS=. read -r major minor patch <<< "$latest"
  case "$bump" in
    major) next="$((major + 1)).0.0" ;;
    minor) next="$major.$((minor + 1)).0" ;;
    *) next="$major.$minor.$((patch + 1))" ;;
  esac
  max_version "$next" "$pkg"
}

version_code() {
  local core="${1%%-*}" major minor patch
  IFS=. read -r major minor patch <<< "$core"
  echo $((major * 10000 + minor * 100 + patch))
}
