import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker with CDN for better deployment compatibility
const initializePDFWorker = () => {
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
};

/**
 * Extracts text content from a PDF file
 * @param file - The PDF file to extract text from
 * @returns Promise<string> - The extracted text content
 */
export const extractTextFromPDF = async (file: File): Promise<string> => {
  initializePDFWorker(); // Initialize worker before using it

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
    }).promise;

    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + ' ';
    }

    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF. The file may be password-protected or corrupted.');
  }
};

/**
 * Extracts metadata from a PDF file
 * @param file - The PDF file to extract metadata from
 * @returns Promise<object> - The extracted metadata
 */
export const extractMetadataFromPDF = async (file: File) => {
  initializePDFWorker(); // Initialize worker before using it

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
    }).promise;

    const metadata = await pdf.getMetadata();
    return {
      title: metadata.info.Title || 'Untitled',
      author: metadata.info.Author || 'Unknown',
      subject: metadata.info.Subject || '',
      keywords: metadata.info.Keywords || '',
      numPages: pdf.numPages,
      creator: metadata.info.Creator || '',
      producer: metadata.info.Producer || '',
      creationDate: metadata.info.CreationDate || '',
      modificationDate: metadata.info.ModDate || '',
    };
  } catch (error) {
    console.error('Error extracting metadata from PDF:', error);
    return {
      title: 'Untitled',
      author: 'Unknown',
      subject: '',
      keywords: '',
      numPages: 0,
      creator: '',
      producer: '',
      creationDate: '',
      modificationDate: '',
    };
  }
};
