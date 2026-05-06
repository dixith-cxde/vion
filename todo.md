
## 1. OBJECTIVE

Implement a relationship-driven mention system where tagging a user inside a document creates a relationship and a notification, and removing the tag removes both consistently through backend-controlled logic.

---

## 2. PHASE 1: DATA FOUNDATION

### 2.1 Extend relationships table usage

Define a strict relationship type:

* `MENTIONS`
* Source: `DOCUMENT`
* Target: `USER`

This becomes the single source of truth for mentions.

---

### 2.2 Create notifications table

Add a dedicated table:

```
notifications
- id
- type (MENTION)
- source_entity_type (DOCUMENT)
- source_entity_id
- target_user_id
- relationship_id
- is_read
- is_active
- created_at
```

This ensures every notification is tied to a relationship.

---

## 3. PHASE 2: DOCUMENT MENTION EXTRACTION

### 3.1 Mention parsing logic (backend)

From document JSON:

* Traverse content
* Extract:

  ```
  {
    entityType: "USER",
    entityId: "..."
  }
  ```

Store as:

```
Set<userId>
```

---

### 3.2 Persist previous mentions

You must always have:

* Previous mentions (from DB or cached)
* New mentions (from incoming document)

---

## 4. PHASE 3: DIFF ENGINE (CRITICAL)

### 4.1 Compute difference

```
addedMentions = newMentions - oldMentions
removedMentions = oldMentions - newMentions
```

---

### 4.2 This diff drives everything

* No frontend events
* No manual flags

Only this diff decides:

* What to create
* What to delete

---

## 5. PHASE 4: RELATIONSHIP SYNC

### 5.1 For added mentions

For each user:

* Create relationship:

  ```
  DOCUMENT → USER (MENTIONS)
  ```

---

### 5.2 For removed mentions

For each user:

* Delete relationship:

  ```
  DOCUMENT → USER (MENTIONS)
  ```

---

## 6. PHASE 5: NOTIFICATION ENGINE

### 6.1 On relationship creation

* Create notification:

  ```
  type: MENTION
  relationship_id: <created relationship>
  target_user_id: <mentioned user>
  ```

---

### 6.2 On relationship deletion

* Find notification using:

  ```
  relationship_id
  ```
* Mark:

  ```
  is_active = false
  ```

---

## 7. PHASE 6: API LAYER

### 7.1 Document update endpoint

```
PATCH /documents/:id
```

Flow:

1. Receive new JSON
2. Extract mentions
3. Fetch existing mentions
4. Compute diff
5. Sync relationships
6. Sync notifications
7. Save document

---

### 7.2 Notifications API

```
GET /notifications
PATCH /notifications/:id/read
```

---

## 8. PHASE 7: REAL-TIME LAYER

### 8.1 On notification create

Emit:

```
notification:new
```

---

### 8.2 On notification removal

Emit:

```
notification:remove
```

---

## 9. PHASE 8: FRONTEND INTEGRATION

### 9.1 Editor

* Insert mention node
* No responsibility for notifications

---

### 9.2 Notification UI

* Badge count
* Dropdown list
* Click → open document + highlight mention

---

## 10. PHASE 9: PERMISSION CONTROL

Before creating relationship:

* Check if user has access to document

If not:

* Either reject mention
* Or auto-grant access

---

## 11. PHASE 10: EDGE CASE HANDLING

### 11.1 Duplicate mentions

* Only one relationship per user per document

---

### 11.2 Re-mention

* Remove → delete notification
* Add again → create new notification

---

### 11.3 Concurrent edits

* Always recompute from latest stored version
* Do not rely on stale frontend state

---

## 12. PHASE 11: SYSTEM INTEGRATION

### 12.1 Activity log

Log:

* Mention added
* Mention removed

---

### 12.2 Graph system

Expose:

```
DOCUMENT → USER (MENTIONS)
```

---

### 12.3 Side panel

Show:

* Mentioned users in current document

---

## 13. EXECUTION ORDER (STRICT)

1. Notifications table
2. Mention extraction logic
3. Diff engine
4. Relationship sync
5. Notification sync
6. Document update API integration
7. Real-time events
8. UI integration
9. Edge case handling
10. Graph + side panel integration

---

Next step:

Design the exact backend service layer:

* `extractMentions()`
* `computeMentionDiff()`
* `syncMentionRelationships()`
* `syncMentionNotifications()`

That is where most implementation mistakes happen.
