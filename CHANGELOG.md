# Changelog

## [Unreleased]

### Added
- Display loaded thread as a tree in the sidebar (AriadnaTreeDataProvider).
  - Thread title shown as the root element (expanded).
  - Nodes show caption and source location (path:line) as description.
  - Tree updates automatically when a thread is loaded via `ariadna.loadThread`.
