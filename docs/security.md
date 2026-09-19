# Security Architecture & Policies

## Principles
1. **Deny-by-Default Access Control**: Every endpoint requires explicit authentication and role authorization unless marked public (e.g., login, health).
2. **Stateless JWT Tokens**: Signed using HMAC-SHA256 with strong entropy secrets and configurable expiration.
3. **Separation of Duties**:
   - AI generates structured recommendations.
   - Backend enforces schema validation, tenant ownership, and permissions.
   - Authorized human actors trigger state-changing mutations.
4. **Immutable Audit Logs**:
   - Records actor ID, timestamp, entity type, action verb, and execution result.
