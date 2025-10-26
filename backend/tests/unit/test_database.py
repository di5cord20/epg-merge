"""
EPG Merge - Database Tests
Unit tests for database functionality
"""

import pytest


class TestDatabase:
    """Test database operations"""
    
    def test_initialize_creates_tables(self, temp_db):
        """Test that initialization creates required tables"""
        assert temp_db.get_table_count() >= 3
    
    def test_health_check_success(self, temp_db):
        """Test database health check"""
        assert temp_db.health_check() is True
    
    def test_save_and_get_channels(self, temp_db):
        """Test saving and retrieving channels"""
        channels = ["ch1", "ch2", "ch3"]
        temp_db.save_selected_channels(channels)
        
        retrieved = temp_db.get_selected_channels()
        assert len(retrieved) == 3
        assert set(retrieved) == set(channels)
    
    def test_save_channels_replaces_previous(self, temp_db):
        """Test that saving channels replaces previous ones"""
        temp_db.save_selected_channels(["ch1", "ch2"])
        assert len(temp_db.get_selected_channels()) == 2
        
        temp_db.save_selected_channels(["ch3", "ch4", "ch5"])
        retrieved = temp_db.get_selected_channels()
        assert len(retrieved) == 3
        assert "ch1" not in retrieved
    
    def test_get_empty_channels(self, temp_db):
        """Test getting channels when none saved"""
        channels = temp_db.get_selected_channels()
        assert channels == []
    
    def test_save_and_get_setting(self, temp_db):
        """Test saving and retrieving settings"""
        temp_db.set_setting("test_key", "test_value")
        value = temp_db.get_setting("test_key")
        assert value == "test_value"
    
    def test_get_nonexistent_setting_returns_default(self, temp_db):
        """Test default return for missing settings"""
        value = temp_db.get_setting("nonexistent", "default_value")
        assert value == "default_value"
    
    def test_update_setting(self, temp_db):
        """Test updating existing setting"""
        temp_db.set_setting("key", "value1")
        assert temp_db.get_setting("key") == "value1"
        
        temp_db.set_setting("key", "value2")
        assert temp_db.get_setting("key") == "value2"
    
    def test_get_all_settings_empty(self, temp_db):
        """Test getting all settings when none exist"""
        settings = temp_db.get_all_settings()
        assert settings == {}
    
    def test_get_all_settings(self, temp_db):
        """Test getting all settings"""
        temp_db.set_setting("key1", "value1")
        temp_db.set_setting("key2", "value2")
        temp_db.set_setting("key3", "value3")
        
        settings = temp_db.get_all_settings()
        assert len(settings) == 3
        assert settings["key1"] == "value1"
        assert settings["key2"] == "value2"
        assert settings["key3"] == "value3"
    
    def test_save_archive_metadata(self, temp_db):
        """Test saving archive metadata"""
        temp_db.save_archive("test.xml.gz", 10, 100, 7, 5242880)
        
        archive = temp_db.get_archive("test.xml.gz")
        assert archive is not None
        assert archive["filename"] == "test.xml.gz"
        assert archive["channels"] == 10
        assert archive["programs"] == 100
        assert archive["days_included"] == 7
        assert archive["size_bytes"] == 5242880
    
    def test_get_nonexistent_archive(self, temp_db):
        """Test getting nonexistent archive"""
        archive = temp_db.get_archive("nonexistent.xml.gz")
        assert archive is None