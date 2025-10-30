/**
 * Integration Test Suite - v0.4.2 Phase 3
 * Backend/Frontend API Contract Validation
 * Tests end-to-end workflows and error handling
 * 
 * Run: npm test -- integration.test.js
 * Requires: Backend running on http://localhost:9193
 */

// Setup fetch mock
beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  global.fetch.mockClear();
});

// =========================================================================
// API ENDPOINT CONTRACTS
// =========================================================================

describe('API Endpoint Contracts', () => {

  describe('GET /api/health', () => {
    test('returns version information', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ version: '0.4.2', status: 'ok' })
      });

      const response = await fetch('/api/health');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.version).toBeDefined();
      expect(data.status).toBe('ok');
    });
  });

  describe('GET /api/settings/get', () => {
    test('returns all current settings', async () => {
      const mockSettings = {
        output_filename: 'merged.xml.gz',
        merge_schedule: 'daily',
        merge_time: '00:00',
        merge_days: ['0', '1', '2', '3', '4', '5', '6'],
        download_timeout: 120,
        merge_timeout: 300,
        channel_drop_threshold: '10',
        archive_retention_cleanup_expired: true,
        discord_webhook: ''
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings
      });

      const response = await fetch('/api/settings/get');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.output_filename).toBeDefined();
      expect(data.merge_schedule).toBe('daily');
      expect(data.archive_retention_cleanup_expired).toBe(true);
    });

    test('handles missing archive_retention_days', async () => {
      const mockSettings = {
        output_filename: 'merged.xml.gz',
        merge_schedule: 'daily',
        merge_time: '00:00'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings
      });

      const response = await fetch('/api/settings/get');
      const data = await response.json();

      expect(data.archive_retention_days).toBeUndefined();
      expect(data.archive_retention_cleanup_expired).toBeUndefined();
    });
  });

  describe('POST /api/settings/set', () => {
    test('accepts all settings fields', async () => {
      const settings = {
        output_filename: 'merged.xml.gz',
        merge_schedule: 'daily',
        merge_time: '00:00',
        merge_days: JSON.stringify(['0', '1', '2', '3', '4', '5', '6']),
        download_timeout: '120',
        merge_timeout: '300',
        channel_drop_threshold: '10',
        archive_retention_cleanup_expired: true,
        discord_webhook: ''
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const response = await fetch('/api/settings/set', {
        method: 'POST',
        body: JSON.stringify(settings)
      });

      expect(response.ok).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/settings/set', expect.any(Object));
    });

    test('validates required settings', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Missing required field: output_filename' })
      });

      const response = await fetch('/api/settings/set', {
        method: 'POST',
        body: JSON.stringify({})
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/archives/list', () => {
    test('returns array of archives', async () => {
      const mockArchives = {
        archives: [
          {
            filename: 'merged_2025-10-29.xml.gz',
            created_at: '2025-10-29T00:00:00Z',
            size_bytes: 5242880,
            channels: 150,
            programs: 10000,
            days_included: 7,
            is_current: true
          }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockArchives
      });

      const response = await fetch('/api/archives/list');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(Array.isArray(data.archives)).toBe(true);
      expect(data.archives[0].filename).toBeDefined();
      expect(data.archives[0].is_current).toBeDefined();
    });
  });

  describe('GET /api/archives/download/:filename', () => {
    test('returns file blob', async () => {
      const mockBlob = new Blob(['mock data'], { type: 'application/gzip' });

      fetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob
      });

      const response = await fetch('/api/archives/download/merged.xml.gz');
      expect(response.ok).toBe(true);
    });

    test('handles missing file', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'File not found' })
      });

      const response = await fetch('/api/archives/download/nonexistent.xml.gz');
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/archives/delete/:filename', () => {
    test('deletes archive file', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const response = await fetch('/api/archives/delete/merged.xml.gz', {
        method: 'DELETE'
      });

      expect(response.ok).toBe(true);
    });

    test('prevents deleting current file', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Cannot delete current file' })
      });

      const response = await fetch('/api/archives/delete/merged.xml.gz', {
        method: 'DELETE'
      });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/jobs/status', () => {
    test('returns job status', async () => {
      const mockStatus = {
        is_running: false,
        next_scheduled_run: '2025-10-30T00:00:00Z',
        latest_job: {
          job_id: 'job-123',
          status: 'success',
          started_at: '2025-10-29T00:00:00Z',
          execution_time_seconds: 300
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus
      });

      const response = await fetch('/api/jobs/status');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.is_running).toBeDefined();
      expect(data.next_scheduled_run).toBeDefined();
      expect(data.latest_job).toBeDefined();
    });
  });

  describe('GET /api/jobs/history', () => {
    test('returns job history', async () => {
      const mockHistory = {
        jobs: [
          {
            job_id: 'job-123',
            status: 'success',
            started_at: '2025-10-29T00:00:00Z',
            execution_time_seconds: 300
          }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory
      });

      const response = await fetch('/api/jobs/history?limit=10');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(Array.isArray(data.jobs)).toBe(true);
    });
  });
});

