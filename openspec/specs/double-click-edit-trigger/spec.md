## ADDED Requirements

### Requirement: Double-Click Edit Trigger

The system SHALL trigger edit dialogs for caption and comments fields in Node Details panel only when the user double-clicks on the field.

#### Scenario: Double-click on caption field
- **WHEN** user double-clicks on the "caption" field in Node Details panel
- **THEN** system opens the caption edit dialog
- **AND** the current caption value is pre-filled in the input box

#### Scenario: Double-click on comment field
- **WHEN** user double-clicks on a comment item in Node Details panel
- **THEN** system opens the comment edit dialog for that specific comment
- **AND** the current comment text is pre-filled in the input box

#### Scenario: Single-click on caption field
- **WHEN** user single-clicks on the "caption" field in Node Details panel
- **THEN** the field is selected/highlighted in the tree view
- **AND** no edit dialog is opened

#### Scenario: Single-click on comment field
- **WHEN** user single-clicks on a comment item in Node Details panel
- **THEN** the comment item is selected/highlighted in the tree view
- **AND** no edit dialog is opened

#### Scenario: Double-click timing threshold
- **WHEN** user clicks the same field twice with more than 300ms between clicks
- **THEN** the system treats this as two separate single-clicks
- **AND** no edit dialog is opened

#### Scenario: Double-click on different fields
- **WHEN** user clicks one field and then clicks a different field within 300ms
- **THEN** the system treats this as two separate single-clicks on different items
- **AND** no edit dialog is opened
