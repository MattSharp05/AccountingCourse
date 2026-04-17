import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
// Worker is bundled by Vite and served from the build output. Using `?url`
// rather than a CDN keeps PDF rendering offline-safe.
//
// IMPORTANT: `pdfjs-dist` MUST be pinned to the exact version react-pdf
// depends on (currently 5.4.296). The pdf.js API and Worker are versioned
// together and refuse to talk to each other if the versions disagree —
// you'll see "API version X does not match Worker version Y" in the UI.
// If you upgrade react-pdf, check `node_modules/react-pdf/package.json`
// for its `pdfjs-dist` pin and update the top-level dependency to match.
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ExternalLink, FileText } from 'lucide-react';
import { BrandButton } from '../ui';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfViewerProps {
  fileUrl: string;
  title: string;
  onComplete: () => void;
}

/**
 * Renders a PDF as stacked canvas pages using pdf.js.
 *
 * Why not an <iframe src=*.pdf>?
 *  - Some Windows browsers (and Firefox) refuse to embed PDFs and instead
 *    open them in a new tab or trigger a download.
 *  - Native PDF viewers create a nested scroll container that fights the
 *    parent modal's scroll, which feels buggy on macOS.
 *
 * Rendering pages as canvases lives entirely inside the modal's scroll
 * container, so scrolling is smooth, and works the same in every browser.
 */
export function PdfViewer({ fileUrl, title, onComplete }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Track container width so pages render at the right size and reflow
  // when the modal resizes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => setContainerWidth(el.clientWidth);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Reset state when the URL changes (e.g. switching tabs in a checkpoint).
  useEffect(() => {
    console.log('[PdfViewer] loading PDF', { title, fileUrl });
    setNumPages(null);
    setLoadError(null);
  }, [fileUrl, title]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: count }: { numPages: number }) => {
      console.log('[PdfViewer] load success', { title, pages: count });
      setNumPages(count);
    },
    [title],
  );

  const onDocumentLoadError = useCallback(
    (err: Error) => {
      console.error('[PdfViewer] load error', { title, fileUrl, err });
      setLoadError(err);
    },
    [fileUrl, title],
  );

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="rounded-xl border border-white/10 bg-brand-dark-lighter p-2 overflow-hidden"
      >
        {loadError ? (
          <PdfFallback fileUrl={fileUrl} error={loadError} />
        ) : (
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="py-12 text-center text-sm text-[#9ca3af]">
                Loading PDF…
              </div>
            }
            error={<PdfFallback fileUrl={fileUrl} />}
          >
            {containerWidth > 0 &&
              numPages !== null &&
              Array.from({ length: numPages }, (_, i) => (
                <div
                  key={`pdf-page-${i + 1}`}
                  className="mb-3 flex justify-center last:mb-0"
                >
                  <Page
                    pageNumber={i + 1}
                    width={containerWidth - 16 /* account for p-2 padding */}
                    renderTextLayer
                    renderAnnotationLayer
                  />
                </div>
              ))}
          </Document>
        )}
      </div>

      <div className="flex items-center justify-between">
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-brand-accent hover:text-brand-accent/80 underline"
        >
          <ExternalLink className="w-4 h-4" />
          Open in new tab
        </a>
        <BrandButton onClick={onComplete} variant="primary">
          Done Reading
        </BrandButton>
      </div>
    </div>
  );
}

function PdfFallback({ fileUrl, error }: { fileUrl: string; error?: Error }) {
  return (
    <div className="py-10 px-4 text-center space-y-3">
      <p className="text-white/90">
        We couldn't display this PDF inside the page.
      </p>
      {error && (
        <p className="text-xs text-[#6b7280] font-mono break-all">
          {error.message}
        </p>
      )}
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-accent/10 text-brand-accent rounded-lg hover:bg-brand-accent/20 transition-colors"
      >
        <FileText className="w-4 h-4" />
        Open PDF in new tab
      </a>
    </div>
  );
}