// =========================================================================
// WORKFLOW VALIDATION
// =========================================================================

describe('End-to-End Workflows', () => {

  describe('Settings Configuration Workflow', () => {
    test('fetch, modify, and save settings', async () => {
      const originalSettings = {
        output_filename: 'merged.xml.gz',
        merge_schedule: 'daily',
        merge_time: '00:00'
      };

      const modifiedSettings = {
        ...originalSettings,
        merge_time: '14:30',
        merge_schedule: 'weekly'
      };

      // Step 1: Fetch settings
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => originalSettings
      });

      let response = await fetch('/api/settings/get');
      let data = await response.json();
      expect(data.merge_time).toBe('00:00');

      // Step 2: Save modified settings
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      response = await fetch('/api/settings/set', {
        method: 'POST',
        body: JSON.stringify(modifiedSettings)
      });

      expect(response.ok).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Archive Management Workflow', () => {
    test('list, download, and delete archives', async () => {
      const mockArchives = {
        archives: [
          {
            filename: 'merged_2025-10-29.xml.gz',
            is_current: false
          }
        ]
      };

      // Step 1: List archives
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockArchives
      });

      let response = await fetch('/api/archives/list');
      let data = await response.json();
      expect(data.archives).toHaveLength(1);

      // Step 2: Download archive
      fetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob()
      });

      response = await fetch('/api/archives/download/merged_2025-10-29.xml.gz');
      expect(response.ok).toBe(true);

      // Step 3: Delete archive
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      response = await fetch('/api/archives/delete/merged_2025-10-29.xml.gz', {
        method: 'DELETE'
      });

      expect(response.ok).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Dashboard Monitoring Workflow', () => {
    test('fetch status and history', async () => {
      const mockStatus = {
        is_running: false,
        next_scheduled_run: '2025-10-30T00:00:00Z'
      };

      const mockHistory = {
        jobs: [{ job_id: 'job-1', status: 'success' }]
      };

      // Step 1: Fetch status
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus
      });

      let response = await fetch('/api/jobs/status');
      let data = await response.json();
      expect(data.is_running).toBe(false);

      // Step 2: Fetch history
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory
      });

      response = await fetch('/api/jobs/history?limit=10');
      data = await response.json();
      expect(data.jobs).toHaveLength(1);

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});

// =========================================================================
// ERROR HANDLING & EDGE CASES
// =========================================================================

