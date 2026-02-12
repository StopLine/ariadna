# node-relative-insert Specification

## Purpose
TBD - created by archiving change refactor-insert-node-commands. Update Purpose after archive.
## Requirements
### Requirement: Relative Node Insertion

The system SHALL provide a function to insert a new node relative to an existing node with a given offset.

#### Scenario: Insert with offset 0 (before)
- **WHEN** вызывается `insertNodeRelative(node, 0)`
- **THEN** новый узел вставляется в позицию существующего узла (сдвигая его вправо)
- **AND** новый узел имеет того же родителя, что и целевой узел

#### Scenario: Insert with offset 1 (after)
- **WHEN** вызывается `insertNodeRelative(node, 1)`
- **THEN** новый узел вставляется сразу после существующего узла
- **AND** новый узел имеет того же родителя, что и целевой узел

#### Scenario: No thread loaded
- **WHEN** вызывается `insertNodeRelative()` когда `currentThread` равен null
- **THEN** функция возвращается без изменений (early return)

#### Scenario: Node not found in tree
- **WHEN** вызывается `insertNodeRelative()` для узла, который не найден в дереве
- **THEN** функция возвращается без изменений (early return)

