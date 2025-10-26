"""
EPG Merge - API Integration Tests
Integration tests for FastAPI endpoints
"""

import pytest


class TestHealthEndpoints:
    """Test health check endpoints"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data['status'] in ['healthy', 'unhealthy']
        assert 'version' in data
        assert 'timestamp' in data
    
    def test_status_endpoint(self, client):
        """Test status endpoint"""
        response = client.get("/api/status")
        assert response.status_code == 200
        data = response.json()
        assert 'app' in data
        assert 'storage' in data
        assert 'database' in data
        assert data['app']['version'] == '0.1.0'


class TestSourcesAPI:
    """Test sources endpoints"""
    
    def test_list_sources_default_params(self, client):
        """Test listing sources with default parameters"""
        response = client.get("/api/sources/list")
        assert response.status_code in [200, 500]  # May fail without internet
    
    def test_list_sources_valid_timeframe(self, client):
        """Test listing sources with valid timeframe"""
        response = client.get("/api/sources/list?timeframe=3&feed_type=iptv")
        assert response.status_code in [200, 500]
        if response.status_code == 200:
            data = response.json()
            assert 'sources' in data
            assert 'total' in data
    
    def test_invalid_timeframe_rejected(self, client):
        """Test that invalid timeframes are rejected"""
        response = client.get("/api/sources/list?timeframe=99")
        assert response.status_code == 422  # Validation error
    
    def test_invalid_feed_type_rejected(self, client):
        """Test that invalid feed types are rejected"""
        response = client.get("/api/sources/list?feed_type=invalid")
        assert response.status_code == 422  # Validation error
    
    def test_select_sources_valid(self, client):
        """Test saving valid sources"""
        sources = ["canada.xml.gz", "usa.xml.gz"]
        response = client.post("/api/sources/select", json={"sources": sources})
        assert response.status_code == 200
        assert response.json()['count'] == 2
    
    def test_select_sources_invalid_type(self, client):
        """Test that non-list sources are rejected"""
        response = client.post("/api/sources/select", json={"sources": "not_a_list"})
        assert response.status_code == 500


class TestChannelsAPI:
    """Test channels endpoints"""
    
    def test_get_selected_channels_empty(self, client):
        """Test getting selected channels when none exist"""
        response = client.get("/api/channels/selected")
        assert response.status_code == 200
        data = response.json()
        assert data['channels'] == []
    
    def test_select_channels_valid(self, client):
        """Test saving valid channels"""
        channels = ["channel1", "channel2", "channel3"]
        response = client.post("/api/channels/select", json={"channels": channels})
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'saved'
        assert data['count'] == 3
    
    def test_select_channels_invalid_type(self, client):
        """Test that non-list channels are rejected"""
        response = client.post("/api/channels/select", json={"channels": "not_a_list"})
        assert response.status_code == 500
    
    def test_get_selected_channels_after_save(self, client):
        """Test retrieving saved channels"""
        channels = ["ch1", "ch2"]
        client.post("/api/channels/select", json={"channels": channels})
        
        response = client.get("/api/channels/selected")
        assert response.status_code == 200
        data = response.json()
        assert len(data['channels']) == 2
        assert set(data['channels']) == set(channels)
    
    def test_export_channels(self, client):
        """Test exporting channels"""
        channels = ["ch1", "ch2", "ch3"]
        client.post("/api/channels/select", json={"channels": channels})
        
        response = client.post("/api/channels/export")
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'success'
        assert data['data']['channel_count'] == 3
        assert 'filename' in data
    
    def test_import_channels(self, client):
        """Test importing channels"""
        channels = ["imported1", "imported2"]
        response = client.post("/api/channels/import", json={"channels": channels})
        assert response.status_code == 200
        assert response.json()['count'] == 2
        
        # Verify they were saved
        get_response = client.get("/api/channels/selected")
        assert len(get_response.json()['channels']) == 2


class TestMergeAPI:
    """Test merge endpoints"""
    
    def test_get_current_merge_not_exists(self, client):
        """Test getting current merge when none exists"""
        response = client.get("/api/merge/current")
        assert response.status_code == 200
        data = response.json()
        assert data['exists'] is False
        assert data['filename'] == 'merged.xml.gz'


class TestArchivesAPI:
    """Test archives endpoints"""
    
    def test_list_archives_empty(self, client):
        """Test listing archives when none exist"""
        response = client.get("/api/archives/list")
        assert response.status_code == 200
        data = response.json()
        assert 'archives' in data
        assert data['archives'] == []
    
    def test_download_nonexistent_archive(self, client):
        """Test downloading nonexistent archive"""
        response = client.get("/api/archives/download/nonexistent.xml.gz")
        assert response.status_code == 404


class TestSettingsAPI:
    """Test settings endpoints"""
    
    def test_get_settings_empty(self, client):
        """Test getting settings when none exist"""
        response = client.get("/api/settings/get")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
    
    def test_set_settings_valid(self, client):
        """Test saving valid settings"""
        settings = {
            "output_filename": "merged.xml.gz",
            "merge_schedule": "daily",
            "merge_time": "00:00"
        }
        response = client.post("/api/settings/set", json=settings)
        assert response.status_code == 200
        assert response.json()['status'] == 'saved'
    
    def test_get_settings_after_save(self, client):
        """Test retrieving saved settings"""
        settings = {"test_key": "test_value"}
        client.post("/api/settings/set", json=settings)
        
        response = client.get("/api/settings/get")
        assert response.status_code == 200
        data = response.json()
        assert "test_key" in data
        assert data["test_key"] == "test_value"