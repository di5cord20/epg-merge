"""
EPG Merge Application - Version Information
Single source of truth for version across all components
"""

__version__ = "0.3.1"
__release_date__ = "2025-10-28"
__author__ = "di5cord20"
__license__ = "MIT"
__description__ = "Production-grade TV feed merger with archive cleanup and enhanced UI"

# Version components
VERSION_MAJOR = 0
VERSION_MINOR = 3
VERSION_PATCH = 1

def get_version():
    """Get current version string"""
    return __version__

def get_version_info():
    """Get detailed version information"""
    return {
        "version": __version__,
        "major": VERSION_MAJOR,
        "minor": VERSION_MINOR,
        "patch": VERSION_PATCH,
        "release_date": __release_date__,
        "author": __author__,
        "license": __license__,
        "description": __description__
    }

if __name__ == "__main__":
    print(f"EPG Merge App v{__version__} ({__release_date__})")