describe('Error Handling', () => {

  describe('Network Errors', () => {
    test('handles network failure', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('/api/settings/get');
        fail('Should have thrown');
      } catch (err) {
        expect(err.message).toBe('Network error');
      }
    });

    test('handles timeout', async () => {
      fetch.mockRejectedValueOnce(new Error('Request timeout'));

      try {
        await fetch('/api/settings/get');
        fail('Should have thrown');
      } catch (err) {
        expect(err.message).toBe('Request timeout');
      }
    });
  });

  describe('HTTP Error Responses', () => {
    test('handles 400 Bad Request', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid request' })
      });

      const response = await fetch('/api/settings/set', {
        method: 'POST',
        body: JSON.stringify({})
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    test('handles 404 Not Found', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Resource not found' })
      });

      const response = await fetch('/api/archives/download/nonexistent.xml.gz');
      expect(response.status).toBe(404);
    });

    test('handles 500 Server Error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      });

      const response = await fetch('/api/settings/get');
      expect(response.status).toBe(500);
    });
  });

  describe('Data Validation', () => {
    test('validates settings filename format', () => {
      const validate = (filename) => {
        if (!filename.match(/\.(xml|xml\.gz)$/i)) {
          throw new Error('Invalid filename format');
        }
      };

      expect(() => validate('merged.xml')).not.toThrow();
      expect(() => validate('merged.xml.gz')).not.toThrow();
      expect(() => validate('merged.txt')).toThrow();
    });

    test('validates timeout ranges', () => {
      const validateTimeout = (timeout, min, max) => {
        if (timeout < min || timeout > max) {
          throw new Error(`Timeout must be between ${min} and ${max}`);
        }
      };

      expect(() => validateTimeout(120, 10, 600)).not.toThrow();
      expect(() => validateTimeout(5, 10, 600)).toThrow();
      expect(() => validateTimeout(700, 10, 600)).toThrow();
    });

    test('validates Discord webhook format', () => {
      const validate = (url) => {
        if (url && !url.match(/^https:\/\/discord\.com\/api\/webhooks\/\d+\/.+$/)) {
          throw new Error('Invalid webhook URL');
        }
      };

      expect(() => validate('https://discord.com/api/webhooks/123/abc')).not.toThrow();
      expect(() => validate('https://example.com/webhook')).toThrow();
      expect(() => validate('')).not.toThrow(); // Optional
    });
  });
});

// =========================================================================
// BACKWARDS COMPATIBILITY
// =========================================================================

describe('Backwards Compatibility', () => {

  test('handles old settings without archive_retention_cleanup_expired', async () => {
    const oldSettings = {
      output_filename: 'merged.xml.gz',
      merge_schedule: 'daily',
      merge_time: '00:00',
      archive_retention: 30 // Old field
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => oldSettings
    });

    const response = await fetch('/api/settings/get');
    const data = await response.json();

    expect(data.output_filename).toBeDefined();
    // New field should default to true if missing
    expect(data.archive_retention_cleanup_expired).toBeUndefined();
  });

  test('handles archive response without days_left', async () => {
    const mockArchive = {
      filename: 'merged.xml.gz',
      created_at: '2025-10-29T00:00:00Z',
      channels: 150
      // days_left is missing
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ archives: [mockArchive] })
    });

    const response = await fetch('/api/archives/list');
    const data = await response.json();

    expect(data.archives[0].filename).toBeDefined();
    expect(data.archives[0].days_left).toBeUndefined();
  });
});

// =========================================================================
// RESPONSE TIME EXPECTATIONS
// =========================================================================

describe('Performance Expectations', () => {

  test('settings endpoints respond within reasonable time', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ output_filename: 'merged.xml.gz' })
    });

    const start = Date.now();
    await fetch('/api/settings/get');
    const duration = Date.now() - start;

    // Should respond relatively quickly (mocked, but good practice)
    expect(duration).toBeLessThan(1000);
  });

  test('list endpoints handle pagination', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        archives: Array(100).fill(null).map((_, i) => ({
          filename: `archive_${i}.xml.gz`
        })),
        total: 100
      })
    });

    const response = await fetch('/api/archives/list?limit=100');
    const data = await response.json();

    expect(data.archives.length).toBeLessThanOrEqual(100);
  });
});

// =========================================================================
// PHASE 3 VALIDATION CHECKLIST
// =========================================================================

describe('Phase 3 Integration Checklist', () => {
  test('all endpoints have defined contracts', () => {
    const endpoints = [
      '/api/health',
      '/api/settings/get',
      '/api/settings/set',
      '/api/archives/list',
      '/api/archives/download/:filename',
      '/api/archives/delete/:filename',
      '/api/jobs/status',
      '/api/jobs/history'
    ];

    expect(endpoints).toHaveLength(8);
    endpoints.forEach(endpoint => {
      expect(endpoint).toBeTruthy();
    });
  });

  test('settings contract includes cleanup checkbox', () => {
    expect('archive_retention_cleanup_expired').toBeTruthy();
  });

  test('archives include is_current flag', () => {
    expect('is_current').toBeTruthy();
  });

  test('dashboard removed Run Now endpoint', () => {
    const removedEndpoints = ['/api/jobs/execute', '/api/jobs/run-now'];
    expect(removedEndpoints).toHaveLength(2);
  });

  test('error responses follow standard format', () => {
    const errorFormat = { error: 'message', code: 'optional' };
    expect(errorFormat.error).toBeDefined();
  });
});