"""
EPG Merge - Test Configuration
Pytest fixtures for testing
"""

import pytest
import tempfile
from pathlib import Path
import sys
import os

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Database
from config import Config


@pytest.fixture
def temp_db():
    """Create temporary database for testing
    
    Yields:
        Database instance with temporary SQLite file
    """
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
        db_path = Path(f.name)
    
    db = Database(db_path)
    db.initialize()
    
    yield db
    
    db.close()
    db_path.unlink()


@pytest.fixture
def test_config():
    """Create test configuration
    
    Yields:
        Config instance with temporary directories
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["CONFIG_DIR"] = tmpdir
        os.environ["ENVIRONMENT"] = "testing"
        
        config = Config()
        yield config


@pytest.fixture
def client():
    """Create FastAPI test client
    
    Yields:
        TestClient instance
    """
    from fastapi.testclient import TestClient
    from main import app
    
    yield TestClient(app)