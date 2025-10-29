import React from 'react';

/**
 * ArchivesLegend Component - v0.4.2
 * Displays archives guide, file status, column explanations, and urgency indicators
 */
export const ArchivesLegend = () => {
  const sectionStyle = {
    marginBottom: '25px'
  };

  const labelStyle = {
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const containerStyle = {
    display: 'flex',
    gap: '30px',
    flexWrap: 'wrap'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px'
  };

  const itemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    color: '#cbd5e1'
  };

  const actionGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px'
  };

  return (
    <div>
      {/* File Status Section */}
      <div style={sectionStyle}>
        <div style={labelStyle}>File Status</div>
        <div style={containerStyle}>
          <div style={itemStyle}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                background: '#10b981',
                borderRadius: '50%',
                flexShrink: 0
              }}
            />
            <div>
              <strong style={{ color: '#86efac' }}>Current</strong>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Live merged file being used by the system
              </div>
            </div>
          </div>
          <div style={itemStyle}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>📦</span>
            <div>
              <strong style={{ color: '#cbd5e1' }}>Archive</strong>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Historical version (read-only, can be deleted)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Columns Section */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Table Columns</div>
        <div style={gridStyle}>
          <div>
            <strong style={{ color: '#60a5fa', fontSize: '13px' }}>Filename</strong>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              File name with creation timestamp
            </div>
          </div>
          <div>
            <strong style={{ color: '#60a5fa', fontSize: '13px' }}>Created</strong>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Date and time file was created
            </div>
          </div>
          <div>
            <strong style={{ color: '#60a5fa', fontSize: '13px' }}>Size</strong>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Compressed file size in MB
            </div>
          </div>
          <div>
            <strong style={{ color: '#60a5fa', fontSize: '13px' }}>Channels</strong>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Number of TV channels included
            </div>
          </div>
          <div>
            <strong style={{ color: '#60a5fa', fontSize: '13px' }}>Programs</strong>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Total program listings in file
            </div>
          </div>
          <div>
            <strong style={{ color: '#60a5fa', fontSize: '13px' }}>Days Included</strong>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Timeframe (3, 7, or 14 days)
            </div>
          </div>
          <div>
            <strong style={{ color: '#60a5fa', fontSize: '13px' }}>Days Left</strong>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Remaining days of programming data
            </div>
          </div>
        </div>
      </div>

      {/* Days Left Urgency Indicator */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Days Left - Urgency Indicator</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <span style={{ color: '#10b981', fontWeight: '700', fontSize: '16px', minWidth: '30px' }}>3+</span>
            <div>
              <div style={{ color: '#cbd5e1' }}>Safe</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Plenty of time remaining</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <span style={{ color: '#ff8800', fontWeight: '700', fontSize: '16px', minWidth: '30px' }}>2</span>
            <div>
              <div style={{ color: '#cbd5e1' }}>Warning</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Getting close to expiring</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <span style={{ color: '#ffaa00', fontWeight: '700', fontSize: '16px', minWidth: '30px' }}>1</span>
            <div>
              <div style={{ color: '#cbd5e1' }}>Urgent</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Last day of data</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <span style={{ color: '#ff4444', fontWeight: '700', fontSize: '16px', minWidth: '30px' }}>0</span>
            <div>
              <div style={{ color: '#cbd5e1' }}>Expired</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>No programming data left</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Section */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Action Buttons</div>
        <div style={actionGridStyle}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              background: 'rgba(59, 130, 246, 0.2)',
              color: '#60a5fa',
              borderRadius: '6px',
              flexShrink: 0,
              fontWeight: '600'
            }}>
              ⬇️
            </span>
            <div>
              <strong style={{ color: '#60a5fa', fontSize: '13px' }}>Download</strong>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                Save the archive file to your computer as .gz format
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              borderRadius: '6px',
              flexShrink: 0,
              fontWeight: '600'
            }}>
              🗑️
            </span>
            <div>
              <strong style={{ color: '#f87171', fontSize: '13px' }}>Delete</strong>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                Permanently remove archive file (not available for current file)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};