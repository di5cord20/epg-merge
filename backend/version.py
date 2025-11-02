"""
EPG Merge Application - Version Information
SINGLE SOURCE OF TRUTH - Update this file only
All other files auto-sync during build/deployment
"""

__version__ = "0.4.5"
__release_date__ = "2025-11-01"
__author__ = "di5cord20"
__license__ = "MIT"
__description__ = "TV feed merger with simplified persistence and streamlined services"

# Semantic versioning components
VERSION_MAJOR = 0
VERSION_MINOR = 4
VERSION_PATCH = 5


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