# Testing Strategy v0.4.2

## Test Pyramid

▲
   / \
  /   \  E2E Tests (Future)
 /─────\
/       \

/         \ Integration Tests (32)
/───────────
/             
/               \ Unit Tests (32)
─────────────────

## Coverage

### Frontend Tests (32)
- **Unit:** Validation, formatters, calculations
- **Integration:** Component rendering, API mocking
- **Coverage:** Utilities + API contracts

### Integration Tests (32)
- **API Contracts:** 8 endpoints tested
- **Workflows:** Settings, Archives, Dashboard
- **Error Handling:** Network, HTTP errors, validation

### E2E Tests (Future - Phase 5)
- Full user workflows
- Multi-step processes
- Production-like scenarios

## Running Tests
```bash
# All tests
npm test

# Specific suite
npm test -- frontend.test.js
npm test -- integration.test.js

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Test Locations
- Frontend: `frontend/src/__tests__/frontend.test.js`
- Integration: `frontend/src/__tests__/integration.test.js`

## Quality Gates
- ✅ All tests must pass before merge
- ✅ No regressions allowed
- ✅ New features must include tests