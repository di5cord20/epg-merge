"""
backend/constants.py
Shared constants for the EPG Merge application
"""

"""
FOLDER_MAP Reference:
Maps (timeframe, feed_type) to actual folder paths on share.jesmann.com
Source Provider: share.jesmann.com
Last verified: 2025-11-01

Update frequency reference (informational):
- 3-day feeds: Updated once daily (late afternoon)
- 7-day feeds: Updated once daily (early afternoon)
- 14-day feeds: Updated three times daily (Overnight, Morning, Evening)
"""

FOLDER_MAP = {
    "3": {
        "iptv": "3dayiptv",
        "gracenote": "3daygracenote"
    },
    "7": {
        "iptv": "7dayiptv",
        "gracenote": "7daygracenote"
    },
    "14": {
        "iptv": "iptv",           # 14-day IPTV at root/iptv/
        "gracenote": ""           # 14-day Gracenote at root (empty string = "")
    }
}

UPDATE_FREQUENCIES = {
    "3": "Updated once daily (late afternoon)",
    "7": "Updated once daily (early afternoon)",
    "14": "Updated three times daily (Overnight, Morning, Evening)"
}


def get_folder_name(timeframe: str, feed_type: str) -> str:
    """
    Get the folder name for a given timeframe and feed type.
    
    Args:
        timeframe: "3", "7", or "14"
        feed_type: "iptv" or "gracenote"
    
    Returns:
        Folder name string (may be empty string for root-level access)
    
    Raises:
        ValueError: If timeframe or feed_type is invalid
    """
    if timeframe not in FOLDER_MAP:
        raise ValueError(f"Invalid timeframe: {timeframe}. Must be 3, 7, or 14.")
    
    if feed_type not in FOLDER_MAP[timeframe]:
        raise ValueError(f"Invalid feed_type: {feed_type}. Must be 'iptv' or 'gracenote'.")
    
    return FOLDER_MAP[timeframe][feed_type]


def get_update_frequency(timeframe: str) -> str:
    """
    Get human-readable update frequency for a timeframe.
    
    Args:
        timeframe: "3", "7", or "14"
    
    Returns:
        Update frequency description
    """
    return UPDATE_FREQUENCIES.get(timeframe, "Unknown update frequency")