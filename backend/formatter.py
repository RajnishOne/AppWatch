"""
Discord release notes formatter
"""
import re
import logging

logger = logging.getLogger(__name__)


class DiscordFormatter:
    """Format App Store release notes for Discord"""
    
    # Section headers to recognize
    SECTION_HEADERS = [
        r'^new\s*:?\s*$',
        r'^added\s*:?\s*$',
        r'^improvements?\s*:?\s*$',
        r'^improved\s*:?\s*$',
        r'^fixed\s*:?\s*$',
        r'^fixes\s*:?\s*$',
        r'^bugs?\s*:?\s*$',
        r'^changes?\s*:?\s*$',
    ]
    
    def __init__(self):
        # Compile regex patterns
        self.section_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.SECTION_HEADERS]
    
    def format_release_notes(self, version, release_notes):
        """
        Format release notes for Discord.
        
        Supports two cases:
        - Case A: Generic release text (fallback)
        - Case B: Structured sections
        """
        if not release_notes:
            return f"# v{version}\n\nNo release notes available."
        
        # Clean up markdown from App Store
        cleaned = self._strip_app_store_markdown(release_notes)
        
        # Try to detect structured sections
        sections = self._parse_sections(cleaned)
        
        if sections:
            # Case B: Structured sections
            return self._format_structured(version, sections)
        else:
            # Case A: Generic release text
            return self._format_generic(version, cleaned)
    
    def _strip_app_store_markdown(self, text):
        """Strip App Store markdown (**, _, *)"""
        # Remove bold markers
        text = re.sub(r'\*\*', '', text)
        # Remove italic markers
        text = re.sub(r'_', '', text)
        text = re.sub(r'\*', '', text)
        return text.strip()
    
    def _parse_sections(self, text):
        """Parse text into structured sections"""
        lines = text.split('\n')
        sections = {}
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if line is a section header
            is_header = False
            header_name = None
            
            for pattern in self.section_patterns:
                if pattern.match(line):
                    is_header = True
                    # Normalize header name
                    header_name = self._normalize_header(line)
                    break
            
            if is_header:
                current_section = header_name
                sections[current_section] = []
            elif current_section:
                # Add to current section
                sections[current_section].append(line)
            else:
                # No section header yet, might be generic text
                pass
        
        # Only return sections if we found at least one
        if sections:
            return sections
        return None
    
    def _normalize_header(self, header):
        """Normalize section header names"""
        header_lower = header.lower().rstrip(':').strip()
        
        # Map variations to standard names
        if header_lower in ['new']:
            return 'New'
        elif header_lower in ['added']:
            return 'Added'
        elif header_lower in ['improvements', 'improved']:
            return 'Improvements'
        elif header_lower in ['fixed', 'fixes', 'bugs', 'bug']:
            return 'Fixed'
        elif header_lower in ['changes', 'change']:
            return 'Changes'
        else:
            return header.strip().rstrip(':')
    
    def _format_structured(self, version, sections):
        """Format structured sections (Case B)"""
        parts = [f"# v{version}", ""]
        
        for section_name, items in sections.items():
            parts.append(f"**{section_name}**")
            
            for item in items:
                # Ensure items start with bullet
                item_clean = item.strip()
                if not item_clean.startswith('-'):
                    item_clean = f"- {item_clean}"
                parts.append(item_clean)
            
            parts.append("")  # Empty line between sections
        
        return '\n'.join(parts).strip()
    
    def _format_generic(self, version, text):
        """Format generic release text (Case A)"""
        lines = text.split('\n')
        parts = [f"# v{version}", ""]
        
        # Check if it starts with "This release includes"
        first_line = lines[0].strip() if lines else ""
        if first_line.lower().startswith('this release includes'):
            parts.append(f"**{first_line}**")
            parts.append("")
            
            # Process remaining lines as bullets
            for line in lines[1:]:
                line = line.strip()
                if line:
                    if not line.startswith('-'):
                        line = f"- {line}"
                    parts.append(line)
        else:
            # Generic formatting - make first line bold if it looks like a header
            if lines:
                first_line = lines[0].strip()
                if first_line and not first_line.startswith('-'):
                    parts.append(f"**{first_line}**")
                    parts.append("")
                    
                    # Process remaining lines
                    for line in lines[1:]:
                        line = line.strip()
                        if line:
                            if not line.startswith('-'):
                                line = f"- {line}"
                            parts.append(line)
                else:
                    # All lines are bullets
                    for line in lines:
                        line = line.strip()
                        if line:
                            if not line.startswith('-'):
                                line = f"- {line}"
                            parts.append(line)
        
        return '\n'.join(parts).strip()

