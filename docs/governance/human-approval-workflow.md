# Human Approval Workflow

High-risk write tools require human approval unless an explicit production policy allows narrowly scoped automation.

## Default Rule

Write actions default to denied or `approval_required`.

## Flow

1. Gateway receives write tool invocation.
2. Auth, RBAC, project access, connector access, and tool permission are checked.
3. Policy marks action as `approval_required`.
4. Runtime audit event is written.
5. Human approver reviews request context.
6. Approved execution is resumed or retried with approval evidence.
7. Final execution is audited.

## Examples

- jira.create_issue: approval_required
- jira.add_comment: approval_required
- jira.transition_issue: approval_required
- servicenow.create_incident: approval_required
- servicenow.update_incident: approval_required

