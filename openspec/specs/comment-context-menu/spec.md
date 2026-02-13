## ADDED Requirements

### Requirement: Add comment from comments group
The system SHALL provide an "Add" context menu item on the "comments" group element in the detail panel. Activating this command SHALL open an InputBox for entering comment text and append the new comment to the end of the current node's `comments` array.

#### Scenario: Add comment to empty list
- **WHEN** user right-clicks the "comments" group element that shows "(empty)" and selects "Add"
- **THEN** an InputBox appears with placeholder text
- **AND** after entering text and confirming, the comment is appended to `comments[]`
- **AND** the detail panel refreshes showing the new comment

#### Scenario: Add comment to existing list
- **WHEN** user right-clicks the "comments" group element that has children and selects "Add"
- **THEN** an InputBox appears, and after confirmation the comment is appended at the end of `comments[]`

#### Scenario: Cancel add
- **WHEN** user opens the InputBox and presses Escape
- **THEN** no comment is added and the list remains unchanged

### Requirement: Add comment after selected comment
The system SHALL provide an "Add After" context menu item on each comment element in the detail panel. Activating this command SHALL insert a new comment immediately after the selected comment's position in the `comments` array.

#### Scenario: Add after middle comment
- **WHEN** user right-clicks comment at index 1 (of 3 comments) and selects "Add After"
- **THEN** an InputBox appears, and after confirmation the new comment is inserted at index 2
- **AND** the detail panel refreshes with updated indices

### Requirement: Add comment before selected comment
The system SHALL provide an "Add Before" context menu item on each comment element in the detail panel. Activating this command SHALL insert a new comment immediately before the selected comment's position in the `comments` array.

#### Scenario: Add before first comment
- **WHEN** user right-clicks comment at index 0 and selects "Add Before"
- **THEN** an InputBox appears, and after confirmation the new comment is inserted at index 0
- **AND** the previously first comment moves to index 1

### Requirement: Delete comment
The system SHALL provide a "Delete" context menu item on each comment element in the detail panel. Activating this command SHALL remove the selected comment from the `comments` array without confirmation dialog.

#### Scenario: Delete single comment
- **WHEN** user right-clicks the only comment and selects "Delete"
- **THEN** the comment is removed and the detail panel shows "comments: (empty)"

#### Scenario: Delete comment from middle
- **WHEN** user right-clicks comment at index 1 (of 3) and selects "Delete"
- **THEN** the comment is removed and remaining comments are re-indexed

### Requirement: Comment text validation
The system SHALL validate comment text entered via InputBox. Empty input or input exceeding 255 characters SHALL be rejected with a validation message.

#### Scenario: Empty input rejected
- **WHEN** user submits an empty string in the InputBox
- **THEN** a validation message is shown and input is not accepted

#### Scenario: Overlong input rejected
- **WHEN** user types more than 255 characters
- **THEN** a validation message is shown and input is not accepted

### Requirement: Context menu grouping
The system SHALL group context menu items as follows: "Add Before" and "Add After" in group `1_add`, "Delete" in group `2_delete`. The "Add" item on the comments group SHALL be in group `1_add`.

#### Scenario: Menu groups display with separator
- **WHEN** user right-clicks a comment item
- **THEN** "Add Before" and "Add After" appear in one group, separated from "Delete" by a visual divider

### Requirement: contextValue assignment
The system SHALL assign `contextValue = 'commentItem'` to each comment tree item and `contextValue = 'commentsGroup'` to the "comments" parent tree item in the detail panel.

#### Scenario: Context values control menu visibility
- **WHEN** a comment item has `contextValue = 'commentItem'`
- **THEN** only comment-specific menu items (Add Before, Add After, Delete) appear
- **AND** when the comments group has `contextValue = 'commentsGroup'`
- **THEN** only the "Add" menu item appears
