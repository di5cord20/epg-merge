# Code Design Patterns

## Component Architecture

### Sub-Component Pattern
```javascript
// All settings sub-components follow this pattern
export const SettingsXXX = ({
  settings,              // Current config (read-only)
  onSettingChange,       // Update handler
  validationErrors,      // Validation results
  savedPanel,           // Which panel just saved
  onSave               // Trigger save for panel
}) => {
  // Component implementation
};
```

### Orchestrator Pattern
- Main page manages state
- Sub-components receive props only
- No localStorage in sub-components
- All state flows downward
- Changes flow upward via callbacks

## Styling

- **All inline styles** - No CSS imports in components
- **Consistent palette** - Colors defined in App.css
- **Reusable objects** - panelContainerStyle, sectionStyle, buttonStyle
- **Dark mode only** - No light theme support

## Testing Strategy

- **Frontend tests:** Utilities + validation
- **Integration tests:** API contracts + workflows
- **No E2E tests yet** - Consider for Phase 5

## Error Handling

- All components receive `validationErrors` object
- Validation happens in orchestrator
- Sub-components display errors in real-time