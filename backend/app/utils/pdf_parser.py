"""
RBU Platform — PDF Parser (Simplified)
Simple text extraction — no chunking, no embeddings.
"""

import PyPDF2
import io
import logging

logger = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract all text from a PDF file. No chunking, no embeddings."""
    try:
        text = ""
        reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))

        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n\n"

        text = text.strip()

        if not text:
            logger.warning("PDF extraction returned empty text")
            return ""

        logger.info(f"Extracted {len(text)} characters from PDF ({len(reader.pages)} pages)")
        return text

    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")
