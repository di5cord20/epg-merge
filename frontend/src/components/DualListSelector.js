import React, { useState } from 'react';

/**
 * Dual list selector component
 * Allows users to move items between available and selected lists
 * Features search filtering on both sides
 * 
 * @param {Array} available - List of available items
 * @param {Array} selected - List of selected items
 * @param {function} onSelectionChange - Callback when selection changes
 * @param {string} title - Label for the lists (e.g., "Sources", "Channels")
 * @returns {React.ReactElement} Dual list selector component
 */
export const DualListSelector = ({ 
  available = [], 
  selected = [], 
  onSelectionChange,
  title = "Items"
}) => {
  const [availableSearch, setAvailableSearch] = useState('');
  const [selectedSearch, setSelectedSearch] = useState('');
  
  const filteredAvailable = available
    .filter(item => !selected.includes(item))
    .filter(item => item.toLowerCase().includes(availableSearch.toLowerCase()))
    .sort();
  
  const filteredSelected = selected
    .filter(item => item.toLowerCase().includes(selectedSearch.toLowerCase()))
    .sort();
  
  const moveItem = (item, toSelected) => {
    let newSelected;
    if (toSelected && !selected.includes(item)) {
      newSelected = [...selected, item];
    } else if (!toSelected) {
      newSelected = selected.filter(i => i !== item);
    } else {
      return;
    }
    onSelectionChange(newSelected);
  };
  
  const moveAll = (toSelected) => {
    if (toSelected) {
      const toAdd = available.filter(i => !selected.includes(i));
      onSelectionChange([...selected, ...toAdd]);
    } else {
      onSelectionChange([]);
    }
  };
  
  return (
    <div className="dual-list">
      <div className="list-container">
        <div className="list-header">
          Available {title} ({filteredAvailable.length})
        </div>
        <input
          type="text"
          className="input-field list-search"
          placeholder="Search..."
          value={availableSearch}
          onChange={(e) => setAvailableSearch(e.target.value)}
        />
        <div className="list-items">
          {filteredAvailable.length === 0 && available.length === 0 ? (
            <div className="empty-state">No items available</div>
          ) : (
            filteredAvailable.map(item => (
              <div
                key={item}
                className="list-item"
                onClick={() => moveItem(item, true)}
              >
                {item}
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="move-buttons">
        <button 
          className="btn btn-primary move-btn" 
          onClick={() => moveAll(true)}
        >
          ⇒⇒
        </button>
        <button 
          className="btn btn-primary move-btn" 
          onClick={() => moveAll(false)}
        >
          ⇐⇐
        </button>
      </div>
      
      <div className="list-container">
        <div className="list-header">
          Selected {title} ({filteredSelected.length})
        </div>
        <input
          type="text"
          className="input-field list-search"
          placeholder="Search..."
          value={selectedSearch}
          onChange={(e) => setSelectedSearch(e.target.value)}
        />
        <div className="list-items">
          {filteredSelected.length === 0 ? (
            <div className="empty-state">No items selected</div>
          ) : (
            filteredSelected.map(item => (
              <div
                key={item}
                className="list-item selected"
                onClick={() => moveItem(item, false)}
              >
                {item}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};